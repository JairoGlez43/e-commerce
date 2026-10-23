// The owner's login against Supabase Auth with plain fetch, no SDK (spec 0014).
// Browser only: imported by the admin page's script. The single home of every Auth call and of
// the stored session. Features 12–14 send their own requests through authFetch().

export interface AuthUser {
	email: string;
	app_metadata: Record<string, unknown>;
}

export type AuthErrorKind = 'credentials' | 'linkError' | 'weak' | 'same' | 'rate' | 'signedOut' | 'offline' | 'unknown';

// Every function here throws only this; the page turns `kind` into a Spanish message.
export class AuthError extends Error {
	constructor(readonly kind: AuthErrorKind) {
		super(`Auth: ${kind}`);
		this.name = 'AuthError';
	}
}

interface Session {
	access_token: string;
	refresh_token: string;
	// Milliseconds on this phone's clock (Date.now()), never the server's expires_at.
	expires_at: number;
	user: AuthUser | null;
}

interface TokenResponse {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	user?: AuthUser;
}

const STORAGE_KEY = 'admin-session';
// Renew the access token when less than this is left, so an expired one is never sent.
const REFRESH_MARGIN_MS = 60_000;
// A 403 with one of these codes means "bad or closed token", not "not allowed" (spec 0014).
const REJECTED_TOKEN_CODES = new Set(['bad_jwt', 'session_not_found']);

let config: { url: string; key: string } | undefined;
// Mirror of the stored session, used when localStorage is unavailable (private mode, blocked).
let memorySession: Session | null = null;
// One refresh at a time: refresh tokens are single use.
let refreshing: Promise<Session> | undefined;

// The page passes the project URL and publishable key read from its data attributes.
export function initAuth(value: { url: string; key: string }): void {
	config = value;
}

// --- Stored session ---------------------------------------------------------------------

function readSession(): Session | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) return JSON.parse(raw) as Session;
	} catch {
		// Storage unavailable or corrupt: fall back to the in-memory copy.
	}
	return memorySession;
}

function saveSession(session: Session | null): void {
	memorySession = session;
	try {
		if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
		else localStorage.removeItem(STORAGE_KEY);
	} catch {
		// Storage unavailable: the session lasts only while the page is open.
	}
}

function pickUser(user: AuthUser): AuthUser {
	return { email: user.email, app_metadata: user.app_metadata ?? {} };
}

function storeTokens(tokens: TokenResponse, user: AuthUser | null): Session {
	const session: Session = {
		access_token: tokens.access_token,
		refresh_token: tokens.refresh_token,
		// Counted on this phone's clock, so a phone with the wrong time still counts the hour right.
		expires_at: Date.now() + tokens.expires_in * 1000,
		user: tokens.user ? pickUser(tokens.user) : user,
	};
	saveSession(session);
	return session;
}

export function hasSession(): boolean {
	return readSession() !== null;
}

// The last user Supabase confirmed, for showing the admin while offline.
export function storedUser(): AuthUser | null {
	return readSession()?.user ?? null;
}

// Only for the UI. The real protection is is_owner() in the database (supabase/auth.sql).
export function isOwner(user: AuthUser): boolean {
	return user.app_metadata.role === 'owner';
}

// --- Requests ---------------------------------------------------------------------------

async function send(path: string, init: RequestInit = {}, accessToken?: string): Promise<Response> {
	if (!config) throw new Error('Auth: initAuth() must run before any request.');
	const headers = new Headers(init.headers);
	// The publishable key goes in apikey only, never in Authorization.
	headers.set('apikey', config.key);
	headers.set('Content-Type', 'application/json');
	if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
	try {
		return await fetch(`${config.url}${path}`, { ...init, headers });
	} catch {
		throw new AuthError('offline');
	}
}

// Newer Auth API versions moved the string code from error_code to code; the old `code` is the
// HTTP status as a number. The header is the last resort. Never read the human `msg`.
async function errorCode(response: Response): Promise<string | undefined> {
	let body: { error_code?: unknown; code?: unknown } = {};
	if (response.headers.get('Content-Type')?.includes('application/json')) {
		try {
			body = await response.clone().json();
		} catch {
			// Not JSON after all; use the header.
		}
	}
	if (typeof body.error_code === 'string') return body.error_code;
	if (typeof body.code === 'string') return body.code;
	return response.headers.get('x-sb-error-code') ?? undefined;
}

async function failure(path: string, response: Response): Promise<AuthError> {
	if (response.status === 429) return new AuthError('rate');
	const code = await errorCode(response);
	if (code === 'invalid_credentials') return new AuthError('credentials');
	if (code === 'weak_password') return new AuthError('weak');
	if (code === 'same_password') return new AuthError('same');
	console.error(`[auth] ${path.split('?')[0]} failed with status ${response.status} (${code ?? 'no code'})`);
	return new AuthError('unknown');
}

async function isRejectedToken(response: Response): Promise<boolean> {
	if (response.status === 401) return true;
	if (response.status !== 403) return false;
	const code = await errorCode(response);
	return code !== undefined && REJECTED_TOKEN_CODES.has(code);
}

async function refresh(session: Session): Promise<Session> {
	const path = '/auth/v1/token?grant_type=refresh_token';
	const response = await send(path, { method: 'POST', body: JSON.stringify({ refresh_token: session.refresh_token }) });
	// Supabase answers every refused refresh token with 400. A 429, a 5xx or no network keep the
	// session: the owner must not be signed out by Cuba's unreliable connections.
	if (response.status === 400 || response.status === 401) {
		saveSession(null);
		throw new AuthError('signedOut');
	}
	if (!response.ok) throw await failure(path, response);
	return storeTokens((await response.json()) as TokenResponse, session.user);
}

function refreshOnce(session: Session): Promise<Session> {
	refreshing ??= refresh(session).finally(() => {
		refreshing = undefined;
	});
	return refreshing;
}

// Layer 1 of spec 0014: renew before sending when the token is about to expire.
export async function getSession(): Promise<{ user: AuthUser | null; accessToken: string } | null> {
	let session = readSession();
	if (!session) return null;
	if (session.expires_at - Date.now() < REFRESH_MARGIN_MS) session = await refreshOnce(session);
	return { user: session.user, accessToken: session.access_token };
}

// Any authenticated call to the project (Auth now; database, Storage, functions in features
// 12–14). Layer 2 of spec 0014: a rejected token gets one refresh and one repeat, never more.
// `init.body` must be a string so the request can be sent twice.
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
	const session = await getSession();
	if (!session) throw new AuthError('signedOut');
	const response = await send(path, init, session.accessToken);
	if (!(await isRejectedToken(response))) return response;

	const current = readSession();
	if (!current) throw new AuthError('signedOut');
	const renewed = await refreshOnce(current);
	const repeated = await send(path, init, renewed.access_token);
	if (await isRejectedToken(repeated)) {
		saveSession(null);
		throw new AuthError('signedOut');
	}
	return repeated;
}

// --- Actions ----------------------------------------------------------------------------

export async function signIn(email: string, password: string): Promise<AuthUser> {
	const path = '/auth/v1/token?grant_type=password';
	const response = await send(path, { method: 'POST', body: JSON.stringify({ email, password }) });
	if (!response.ok) throw await failure(path, response);
	const session = storeTokens((await response.json()) as TokenResponse, null);
	return session.user ?? getUser();
}

// Checks the session with Supabase and refreshes the stored email and role.
export async function getUser(): Promise<AuthUser> {
	const path = '/auth/v1/user';
	const response = await authFetch(path);
	if (!response.ok) throw await failure(path, response);
	const user = pickUser((await response.json()) as AuthUser);
	const session = readSession();
	if (session) saveSession({ ...session, user });
	return user;
}

// Global: every device signed in as the owner is signed out (spec 0014). The stored session is
// cleared even when the call fails, for example offline.
export async function signOut(): Promise<void> {
	try {
		await authFetch('/auth/v1/logout?scope=global', { method: 'POST' });
	} catch {
		// Nothing to undo: the local session goes either way.
	} finally {
		saveSession(null);
	}
}

// Sends Supabase's default recovery email. Its link comes back to this site's /admin/, which
// must be in the project's Redirect URLs. No code_challenge: the implicit flow puts the session
// in the link itself, so it works in any browser. Any email gets the same 200.
export async function requestRecovery(email: string): Promise<void> {
	const redirectTo = encodeURIComponent(`${location.origin}/admin/`);
	const path = `/auth/v1/recover?redirect_to=${redirectTo}`;
	const response = await send(path, { method: 'POST', body: JSON.stringify({ email }) });
	if (!response.ok) throw await failure(path, response);
}

// Runs first on page load. A recovery link lands here with the session, or an error, in the URL
// fragment (#…). Browsers never send the fragment to a server; it is removed from the address
// bar and from history right away.
export function readRecoveryLink(): 'recovery' | 'linkError' | null {
	const params = new URLSearchParams(location.hash.slice(1));
	const isError = params.has('error') || params.has('error_code');
	const accessToken = params.get('access_token');
	const refreshToken = params.get('refresh_token');
	const expiresIn = Number(params.get('expires_in'));
	const isRecovery = params.get('type') === 'recovery' && !!accessToken && !!refreshToken && expiresIn > 0;
	if (!isError && !isRecovery) return null;

	history.replaceState(null, '', location.pathname + location.search);
	if (isError || !accessToken || !refreshToken) return 'linkError';
	storeTokens({ access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn }, null);
	return 'recovery';
}

export async function setPassword(password: string): Promise<AuthUser> {
	const path = '/auth/v1/user';
	const response = await authFetch(path, { method: 'PUT', body: JSON.stringify({ password }) });
	if (!response.ok) throw await failure(path, response);
	const user = pickUser((await response.json()) as AuthUser);
	const session = readSession();
	if (session) saveSession({ ...session, user });
	return user;
}

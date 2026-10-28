// The owner's "Publicar cambios" and the publish status, with plain fetch and no SDK
// (spec 0016). Browser only: imported by the admin page's script. The single home of the
// publish requests and of the rule that turns three timestamps into a state. Every compared time
// comes from a server (Supabase or the build), never from the phone's clock.
import { AuthError, authFetch } from './auth';

export interface Build {
	builtAt: string;
	catalogChangedAt: string;
}

export interface PublishState {
	// The database holds a catalog the live site does not show yet.
	pending: boolean;
	// The last publish was asked for after the live build ran, so its build is still to come.
	publishing: boolean;
}

export type PublishErrorKind = 'tooSoon' | 'forbidden' | 'unknown';

// Every function here throws only this or an AuthError (from authFetch(), passed through
// unchanged, or `offline` from readBuild()). The page turns `kind` into a Spanish message.
export class PublishError extends Error {
	constructor(readonly kind: PublishErrorKind) {
		super(`Publish: ${kind}`);
		this.name = 'PublishError';
	}
}

function failure(path: string, response: Response): PublishError {
	if (response.status === 429) return new PublishError('tooSoon');
	if (response.status === 403) return new PublishError('forbidden');
	console.error(`[publish] ${path.split('?')[0]} failed with status ${response.status}`);
	return new PublishError('unknown');
}

// Starts one build of the public site through the Edge Function `publish`
// (supabase/functions/publish/index.ts). Returns when the request was recorded.
export async function requestPublish(): Promise<string> {
	const path = '/functions/v1/publish';
	const response = await authFetch(path, { method: 'POST', body: '{}' });
	if (response.status !== 200) throw failure(path, response);
	const body = (await response.json()) as { requested_at?: unknown };
	if (typeof body.requested_at !== 'string') throw new PublishError('unknown');
	return body.requested_at;
}

// The time of the last publish request, or null if there was never one. Only the owner can read it.
export async function lastPublish(): Promise<string | null> {
	const path = '/rest/v1/publishes?select=requested_at&order=requested_at.desc&limit=1';
	const response = await authFetch(path);
	if (response.status !== 200) throw failure(path, response);
	const [row] = (await response.json()) as { requested_at: string }[];
	return row?.requested_at ?? null;
}

// When the catalog last changed in the database (the trigger's stamp).
export async function catalogChangedAt(): Promise<string> {
	const path = '/rest/v1/catalog_state?select=changed_at';
	const response = await authFetch(path);
	if (response.status !== 200) throw failure(path, response);
	const [row] = (await response.json()) as { changed_at: string }[];
	if (row === undefined) throw new PublishError('unknown');
	return row.changed_at;
}

// The live site's /build.json, same origin, never from the browser's cache.
export async function readBuild(): Promise<Build> {
	let response: Response;
	try {
		response = await fetch('/build.json', { cache: 'no-store' });
	} catch {
		throw new AuthError('offline');
	}
	if (!response.ok) {
		console.error(`[publish] /build.json failed with status ${response.status}`);
		throw new PublishError('unknown');
	}
	try {
		const body = (await response.json()) as Partial<Build>;
		if (typeof body.builtAt === 'string' && typeof body.catalogChangedAt === 'string') {
			return { builtAt: body.builtAt, catalogChangedAt: body.catalogChangedAt };
		}
	} catch {
		// Not JSON: refused below.
	}
	throw new PublishError('unknown');
}

// The stamps are compared as PostgREST wrote them, so equal strings mean the same catalog.
export function publishState(build: Build, changedAt: string, requestedAt: string | null): PublishState {
	return {
		pending: changedAt !== build.catalogChangedAt,
		publishing: requestedAt !== null && Date.parse(requestedAt) > Date.parse(build.builtAt),
	};
}

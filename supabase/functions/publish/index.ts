// Edge Function `publish` (spec 0016): the owner's "Publicar cambios" starts one build of the
// public site. Deno, one file, no imports, no SDK. Pasted into the Supabase dashboard editor;
// this file is the copy kept in the repo.
// The database decides who is the owner: the `publishes` row is inserted with the caller's own
// JWT, and its RLS policy is public.is_owner(). Only after that insert works is the deploy hook
// called. The hook URL is a secret and never leaves this function.

const CORS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
// Stops double taps and protects the hook's limit of 60 triggers an hour.
const MIN_GAP_MS = 60_000;

// Injected by Supabase into every function. Never a secret or service-role key: every database
// call below runs as the caller, under RLS.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const PUBLISHABLE_KEY: string = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}').default;

function reply(status: number, body?: unknown): Response {
	if (body === undefined) return new Response(null, { status, headers: CORS });
	return Response.json(body, { status, headers: CORS });
}

// Logs name the step and the status, never a header, a token or the hook URL.
function fail(step: string, detail: string | number, status: number, error: string): Response {
	console.error(`[publish] ${step} failed (${detail})`);
	return reply(status, { error });
}

// A PostgREST call made as the caller: their Authorization header goes on unchanged, and the
// apikey is the project's own publishable key, never the one the caller sent.
function database(path: string, authorization: string, init: RequestInit = {}): Promise<Response> {
	return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
		...init,
		headers: {
			apikey: PUBLISHABLE_KEY,
			Authorization: authorization,
			'Content-Type': 'application/json',
			Prefer: 'return=representation',
		},
	});
}

// An expired token answers 401, so authFetch() in the admin refreshes it and tries once more.
function refused(step: string, response: Response): Response {
	if (response.status === 401) return fail(step, 401, 401, 'signedOut');
	if (response.status === 403) return fail(step, 403, 403, 'forbidden');
	return fail(step, response.status, 500, 'unknown');
}

async function publish(authorization: string): Promise<Response> {
	// Step 2: at most one publish a minute. RLS hides the rows from anyone but the owner.
	const last = await database('publishes?select=requested_at&order=requested_at.desc&limit=1', authorization);
	if (!last.ok) return refused('read last publish', last);
	const [lastRow] = (await last.json()) as { requested_at: string }[];
	if (lastRow && Date.now() - Date.parse(lastRow.requested_at) < MIN_GAP_MS) {
		return reply(429, { error: 'tooSoon' });
	}

	// Step 3: the owner check. Only is_owner() lets this insert through.
	const insert = await database('publishes', authorization, { method: 'POST', body: '{}' });
	if (insert.status !== 201) return refused('insert publish', insert);
	const rows = (await insert.json()) as { id: number; requested_at: string }[];
	const [row] = rows;
	if (rows.length !== 1 || row === undefined) return fail('insert publish', 'no row', 500, 'unknown');

	// Step 4: the deploy hook. On failure the row goes, so the 60 s gap does not block a retry.
	const hook = Deno.env.get('DEPLOY_HOOK_URL');
	let hookStatus: string | number = 'no secret';
	if (hook) {
		try {
			hookStatus = (await fetch(hook, { method: 'POST' })).status;
		} catch {
			hookStatus = 'no answer';
		}
	}
	if (typeof hookStatus !== 'number' || hookStatus < 200 || hookStatus > 299) {
		await database(`publishes?id=eq.${row.id}`, authorization, { method: 'DELETE' }).catch(() => undefined);
		return fail('deploy hook', hookStatus, 502, 'hook');
	}

	// Step 5.
	return reply(200, { requested_at: row.requested_at });
}

Deno.serve(async (request) => {
	if (request.method === 'OPTIONS') return reply(204);
	if (request.method !== 'POST') return reply(405);

	// Step 1.
	const authorization = request.headers.get('Authorization');
	if (!authorization?.startsWith('Bearer ')) return reply(401, { error: 'signedOut' });

	try {
		return await publish(authorization);
	} catch {
		return fail('request', 'no answer from the database', 500, 'unknown');
	}
});

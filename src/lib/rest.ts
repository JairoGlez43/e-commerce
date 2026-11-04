// The admin's requests to the Supabase REST API (PostgREST) and the mapping of a refused answer
// to an error kind (spec 0018, moved from products.ts without behavior change). Browser only:
// products.ts, photos.ts and categories.ts build on it. Every request goes through authFetch().
import { authFetch } from './auth';

export type RestErrorKind = 'exists' | 'reference' | 'invalid' | 'forbidden' | 'gone' | 'system' | 'unknown';

// Every admin request throws only this or an AuthError from authFetch(), passed through
// unchanged. The page turns `kind` into a Spanish message for its own context. `constraint` is
// set only on a 409 23505: the unique constraint that refused the row (spec 0018, AC-14).
export class RestError extends Error {
	constructor(
		readonly kind: RestErrorKind,
		readonly constraint?: string,
	) {
		super(`Rest: ${kind}`);
		this.name = 'RestError';
	}
}

const HEADERS = { 'Content-Type': 'application/json', Prefer: 'return=representation' };

// Plain records only, so a caller's headers can be spread over the defaults.
type SendInit = Omit<RequestInit, 'headers'> & { headers?: Record<string, string> };

// Reads the JSON body's code and message only when the answer says it is JSON.
async function errorBody(response: Response): Promise<{ code?: string; message?: string }> {
	if (!response.headers.get('Content-Type')?.includes('application/json')) return {};
	try {
		const body = (await response.json()) as { code?: unknown; message?: unknown };
		return {
			code: typeof body.code === 'string' ? body.code : undefined,
			message: typeof body.message === 'string' ? body.message : undefined,
		};
	} catch {
		return {};
	}
}

// Postgres names the constraint in the message, measured in spec 0018 T3:
// 'duplicate key value violates unique constraint "categories_sort_order_key"'.
function constraintOf(message: string | undefined): string | undefined {
	return message?.match(/unique constraint "([^"]+)"/)?.[1];
}

async function failure(method: string, path: string, response: Response): Promise<RestError> {
	const { code, message } = await errorBody(response);
	if (response.status === 409 && code === '23505') return new RestError('exists', constraintOf(message));
	// A foreign key refused it: a missing category for a product, products left for a category.
	if (response.status === 409 && code === '23503') return new RestError('reference');
	// A real refusal by RLS. authFetch() already refreshed and retried an expired token (401).
	if (response.status === 403 && code === '42501') return new RestError('forbidden');
	console.error(`[rest] ${method} ${path.split('?')[0]} failed with status ${response.status} (${code ?? 'no code'})`);
	// Postgres classes 22 (data) and 23 (rules) mean the data sent was wrong. Any other 4xx is a
	// fault the owner cannot fix from the form (spec 0015, amended 2026-10-28).
	if (response.status === 400 && (code?.startsWith('22') || code?.startsWith('23'))) return new RestError('invalid');
	if (response.status >= 400 && response.status < 500) return new RestError('system');
	return new RestError('unknown');
}

export async function send<Row>(path: string, init: SendInit = {}, expected = 200): Promise<Row[]> {
	const response = await authFetch(path, { ...init, headers: { ...HEADERS, ...init.headers } });
	if (response.status !== expected) throw await failure(init.method ?? 'GET', path, response);
	return (await response.json()) as Row[];
}

// A PATCH or DELETE that matches no row answers 200 with [] (also when RLS hides the row), so
// every one checks that exactly one row came back.
export function onlyRow<Row>(rows: Row[]): Row {
	const [row] = rows;
	if (rows.length !== 1 || row === undefined) throw new RestError('gone');
	return row;
}

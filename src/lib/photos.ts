// The owner's product photos in Supabase Storage, with plain fetch and no SDK (spec 0017).
// Browser only: imported by src/lib/products.ts and the admin page's script. The single home of
// the photo rules: how a phone photo is shrunk, how its file is named, and how it is uploaded
// and deleted. What really protects the bucket is RLS with public.is_owner() and the bucket's own
// limits (supabase/photos.sql).
import { AuthError, authFetch } from './auth';
import { ProductError } from './products';

// Thrown only by preparePhoto(); the page turns it into a Spanish message.
export class PhotoError extends Error {
	constructor(readonly kind: 'unreadable') {
		super(`Photos: ${kind}`);
		this.name = 'PhotoError';
	}
}

// The browser's copy of the bucket name. src/lib/supabase.ts keeps the build's copy: importing
// either way would drag build-only or browser-only code across.
const BUCKET = 'product-photos';
// The largest public rendition is 800 px square (product page), so 1000 keeps a margin for the
// square crop. The long side limit keeps panoramas small.
const MAX_SHORT_SIDE = 1000;
const MAX_LONG_SIDE = 2000;
const JPEG_QUALITY = 0.8;

// Paths follow the rule a-z0-9-. only (supabase/photos.sql), so they need no encoding.
function objectPath(path: string): string {
	return `/storage/v1/object/${BUCKET}/${path}`;
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
	return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
}

// Shrinks a phone photo before it travels: shorter side at most 1000 px, never enlarged, as
// JPEG. Re-encoding drops the EXIF metadata (the GPS location too) and turns HEIC into JPEG.
export async function preparePhoto(file: File): Promise<Blob> {
	let bitmap: ImageBitmap | undefined;
	try {
		// Applies the EXIF orientation by default (imageOrientation: "from-image").
		bitmap = await createImageBitmap(file);
		const shortSide = Math.min(bitmap.width, bitmap.height);
		const longSide = Math.max(bitmap.width, bitmap.height);
		if (shortSide === 0) throw new PhotoError('unreadable');
		const scale = Math.min(1, MAX_SHORT_SIDE / shortSide, MAX_LONG_SIDE / longSide);
		const canvas = document.createElement('canvas');
		canvas.width = Math.max(1, Math.round(bitmap.width * scale));
		canvas.height = Math.max(1, Math.round(bitmap.height * scale));
		const context = canvas.getContext('2d');
		if (!context) throw new PhotoError('unreadable');
		// White first, so a transparent PNG does not turn black as JPEG.
		context.fillStyle = 'white';
		context.fillRect(0, 0, canvas.width, canvas.height);
		context.imageSmoothingQuality = 'high';
		context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
		const photo = await toBlob(canvas);
		if (!photo) throw new PhotoError('unreadable');
		return photo;
	} catch {
		// A format this browser cannot decode (for example HEIC on Android), or too little memory.
		throw new PhotoError('unreadable');
	} finally {
		bitmap?.close();
	}
}

// A new name for every upload, so no cache can ever serve an old photo. Never from the clock.
export function photoPath(id: string): string {
	const bytes = crypto.getRandomValues(new Uint8Array(4));
	const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
	return `${id}-${hex}.jpg`;
}

// Storage answers errors as JSON { statusCode, error, message }. Older versions answer an RLS
// refusal with 400 and statusCode "403".
async function errorBody(response: Response): Promise<{ statusCode?: unknown; error?: unknown }> {
	if (!response.headers.get('Content-Type')?.includes('application/json')) return {};
	try {
		return (await response.json()) as { statusCode?: unknown; error?: unknown };
	} catch {
		return {};
	}
}

// The same kinds as a product write, so the page keeps one table of messages.
async function photoFailure(method: string, path: string, response: Response): Promise<ProductError> {
	const body = await errorBody(response);
	if (response.status === 403 || String(body.statusCode) === '403') return new ProductError('forbidden');
	const error = typeof body.error === 'string' ? body.error : 'no error';
	console.error(`[photos] ${method} ${path} failed with status ${response.status} (${error})`);
	if (response.status >= 400 && response.status < 500) return new ProductError('system');
	return new ProductError('unknown');
}

// Uploads the prepared photo under a new path and returns that path. Never overwrites.
export async function uploadPhoto(id: string, photo: Blob): Promise<string> {
	const path = photoPath(id);
	const body = new FormData();
	body.append('file', photo, path);
	const response = await authFetch(objectPath(path), { method: 'POST', body });
	if (response.status !== 200) throw await photoFailure('POST', path, response);
	return path;
}

// Cleanup only: it never throws. A file left behind harms nobody, because visitors never load
// photos from Supabase (spec 0013), so a failure is only logged.
export async function deletePhoto(path: string): Promise<void> {
	try {
		const response = await authFetch(objectPath(path), { method: 'DELETE' });
		// A missing file answers HTTP 400 with `statusCode: "404"` in the body (spec 0017, T1).
		if (response.ok || response.status === 404 || String((await errorBody(response)).statusCode) === '404') return;
		console.error(`[photos] DELETE ${path} failed with status ${response.status}`);
	} catch (error) {
		console.error(`[photos] DELETE ${path} failed (${error instanceof AuthError ? error.kind : 'unknown'})`);
	}
}

// The current photo for the admin preview. The page passes its configured Supabase URL.
export function publicPhotoUrl(supabaseUrl: string, path: string): string {
	return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
}

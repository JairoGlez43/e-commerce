import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';

// /build.json (spec 0016): when this build ran and which catalog it shows. Written once at build,
// like every page. The admin polls it to tell when a publish is live; it holds only these two
// timestamps. In `pnpm dev` it is answered per request, so local status always looks finished.
export const GET = (async () => {
	const state = await getEntry('catalogState', 'current');
	if (!state) throw new Error('build.json: the catalogState collection has no "current" entry.');
	return Response.json({ builtAt: new Date().toISOString(), catalogChangedAt: state.data.changedAt });
}) satisfies APIRoute;

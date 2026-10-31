// Weight budget check (spec 0001 AC7): measures every built page in dist/ and exits 1 when one
// is over budget. Node built-ins only. Run after `pnpm build`: `pnpm check:weight [distDir]`.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// Budget per page, in KB (spec 0001, "Weight budget"). HTML, CSS and JS are measured gzipped;
// fonts and images are already compressed formats, so their file size is what travels.
// The two photo limits were raised for real phone photos (spec 0017).
const BUDGET = {
	htmlCss: 50,
	js: 5,
	fontFile: 25,
	fontFiles: 1,
	thumbnail: 30,
	detailPhoto: 90,
	firstView: 150,
};

// The owner's admin (/admin/) is the only route allowed client JS (spec 0012), so it gets its
// own JS limit (spec 0014). HTML+CSS, fonts and images keep the public limits.
const ADMIN_BUDGET = { ...BUDGET, js: 15 };
const isAdminRoute = (route) => route.startsWith('/admin/');

const dist = process.argv[2] ?? 'dist';
if (!fs.existsSync(dist)) {
	console.error(`No ${dist}/ folder. Run \`pnpm build\` first.`);
	process.exit(1);
}

const kb = (bytes) => bytes / 1024;
const gzipSize = (buffer) => zlib.gzipSync(buffer).length;
// An <img> with no src yet (the admin's photo preview, filled by its script, spec 0017) loads
// nothing at page load, so it counts 0.
const fileSize = (url) => (url ? fs.statSync(path.join(dist, url)).size : 0);

function findPages(dir) {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) return findPages(full);
		return entry.name.endsWith('.html') ? [full] : [];
	});
}

// The largest file an <img> can request: the widest srcset candidate, or src if there is none.
function largestImage(imgTag) {
	const srcset = imgTag.match(/srcset="([^"]+)"/)?.[1];
	if (!srcset) return imgTag.match(/src="([^"]+)"/)?.[1];
	const candidates = srcset.split(',').map((part) => {
		const [url, width] = part.trim().split(/\s+/);
		return { url, width: Number.parseInt(width, 10) || 0 };
	});
	return candidates.sort((a, b) => b.width - a.width)[0].url;
}

function measure(file) {
	const html = fs.readFileSync(file, 'utf8');
	const route = '/' + path.relative(dist, file).split(path.sep).join('/').replace(/index\.html$/, '');

	const cssFiles = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map((m) => m[1]);
	const htmlCss = gzipSize(Buffer.from(html)) + cssFiles.reduce((sum, url) => sum + gzipSize(fs.readFileSync(path.join(dist, url))), 0);

	const jsFiles = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
	const inlineJs = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('');
	const js =
		jsFiles.reduce((sum, url) => sum + gzipSize(fs.readFileSync(path.join(dist, url))), 0) +
		(inlineJs ? gzipSize(Buffer.from(inlineJs)) : 0);

	const fonts = [...new Set([...html.matchAll(/["'(]([^"'()]+\.woff2)["')]/g)].map((m) => m[1]))];
	const fontSizes = fonts.map(fileSize);

	// Product pages show one detail photo; every other page shows catalog thumbnails (spec 0001).
	const isProduct = route.startsWith('/producto/');
	const images = [...html.matchAll(/<img[^>]*>/g)].map((m) => ({
		size: fileSize(largestImage(m[0])),
		eager: /loading="eager"/.test(m[0]),
	}));
	const imageLimit = isProduct ? BUDGET.detailPhoto : BUDGET.thumbnail;
	const largest = Math.max(0, ...images.map((image) => image.size));
	const firstView = images.filter((image) => image.eager).reduce((sum, image) => sum + image.size, 0);

	const failures = [];
	const budget = isAdminRoute(route) ? ADMIN_BUDGET : BUDGET;
	if (kb(htmlCss) > budget.htmlCss) failures.push(`HTML+CSS ${kb(htmlCss).toFixed(1)} > ${budget.htmlCss} KB`);
	if (kb(js) > budget.js) failures.push(`JS ${kb(js).toFixed(1)} > ${budget.js} KB`);
	if (fonts.length > BUDGET.fontFiles) failures.push(`${fonts.length} font files > ${BUDGET.fontFiles}`);
	if (fontSizes.some((size) => kb(size) > BUDGET.fontFile)) failures.push(`font file > ${BUDGET.fontFile} KB`);
	if (kb(largest) > imageLimit) failures.push(`image ${kb(largest).toFixed(1)} > ${imageLimit} KB`);
	if (kb(firstView) > BUDGET.firstView) failures.push(`first view ${kb(firstView).toFixed(1)} > ${BUDGET.firstView} KB`);

	return {
		page: route,
		'HTML+CSS': kb(htmlCss).toFixed(1),
		JS: kb(js).toFixed(1),
		font: kb(Math.max(0, ...fontSizes)).toFixed(1),
		'max img': `${kb(largest).toFixed(1)} / ${imageLimit}`,
		'1st view': kb(firstView).toFixed(1),
		result: failures.length ? `FAIL: ${failures.join('; ')}` : 'ok',
	};
}

const rows = findPages(dist).sort().map(measure);
console.log(`Weight budget (KB): HTML+CSS ≤ ${BUDGET.htmlCss} gz · JS ≤ ${BUDGET.js} gz · font ≤ ${BUDGET.fontFile} · thumbnail ≤ ${BUDGET.thumbnail} · detail photo ≤ ${BUDGET.detailPhoto} · first view ≤ ${BUDGET.firstView}`);
console.log(`Admin (/admin/): HTML+CSS ≤ ${ADMIN_BUDGET.htmlCss} gz · JS ≤ ${ADMIN_BUDGET.js} gz`);
console.table(rows);

const failed = rows.filter((row) => row.result !== 'ok');
if (failed.length) {
	console.error(`${failed.length} page(s) over budget.`);
	process.exit(1);
}
console.log(`All ${rows.length} pages within budget.`);

// The only place that knows how to read the catalog from Supabase (spec 0013).
// It runs at build time only: visitors get static pages and never call Supabase.

export interface CategoryRow {
	id: string;
	name: string;
	sort_order: number;
}

export interface ProductRow {
	id: string;
	name: string;
	category_id: string;
	price: number;
	unit: string;
	in_stock: boolean;
	description: string;
	// null until feature 14 uploads a photo (spec 0015).
	photo_path: string | null;
}

// The build's copy of the bucket name. src/lib/photos.ts keeps the browser's copy (spec 0017).
const PHOTO_BUCKET = 'product-photos';
// PostgREST's default limit per request; a full page could mean the catalog was cut off.
const MAX_ROWS = 1000;

// Both values are public by design but kept out of the repo, like WHATSAPP_NUMBER.
// Errors name the variable, never its value. A bad value stops the build.
// The admin page also calls it at build to hand both values to its script (spec 0014).
export function supabaseConfig(): { url: string; key: string } {
	const url = import.meta.env.SUPABASE_URL;
	const key = import.meta.env.SUPABASE_PUBLISHABLE_KEY;
	if (!url || !/^https:\/\/[^/\s]+$/.test(url)) {
		throw new Error(
			'SUPABASE_URL must be the project URL only, like https://<ref>.supabase.co (no /rest/v1, no trailing slash). See .env.example.',
		);
	}
	if (key?.startsWith('sb_secret_')) {
		throw new Error('SUPABASE_PUBLISHABLE_KEY holds a secret key. Use the publishable key (sb_publishable_…).');
	}
	if (!key?.startsWith('sb_publishable_')) {
		throw new Error('SUPABASE_PUBLISHABLE_KEY must be the project publishable key (sb_publishable_…). See .env.example.');
	}
	return { url, key };
}

// Reads every row of a table through the REST API. Fails on anything but a full, non-empty
// answer: a missing grant or policy returns [] with status 200, which would publish an empty shop.
async function readTable<Row>(table: string, columns: string): Promise<Row[]> {
	const { url, key } = supabaseConfig();
	let response: Response;
	try {
		response = await fetch(`${url}/rest/v1/${table}?select=${columns}`, { headers: { apikey: key } });
	} catch (error) {
		throw new Error(`Supabase: could not reach the project to read "${table}".`, { cause: error });
	}
	if (!response.ok) {
		throw new Error(`Supabase: reading "${table}" failed with status ${response.status}.`);
	}
	const rows = (await response.json()) as Row[];
	if (rows.length === 0) {
		throw new Error(`Supabase: "${table}" returned no rows. Check the data and its read policy.`);
	}
	if (rows.length >= MAX_ROWS) {
		throw new Error(`Supabase: "${table}" returned ${rows.length} rows, the most one request allows.`);
	}
	return rows;
}

// When the catalog last changed, stamped by a trigger in Supabase (spec 0016). Kept exactly as
// PostgREST returned it: the admin compares it as a string with the one in /build.json.
// Read once per build, and always before the tables below, so the stamp is never newer than the
// data in the build. An edit made during a build then still shows as pending.
let catalogChangedAt: Promise<string> | undefined;
export function readCatalogChangedAt(): Promise<string> {
	// readTable() already refused an empty answer, so the one row is there.
	catalogChangedAt ??= readTable<{ changed_at: string }>('catalog_state', 'changed_at').then(
		([row]) => row!.changed_at,
	);
	return catalogChangedAt;
}

// Shared by both loaders, so categories are fetched once per build.
let categoryRows: Promise<CategoryRow[]> | undefined;
export function readCategories(): Promise<CategoryRow[]> {
	categoryRows ??= readCatalogChangedAt().then(() => readTable<CategoryRow>('categories', 'id,name,sort_order'));
	return categoryRows;
}

// reference() alone only logs an unknown category and the build still exits 0 (spec 0004),
// so every product's category is checked here, where a throw fails the build.
export async function readProducts(): Promise<ProductRow[]> {
	await readCatalogChangedAt();
	const [categories, products] = await Promise.all([
		readCategories(),
		readTable<ProductRow>('products', 'id,name,category_id,price,unit,in_stock,description,photo_path'),
	]);
	const categoryIds = new Set(categories.map((category) => category.id));
	for (const product of products) {
		if (!categoryIds.has(product.category_id)) {
			throw new Error(`Supabase: product "${product.id}" has unknown category id "${product.category_id}".`);
		}
	}
	return products;
}

// Public URL of a photo in the bucket; astro:assets downloads and optimizes it at build.
export function photoUrl(path: string): string {
	return `${supabaseConfig().url}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
}

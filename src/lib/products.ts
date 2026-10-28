// The owner's product reads and writes through the Supabase REST API (PostgREST), with plain
// fetch and no SDK (spec 0015). Browser only: imported by the admin page's script. The single
// home of the form's field rules and of the id rule. What really protects the data is RLS with
// public.is_owner() (supabase/products-write.sql); these rules only give Spanish messages first.
import { authFetch } from './auth';
// Type-only: nothing from supabase.ts (build-time code) reaches the browser bundle.
import type { CategoryRow, ProductRow } from './supabase';

// What the form edits. Never `id` (fixed once added) and never `photo_path` (feature 14).
export type ProductFields = Pick<ProductRow, 'name' | 'category_id' | 'price' | 'unit' | 'in_stock' | 'description'>;

// The form's values as typed, before checkFields().
export interface RawFields {
	name: string;
	category_id: string;
	price: string;
	unit: string;
	description: string;
	in_stock: boolean;
}

export type FieldName = Exclude<keyof RawFields, 'in_stock'>;

export interface FieldProblem {
	field: FieldName;
	message: string;
}

export type ProductErrorKind = 'exists' | 'noCategory' | 'invalid' | 'forbidden' | 'gone' | 'system' | 'unknown';

// Every function here throws only this or an AuthError from authFetch(), passed through
// unchanged. The page turns `kind` into a Spanish message.
export class ProductError extends Error {
	constructor(readonly kind: ProductErrorKind) {
		super(`Products: ${kind}`);
		this.name = 'ProductError';
	}
}

// The limits mirror supabase/schema.sql and spec 0004.
const MAX_NAME = 60;
const MAX_UNIT = 30;
const MAX_DESCRIPTION = 300;
const MAX_ID = 60;
// The largest Postgres integer.
const MAX_PRICE = 2_147_483_647;

const HEADERS = { 'Content-Type': 'application/json', Prefer: 'return=representation' };
const PRODUCT_COLUMNS = 'id,name,category_id,price,unit,in_stock,description,photo_path';

// --- Rules ------------------------------------------------------------------------------

// Postgres char_length counts code points, not UTF-16 units like String.length.
function length(text: string): number {
	return [...text].length;
}

// Every text value is trimmed first. Returns the clean fields or one message per bad field.
export function checkFields(
	raw: RawFields,
	categoryIds: readonly string[],
): { fields: ProductFields } | { problems: FieldProblem[] } {
	const name = raw.name.trim();
	const categoryId = raw.category_id.trim();
	const unit = raw.unit.trim();
	const description = raw.description.trim();
	// es-ES writes thousands with a dot ("12.500 CUP"), so dots are dropped. A comma is never a
	// decimal here, so "12,5" stays refused.
	const priceText = raw.price.replace(/[\s.]/g, '');
	const price = Number(priceText);

	const problems: FieldProblem[] = [];
	if (length(name) < 1 || length(name) > MAX_NAME) {
		problems.push({ field: 'name', message: 'Escribe el nombre del producto.' });
	} else if (!/[\p{L}\p{N}]/u.test(name)) {
		problems.push({ field: 'name', message: 'El nombre necesita al menos una letra o un número.' });
	}
	if (!categoryIds.includes(categoryId)) {
		problems.push({ field: 'category_id', message: 'Elige una categoría.' });
	}
	if (!/^\d+$/.test(priceText) || price < 1 || price > MAX_PRICE) {
		problems.push({ field: 'price', message: 'El precio debe ser un número entero mayor que 0, sin decimales.' });
	}
	if (length(unit) < 1 || length(unit) > MAX_UNIT) {
		problems.push({ field: 'unit', message: 'Escribe la unidad, por ejemplo «paquete de 1 kg».' });
	}
	if (length(description) < 1 || length(description) > MAX_DESCRIPTION) {
		problems.push({ field: 'description', message: 'Escribe una descripción corta.' });
	}
	if (problems.length > 0) return { problems };
	return { fields: { name, category_id: categoryId, price, unit, in_stock: raw.in_stock, description } };
}

// The URL slug, from the name when the product is added. It never changes afterwards, so links
// already shared in WhatsApp keep working after a rename.
export function productId(name: string, takenIds: Iterable<string>): string {
	const base = name
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, MAX_ID)
		.replace(/-+$/, '');
	const taken = new Set(takenIds);
	let id = base;
	for (let suffix = 2; taken.has(id); suffix++) id = `${base}-${suffix}`;
	return id;
}

// Only what differs from the stored row goes in a PATCH.
export function changedFields(row: ProductRow, fields: ProductFields): Partial<ProductFields> {
	const changes: Partial<ProductFields> = {};
	for (const key of Object.keys(fields) as (keyof ProductFields)[]) {
		if (fields[key] !== row[key]) Object.assign(changes, { [key]: fields[key] });
	}
	return changes;
}

// The admin list: categories in sort_order, products A–Z by name inside each, empty categories
// skipped. Not the catalog's "in stock first": a row must not jump when its stock is switched.
export function groupProducts(
	categories: readonly CategoryRow[],
	products: readonly ProductRow[],
): { category: CategoryRow; products: ProductRow[] }[] {
	return [...categories]
		.sort((a, b) => a.sort_order - b.sort_order)
		.map((category) => ({
			category,
			products: products
				.filter((product) => product.category_id === category.id)
				.sort((a, b) => a.name.localeCompare(b.name, 'es')),
		}))
		.filter((group) => group.products.length > 0);
}

// --- Requests ---------------------------------------------------------------------------

// Reads the JSON body's code only when the answer says it is JSON.
async function errorCode(response: Response): Promise<string | undefined> {
	if (!response.headers.get('Content-Type')?.includes('application/json')) return undefined;
	try {
		const body = (await response.json()) as { code?: unknown };
		return typeof body.code === 'string' ? body.code : undefined;
	} catch {
		return undefined;
	}
}

async function failure(method: string, path: string, response: Response): Promise<ProductError> {
	const code = await errorCode(response);
	if (response.status === 409 && code === '23505') return new ProductError('exists');
	if (response.status === 409 && code === '23503') return new ProductError('noCategory');
	// A real refusal by RLS. authFetch() already refreshed and retried an expired token (401).
	if (response.status === 403 && code === '42501') return new ProductError('forbidden');
	console.error(`[products] ${method} ${path.split('?')[0]} failed with status ${response.status} (${code ?? 'no code'})`);
	// Postgres classes 22 (data) and 23 (rules) mean the data sent was wrong. Any other 4xx is a
	// fault the owner cannot fix from the form (spec 0015, amended 2026-10-28).
	if (response.status === 400 && (code?.startsWith('22') || code?.startsWith('23'))) return new ProductError('invalid');
	if (response.status >= 400 && response.status < 500) return new ProductError('system');
	return new ProductError('unknown');
}

async function send<Row>(path: string, init: RequestInit = {}, expected = 200): Promise<Row[]> {
	const response = await authFetch(path, { ...init, headers: HEADERS });
	if (response.status !== expected) throw await failure(init.method ?? 'GET', path, response);
	return (await response.json()) as Row[];
}

// A PATCH or DELETE that matches no row answers 200 with [] (also when RLS hides the row), so
// every one checks that exactly one row came back.
function onlyRow<Row>(rows: Row[]): Row {
	const [row] = rows;
	if (rows.length !== 1 || row === undefined) throw new ProductError('gone');
	return row;
}

function rowPath(id: string): string {
	return `/rest/v1/products?id=eq.${encodeURIComponent(id)}`;
}

export function listCategories(): Promise<CategoryRow[]> {
	return send<CategoryRow>('/rest/v1/categories?select=id,name,sort_order&order=sort_order.asc');
}

export function listProducts(): Promise<ProductRow[]> {
	return send<ProductRow>(`/rest/v1/products?select=${PRODUCT_COLUMNS}&order=name.asc`);
}

// The id is the only thing the admin ever sets besides the fields; photo_path stays null.
export async function addProduct(fields: ProductFields, takenIds: Iterable<string>): Promise<ProductRow> {
	const body = { id: productId(fields.name, takenIds), ...fields };
	const rows = await send<ProductRow>('/rest/v1/products', { method: 'POST', body: JSON.stringify(body) }, 201);
	const [row] = rows;
	if (row === undefined) throw new ProductError('unknown');
	return row;
}

export async function updateProduct(id: string, fields: Partial<ProductFields>): Promise<ProductRow> {
	return onlyRow(await send<ProductRow>(rowPath(id), { method: 'PATCH', body: JSON.stringify(fields) }));
}

export function setStock(id: string, inStock: boolean): Promise<ProductRow> {
	return updateProduct(id, { in_stock: inStock });
}

export async function deleteProduct(id: string): Promise<void> {
	onlyRow(await send<ProductRow>(rowPath(id), { method: 'DELETE' }));
}

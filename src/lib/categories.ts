// The owner's category reads and writes through the Supabase REST API (PostgREST), with plain
// fetch and no SDK (spec 0018). Browser only: imported by the admin page's script. The single
// home of the category requests and of the name rules. What really protects the data is RLS
// with public.is_owner() (supabase/categories-write.sql); the rules only give Spanish messages.
import { productId } from './products';
import { onlyRow, RestError, send } from './rest';
// Type-only: nothing from supabase.ts (build-time code) reaches the browser bundle.
import type { CategoryRow } from './supabase';

// The limit mirrors supabase/schema.sql.
const MAX_NAME = 30;

// --- Rules ------------------------------------------------------------------------------

// Two names are the same when they differ only in case, accents or repeated spaces.
function nameKey(name: string): string {
	return name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

// The name is trimmed first. `ownId` is the edited category, so it may keep its own name with
// other capitals. Returns the clean name or the form's message.
export function checkCategoryName(
	raw: string,
	categories: readonly CategoryRow[],
	ownId?: string,
): { name: string } | { message: string } {
	const name = raw.trim();
	// Postgres char_length counts code points, not UTF-16 units like String.length.
	const size = [...name].length;
	if (size < 1) return { message: 'Escribe el nombre de la categoría.' };
	if (size > MAX_NAME) return { message: 'El nombre puede tener 30 caracteres como máximo.' };
	if (!/[\p{L}\p{N}]/u.test(name)) return { message: 'El nombre necesita al menos una letra o un número.' };
	// The id comes from the name, so a name with no Latin letter or digit would give an empty id.
	if (productId(name, []) === '') return { message: 'El nombre necesita al menos una letra (a–z) o un número.' };
	const key = nameKey(name);
	if (categories.some((category) => category.id !== ownId && nameKey(category.name) === key)) {
		return { message: 'Ya hay una categoría con ese nombre.' };
	}
	return { name };
}

// --- Requests ---------------------------------------------------------------------------

// Every request goes through send() in rest.ts, which throws a RestError or an AuthError.
function rowPath(id: string): string {
	return `/rest/v1/categories?id=eq.${encodeURIComponent(id)}`;
}

export function listCategories(): Promise<CategoryRow[]> {
	return send<CategoryRow>('/rest/v1/categories?select=id,name,sort_order&order=sort_order.asc');
}

// The id comes from the name and never changes afterwards, so shared links survive a rename.
// The new category goes last. The list is never empty (the build refuses an empty table); if it
// were, the first sort_order would be 0.
export async function addCategory(name: string, categories: readonly CategoryRow[]): Promise<CategoryRow> {
	const id = productId(name, categories.map((category) => category.id));
	const sortOrder = Math.max(-1, ...categories.map((category) => category.sort_order)) + 1;
	const rows = await send<CategoryRow>(
		'/rest/v1/categories',
		{ method: 'POST', body: JSON.stringify({ id, name, sort_order: sortOrder }) },
		201,
	);
	const [row] = rows;
	if (row === undefined) throw new RestError('unknown');
	return row;
}

// Only the name: the admin never sends `id` in a PATCH.
export async function renameCategory(id: string, name: string): Promise<CategoryRow> {
	return onlyRow(await send<CategoryRow>(rowPath(id), { method: 'PATCH', body: JSON.stringify({ name }) }));
}

// Exchanges the sort_order of two rows in one upsert: one statement, so both change or neither
// does. `name` goes too, because the insert half of an upsert needs every not null column.
// TODO(spec 0018 T3): 201 is a placeholder until T3 measures the real status.
export function swapCategories(a: CategoryRow, b: CategoryRow): Promise<CategoryRow[]> {
	return send<CategoryRow>(
		'/rest/v1/categories',
		{
			method: 'POST',
			headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
			body: JSON.stringify([
				{ id: a.id, name: a.name, sort_order: b.sort_order },
				{ id: b.id, name: b.name, sort_order: a.sort_order },
			]),
		},
		201,
	);
}

// Moves every product of one category to another. Any count is fine, none too: a second try
// after a half done delete finds the category already empty. `select=id` keeps the answer small.
export async function moveProducts(fromId: string, toId: string): Promise<string[]> {
	const rows = await send<{ id: string }>(
		`/rest/v1/products?category_id=eq.${encodeURIComponent(fromId)}&select=id`,
		{ method: 'PATCH', body: JSON.stringify({ category_id: toId }) },
	);
	return rows.map((row) => row.id);
}

// Refused with `reference` while any product still points to the category (on delete restrict).
export async function deleteCategory(id: string): Promise<void> {
	onlyRow(await send<CategoryRow>(rowPath(id), { method: 'DELETE' }));
}

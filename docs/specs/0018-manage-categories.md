# 0018 · Manage categories

**Date**: 2026-10-31
**Status**: In Progress
<!-- Proposed → In Progress → Accepted · Assumed (recorded by /develop, awaiting ratification) · Superseded by NNNN -->
**Scope**: `docs/scope/scope.md` → feature 15
**Amends**: spec 0015 (its request helpers and error class move to a shared `src/lib/rest.ts`;
`listCategories()` moves to `src/lib/categories.ts`; the error kind `noCategory` becomes
`reference`). Product behavior does not change.

## Summary

You, the shop owner, can add, rename, reorder and delete product categories from `/admin/` on
your phone. A category that still has products is deleted only after you choose where its
products go: the page moves them first, then deletes the category. The order is changed with
"Subir" and "Bajar" buttons, one tap saves it. The request code shared with products moves to
one new file, `src/lib/rest.ts`, so both features use the same requests and error messages.

## Context

The owner manages products from `/admin/` (spec 0015), but the six categories came from the
seed (spec 0013) and only the developer can change them, in the Supabase dashboard. A shop
that starts selling fruit, or wants "Bebidas" before "Aseo", has to call the developer. That
breaks the promise of the "Autónomo" package: the owner manages the whole catalog alone.

What already exists and shapes the problem:
- The table `categories (id, name, sort_order)` is public to read, and nobody can write to it
  through the API: it has no write policies (spec 0013).
- `products.category_id` points to `categories.id` with `on delete restrict` (a foreign key that
  refuses to delete a category while any product still points to it). Spec 0013 left this rule
  for this feature to build on.
- The public site already follows the data at each build: chips and sections come from
  `getCatalog()` in `sort_order`, and a category with no products gets no chip, no section and
  no page (spec 0005, AC11). The trigger `touch_catalog()` already marks the catalog as changed
  after any write to `categories` (spec 0016).
- There is always at least one product (spec 0015, AC6), so there is always at least one
  category with products. The build refuses an empty table (spec 0013).
- The admin's request code (`send()`, `failure()`, `onlyRow()`, `ProductError`) lives in
  `src/lib/products.ts` and is private to it.

Forces: connections in Cuba are slow and drop mid request, so any write that touches several
rows must leave the data usable if it stops halfway. The admin JS has a 15 KB gzipped limit
(spec 0014), and today it measures 7.5 KB. Links to `/categoria/<id>` are shared in WhatsApp
groups.

## Requirements

**User stories**:
- As the shop owner, I want to add a category so that I can sell a new kind of product.
- As the shop owner, I want to rename a category so that the menu says what I sell, without
  breaking links I already shared.
- As the shop owner, I want to move a category up or down so that customers see the most
  important ones first.
- As the shop owner, I want to delete a category I no longer use, choosing where its products
  go, so that no product is lost.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: After `supabase/categories-write.sql` runs in the SQL editor:
  - a `POST`, `PATCH` or `DELETE` on `categories` with only the publishable key is refused;
  - in the SQL editor, an insert run as `authenticated` with JWT claims that have no
    `app_metadata.role` fails with `42501`. Run with the owner's claims, the same insert works
    and is then rolled back.
- **AC-2**: On a 360 px screen, the signed in view shows a "Categorías" section after
  "Productos", with every category (empty ones too) in `sort_order`.
  - Each row shows the name as a button (link style, opens the form), a `text-sm text-muted`
    line "1 producto", "<N> productos" or "Vacía: no se ve en la web", and the buttons "Subir"
    and "Bajar". Every target is at least 44 px.
  - The first row's "Subir" and the last row's "Bajar" are disabled.
  - The section is hidden while categories and products load, on the first load and on every
    reload, and shows again when the load succeeds. Loading and load errors keep using the
    product list's status line and its "Reintentar" button (spec 0015).
- **AC-3**: "Añadir categoría" opens an empty form. Saving a valid name creates the row:
  - its id comes from the name, for example "Frutas y viandas" → `frutas-y-viandas`. A name
    whose id is taken gets `-2`, `-3`…;
  - its `sort_order` is the largest loaded `sort_order` plus 1, so it shows last in the list,
    marked "Vacía: no se ve en la web";
  - it shows at once in the product form's "Categoría" list.
- **AC-4**: Tapping a category's name opens the form filled with its name, plus the line
  "Enlace: /categoria/<id>". Saving a new name updates the categories list, the product list's
  group heading and the product form's "Categoría" list. After a page reload the new name is
  still there and the id is unchanged. Saving a name identical to the stored one (after
  trimming) sends no request and returns to the list; a change of capitals only is sent.
- **AC-5**: The form refuses, with the message in Feature design and with no request in the
  network panel:
  - an empty name (or only spaces);
  - a name with no letter or digit (for example "!!!");
  - a name with no Latin letter (a to z, accents allowed) or digit, which would give an empty
    id (for example "日本");
  - a name equal to another category's name, ignoring case, accents and repeated inner spaces
    (for example "lacteos  Y HUEVOS" when "Lácteos y huevos" exists).
  Leading and trailing spaces are removed before checking and saving. Saving a category under
  its own name with other capitals ("bebidas" → "Bebidas") is allowed. The field has
  `maxlength=30`.
- **AC-6**: Tapping "Bajar" on a category swaps it with the next one, and "Subir" with the
  previous one (for example "Bajar" on the first, "Subir" on the last):
  - the network panel shows one `POST` to `/rest/v1/categories`;
  - every "Subir" and "Bajar" button is disabled until the answer arrives;
  - the categories list and the product list groups show the new order;
  - after a page reload the order is kept;
  - if the save fails for any reason, the section shows the error message and both lists load
    again, so the screen shows what the database really holds (the swap may have been saved
    with only its answer lost).
- **AC-7**: In the form of a category with no products, "Borrar categoría" shows "¿Borrar
  «<name>»? No se puede deshacer." with "Sí, borrar" and "No, volver".
  - "No, volver" changes nothing.
  - "Sí, borrar" deletes the row and returns to the list without it, with "Categoría borrada."
    in the section's status line.
- **AC-8**: In the form of a category with products, "Borrar categoría" shows "«<name>» tiene
  <N> productos. Elige adónde moverlos antes de borrarla." (or "tiene 1 producto"), a
  "Mover a" list with "Elige una categoría" (empty value) first and then every other category,
  "Mover y borrar" and "No, volver".
  - "Mover y borrar" with no choice shows "Elige una categoría." on the list and sends nothing.
  - With a choice, it moves every product of that category to the chosen one, then deletes the
    category. Categories and products load again, the moved products show under the chosen
    category, and the status line says "Productos movidos a «<chosen name>». Categoría
    borrada.".
- **AC-9**: When only one category exists, "Borrar categoría" is replaced by "No puedes borrar
  la única categoría." and no request is sent.
- **AC-10**: Failures keep the owner's work and say what happened:
  - with the network off, saving the form shows the offline message of spec 0014 and the form
    keeps the name;
  - products were moved but the delete failed (offline, `rate`, `forbidden`, `system` or
    `unknown`): "Los productos ya están en «<chosen name>», pero «<name>» no se borró.
    Inténtalo otra vez." This replaces the offline message. Both lists load again, and the
    category shows as "Vacía: no se ve en la web". After a move, `reference`, `gone` and
    `signedOut` keep their own handling below;
  - a product was added to the category elsewhere after the list loaded, so the delete is
    refused (`409` `23503`): "Esta categoría todavía tiene productos. La lista se ha
    actualizado." and both lists load again;
  - the category, or the chosen "Mover a" category, was deleted in the dashboard while the form
    was open: "Esta categoría ya no existe. La lista se ha actualizado." and both lists load
    again;
  - a refused session (`signedOut`) shows the sign in view with its message (spec 0014).
- **AC-11**: Products work as before the move of the request code to `src/lib/rest.ts`: the
  spec 0015 flows (list, add, edit, stock switch, delete) and its error messages, including
  the mocked cases of spec 0015 AC11, behave the same.
- **AC-12**: After a publish (spec 0016), the public site follows the categories:
  - a renamed category shows its new name on its chip, its section heading, its page `h1` and
    `<title>`, at the same `/categoria/<id>`;
  - chips and home sections follow the new order;
  - a deleted category has no chip and no page, and its products show under their new
    category;
  - a new category shows only once it has at least one product.
  No file under `src/pages/` other than `admin/index.astro`, and no file in `src/components/`,
  changes.
- **AC-13**: `pnpm typecheck`, `pnpm build` and `pnpm check:weight` pass. `/admin/` JS stays
  within its 15 KB gzipped limit. No public route has a `<script>` tag or contains
  `supabase.co` or `sb_publishable_`.

## Options considered

Each decision had its own options; the engineer chose each one in the design conversation.

### Option 1: Moving the products, then deleting the category with two requests (chosen)

A `PATCH` on `products` filtered by the old `category_id` moves every product, then a `DELETE`
on `categories` removes the row (basis: spec 0015, writes through PostgREST with RLS).

**Pros**:
- No new pattern: both are plain PostgREST writes like the ones products already use.
- If the second request fails, what remains is an empty category, which the public site already
  hides. Repeating "Borrar" finishes the job without asking for a target.

**Cons**:
- Not all or nothing: for a moment the data is in a middle state, and the owner sees a
  "half done" message when the second request fails.

### Option 2: One Postgres function called through RPC

A function `delete_category(from_id, to_id)` runs both statements in one transaction, called
with `POST /rest/v1/rpc/delete_category`.

**Pros**:
- All or nothing: the middle state never exists.

**Cons**:
- The project's first RPC: one more SQL file to paste in every new shop, and a function whose
  security (`security invoker` vs `definer`) needs its own review.
- The middle state it removes is harmless here.

### Option 3: Refuse to delete a category that has products

The database already refuses it (`on delete restrict`); the form would only explain it.

**Pros**:
- The least code and no middle state.

**Cons**:
- The owner moves products one by one through the product form, which is slow on a phone.
  Rejected by the engineer.

### Option 4: Reordering with one upsert, two PATCHes, or an RPC

"Subir" and "Bajar" swap the `sort_order` of two rows. One `POST` upsert (an insert that updates
the row when its id already exists) sends both rows in one statement (chosen). Two `PATCH`
requests are easier to read, but a failure between them leaves two categories with the same
number and an unstable order. An RPC swap function is all or nothing, with the costs of
Option 2.

**Pros (upsert)**:
- One trip instead of two on slow data, and both rows change or neither does (one statement;
  T3 confirms it).

**Cons (upsert)**:
- It needs the insert and update policies (and the public select policy that already exists),
  and it must send every `not null` column (`name` too), so a name renamed on another device in
  the meantime is overwritten. If the row was deleted elsewhere, the upsert creates it again.

## Decision

**Chosen option**: Option 1 for deleting, the upsert of Option 4 for reordering, both through
PostgREST with RLS and plain `fetch`.

The owner manages categories in a new "Categorías" section of `/admin/` and a category form
view. A new browser module, `src/lib/categories.ts`, is the single home of the category reads,
writes and name rules. The shared request code moves from `products.ts` to a new
`src/lib/rest.ts`. RLS with `public.is_owner()` is the real guard, through a new
`supabase/categories-write.sql`.

Decisions taken in the conversation (engineer's choices):
- **Delete with products:** ask where to move them, then delete (Option 1). A move target list
  with no choice made in advance.
- **Order:** "Subir" and "Bajar" buttons; one upsert per tap; every order button is disabled
  while a save runs.
- **Id:** from the name when the category is added, never changed. Links shared in WhatsApp keep
  working after a rename (basis: spec 0015, the same rule for products).
- **Duplicate names:** refused by the form, ignoring case and accents. No database constraint.
- **Screen:** a section plus a form view, like products. Each row shows its product count.
- **Code:** extract a shared `src/lib/rest.ts` (engineer's choice over exporting the helpers
  from `products.ts`).
- **Half done delete:** a clear message and a reload, no hidden retry. After a move and delete,
  categories and products load again.

Decisions taken while writing (recommended, with the runner up):
- **The error class becomes `RestError`, and the kind `noCategory` becomes `reference`.** A
  `409` `23503` means "a foreign key refused it": for a product it is a missing category, for a
  category delete it is "still has products". Each page context maps the kind to its own
  Spanish message. Runner up: keep `ProductError` and use it for categories (a misleading
  name).
- **`listCategories()` moves to `categories.ts`,** so it is the single home of category reads.
  Runner up: leave it in `products.ts` (fewer lines moved, two homes for category code).
- **The category id reuses `productId()` from `products.ts`** (the same slug rule). Runner up:
  move it to its own `slug.ts` (cleaner name, one more file and a refactor the scope does not
  need).
- **Moving and deleting are two exported functions,** `moveProducts()` and `deleteCategory()`,
  called in order by the page. So the page knows which step failed (AC-10). Runner up: one
  `removeCategory()` that throws a special error for the half done case (less readable).
- **The categories section has no loading or error state of its own:** it shows once the shared
  load succeeds; the product list's states cover it. Runner up: a second status line and
  "Reintentar" (duplicated UI for the same request).

## Rationale

The force that decides most of this design is the slow connection: a write can stop halfway.
For deleting, the middle state of two requests is an empty category, which the public site
already hides (spec 0005) and which one more tap removes. Paying for an RPC, the project's
first, a new SQL file in every shop and a new security review, to avoid a harmless state is
not worth it. For reordering, the middle state of two PATCHes is a tie in `sort_order`, which
makes the public order unstable; the upsert avoids it in one trip, at the cost of sending
`name` too. With one owner, the overwrite risk is the same "last save wins" that spec 0015
already accepts.

Everything else reuses what products proved: PostgREST writes through `authFetch()`, RLS with
`is_owner()` as the only real guard, rules in the form only for Spanish messages, `<template>`
plus `textContent` for rows, and the in page confirmation. Moving the request code to
`rest.ts` costs a careful refactor of `products.ts` now (AC-11 checks it), but gives both
features one place for requests and error mapping, so a third admin feature does not copy it.

The public site needs no change: it already rebuilds from the tables, drops empty categories,
and the trigger already marks a category write as unpublished.

## Feature design

**Data model sketch**:

| Table | Key | Fields | Relationship | Change |
|---|---|---|---|---|
| `categories` | `id` text, slug, fixed | `name` text not null, 1 to 30 · `sort_order` integer not null, ≥ 0 | 1 category : N products | New owner insert, update and delete policies |
| `products` | `id` | `category_id` → `categories.id`, `on delete restrict` | N : 1 | None. The move uses the existing owner update policy |

No new table, column or index. New file `supabase/categories-write.sql`, run once after
`photos.sql` (order for every new shop: `schema.sql` → `seed.sql` → `auth.sql` →
`products-write.sql` → `publish.sql` → `photos.sql` → `categories-write.sql`):
```sql
-- The owner's writes on categories (spec 0018). Reads stay public (schema.sql).
-- Only the owner may write: the grant opens the door to signed in users, and each policy lets
-- through only a JWT whose app_metadata.role is "owner" (public.is_owner(), auth.sql).
-- The reorder upsert needs insert and update, plus the public select policy of schema.sql.
grant insert, update, delete on table public.categories to authenticated;
create policy "owner inserts categories" on public.categories
  for insert to authenticated with check (public.is_owner());
create policy "owner updates categories" on public.categories
  for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "owner deletes categories" on public.categories
  for delete to authenticated using (public.is_owner());

-- AC-1 check (run, read the result, nothing is kept):
-- begin;
--   set local role authenticated;
--   set local request.jwt.claims = '{"app_metadata":{}}';
--   insert into public.categories (id, name, sort_order) values ('prueba', 'Prueba', 99);  -- expect 42501
-- rollback;
-- Repeat with '{"app_metadata":{"role":"owner"}}': the insert works, then rollback.
```

**State transitions**: none. A category exists or not; "empty" is derived from the products.

**API surface** (browser functions; every request goes through `authFetch()` with the
publishable key and the owner's token, so the auth column is "owner JWT, RLS `is_owner()`"
for every write and "public" for reads):

`src/lib/rest.ts` (new, moved from `products.ts` without behavior change):
- `class RestError extends Error { kind }`, kinds `exists | reference | invalid | forbidden |
  gone | system | unknown`. Same mapping as spec 0015's `failure()`: `409 23505` → `exists`,
  `409 23503` → `reference`, `403 42501` → `forbidden`, `400` with code class `22`/`23` →
  `invalid`, any other 4xx → `system`, anything else → `unknown`. `system` and `unknown` log
  method, path, status and code with `console.error`, prefix `[rest]`.
- `send<Row>(path, init?, expected = 200): Promise<Row[]>`: default headers
  `Content-Type: application/json` and `Prefer: return=representation`; `init.headers` is
  merged over them. A status other than `expected` throws `failure()`.
- `onlyRow<Row>(rows)`: exactly one row, else `RestError('gone')`.
- `products.ts` imports these; `ProductError` and `ProductErrorKind` are removed, and the admin
  page's product message map uses `RestError` kinds (`reference` keeps the message "Esa
  categoría ya no existe. La lista se ha actualizado.").

`src/lib/categories.ts` (new):

| Function | Request | Key inputs | Result | Key errors |
|---|---|---|---|---|
| `listCategories()` | `GET /rest/v1/categories?select=id,name,sort_order&order=sort_order.asc` | none | `CategoryRow[]` | `system`, `unknown`, `AuthError` |
| `addCategory(name, categories)` | `POST /rest/v1/categories`, body `{ id, name, sort_order }`, expects 201 | checked name, loaded list | the created row | `exists` (`409 23505`) |
| `renameCategory(id, name)` | `PATCH /rest/v1/categories?id=eq.<id>`, body `{ name }`, `onlyRow` | id, checked name | the updated row | `gone` (`200 []`) |
| `swapCategories(a, b)` | `POST /rest/v1/categories`, header `Prefer: resolution=merge-duplicates,return=representation`, body `[{ id: a.id, name: a.name, sort_order: b.sort_order }, { id: b.id, name: b.name, sort_order: a.sort_order }]`, expects the status T3 records | two neighbor rows | the two rows | `invalid`, `system` |
| `moveProducts(fromId, toId)` | `PATCH /rest/v1/products?category_id=eq.<fromId>&select=id`, body `{ category_id: toId }` (`select=id` keeps the answer small on slow data) | two ids | the moved ids (any count, `[]` allowed) | `reference` (`409 23503`, target gone) |
| `deleteCategory(id)` | `DELETE /rest/v1/categories?id=eq.<id>`, `onlyRow` | id | nothing | `reference` (`409 23503`, still has products), `gone` |
| `checkCategoryName(raw, categories, ownId?)` | none (pure) | typed name, loaded list, the edited row's id | `{ name }` or `{ message }` | none |

Ids in filters go through `encodeURIComponent`. `AuthError` (`offline`, `rate`, `signedOut`)
passes through unchanged, as in spec 0015.

Name rules (`checkCategoryName`), every value trimmed first, limits from `schema.sql`:

| Rule | Message |
|---|---|
| at least 1 character (code points) | Escribe el nombre de la categoría. |
| at most 30 characters (only reachable if `maxlength` is bypassed) | El nombre puede tener 30 caracteres como máximo. |
| at least one letter or digit (`/[\p{L}\p{N}]/u`) | El nombre necesita al menos una letra o un número. |
| `productId(name, [])` is not empty (a Latin letter, accents allowed, or a digit) | El nombre necesita al menos una letra (a–z) o un número. |
| no other category (all but `ownId`) has the same name after NFD, removing combining marks, lowercasing and collapsing inner spaces | Ya hay una categoría con ese nombre. |

Category messages in the admin page. The page keeps two named maps keyed by `RestError` kind,
`PRODUCT_MESSAGES` and `CATEGORY_MESSAGES`, and two reload sets, `PRODUCT_RELOAD_KINDS` and
`CATEGORY_RELOAD_KINDS`; `needsReload()` and `messageOf()` take the context. The catch inside
`loadCatalog()` uses the product map. Successes go to the categories section's status line,
errors to its alert line:

| Kind | Message | Then |
|---|---|---|
| `exists` | Ya existe una categoría con ese enlace. La lista se ha actualizado. | reload both lists |
| `reference` on `deleteCategory` | Esta categoría todavía tiene productos. La lista se ha actualizado. | reload both lists |
| `reference` on `moveProducts`, `gone` | Esta categoría ya no existe. La lista se ha actualizado. | reload both lists |
| `invalid` | Algún dato no es válido. Revisa el formulario. | stay |
| `forbidden` | Esta cuenta no puede cambiar el catálogo. | stay |
| `system` | Error del sistema, no es culpa tuya. Avisa a quien mantiene la web. | stay |
| `unknown` | Algo salió mal. Inténtalo otra vez. | stay |
| `AuthError` | spec 0014's messages | `signedOut` shows sign in |
| `deleteCategory` fails after `moveProducts` succeeded, with offline, `rate`, `forbidden`, `system` or `unknown` | Los productos ya están en «<chosen name>», pero «<name>» no se borró. Inténtalo otra vez. | reload both lists |
| any `swapCategories` failure | the kind's message above | reload both lists (AC-6) |

**`src/pages/admin/index.astro`** (still one processed `<script>`, no attributes, no framework;
it now also imports `src/lib/categories.ts`):
- **Categories section**, inside the signed in view after the products section, hidden until
  the shared load succeeds: `h2` "Categorías" with a primary button "Añadir categoría"; one
  `role="status"` and one `role="alert"` line; a `<ul>` of rows cloned from a `<template>` and
  filled with `textContent` only. Each row: the name button (`inline-flex min-h-11
  items-center`, link style), the count line, and "Subir" / "Bajar" buttons (`min-h-11`, border
  style), each with `<span class="sr-only"><name>: </span>` before its label.
- **Category form view** (`data-view="category"`, a new `<section>`, hidden like the others):
  `h2` "Añadir categoría" or "Editar categoría"; in edit mode the line "Enlace:
  /categoria/<id>"; field "Nombre" (`maxlength=30`, the sign in form's input classes);
  "Guardar" (primary) and "Cancelar" (link style). In edit mode, "Borrar categoría" (link
  style, `text-accent`) opens the confirm block of AC-7 or AC-8, or shows the AC-9 line.
  Validation follows the project pattern (`method="post"`, `novalidate`, `preventDefault`,
  `setCustomValidity`, `reportValidity`, message cleared on `input`). While a request runs the
  pressed button is disabled and its label ends in "…". Everything not stated here (focus on
  open and on return, the form reset on each open, the "Guardar" and "Cancelar" buttons while
  the confirm block shows, an unsaved name when "Borrar categoría" is tapped) copies the
  product form's current rules.
- **Data on the page:** one `Promise.all([listCategories(), listProducts()])` load, as today.
  `loadCatalog()` gains a second argument, `status`: after a successful load it writes `alert`
  and `status` into the categories section's lines (the section is visible again by then);
  the product list keeps its own lines. After add, rename or swap, the page updates its
  `categories` array from the returned rows, sorts it by `sort_order` then `id` (PostgREST does
  not promise the order of returned rows), and redraws the categories section, the product
  list and the product form's category list. After a move and delete, after a `reference`,
  `gone` or `exists` error, after any swap failure, and after the half done case, it runs the
  full load again.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Add | `id` | `productId(name, ids of the loaded categories)` |
| Add | `sort_order` | largest `sort_order` in the loaded categories, plus 1 |
| Add, rename | `name` | the form field, trimmed and checked by `checkCategoryName()` |
| Row | product count and "Vacía" line | count of loaded products whose `category_id` is the row's id |
| Row | "Subir" / "Bajar" disabled | the row's position in the loaded list (first / last) |
| Swap | the two new `sort_order` values | the two rows' current values, exchanged |
| Swap | `name` of both rows | the loaded rows (required by the upsert) |
| Delete | which confirm block shows (AC-7, AC-8, AC-9) | the product count, and the number of loaded categories |
| Move | "Mover a" options | the loaded categories, minus the one being deleted |
| Move | `toId`, "<chosen name>" | the "Mover a" choice and its loaded row |
| Edit | "Enlace: /categoria/<id>" | the row's `id` |
| Public site | chips, order, names, pages | the next build, through `getCatalog()` (specs 0005, 0013) |

**Key invariants**:
- A category's `id` never changes after it is added (the admin never sends `id` in a PATCH).
- No product points to a missing category: `on delete restrict` in the database; the build also
  checks it (`readProducts()`, spec 0013).
- There is always at least one category: the form never deletes the only one (AC-9), and the
  database refuses to delete one that has products.
- Category names are unique ignoring case and accents, enforced by the form only.
- `sort_order` values stay distinct when every write goes through this admin (a new row takes
  the largest plus 1, a swap exchanges two values in one statement). The seed uses 1 to 6. A tie
  made in the dashboard is accepted: the admin orders ties by `id`, and the public order of
  tied categories is then not fixed.
- Multi row writes do not trip `pg_safeupdate`: `touch_catalog()` is a statement level trigger
  whose update has `where id = true` (spec 0016), and every PATCH and DELETE here has a filter.

**Security model**:
- Anyone may read `categories` (unchanged). Only a JWT with `app_metadata.role = "owner"` may
  insert, update or delete a category (`is_owner()`), and only it may move products (the
  existing product update policy). The page's own owner check only drives the UI (spec 0014).
- Names typed by the owner reach the DOM only through `textContent`. The public pages escape
  them through Astro, as before.
- No personal data, money or regulated data. No new secret.

**Configuration required**: none. No new environment variable or credential. The owner runs
`supabase/categories-write.sql` once in the SQL editor of each shop.

**Weight:** about 1.5 to 2.5 KB gzipped more admin JS (7.5 KB today, limit 15 KB).
`check-weight.mjs` needs no change.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: add "Frutas", rename it, move it up, give it a product, publish, and see its chip
  in place on the live site, verifies **AC-3**, **AC-4**, **AC-6**, **AC-12**
- Failure case: move the products of a category, then fail the delete (mocked `500`): the half
  done message shows, the lists reload, the category shows as empty, and a second "Borrar"
  deletes it with the AC-7 confirmation, verifies **AC-10**, **AC-7**
- Failure case: with the network throttled, tap "Bajar" twice quickly: only one request is
  sent, verifies **AC-6**
- Auth/permission: a `POST`, `PATCH` and `DELETE` on `categories` with the publishable key only
  are refused, and an insert with a JWT without the owner role fails with `42501`, verifies
  **AC-1**
- Regression: the spec 0015 product flows and its mocked error cases behave the same, verifies
  **AC-11**

## Build plan

Delivery style is Facade (scope header): the screen comes first, on the real data the admin
already reads, and the database change waits until the screen is reviewed. The shared request
code moves first, because the screen's module is built on it.

- [x] **T1** (AC-11) Create `src/lib/rest.ts` with `RestError`, `send()`, `failure()`,
  `errorCode()` and `onlyRow()` moved from `src/lib/products.ts`; `send()` merges
  `init.headers` over the defaults, and every request products sends today keeps exactly the
  headers it sends now; kind `noCategory` becomes `reference`, log prefix `[rest]`. Update
  `products.ts` and, in the admin page, every use of `ProductError` (`needsReload()`,
  `messageOf()` and the `gone` check in the product save handler; search for `ProductError`),
  renaming the maps to `PRODUCT_MESSAGES` / `PRODUCT_RELOAD_KINDS`. Check the product flows
  and the spec 0015 AC11 mocked cases, plus `pnpm typecheck` and `pnpm build`.
- [ ] **T2** (AC-2, AC-3, AC-4, AC-5, AC-7, AC-8, AC-9) Create `src/lib/categories.ts`
  (`listCategories()` moved from `products.ts`, `checkCategoryName()`, the request functions)
  and build the categories section, its row template, the category form view and the confirm
  blocks in `src/pages/admin/index.astro`, on the real loaded data. Writes are wired but will
  be refused until T3, which shows the `forbidden` message. `swapCategories()` expects `201`
  as a placeholder until T3 measures the real status.
- [ ] **T3** (AC-1) Write `supabase/categories-write.sql`. Guide the owner to run it, then run
  the AC-1 checks: the commented SQL test, and a `curl` POST, PATCH and DELETE with the
  publishable key only. In one throwaway run with the owner's session, record here the real
  answers to: the swap upsert (status and body), a `PATCH` on `products` with `select=id` that
  moves 0 rows (status and body), and a `DELETE` of a category with products (status and code).
  Replace the placeholder expected status of `swapCategories()` with the recorded one. After
  one swap, check that the admin shows "Hay cambios sin publicar" (trigger fired).
- [ ] **T4** (AC-3, AC-4, AC-6, AC-7, AC-8, AC-10) Run every flow against the real database at
  360 px: add, rename, swap, delete empty, move and delete. Run the AC-10 failures against a
  mocked Supabase (offline, half done, stale count, gone, `signedOut`).
- [ ] **T5** (AC-12, AC-13) `pnpm typecheck`, `pnpm build`, `pnpm check:weight`; check no public
  route gained a script. Publish from the demo's admin and check the public site against
  AC-12, then restore the seed order and names.
- [ ] **T6** (AC-2) Add the categories section, row and form classes to `design.md`.

## Consequences

**Positive**:
- The owner manages the whole catalog without the developer, which completes the admin of
  the "Autónomo" package.
- Products and categories share one request and error module; a later admin feature reuses it.
- The public site needs no change: categories already flow through the build.

**Negative / tradeoffs**:
- A delete can stop halfway (products moved, category not deleted). The owner sees it and one
  more tap finishes it.
- The swap upsert sends `name`, so a rename made on another device between the load and the tap
  is overwritten, and a category deleted elsewhere is created again. Accepted with one owner.
- Duplicate names are refused only by the form; a name typed in the dashboard can still repeat.
- If an "Añadir" is saved but its answer is lost, a retry gets "Ya existe una categoría con ese
  enlace" although the row is the owner's own. Accepted on purpose: the list reloads and shows
  it.
- A renamed category keeps its old id in the URL (`/categoria/bebidas` for "Refrescos"). A
  deleted category's shared link gives 404 after the next publish.
- T1 touches working product code; AC-11 must pass before anything else is built on it.

**Neutral**:
- One more SQL file to run in every new shop (feature 18's checklist gains a step).
- An empty category exists in the admin but not on the public site, which the row explains.

## Out of scope

- Category photos, descriptions or icons.
- Drag and drop reordering, or moving a category more than one place per tap.
- Redirects from a deleted category's old link.
- Moving the products of a category to a new category created in the same step.
- Detecting edits from two devices (the last save wins; there is one owner).
- A database rule for unique names.

## Follow-up

- [ ] `/sync` after the build: `AGENTS.md` should list `src/lib/rest.ts`, `src/lib/categories.ts`,
  `supabase/categories-write.sql` and the new SQL run order, and drop "`ProductError`" and
  "`listCategories` in `products.ts`" wording where it appears (spec 0015 Design keeps its
  history).
- [ ] Feature 18 (new shop setup) should include `categories-write.sql` in its steps.

## References

**Project sources** (verifiable, in this repo):
- `docs/scope/scope.md` → feature 15. Specs 0005 (empty categories hidden), 0013 (tables,
  `on delete restrict`, build checks), 0014 (auth, `authFetch()`, admin JS limit), 0015
  (product writes, id rule, error mapping, in page confirm), 0016 (`touch_catalog()` trigger).
- `supabase/schema.sql`, `supabase/products-write.sql`, `supabase/publish.sql`,
  `src/lib/products.ts`, `src/lib/supabase.ts`, `src/lib/catalog.ts`,
  `src/components/CategoryNav.astro`, `src/pages/categoria/[id].astro`,
  `src/pages/admin/index.astro`, `AGENTS.md`.
- Engineer's answers, 2026-10-31: move the products then delete; "Subir" / "Bajar"; fixed id;
  duplicate names refused by the form; two requests for move and delete; one upsert per swap;
  section plus form; extract `rest.ts`; product count per row; move target with no choice made
  in advance; order buttons disabled while saving; clear message and reload for a half done
  delete; reload both lists after a move.

**Practices & standards**:
- Row level security as the only real guard; the client repeats rules only for messages.
- Upsert (`INSERT … ON CONFLICT DO UPDATE`) for a multi row change in one statement.
- Slugs fixed at creation so shared links survive renames.

**Links** (web verified by the `researcher` subagent, 2026-10-31):
- PostgREST, Tables and views (bulk insert, upsert with `resolution=merge-duplicates`, PATCH
  with filters, the `columns` parameter is optional):
  https://docs.postgrest.org/en/stable/references/api/tables_views.html
- PostgREST, Preferences (`return=representation`, several preferences in one header):
  https://docs.postgrest.org/en/stable/references/api/preferences.html
- PostgreSQL, CREATE POLICY (an upsert checks the insert policy, the select policy, and on
  conflict the update policy): https://www.postgresql.org/docs/current/sql-createpolicy.html
- PostgreSQL, INSERT (`ON CONFLICT DO UPDATE`): https://www.postgresql.org/docs/current/sql-insert.html

**Not confirmed by the docs, measured by T3:** the upsert's status code (201 is only the
documented example for a plain POST), that the whole upsert array is one all or nothing
statement, whether `not null` is checked on a conflicting row (so `name` is always sent), and
the status and body of a PATCH that matches no rows (spec 0015 measured `200 []` on a single
row filter).

# 0018 · Manage categories

**Date**: 2026-10-31
**Status**: In Progress
<!-- Proposed → In Progress → Accepted · Assumed (recorded by /develop, awaiting ratification) · Superseded by NNNN -->
**Scope**: `docs/scope/scope.md` → feature 15
**Amends**: spec 0015 (its request helpers and error class move to a shared `src/lib/rest.ts`;
`listCategories()` moves to `src/lib/categories.ts`; the error kind `noCategory` becomes
`reference`). Product behavior does not change.
**Amended**: 2026-11-04. A unique, deferrable constraint on `categories.sort_order` with its own
message (AC-14), and AC-1 rewritten with the answers measured during T2.

## Summary

You, the shop owner, can add, rename, reorder and delete product categories from `/admin/` on
your phone. A category that still has products is deleted only after you choose where its
products go: the page moves them first, then deletes the category. The order is changed with
"Subir" and "Bajar" buttons, one tap saves it. The database refuses two categories with the
same place in the order, so the public order never wobbles; when another phone changed the order
first, you see a clear message and the fresh list. The request code shared with products moves to
one new file, `src/lib/rest.ts`, so both features use the same requests and error messages.

## Context

The owner manages products from `/admin/` (spec 0015), but the six categories came from the
seed (spec 0013) and only the developer can change them, in the Supabase dashboard. A shop
that starts selling fruit, or wants "Bebidas" before "Aseo", has to call the developer. That
breaks the promise of the "Autónomo" package: the owner manages the whole catalog alone.

What already exists and shapes the problem:
- The table `categories (id, name, sort_order)` is public to read, and nobody can write to it
  through the API: it has no write policies (spec 0013). `schema.sql` grants only `select`, but
  the live project also grants `update` to `authenticated`: measured during T2 (2026-11-03), an owner
  `PATCH` with no update policy answered `200 []` (RLS matched no row), and a `POST` answered
  `403` `42501` ("new row violates row-level security policy").
- `sort_order` has no unique rule today: two categories can share a number, and then the public
  order of those two is not fixed.
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
  - with only the publishable key, a `POST` on `categories` is refused (`401` or `403`, code
    `42501`), and a `PATCH` or `DELETE` changes no row: it is refused, or it answers `200 []`
    (the role may hold the table grant, and RLS then matches no row). A `GET` afterwards shows
    every category unchanged;
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
- **AC-14**: After `supabase/categories-write.sql` runs, `categories.sort_order` is unique through
  the constraint `categories_sort_order_key`, `deferrable initially immediate`:
  - in the SQL editor, an insert or update that gives a category a `sort_order` another one
    already has fails with `23505`;
  - "Subir" and "Bajar" still save in one request (AC-6);
  - when a swap or an add meets a `sort_order` taken since the list loaded (`409` `23505` on
    `categories_sort_order_key`, for example after a reorder or an add on another device), the
    message is "El orden cambió en otro dispositivo. La lista se ha actualizado." and both lists
    load again. After an add, the form keeps the name and a second "Guardar" saves it;
  - an id taken by another add (`409` `23505` on the primary key) keeps "Ya existe una categoría
    con ese enlace. La lista se ha actualizado.".

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

### Option 5: Keeping `sort_order` distinct (amendment, 2026-11-04)

(a) The admin alone keeps the values distinct (largest plus 1, swaps exchange two values); a
tie from the dashboard or from two devices is accepted and ordered by `id`. (b) A plain
`unique (sort_order)`. (c) `unique (sort_order) deferrable initially immediate` (chosen).

**Pros (c)**:
- The database refuses every tie, from any device or the dashboard, so the public order is
  always fixed.
- The swap still works: a constraint that is deferrable but not deferred is checked when the
  statement ends, not after each row (basis: PostgreSQL, CREATE TABLE, "Non-Deferred Uniqueness
  Constraints"). A plain unique (b) is checked after each row, so exchanging two values in one
  statement fails.
- It also turns a stale swap (the order changed on another device) into a clear refusal, instead
  of a silent tie.

**Cons (c)**:
- The docs do not say how a deferrable constraint on a column that is not the conflict arbiter
  behaves inside `INSERT … ON CONFLICT DO UPDATE` (they only forbid it as an arbiter; ours is
  the primary key). T3 must prove the swap works.
- Reordering by hand in the dashboard now needs one statement per swap (two separate updates
  fail on the first).
- A second kind of `409` `23505` reaches the page, and it must be told apart from a taken id.

**Telling the two `23505` apart**: PostgREST answers both with the same status and code (basis:
PostgREST, errors, `23505` → `409`); only the constraint name in the body's `message` differs.
Chosen: `RestError` carries that name, and `categories.ts` alone knows which name means "order
taken". Runner up: a new `RestErrorKind` (`rest.ts` would know a table, and the product message
map would need an entry it never uses).

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
- **Order uniqueness (amendment, 2026-11-04):** `unique (sort_order) deferrable initially
  immediate`, named `categories_sort_order_key`, added by `categories-write.sql` (Option 5). Its
  `23505` gets its own message: "El orden cambió en otro dispositivo. La lista se ha
  actualizado."
- **AC-1 (amendment, 2026-11-04):** a `PATCH` or `DELETE` without a policy may answer `200 []`
  instead of a refusal, as measured during T2; AC-1 checks that no row changed.

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
- **An order taken is told apart by the constraint name (amendment):** `RestError` gains an
  optional `constraint`, read from the body's `message` on a `23505`; `isOrderTaken()` in
  `categories.ts` compares it with `categories_sort_order_key`. The kind stays `exists`, so the
  reload rules do not change, only the message. Runner up: a new `RestErrorKind` `order`.
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

The amendment closes the gap the upsert left open. The admin keeps `sort_order` distinct only
while every write starts from fresh data; a swap from a stale list, or a tie typed in the
dashboard, made an unstable public order, which is the very problem the upsert was chosen to
avoid. A deferrable unique constraint makes the database the guard, as RLS already is for
permissions, and keeps the one statement swap working. Telling the two `23505` apart by the
constraint name keeps `rest.ts` free of table knowledge and the reload rules unchanged.

The public site needs no change: it already rebuilds from the tables, drops empty categories,
and the trigger already marks a category write as unpublished.

## Feature design

**Data model sketch**:

| Table | Key | Fields | Relationship | Change |
|---|---|---|---|---|
| `categories` | `id` text, slug, fixed | `name` text not null, 1 to 30 · `sort_order` integer not null, ≥ 0, unique (deferrable) | 1 category : N products | New owner insert, update and delete policies; new constraint `categories_sort_order_key` |
| `products` | `id` | `category_id` → `categories.id`, `on delete restrict` | N : 1 | None. The move uses the existing owner update policy |

No new table or column; the constraint adds one unique index. New file
`supabase/categories-write.sql`, run once after
`photos.sql` (order for every new shop: `schema.sql` → `seed.sql` → `auth.sql` →
`products-write.sql` → `publish.sql` → `photos.sql` → `categories-write.sql`):
```sql
-- No two categories share a place in the order (spec 0018, AC-14). Deferrable but not deferred:
-- checked when the statement ends, so the admin's one statement swap passes. Before running it,
-- this must return no rows (a tie makes the alter fail):
--   select sort_order, count(*) from public.categories group by sort_order having count(*) > 1;
alter table public.categories
  add constraint categories_sort_order_key unique (sort_order) deferrable initially immediate;

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

-- AC-14 check (nothing is kept):
-- begin;
--   insert into public.categories (id, name, sort_order)
--     select 'prueba', 'Prueba', min(sort_order) from public.categories;  -- expect 23505
-- rollback;
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
- Amendment: `RestError` also has `constraint?: string`, set only for `409` `23505`: the name
  inside `unique constraint "<name>"` in the body's `message` (the error body carries `code`,
  `message`, `details`, `hint`; T3 records a real one). No name found → `undefined`. Kinds and
  products are unchanged.
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
| `addCategory(name, categories)` | `POST /rest/v1/categories`, body `{ id, name, sort_order }`, expects 201 | checked name, loaded list | the created row | `exists` (`409 23505`: id taken, or order taken per `isOrderTaken()`) |
| `renameCategory(id, name)` | `PATCH /rest/v1/categories?id=eq.<id>`, body `{ name }`, `onlyRow` | id, checked name | the updated row | `gone` (`200 []`) |
| `swapCategories(a, b)` | `POST /rest/v1/categories`, header `Prefer: resolution=merge-duplicates,return=representation`, body `[{ id: a.id, name: a.name, sort_order: b.sort_order }, { id: b.id, name: b.name, sort_order: a.sort_order }]`, expects the status T3 records | two neighbor rows | the two rows | `invalid`, `system`, `exists` (order taken, stale list) |
| `moveProducts(fromId, toId)` | `PATCH /rest/v1/products?category_id=eq.<fromId>&select=id`, body `{ category_id: toId }` (`select=id` keeps the answer small on slow data) | two ids | the moved ids (any count, `[]` allowed) | `reference` (`409 23503`, target gone) |
| `deleteCategory(id)` | `DELETE /rest/v1/categories?id=eq.<id>`, `onlyRow` | id | nothing | `reference` (`409 23503`, still has products), `gone` |
| `checkCategoryName(raw, categories, ownId?)` | none (pure) | typed name, loaded list, the edited row's id | `{ name }` or `{ message }` | none |
| `isOrderTaken(error)` | none (pure) | any caught error | `true` for a `RestError` `exists` whose `constraint` is `categories_sort_order_key` | none |

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
| `exists` with `isOrderTaken()` (amendment; `messageOf()` checks it first in the categories context) | El orden cambió en otro dispositivo. La lista se ha actualizado. | reload both lists |
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
| Swap, add | "El orden cambió…" instead of the `exists` message | `isOrderTaken()` on the caught error: the constraint name in the `409` body's `message` |
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
- `sort_order` values are always distinct: `categories_sort_order_key` refuses a tie from any
  source, the admin or the dashboard (amendment). A new row takes the largest loaded value plus
  1, a swap exchanges two values in one statement. The seed uses 1 to 6. The admin still sorts
  by `sort_order` then `id`, because PostgREST does not promise the order of returned rows.
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
- Auth/permission: with the publishable key only, a `POST` on `categories` is refused, a `PATCH`
  and a `DELETE` change no row (refused or `200 []`), and an insert with a JWT without the owner
  role fails with `42501`, verifies **AC-1**
- Failure case (amendment): two tabs load the list; tab A taps "Bajar" on the first category;
  tab B, still stale, taps "Bajar" on the second. Tab B's upsert meets a taken `sort_order`, shows
  "El orden cambió en otro dispositivo. La lista se ha actualizado." and reloads with tab A's
  order, verifies **AC-14**, **AC-6**
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
- [x] **T2** (AC-2, AC-3, AC-4, AC-5, AC-7, AC-8, AC-9) Create `src/lib/categories.ts`
  (`listCategories()` moved from `products.ts`, `checkCategoryName()`, the request functions)
  and build the categories section, its row template, the category form view and the confirm
  blocks in `src/pages/admin/index.astro`, on the real loaded data. Writes are wired but will
  be refused until T3, which shows the `forbidden` message. `swapCategories()` expects `201`
  as a placeholder until T3 measures the real status.
- [x] **T3** (AC-1, AC-14) Write `supabase/categories-write.sql` (the constraint, then the
  policies). Have the owner run the tie check query, then the file. Run the AC-1 checks (the
  commented SQL test; a `curl` POST, PATCH and DELETE with the publishable key only, then a
  GET) and the AC-14 SQL check. In one throwaway run with the owner's session, record here the
  real answers to: the swap upsert (status and body; it must pass the deferrable constraint), a
  `PATCH` on `products` with `select=id` that moves 0 rows (status and body), a `DELETE` of a
  category with products (status and code), and a stale swap that meets a taken `sort_order`
  (status and the full body). Replace the placeholder expected status of `swapCategories()`
  with the recorded one. After one swap, check that the admin shows "Hay cambios sin publicar"
  (trigger fired). If the swap fails on the constraint, or the stale swap's body does not name
  `categories_sort_order_key`, stop and return to `/architect`.
- [x] **T3b** (AC-14, AC-11) Add `constraint` to `RestError` in `src/lib/rest.ts`,
  `isOrderTaken()` to `src/lib/categories.ts`, and the "El orden cambió…" message to the admin
  page's `messageOf()` in the categories context. Check the spec 0015 product flows still map
  as before, plus `pnpm typecheck` and `pnpm build`.
- [x] **T4** (AC-3, AC-4, AC-6, AC-7, AC-8, AC-10, AC-14) Run every flow against the real
  database at 360 px: add, rename, swap, delete empty, move and delete. Run the AC-10 failures
  against a mocked Supabase (offline, half done, stale count, gone, `signedOut`). Run the AC-14
  two tab cases against the real database: a stale swap, and a stale add (tab A adds one
  category, tab B adds another with the old list).
- [x] **T5** (AC-12, AC-13) `pnpm typecheck`, `pnpm build`, `pnpm check:weight`; check no public
  route gained a script. Publish from the demo's admin and check the public site against
  AC-12, then restore the seed order and names.
- [x] **T6** (AC-2) Add the categories section, row and form classes to `design.md`.

## Consequences

**Positive**:
- The owner manages the whole catalog without the developer, which completes the admin of
  the "Autónomo" package.
- Products and categories share one request and error module; a later admin feature reuses it.
- The public order is always fixed: the database refuses a tie in `sort_order`, and a stale
  swap or add on a second device ends in a clear message instead of a silent tie (amendment).
- The public site needs no change: categories already flow through the build.

**Negative / tradeoffs**:
- A delete can stop halfway (products moved, category not deleted). The owner sees it and one
  more tap finishes it.
- The swap upsert sends `name`, so a rename made on another device between the load and the tap
  is overwritten, and a category deleted elsewhere is created again. Accepted with one owner.
- Duplicate names are refused only by the form; a name typed in the dashboard can still repeat.
- Telling an order clash from an id clash depends on the constraint name inside the error's
  `message` text. If that wording ever changes, an order clash falls back to the id message:
  the lists still reload, only the words are wrong.
- Reordering by hand in the dashboard needs one statement per swap; two separate updates fail.
- If an "Añadir" is saved but its answer is lost, a retry gets "Ya existe una categoría con ese
  enlace" although the row is the owner's own. Accepted on purpose: the list reloads and shows
  it.
- A renamed category keeps its old id in the URL (`/categoria/bebidas` for "Refrescos"). A
  deleted category's shared link gives 404 after the next publish.
- T1 touches working product code; AC-11 must pass before anything else is built on it.

**Neutral**:
- One more SQL file to run in every new shop (feature 18's checklist gains a step). On a live
  shop it fails if two categories already share a `sort_order`; the check query in the file
  finds them first.
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
- [ ] `/sync` after the build: `AGENTS.md` should record `categories_sort_order_key` (reorders in
  the dashboard need one statement), `RestError.constraint` with `isOrderTaken()`, and that the
  live project grants `update` to `authenticated` beyond `schema.sql`, so a write with no
  policy answers `200 []` rather than a refusal (measured in T2).

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
- A unique constraint that is deferrable but not deferred, so a statement that exchanges values
  is checked as a whole (amendment).

**Links** (web verified by the `researcher` subagent, 2026-10-31):
- PostgREST, Tables and views (bulk insert, upsert with `resolution=merge-duplicates`, PATCH
  with filters, the `columns` parameter is optional):
  https://docs.postgrest.org/en/stable/references/api/tables_views.html
- PostgREST, Preferences (`return=representation`, several preferences in one header):
  https://docs.postgrest.org/en/stable/references/api/preferences.html
- PostgreSQL, CREATE POLICY (an upsert checks the insert policy, the select policy, and on
  conflict the update policy): https://www.postgresql.org/docs/current/sql-createpolicy.html
- PostgreSQL, INSERT (`ON CONFLICT DO UPDATE`; deferrable constraints cannot be conflict
  arbiters): https://www.postgresql.org/docs/current/sql-insert.html
- PostgreSQL, CREATE TABLE (`DEFERRABLE`, `INITIALLY IMMEDIATE`, "Non-Deferred Uniqueness
  Constraints"), verified 2026-11-04: https://www.postgresql.org/docs/current/sql-createtable.html
- PostgREST, Errors (body fields `code`, `message`, `details`, `hint`; `23505` → `409`), verified
  2026-11-04: https://docs.postgrest.org/en/stable/references/errors.html

**Not confirmed by the docs, measured by T3:** the upsert's status code (201 is only the
documented example for a plain POST), that the whole upsert array is one all or nothing
statement, whether `not null` is checked on a conflicting row (so `name` is always sent), and
the status and body of a PATCH that matches no rows (spec 0015 measured `200 []` on a single
row filter). Added by the amendment: that the deferrable `sort_order` constraint lets the swap
upsert pass (the docs are silent on a deferrable constraint that is not the conflict arbiter),
and that a `23505` body names the constraint in `message` (the docs show no `23505` example).

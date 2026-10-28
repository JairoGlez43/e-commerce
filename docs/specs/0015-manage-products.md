# 0015 · Manage products

**Status:** Accepted
<!-- Proposed → In Progress → Accepted · Assumed (recorded by /develop, awaiting ratification) · Superseded by NNNN -->
**Date:** 2026-10-27
**Scope:** `docs/scope/scope.md` → feature 12
**Supersedes:** — (amends spec 0013: `photo_path` becomes nullable and the `photo` field of the
spec 0004 shape becomes optional; the public pages gain a "Sin foto" state)
**Amended:** 2026-10-28 — a new error kind, `system`, for a refused request that is not the
owner's data (Design → Errors, AC11, T7). The amendment is built and verified; the spec is Accepted.

## Context
The owner can sign in to `/admin/` (spec 0014), but the signed-in view is a placeholder. This
feature lets the owner list, add, edit and delete products from a phone. The database has no
write policies yet (spec 0013), and `photo_path` is required, although photo upload only comes
with feature 14. A product added here therefore has no photo, and the public site must show
that correctly.

## Decision
- **The admin writes straight to `products` through the Supabase REST API (PostgREST)** with
  plain `fetch`, through `authFetch()` from `src/lib/auth.ts`. There is no SDK and no UI
  framework. A new browser module, `src/lib/products.ts`, is the single home of the product
  reads and writes, the form's field rules and the id rule.
- **RLS is the real guard.** New insert, update and delete policies on `products` allow only
  `public.is_owner()` (spec 0014). The form repeats the database rules only to give messages in
  Spanish before sending anything.
- **The photo is optional** (owner's choice). `photo_path` becomes nullable. A product without
  a photo shows a "Sin foto" box styled with design tokens on the catalog, category and
  product pages. Its WhatsApp preview uses `og-default.png`. This feature never writes
  `photo_path`, because feature 14 owns it.
- **Quick stock switch in the list** (owner's choice). Each row has a "Disponible" checkbox
  that saves with one tap. The edit form also has it.
- **The id (the URL slug) comes from the name when the product is added, and never changes.**
  Links already shared in WhatsApp keep working after a rename.
- **Delete asks for confirmation inside the page**, not with `confirm()`. Some in-app
  browsers block `confirm()`. The last product cannot be deleted, because the build refuses an
  empty table (spec 0013) and the deletion would never reach the public site.
- **Saving changes the data at once, and the public site follows at the next publish**
  (feature 13). Until then the admin says so in one line.

## Acceptance criteria
- **AC1:** After `supabase/products-write.sql` runs in the SQL editor:
  - `photo_path` accepts `null`;
  - a `POST`, `PATCH` or `DELETE` on `products` with only the publishable key is refused;
  - in the SQL editor, an insert run as `authenticated` with JWT claims that have no
    `app_metadata.role` fails with `42501`. Run as the owner's claims, the same insert works
    and is then rolled back.
- **AC2:** On a 360 px screen, the signed-in view lists every product, in stock or not.
  - Products are grouped under their category name, in `sort_order`, and sorted A–Z by name
    inside each group.
  - Each row shows the name, the unit, the price through `formatPrice()`, and a "Disponible"
    checkbox. Targets are at least 44 px.
  - While loading, the list shows "Cargando productos…".
  - If loading fails, the list shows the error message and a "Reintentar" button that loads it
    again.
- **AC3:** "Añadir producto" opens an empty form. Disponible is checked and no category is
  chosen. Saving a valid form creates the row:
  - the list shows it at once, in its place;
  - its id is derived from the name, for example "Café Cubano 250 g" → `cafe-cubano-250-g`.
    A name whose id is taken gets `-2`, `-3`… The row in Supabase has `photo_path` null.
- **AC4:** Tapping a product's name opens the form filled with its data, plus the line
  "Enlace: /producto/<id>". Each field (name, category, price, unit, description, stock) can be
  changed and saved. After a page reload the change is still there, and the id is unchanged.
- **AC5:** Tapping a row's "Disponible" checkbox saves the new stock state. The checkbox is
  disabled until the answer arrives. After a reload the state is kept. If the save fails, the
  checkbox returns to its previous state and the list shows the error message.
- **AC6:** In the edit form, "Borrar producto" shows "¿Borrar «<name>»? No se puede
  deshacer." with "Sí, borrar" and "No, volver".
  - "No, volver" changes nothing.
  - "Sí, borrar" deletes the row and returns to the list without it.
  - When only one product is left, "Borrar producto" is replaced by "No puedes borrar el
    último producto: la tienda quedaría vacía." and no request is sent.
- **AC7:** The form refuses, with the message in Design and with no request in the network
  panel:
  - an empty name;
  - a name with no letter or digit (for example "!!!");
  - no category;
  - an empty unit or description;
  - the prices "-5", "0", "abc", "12,5" and "".
  The price "12.500" is saved as `12500`. Leading and trailing spaces are removed from every
  text field before checking and saving.
- **AC8:** Failures keep the owner's work:
  - With the network off, saving shows "Sin conexión. Revisa tus datos e inténtalo otra vez."
    and the form keeps every value.
  - A product deleted in the dashboard while its form is open: saving shows "Este producto ya
    no existe. La lista se ha actualizado." and the list reloads.
  - A refused session (`signedOut`) shows the sign-in view with its message (spec 0014).
- **AC9:** After a build with one product whose `photo_path` is null:
  - its card on `/` and on its category page, and its product page, show the "Sin foto" box
    and no `<img>`;
  - its `og:image` is `/og-default.png`;
  - every other product looks as before;
  - `/estilo` builds.
- **AC10:** `pnpm typecheck`, `pnpm build` and `pnpm check:weight` pass. `/admin/` JS stays
  within its 15 KB gzipped limit. No public route has a `<script>` tag or contains
  `supabase.co` or `sb_publishable_`.
- **AC11:** A refusal that is not about the owner's data says so (amended 2026-10-28):
  - a save, and a stock switch, answered `400` `21000` (mocked) show "Error del sistema, no es
    culpa tuya. Avisa a quien mantiene la web.", and the console logs the status and code;
  - after it, the form keeps every value and the checkbox returns to its previous state;
  - a save answered `400` `23514` (mocked) still shows "Algún dato no es válido. Revisa el
    formulario.";
  - a save answered `500` still shows "Algo salió mal. Inténtalo otra vez.".

## Design

**`supabase/products-write.sql`** (new file, run once in the SQL editor after `auth.sql`, in the
demo and in every new shop: `schema.sql` → `seed.sql` → `auth.sql` → `products-write.sql`)
```sql
-- The owner's writes on products (spec 0015). Reads stay public (schema.sql).
-- A product may have no photo until feature 14 uploads one. The existing check still refuses
-- an empty string, and a check passes on null.
alter table public.products alter column photo_path drop not null;

grant insert, update, delete on table public.products to authenticated;
create policy "owner inserts products" on public.products
  for insert to authenticated with check (public.is_owner());
create policy "owner updates products" on public.products
  for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "owner deletes products" on public.products
  for delete to authenticated using (public.is_owner());

-- AC1 check (run, read the result, nothing is kept):
-- begin;
--   set local role authenticated;
--   set local request.jwt.claims = '{"app_metadata":{}}';
--   insert into public.products (id, name, category_id, price, unit, description)
--     values ('prueba', 'Prueba', '<a category id>', 1, 'u', 'd');  -- expect 42501
-- rollback;
-- Repeat with '{"app_metadata":{"role":"owner"}}': the insert works, then rollback.
```
`categories` stays read-only (feature 15).

**`src/lib/products.ts`** (browser module, imported by the admin page's script)
- Types: `import type { ProductRow, CategoryRow } from './supabase'`. This is type-only, so
  nothing from `supabase.ts` reaches the bundle.
- Every request goes through `authFetch(path, init)` with `Content-Type: application/json` and
  `Prefer: return=representation`. Ids in filters go through `encodeURIComponent`.

| Function | Request | Result |
|---|---|---|
| `listCategories()` | `GET /rest/v1/categories?select=id,name,sort_order&order=sort_order.asc` | `CategoryRow[]` |
| `listProducts()` | `GET /rest/v1/products?select=id,name,category_id,price,unit,in_stock,description,photo_path&order=name.asc` | `ProductRow[]` |
| `addProduct(fields, takenIds)` | `POST /rest/v1/products`, body `{ id: productId(fields.name, takenIds), ...fields }` (no `photo_path`) | the created row (expects 201) |
| `updateProduct(id, fields)` | `PATCH /rest/v1/products?id=eq.<id>`, only the changed fields, never `id` or `photo_path` | the updated row |
| `setStock(id, inStock)` | `updateProduct(id, { in_stock })` | the updated row |
| `deleteProduct(id)` | `DELETE /rest/v1/products?id=eq.<id>` | nothing |

- **A PATCH or DELETE that matches no row answers 200 with `[]`** (PostgREST, also when RLS
  hides the row). Every PATCH and DELETE checks that exactly one row came back, and throws
  `ProductError { kind: "gone" }` otherwise. `max-affected` is not used, because the hosted
  PostgREST version is unconfirmed.
- `fields` is `{ name, category_id, price, unit, in_stock, description }`, already checked by
  `checkFields()`.
- **Id rule** (`productId(name, takenIds)`):
  1. Normalize with NFD and remove the combining marks (á → a, ñ → n).
  2. Lowercase. Replace every run of characters other than `a-z0-9` with `-`, and trim `-`
     from both ends.
  3. Cut to 60 characters, then trim a trailing `-`.
  4. If the result is in `takenIds`, add `-2`, `-3`… until it is free.
  The result always matches the schema's id regex. An empty result cannot happen, because
  `checkFields()` refuses it first.
- **Field rules** (`checkFields(raw)`): the limits mirror `schema.sql` and spec 0004. They
  return either the clean `fields` or a list of `{ field, message }`. Every text value is
  trimmed first.

| Field | Rule | Message |
|---|---|---|
| Nombre | 1–60 characters (`maxlength=60`) | Escribe el nombre del producto. |
| Nombre | at least one letter or digit (`/[\p{L}\p{N}]/u`) | El nombre necesita al menos una letra o un número. |
| Categoría | one of the loaded category ids | Elige una categoría. |
| Precio | remove spaces and dots, then `^\d+$`, from 1 to 2147483647 | El precio debe ser un número entero mayor que 0, sin decimales. |
| Unidad | 1–30 characters (`maxlength=30`) | Escribe la unidad, por ejemplo «paquete de 1 kg». |
| Descripción | 1–300 characters (`maxlength=300`) | Escribe una descripción corta. |

  The dots are removed because `es-ES` writes thousands with a dot ("12.500 CUP", spec 0004),
  so an owner may type one. A comma is never a decimal here, so "12,5" is refused.
- **Errors:** `ProductError { kind }`. `AuthError` from `authFetch` passes through unchanged.
  The page maps both kinds to Spanish. The code reads the JSON body's `code` only when
  `Content-Type` is JSON.

| `kind` | Comes from | Message | Then |
|---|---|---|---|
| `exists` | 409 `23505` | Ya existe un producto con ese enlace. La lista se ha actualizado. | reload the list |
| `noCategory` | 409 `23503` | Esa categoría ya no existe. La lista se ha actualizado. | reload the list |
| `invalid` | 400 whose code starts with `22` or `23` (for example `22P02`, `23514`, `23502`) | Algún dato no es válido. Revisa el formulario. | stay |
| `forbidden` | 403 `42501` | Esta cuenta no puede cambiar el catálogo. | stay |
| `gone` | PATCH or DELETE returned `[]` | Este producto ya no existe. La lista se ha actualizado. | reload the list |
| `system` | any other 4xx: a 400 with another code or none (for example `21000`), a 403 or 409 with another code, a 404… | Error del sistema, no es culpa tuya. Avisa a quien mantiene la web. | stay |
| `unknown` | anything else (for example a 5xx) | Algo salió mal. Inténtalo otra vez. | stay |
| `offline`, `rate`, `signedOut` | `AuthError` (spec 0014) | spec 0014's messages | `signedOut` shows sign-in |

  PostgREST answers an expired or invalid JWT with 401 (`PGRST301`/`PGRST303`), which
  `authFetch` already refreshes and retries once (spec 0014). A 403 `42501` is a real refusal
  and is never retried.

  Postgres codes starting with `22` are data errors (a value of the wrong form or size) and
  `23` are rule errors (a check, a `not null`, a key); both mean "the data sent was wrong".
  Every other refusal is a fault in the system (the database, its SQL, the config), which the
  owner cannot fix from the form, so `system` says so. `system` and `unknown` still log the
  method, path, status and code with `console.error`, as today.

**`src/pages/admin/index.astro`**
- The processed `<script>` also imports `src/lib/products.ts` and `formatPrice` from
  `src/lib/price.ts`. There is still one script, no attributes and no framework.
- Repeated markup lives in `<template>` elements in the page, with classes written in full. The
  script clones them and fills them **with `textContent` only, never `innerHTML`**.
- **Signed-in view** (keeps "Sesión iniciada como…", its status line and "Cerrar sesión"), then:
  - a `text-sm text-muted` line: "Los cambios se guardan al momento. La web pública los
    mostrará después de publicar.";
  - `h2` "Productos" and a primary button "Añadir producto";
  - one `role="status"` area and one `role="alert"` area for the list;
  - the list: an `h3` for each category that has products, then a `<ul>` of rows. Empty
    categories are skipped.
  - each row: a name button (link style, `inline-flex min-h-11 items-center`, opens the
    form), the line `<unit> · <price>` in `text-sm text-muted`, and
    `<label class="inline-flex min-h-11 items-center gap-2"><input type="checkbox">
    <span class="sr-only"><name>: </span>Disponible</label>`;
  - states: "Cargando productos…" (status). On error, the message (alert) plus a
    "Reintentar" button. "Todavía no hay productos." can only show if the table was emptied in
    the dashboard.
- **Product form view** (`data-view="product"`, a new `<section>`, hidden like the others):
  - `h2` "Añadir producto" or "Editar producto";
  - in edit mode, the line "Enlace: /producto/<id>" (`text-sm text-muted`);
  - fields, with labels always visible, the input classes of the sign-in form, and the textarea
    with the same classes plus `py-2`:
    - Nombre (`maxlength=60`);
    - Categoría (`<select>` filled from `listCategories()`, first option "Elige una categoría"
      with an empty value);
    - Precio en CUP (`inputmode="numeric"`, hint "Solo el número, sin decimales. Ej.: 12500");
    - Unidad (`maxlength=30`, hint "Ej.: paquete de 1 kg");
    - Descripción (`<textarea maxlength=300 rows=4>`);
    - Disponible (checkbox).
  - buttons: "Guardar" (primary), "Cancelar" (link style, back to the list without saving).
    In edit mode, a "Borrar producto" button in link style with `text-accent` opens the
    confirm block, which shows the text and buttons of AC6.
  - Validation follows the project pattern: `method="post"`, `novalidate`, `preventDefault`.
    The script runs `checkFields()`, sets each message on its field with `setCustomValidity`,
    and calls `reportValidity()`. Each field's message is cleared on `input`.
  - While a request runs, the pressed button is disabled and its label ends in "…" (spec
    0014). On success the view returns to the list, with "Producto guardado." or "Producto
    borrado." in the list's status area.
- **Data on the page:** categories and products load when the signed-in view opens, and again
  after a `exists`, `noCategory` or `gone` error or a "Reintentar". After a successful write,
  the list updates from the row PostgREST returned, without reloading everything.
- Taken ids for `productId()` are the ids in the loaded list. A rare clash with a product added
  elsewhere answers `exists`, and the list reloads.

**Public pages (photo optional)**
- `src/lib/supabase.ts`: `ProductRow.photo_path` becomes `string | null`. Nothing else
  changes.
- `src/content.config.ts`: the loader maps `photo: row.photo_path ? photoUrl(row.photo_path) :
  undefined`, and the schema becomes `photo: z.url().optional()`.
- New component `src/components/NoPhoto.astro`, the single home of the "Sin foto" box:
  `<div class="flex aspect-square w-full items-center justify-center bg-cream text-sm text-muted">Sin foto</div>`,
  plus `rounded-card border border-border` when its prop `framed` is true (the product page).
  Its text is visible, so it needs no `alt`. The product name is already in the heading. It
  takes no `opacity-50`, because the "Agotado" badge already shows the stock.
- `ProductCard.astro`, `producto/[id].astro` and `estilo.astro`: `photo ? <Image …unchanged…/> :
  <NoPhoto />`. On the product page, `getImage()` runs only when `photo` exists, and
  `BaseLayout` gets `image={previewImage?.src}`. Its default is `/og-default.png`.
- `design.md` gains the NoPhoto component and the admin row and form classes (`/develop` adds
  them as they ship).

**Weight:** the admin keeps its limits (spec 0014: JS ≤ 15 KB gzipped, HTML+CSS ≤ 50 KB). The
JS measured on 2026-10-27 is 2.7 KB gzipped. `check-weight.mjs` needs no change, because a page
without an `<img>` counts 0 KB of images.

**Security**
- What protects the data is RLS with `is_owner()`. The page's own owner check only drives the
  UI (spec 0014).
- Product values typed by the owner reach the DOM only through `textContent`, so they cannot
  run as HTML. The public pages escape them through Astro, as before.
- The admin never sends `id` in a PATCH and never sends `photo_path`.

## Build plan
- [x] **T1** (AC1) Write `supabase/products-write.sql`. Guide the owner to run it, then run the
  AC1 checks: the commented SQL test, and a `curl` POST, PATCH and DELETE with the publishable
  key only.
- [x] **T2** (AC9) Make the photo optional: `ProductRow` type, the loader and schema in
  `content.config.ts`, `NoPhoto.astro`, and its use in `ProductCard`, `producto/[id]` and
  `estilo`. Check AC9 with one product whose `photo_path` is set to null in the dashboard, then
  restore it.
- [x] **T3** (AC3, AC4, AC5, AC6, AC7, AC8) `src/lib/products.ts`: the reads and writes, the
  one-row check, `productId()`, `checkFields()` and error mapping. In one throwaway run, record
  here the real answers to a POST (201 and body shape), to a PATCH that matches no row (200
  `[]`) and to a duplicate id (409 `23505`).
  - Recorded 2026-10-28 (owner's session, `Prefer: return=representation`):
    - POST → `201`, body an array of one row with every column, `photo_path: null`.
    - Same POST again → `409`, `{"code":"23505","details":null,"hint":null,"message":"duplicate key value violates unique constraint \"products_pkey\""}`.
    - PATCH `?id=eq.no-existe` → `200` `[]`.
    - DELETE of the test row → `200`, an array holding the deleted row.
- [x] **T4** (AC2, AC3, AC4, AC5, AC6, AC7, AC8) `src/pages/admin/index.astro`: the list, the
  templates, the product form view, the confirm block, the states and the messages.
- [ ] **T5** (AC10) `pnpm typecheck`, `pnpm build`, `pnpm check:weight`. Then run the flows on
  `http://localhost:4321/admin/` at 360 px, and once on the live demo after a deploy (CORS for
  PATCH and DELETE).
  - 2026-10-28 (`/check verify`): checks clean; flows at 360 px passed (52 browser checks against
    a mocked Supabase, plus the owner's add/stock/edit/delete run on real data). Cross-origin
    PATCH and DELETE already worked from `localhost` (T3). Still open: the one run on the live
    demo, after the owner pushes `main`.
- [x] **T6** Add the new components and classes to `design.md`. Update the `learning/code/`
  walkthroughs for every new or changed file.
- [x] **T7** (AC10, AC11) Amendment 2026-10-28: add `system` to `ProductErrorKind` and the
  `22`/`23` test to `failure()` in `src/lib/products.ts`; add its message to
  `PRODUCT_MESSAGES` in `src/pages/admin/index.astro`. Run the AC11 cases against a mocked
  answer and the AC10 checks. Update the two walkthroughs and `glosario.md`.
  - 2026-10-28 (`/develop`): the real `products.ts`, bundled with a stub `authFetch`, mapped 11
    mocked answers as the table says (400 `21000` on POST, PATCH and `setStock` → `system`; 400
    `23514`/`22P02` → `invalid`; 400 with no code, 403 other, 404 → `system`; 403 `42501` →
    `forbidden`; 409 `23505` → `exists`; 500 → `unknown`), each logging status and code. AC10
    clean: typecheck 0 errors, build 27 pages, weight within budget (`/admin/` JS 6.3 KB
    gzipped), no public `<script>` or Supabase values. The in-page AC11 run is for
    `/check verify`.
  - 2026-10-28 (`/check verify`): AC10 clean again. AC11 in the page at 360 px against a mocked
    Supabase, 16 browser checks passed: save, add and stock switch answered 400 `21000` show the
    system message, log status and code, keep every value, and undo the checkbox; 400 `23514`
    and 500 keep their messages; no write reached Supabase.

## Out of scope
- Photo upload, replace or removal, and deleting a removed product's photo from the bucket.
  The orphan file stays until feature 14 decides what to do with it.
- The publish button and its status (feature 13). Adding, renaming or deleting categories
  (feature 15).
- Search, filters, bulk edits, reordering, undo, and editing a product's id.
- Detecting that two devices edited the same product (the last save wins; there is one owner).
- Offline editing or a queue of unsent changes.

## Sources
- `docs/scope/scope.md` → feature 12. Specs 0004, 0012, 0013, 0014. `supabase/schema.sql`,
  `src/lib/supabase.ts`, `src/lib/auth.ts`, `src/lib/catalog.ts`, `src/content.config.ts`,
  `src/components/ProductCard.astro`, `src/pages/producto/[id].astro`,
  `src/pages/estilo.astro`, `scripts/check-weight.mjs`, `design.md`.
- Owner answers, 2026-10-27: the photo is optional, with a "Sin foto" box; a quick stock switch
  in the list; online research allowed.
- `researcher`, 2026-10-27, PostgREST (docs.postgrest.org, stable):
  - references/api/preferences (`return=representation`; `handling=strict` and
    `max-affected`, PGRST124, PGRST122);
  - references/errors (23505 and 23503 → 409, 23502 → 400, other errors → 400, 42501 → 403
    when authenticated, PGRST301/302/303 → 401);
  - references/api/tables_views (insert → 201);
  - supabase.com/blog/postgrest-12-2 and supabase.com/docs/reference/dart/using-modifiers-maxaffected
    (`max-affected` needs v12.2 or v13).
- Owner answers, 2026-10-28 (amendment): a refusal that is not the owner's data gets its own
  message, "Error del sistema, no es culpa tuya. Avisa a quien mantiene la web.". Trigger: a
  `400` `21000` from spec 0016's trigger showed "Algún dato no es válido" with nothing wrong in
  the form.
- Postgres SQLSTATE classes `22` (data exception) and `23` (integrity constraint violation):
  from memory, not looked up; the classes are part of the SQL standard and stable.
- **Not confirmed, tested by T3 and the ACs:**
  - a PATCH or DELETE that matches no row answers 200 `[]` (from memory, not docs). The
    one-row check covers both cases;
  - the hosted PostgREST version, so `max-affected` is not used;
  - whether Supabase's error bodies include `details` and `hint` (only `code` is read);
  - CORS for PATCH and DELETE from the site's origin (T5);
  - a check constraint passing on `null` (standard SQL; AC1 and AC3 show it).

---
## Rationale
<!-- History, not build input. /develop does not read below this line. -->
**Options considered:**
- Photo optional with a "Sin foto" box (chosen, owner) vs a generic `sin-foto.jpg` in the
  bucket as the column default (runner-up: no public code changes, but a fake photo stored as
  data, an extra image to download on slow connections, and feature 14 would have to decide
  again what "no photo" means). The chosen option moves forward one done-when line of feature
  14 ("a product without a photo still shows correctly"), because feature 12 cannot add a
  product without it.
- Quick stock switch in the list (chosen, owner) vs stock only in the form (runner-up: one way
  to do it and less code, but three taps for the most frequent change, on slow data).
- Native checkbox for stock vs a `role="switch"` button: the checkbox needs no ARIA, and the
  `sr-only` name tells screen readers which product it belongs to.
- Id from the name, fixed (chosen) vs an id that follows renames (rejected: links already
  shared in WhatsApp would break) vs random ids (rejected: unreadable URLs, and the seed uses
  readable slugs).
- Admin list A–Z inside each category vs the catalog's "in stock first" order: a row must not
  jump away when its stock switch is tapped.
- In-page delete confirmation (chosen) vs `confirm()`: some in-app browsers block it, and it
  cannot be styled or translated.
- Writes through PostgREST with RLS (chosen) vs an Edge Function per write: RLS already
  protects each row, and a function would add a deploy and a second place for rules. Spec 0012
  keeps Edge Functions for actions that need a secret.
- Rows from `<template>` + `textContent` vs building HTML strings: classes stay written in
  full where Tailwind sees them, and owner text can never become markup.

**Assumptions and risks:**
- Writes change the live data at once, but the public site changes only on the next build.
  Until feature 13 ships, a `git push` or a manual deploy hook call publishes them.
- An owner who deletes every product but one, then deletes that one in the dashboard, empties
  the table. The next build then fails, and the live site keeps the last catalog (spec 0013).
- `es-ES` dots in prices are read as thousands separators. An owner who types "1.5" gets 15,
  not an error. CUP prices are whole numbers, so this is accepted.
- The one-row check assumes PostgREST returns the affected rows with
  `return=representation`. T3 confirms it before the UI is built on top.

**Amendment 2026-10-28, options considered:** its own `system` message (chosen, owner) vs
reusing `unknown`, "Algo salió mal. Inténtalo otra vez." (runner-up, recommended: no new kind,
but it invites a retry that cannot help when the SQL itself is wrong) vs keeping every 400 as
`invalid` (rejected: it sent the owner to check a form with nothing wrong in it). The `22`/`23`
class test vs a fixed list of codes: the classes also cover data codes not seen yet, such as a
value too long (`22001`) or out of range (`22003`).

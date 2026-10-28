# 0015 · Manage products — manual check steps

Run from the project root. "Clean" means `pnpm typecheck` and `pnpm build` exit 0. `pnpm build`
reads `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from `.env` by itself; never open or print
`.env`. Keep passing the fake WhatsApp number inline: `WHATSAPP_NUMBER=5355555555 pnpm build`.

**Before any step:** `supabase/products-write.sql` has run once in the Supabase SQL editor (after
`auth.sql`).

**Places:**
- Local: `pnpm dev` (or `pnpm preview` after a build), then `http://localhost:4321/admin/`, signed
  in as the owner.
- Live: `https://tienda-demo-cuba.vercel.app/admin/` after the owner pushes `main` (git
  integration is off, so `/develop` does not push).

**Phone width:** DevTools device emulation at 360 px (headless windows cannot go that narrow).

**Variables in the `curl` commands:** `$URL` is the project URL and `$KEY` the publishable key,
both public by design. They can be read from the built page:
`grep -o 'data-supabase-[a-z]*="[^"]*"' dist/admin/index.html`.

**Real data:** every write below changes the live Supabase tables. Each step that adds a product
deletes it at the end, and each step that edits one restores its old value.

- **AC1 (database: only the owner writes):**
  - SQL editor:
    `select is_nullable from information_schema.columns where table_name = 'products' and column_name = 'photo_path';`
    → `YES`.
  - SQL editor: run the commented AC1 block of `supabase/products-write.sql` with a real category
    id (e.g. `granos-y-pastas`; `select id from categories;`) → `42501` (new row violates
    row-level security policy). Run it again with `'{"app_metadata":{"role":"owner"}}'` → the
    insert works (`INSERT 0 1`), then `rollback;`. Finally `select count(*) from products where id = 'prueba';` → `0`.
  - Publishable key only (each must be refused, and the table must not change):
    - `curl -s -o /dev/null -w "%{http_code}\n" -X POST "$URL/rest/v1/products" -H "apikey: $KEY" -H "Content-Type: application/json" -d '{"id":"prueba","name":"Prueba","category_id":"granos-y-pastas","price":1,"unit":"u","description":"d"}'`
      → `401`.
    - `curl -s -X PATCH "$URL/rest/v1/products?id=eq.arroz-blanco" -H "apikey: $KEY" -H "Content-Type: application/json" -H "Prefer: return=representation" -d '{"price":1}'`
      → `401`, or `200` with `[]` (no row touched). Then `select price from products where id = 'arroz-blanco';` is unchanged.
    - `curl -s -X DELETE "$URL/rest/v1/products?id=eq.arroz-blanco" -H "apikey: $KEY" -H "Prefer: return=representation"`
      → `401`, or `200` with `[]`. The row still exists.
- **AC2 (list, 360 px):**
  - Signed in: "Cargando productos…" shows briefly (DevTools → Network → throttling "Slow 4G"
    makes it visible), then one `h3` per category in the order of `/`, and inside each the
    products A–Z. Out-of-stock products appear, with "Disponible" unchecked.
  - Each row: the name (underlined, accent), `<unit> · <price>` with the price as on the public
    site (e.g. `12.500 CUP`), and a "Disponible" checkbox.
  - DevTools → Elements: each name button and each checkbox label measure at least 44 px high.
  - Network → "Offline", reload the signed-in page → the error message and a "Reintentar" button.
    Back "No throttling", tap "Reintentar" → the list loads.
- **AC3 (add):**
  - "Añadir producto" → title "Añadir producto", every field empty, Categoría "Elige una
    categoría", Disponible checked, no "Borrar producto".
  - Fill in Nombre "Café Cubano 250 g", any category, Precio `350`, Unidad `paquete de 250 g`,
    Descripción `Prueba.` → "Guardar" → the list shows "Producto guardado." and the product in its
    category, in A–Z place, without a full reload (Network: one `POST products`, status 201, no
    new `GET`).
  - SQL editor: `select id, photo_path from products where name = 'Café Cubano 250 g';` →
    `cafe-cubano-250-g`, `null`.
  - Add a second one with the same name → its id is `cafe-cubano-250-g-2`. Delete both at the end
    (AC6).
- **AC4 (edit):**
  - Tap a product's name → title "Editar producto", "Enlace: /producto/<id>", every field filled.
  - Change each field (name, category, price, unit, description, Disponible), "Guardar" →
    "Producto guardado.", the row shows the new values. Network: one `PATCH` whose body holds only
    the changed fields, never `id` or `photo_path`.
  - Reload the page → the changes are still there. SQL editor: the row's `id` is unchanged.
  - Restore the old values.
- **AC5 (stock switch):**
  - Tap a row's "Disponible" → the checkbox is disabled until the `PATCH` answers (throttling
    "Slow 4G" makes it visible). Reload → the new state is kept. Tap again to restore it.
  - Network → "Offline", tap a checkbox → it returns to its previous state and the list shows
    "Sin conexión. Revisa tus datos e inténtalo otra vez."
- **AC6 (delete):**
  - In the edit form of a test product (AC3), "Borrar producto" → "¿Borrar «<name>»? No se puede
    deshacer." with "Sí, borrar" and "No, volver".
  - "No, volver" → the block closes, nothing is sent (Network), the product still exists.
  - "Borrar producto" → "Sí, borrar" → back to the list with "Producto borrado." and without the
    product. SQL editor: the row is gone.
  - Last product: the real table cannot be emptied to one product without risk, so check it in
    code: `openForm()` in `src/pages/admin/index.astro` hides "Borrar producto"
    and shows "No puedes borrar el último producto: la tienda quedaría vacía." when
    `products.length <= 1`, and the delete click handler returns early in that case. (Emptying the
    real table would break the next build, spec 0013.)
- **AC7 (form refuses, no request):** keep Network open, cleared, with "Fetch/XHR". In "Añadir
  producto", "Guardar" with each of these shows the message on that field and sends nothing:
  - Nombre empty → "Escribe el nombre del producto."; Nombre `!!!` → "El nombre necesita al menos
    una letra o un número.";
  - no category → "Elige una categoría.";
  - Unidad empty → "Escribe la unidad, por ejemplo «paquete de 1 kg»."; Descripción empty →
    "Escribe una descripción corta.";
  - Precio `-5`, `0`, `abc`, `12,5`, empty → "El precio debe ser un número entero mayor que 0, sin
    decimales."
  - Typing in a field clears its message.
  - Precio `12.500` with valid fields → saved; SQL editor → `price = 12500`. Nombre
    `  Prueba espacios  ` → saved as `Prueba espacios`. Delete both.
- **AC8 (failures keep the work):**
  - Fill the add form, Network → "Offline", "Guardar" → "Sin conexión. Revisa tus datos e
    inténtalo otra vez." and every value is still in the form. Back online, "Guardar" works.
  - Open a test product's edit form; in the Supabase Table Editor delete that row; then "Guardar"
    → the list shows "Este producto ya no existe. La lista se ha actualizado." and reloads without
    it.
  - Local Storage → `admin-session`: set `refresh_token` to `x` and `expires_at` to `0`, then tap a
    checkbox → the sign-in view with "Tu sesión terminó. Entra de nuevo."
- **AC9 (public pages without a photo):** SQL editor:
  `update products set photo_path = null where id = 'arroz-blanco';` then
  `WHATSAPP_NUMBER=5355555555 pnpm build`:
  - `grep -c "Sin foto" dist/index.html dist/categoria/granos-y-pastas/index.html dist/producto/arroz-blanco/index.html`
    → at least `1` each, and those cards/pages have no `<img` for that product
    (`grep -o 'alt="Arroz blanco"' dist/producto/arroz-blanco/index.html` → nothing).
  - `grep -o 'og:image" content="[^"]*"' dist/producto/arroz-blanco/index.html` → ends in
    `/og-default.png`.
  - Another product, e.g. `dist/producto/huevos/index.html`, still has its `<img` and its own
    `og:image`. `/estilo` built (`dist/estilo/index.html` exists).
  - Restore: `update products set photo_path = 'arroz-blanco.jpg' where id = 'arroz-blanco';`
- **AC10 (clean, weight, no leaks):**
  - `pnpm typecheck`, `WHATSAPP_NUMBER=5355555555 pnpm build`, `pnpm check:weight` → exit 0; the
    `/admin/` line shows JS ≤ 15 KB gzipped.
  - `grep -rl "<script" dist --include=*.html` → only `dist/admin/index.html`.
  - `grep -rlE "supabase\.co|sb_publishable_" dist --include=*.html` → only `dist/admin/index.html`.
  - Live demo after a deploy: run AC4 and AC6 once (CORS for `PATCH` and `DELETE` from the site's
    origin).

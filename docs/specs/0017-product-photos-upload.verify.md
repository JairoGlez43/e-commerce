# 0017 · Product photos upload — manual check steps

Run from the project root. "Clean" means `pnpm typecheck` and `pnpm build` exit 0. `pnpm build`
reads `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from `.env` by itself; never open or print
`.env`. Keep passing the fake WhatsApp number inline: `WHATSAPP_NUMBER=5355555555 pnpm build`.

**Before any step:** `supabase/photos.sql` has run once in the Supabase SQL editor (after
`publish.sql`), and T1's recorded answers are in the spec.

**Places:**
- Local: `pnpm dev`, then `http://localhost:4321/admin/`, signed in as the owner.
- Live: `https://tienda-demo-cuba.vercel.app/admin/` after the owner pushes `main` (git
  integration is off, so `/develop` does not push).

**Phone width:** DevTools device emulation at 360 px (headless windows cannot go that narrow).

**Test photo:** a real phone photo of 12 MP or more (JPEG; and a HEIC from an iPhone if one is
available), taken with location on so it carries GPS in its EXIF.

**Real data:** every save changes the live Supabase tables and bucket. Use one test product added
for the checks and delete it at the end; check the bucket in the dashboard (Storage →
`product-photos`) after each step that should add or remove a file.

**Mocked answers:** DevTools → Network → right-click the request → "Override content" (or block
the request URL), or a headless run that intercepts `…/storage/v1/object/…` and
`…/rest/v1/products…`. Nothing mocked may reach Supabase.

- **AC1 (bucket guards itself):**
  - SQL editor: `select id, file_size_limit, allowed_mime_types from storage.buckets where id = 'product-photos';`
    → `2097152`, `{image/jpeg}`.
  - SQL editor: `select policyname, cmd from pg_policies where tablename = 'objects' and schemaname = 'storage';`
    → "owner uploads photos" (INSERT), "owner reads photo rows" (SELECT), "owner deletes photos"
    (DELETE).
  - Reload `/admin/` signed in (so the token is fresh), open the DevTools console and paste the
    snippet below. It prints only statuses and bodies, never the token. Expected: 1 owner upload
    200; 2 same path again refused (409 or a body saying it exists); 3 anonymous upload refused;
    4 `prueba.png` refused; 5 3 MB file refused (413 or a body saying too large); 6 delete 200;
    7 delete missing 200 or 404; 8 public URL after delete 400 or 404. Its upload is a `FormData`
    with one part named `file`, the same shape as `uploadPhoto()`.
    ```js
    (async () => {
      const root = document.getElementById('admin');
      const url = root.dataset.supabaseUrl, key = root.dataset.supabaseKey;
      const token = JSON.parse(localStorage.getItem('admin-session')).access_token;
      const obj = (p) => `${url}/storage/v1/object/product-photos/${p}`;
      const show = async (label, r) => console.log(label, r.status, await r.text());
      const form = (blob, name) => { const f = new FormData(); f.append('file', blob, name); return f; };
      const owner = { apikey: key, Authorization: `Bearer ${token}` };
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 8;
      const jpeg = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.8));
      const big = new Blob([new Uint8Array(3 * 1024 * 1024)], { type: 'image/jpeg' });
      const path = 'prueba-0a1b2c3d.jpg';
      await show('1 owner upload', await fetch(obj(path), { method: 'POST', headers: owner, body: form(jpeg, path) }));
      await show('2 same path again', await fetch(obj(path), { method: 'POST', headers: owner, body: form(jpeg, path) }));
      await show('3 anonymous upload', await fetch(obj('prueba-11111111.jpg'), { method: 'POST', headers: { apikey: key }, body: form(jpeg, 'prueba-11111111.jpg') }));
      await show('4 png name', await fetch(obj('prueba.png'), { method: 'POST', headers: owner, body: form(jpeg, 'prueba.png') }));
      await show('5 3 MB file', await fetch(obj('prueba-22222222.jpg'), { method: 'POST', headers: owner, body: form(big, 'prueba-22222222.jpg') }));
      await show('6 delete existing', await fetch(obj(path), { method: 'DELETE', headers: owner }));
      await show('7 delete missing', await fetch(obj(path), { method: 'DELETE', headers: owner }));
      await show('8 public URL after delete', await fetch(`${url}/storage/v1/object/public/product-photos/${path}`));
    })();
    ```
    If 1 is refused but the bucket rules look right, repeat 1 with `body: jpeg` and
    `headers: { ...owner, 'Content-Type': 'image/jpeg' }` and record both answers (spec 0017, T1).
- **AC2 (the Foto block at 360 px):**
  - "Añadir producto": the "Sin foto" box, "Hacer foto" and "Elegir de la galería", no "Quitar
    foto".
  - Edit a seed product (it has a photo): its square photo, the same two buttons with the same
    labels, and "Quitar foto".
  - Tab with the keyboard to "Hacer foto": an outline shows around it and not around "Elegir de la
    galería". Tab once more: the outline moves to "Elegir de la galería" only. Every control
    measures ≥ 44 px high (DevTools box model).
  - On an Android phone in Chrome: "Hacer foto" opens the camera directly, "Elegir de la galería"
    opens the gallery. A photo taken with the camera reaches the preview like a picked one. Same on
    an iPhone in Safari if one is available (note whether the gallery hands over JPEG or HEIC).
  - On a desktop browser: both buttons open the normal file picker.
- **AC3 (shrunk on the phone):**
  - Choose the test photo: "Preparando foto…" shows, "Guardar" is disabled, then the new preview and
    "La foto nueva se subirá al guardar.". The network panel shows no request yet.
  - "Guardar": one `POST …/storage/v1/object/product-photos/<id>-<8 hex>.jpg`, request size under
    2 MB.
  - Open its public URL (`…/storage/v1/object/public/product-photos/<path>`) and save the file:
    the shorter side is 1000 px, the longer ≤ 2000 px, it is upright as on the phone, and
    `grep -c Exif <file>` → `0` (no EXIF, no GPS).
  - Choose a photo smaller than 1000 px on its shorter side: the uploaded file has the same size.
- **AC4 (save with a photo):**
  - Edit the test product, change its name and choose a photo, "Guardar": the network panel shows
    the upload, then one `PATCH` with the new name and `photo_path`, then a `DELETE` of the old
    file (if it had one). "Producto guardado." Reopen it: the new photo shows. The old file is gone
    from the bucket.
  - "Añadir producto" with a photo: the upload, then one `POST` whose row has the new `photo_path`.
- **AC5 (remove and cancel):**
  - "Quitar foto" on a product with a photo: the "Sin foto" box and "La foto se quitará al
    guardar.". "Guardar": `photo_path` is null in the table, and the file is gone from the bucket.
  - Choose a photo, then "Cancelar": nothing sent, the row unchanged. Same after "Quitar foto".
  - While saving with a new photo (throttle to "Slow 3G"), the button reads "Subiendo foto…", then
    "Guardando…".
- **AC6 (failures save nothing):**
  - DevTools offline, "Guardar" with a new photo: "Sin conexión. Revisa tus datos e inténtalo otra
    vez.", every value and the chosen photo kept, the row unchanged.
  - Upload mocked 403 → "Esta cuenta no puede cambiar el catálogo."; 413 and 415 → "Error del
    sistema, no es culpa tuya. Avisa a quien mantiene la web."; 500 → "Algo salió mal. Inténtalo
    otra vez.". The console logs the status for 413, 415 and 500.
  - Upload real, `PATCH` mocked 400 `{"code":"23514"}` → "Algún dato no es válido. Revisa el
    formulario.", and the file just uploaded is not in the bucket.
  - Choose a text file renamed `.jpg` → "No se pudo abrir esta foto. Prueba con otra.", the
    previous photo (or "Sin foto") still shows.
- **AC7 (deleting a product deletes its photo):** delete the test product with a photo: the row and
  its file are gone. With the file `DELETE` mocked 500: "Producto borrado." still shows, the row is
  gone, and the console logs `[photos] DELETE …`.
- **AC8 (public site after publishing):** give a product a large phone photo, replace another's,
  remove a third's, then "Publicar cambios" and wait for "Publicado…". On the live site: the new
  photo on `/`, its category page and its product page (`og:image` in the page source points at
  the new photo); the replaced one shows the new image; the removed one shows "Sin foto". Locally,
  with a 3:4 phone photo of 12 MP or more in the catalog:
  - `WHATSAPP_NUMBER=5355555555 pnpm build && pnpm check:weight` passes: thumbnail ≤ 30 KB,
    detail photo ≤ 90 KB, first view ≤ 150 KB (spec 0001 as amended).
  - Every product image file in `dist/_astro` is square (card 200 and 400 px, detail 400 and
    800 px, the 600×600 `og:image`). This prints only the count when all are square:
    ```sh
    node -e "const sharp=require('sharp'),fs=require('fs');const files=fs.readdirSync('dist/_astro').filter(f=>/\.(webp|jpg)$/.test(f));Promise.all(files.map(f=>sharp('dist/_astro/'+f).metadata().then(m=>m.width===m.height||console.log('not square',f,m.width,m.height)))).then(()=>console.log(files.length,'files checked'))"
    ```
    A source whose shorter side is under 800 px may come out smaller than its target, never
    stretched.
  - At 360 px, `/` and a seed product's page: the seed photos look as before (they were already
    square).
  Restore the seed photos afterwards (upload them again from `supabase/seed-photos/`) if the demo
  should look as before.
- **AC9 (clean, nothing else broke):** `pnpm typecheck`, the build and `pnpm check:weight` pass;
  `/admin/` JS ≤ 15 KB gzipped. `grep -rl "<script" dist --include=*.html | grep -v dist/admin/`
  and `grep -rlE "supabase\.co|sb_publishable_" dist --include=*.html | grep -v dist/admin/` find
  nothing. Sign in, save a product without touching the photo, tap a stock switch, and publish:
  all work as before.
- **AC10 (CORS on the live demo):** on `https://tienda-demo-cuba.vercel.app/admin/`, save a product
  with a new photo and then "Quitar foto" + "Guardar": no CORS error in the console, both requests
  succeed.

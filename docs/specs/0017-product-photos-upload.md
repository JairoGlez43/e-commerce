# 0017 · Product photos upload

**Status:** In Progress
<!-- Proposed → In Progress → Accepted · Assumed (recorded by /develop, awaiting ratification) · Superseded by NNNN -->
**Date:** 2026-10-29
**Scope:** `docs/scope/scope.md` → feature 14
**Supersedes:** — (amends spec 0015: the admin now writes `photo_path`, through the photo flow
only, and a deleted product's photo is removed from the bucket. Amends spec 0013's path rule:
uploaded photos are `<id>-<8 hex>.jpg`, while seed photos keep `<id>.jpg`. Amends spec 0014's
`authFetch()`: it no longer forces a JSON `Content-Type` on a `FormData` body. Amends spec
0001's weight budget: a catalog thumbnail may weigh up to 30 KB and a detail photo up to 90 KB.)
**Updated:** 2026-10-31, after `/check verify` found two failures: no camera on Android Chrome
(AC2) and a phone photo over the weight budget on the public pages (AC8). See "Update
2026-10-31" in the Rationale.

## Summary
The owner adds or changes a product's photo from `/admin/`. The phone shrinks the photo to a
light JPEG before it travels, and "Guardar" uploads it to Supabase Storage with the rest of the
form. Two buttons let the owner take a new photo with the camera or pick one from the gallery.
The public pages crop every product photo to a square when the site is built, so what visitors
download matches what they see, within the weight budget.

## Context
The owner manages products from `/admin/` (spec 0015), but a product added there has no photo,
and the bucket `product-photos` has no upload policies (spec 0013). Phone photos are 3–12 MB
and often HEIC, and the owner uploads them over slow, expensive mobile data in Cuba. The public
pages already handle a missing photo (`NoPhoto`, spec 0015). They also resize every remote
photo at build with `astro:assets`, by width only, and show it as a square through CSS
(`aspect-square object-cover`). The seed photos are square; a phone photo is usually 3:4.

What `/check verify` measured on 2026-10-30 and 2026-10-31:
- On the owner's Android phone in Chrome, `<input type="file" accept="image/*">` opens only
  the gallery (Android's photo picker). The camera is never offered.
- A real 3:4 phone photo builds into a 400×533 thumbnail (29.2 KB, budget 25) and an
  800×1066 detail photo (82.6 KB, budget 80). CSS hides a quarter of those pixels, but the
  visitor still downloads them. Cropped to a square at the same quality (WebP 80, the default),
  the two real phone photos measure 22 to 26 KB at 400 px and 57 to 77 KB at 800 px.

## Decision
- **The phone shrinks the photo before uploading it.** The admin decodes the chosen file and
  draws it on a canvas, its shorter side at most 1000 px. It then re-encodes it as JPEG
  (quality 0.8), which comes to a few hundred KB instead of several MB. Re-encoding also drops
  the EXIF metadata, including the GPS location of the owner's home, and turns iPhone photos
  into plain JPEG. No library is used.
- **The photo is one more field of the product form, saved by "Guardar"** (owner's choice). The
  owner sees it at once as a square preview (the same crop as the public site), and the upload
  happens on save. It works when adding a product too.
- **Two buttons, "Hacer foto" and "Elegir de la galería"** (owner's choice, 2026-10-31). Each is
  a label for its own `<input type="file" accept="image/*">`. The camera one adds
  `capture="environment"` (the attribute that asks the phone to open the rear camera
  directly); the gallery one has no `capture`. A browser without `capture` support, such as a
  desktop browser, shows its normal file picker for both.
- **The public pages crop every product photo to a square at build.** Each `<Image>` and the
  `og:image` get the same width and height plus `fit="cover"`, so `astro:assets` cuts the
  square (centered, like CSS `object-cover` and the admin preview) before encoding. Quality
  stays at the default, WebP 80 (owner's choice), and the budget rises to 30 KB per thumbnail
  and 90 KB per detail photo (amends spec 0001).
- **"Quitar foto"** (owner's choice) brings a product back to "Sin foto" on save.
- **Every upload gets a new file name**, `<id>-<8 random hex>.jpg`, and never overwrites. A new
  URL can never be served stale by Supabase's CDN, the browser or the build's image cache.
- **All or nothing.** The photo goes up first, then one write saves the fields and `photo_path`
  together. If that write fails, the new file is deleted. Then the old file is deleted. Cleanup
  failures are only logged, because an orphan file harms nobody: visitors never load photos
  from Supabase (spec 0013).
- **The bucket guards itself:** RLS on `storage.objects` lets only `is_owner()` insert, read
  rows and delete in `product-photos`. Names must match the path rule. The bucket refuses
  anything that is not JPEG or is over 2 MB.

## Acceptance criteria
- **AC1:** After `supabase/photos.sql` runs in the SQL editor:
  - `product-photos` shows `file_size_limit` 2097152 and `allowed_mime_types` `{image/jpeg}`;
  - an upload with only the publishable key is refused;
  - an upload with the owner's token works for `prueba-0a1b2c3d.jpg` and is refused for
    `prueba.png` and for a 3 MB JPEG;
  - the owner's token deletes `prueba-0a1b2c3d.jpg`, and its public URL then answers 400 or 404.
- **AC2:** In the product form (add and edit) at 360 px:
  - the buttons "Hacer foto" and "Elegir de la galería" always show, with the same labels with
    or without a photo;
  - a product without a photo shows the "Sin foto" box and no "Quitar foto";
  - with a photo, the square preview and "Quitar foto" show;
  - on Android Chrome, "Hacer foto" opens the camera and "Elegir de la galería" opens the
    gallery; a photo taken with the camera reaches the preview like a picked one (iOS Safari
    too when a device is available);
  - on a desktop browser, both buttons open the normal file picker.
  - Targets are at least 44 px. Keyboard focus on each button shows its own outline, and only
    its own.
- **AC3:** Choosing a 12 MP or larger phone photo shows "Preparando foto…", then the new
  preview and the line "La foto nueva se subirá al guardar.". Nothing is sent before
  "Guardar". In the network panel, the upload on save is a single JPEG under 2 MB:
  - its shorter side is 1000 px and its longer side at most 2000 px;
  - it is upright, as the photo shows on the phone;
  - downloaded from its public URL, it has no `Exif` segment.
  A photo already smaller than 1000 px is not enlarged.
- **AC4:** Saving an edited product with a new photo:
  - uploads `<id>-<8 hex>.jpg`, then sends one PATCH with the changed fields and `photo_path`;
  - deletes the old file from the bucket (visible in the dashboard);
  - returns to the list with "Producto guardado.".
  Reopening the product shows the new photo. Adding a product with a photo does the same with
  one POST, and its row holds the new `photo_path`.
- **AC5:** "Quitar foto" shows the "Sin foto" box and "La foto se quitará al guardar.".
  "Guardar" sets `photo_path` to null and deletes the file. "Cancelar" changes nothing, both
  after choosing a photo and after "Quitar foto". During a save, the button reads
  "Subiendo foto…" during the upload, then "Guardando…".
- **AC6:** Failures save nothing and keep the owner's work:
  - with the network off, "Guardar" with a new photo shows "Sin conexión. Revisa tus datos e
    inténtalo otra vez.". The form keeps every value and the chosen photo, and the row is
    unchanged;
  - an upload answered 403 (mocked) shows "Esta cuenta no puede cambiar el catálogo.";
  - an upload answered 413 or 415 (mocked) shows "Error del sistema, no es culpa tuya. Avisa a
    quien mantiene la web.";
  - an upload answered 500 (mocked) shows "Algo salió mal. Inténtalo otra vez.";
  - a PATCH that fails after the upload worked (mocked 400 `23514`) shows its spec 0015
    message, and the new file is deleted from the bucket;
  - a file the browser cannot decode (for example a `.txt` renamed `.jpg`) shows "No se pudo
    abrir esta foto. Prueba con otra." and keeps the previous photo state.
- **AC7:** Deleting a product that has a photo also deletes its file from the bucket. If the
  file delete fails (mocked), the product is still deleted, "Producto borrado." shows, and the
  console logs the failure.
- **AC8:** After "Publicar cambios" (spec 0016) and the build:
  - a product given a large phone photo shows it on `/`, on its category page and on its
    product page, and its `og:image` is the new photo;
  - a replaced photo shows the new image, never the old one;
  - a removed photo shows the "Sin foto" box;
  - every product image file in `dist/` is square: the card's 200 and 400 px versions, the
    detail page's 400 and 800 px versions and the 600×600 `og:image` (a source whose shorter
    side is under 800 px may come out smaller, never stretched);
  - with a 3:4 phone photo of 12 MP or more in the catalog, `pnpm check:weight` passes:
    thumbnail ≤ 30 KB, detail photo ≤ 90 KB, first view ≤ 150 KB (spec 0001 as amended);
  - the seed photos look the same as before (they were already square).
- **AC9:** `pnpm typecheck`, `pnpm build` and `pnpm check:weight` pass. `/admin/` JS stays
  within its 15 KB gzipped limit. No public route has a `<script>` tag or contains
  `supabase.co` or `sb_publishable_`. Sign-in, a product save without a photo and a publish
  still work after the `authFetch()` change.
- **AC10:** On the live demo, an upload and a delete from `https://tienda-demo-cuba.vercel.app/admin/`
  work (CORS for Storage).

## Design

**`supabase/photos.sql`** (new file, run once in the SQL editor after `publish.sql`. Order in a
new shop: `schema.sql` → `seed.sql` → `auth.sql` → `products-write.sql` → `publish.sql` →
`photos.sql`)
```sql
-- The owner's photo uploads (spec 0017). Public reads stay as they are (schema.sql): the bucket
-- is public, so a photo's public URL needs no policy.
-- The bucket refuses what the admin never sends: anything but JPEG, or over 2 MB.
update storage.buckets
  set file_size_limit = 2097152, allowed_mime_types = array['image/jpeg']
  where id = 'product-photos';

-- Names follow the upload rule <id>-<8 hex>.jpg (seed photos, <id>.jpg, match it too).
create policy "owner uploads photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-photos' and public.is_owner()
              and name ~ '^[a-z0-9]+(-[a-z0-9]+)*\.jpg$');
-- Storage reads the object row before deleting it.
create policy "owner reads photo rows" on storage.objects
  for select to authenticated
  using (bucket_id = 'product-photos' and public.is_owner());
create policy "owner deletes photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-photos' and public.is_owner());
```
- There is no update policy: nothing is ever overwritten (no `x-upsert`).
- The column names `file_size_limit` (bytes) and `allowed_mime_types` (text[]) are not
  confirmed by the docs. T1 checks them first with
  `select id, file_size_limit, allowed_mime_types from storage.buckets;`. If they differ, stop
  and return to `/architect`.
- A change to `photo_path` fires the `touch_catalog()` trigger of spec 0016, so the admin shows
  "changes to publish" after a photo change, with no new code.

**`src/lib/auth.ts`** (one-line change in `send()`): set `Content-Type: application/json` only
when `init.body` is not a `FormData`. With `FormData`, the browser writes the multipart header
and its boundary. Every other request is unchanged.

**`src/lib/photos.ts`** (new browser module, imported by the admin page's script; the single home
of the photo rules)

| Function | What it does |
|---|---|
| `preparePhoto(file: File): Promise<Blob>` | `createImageBitmap(file)`, which applies EXIF orientation by default (`imageOrientation: "from-image"`). Scale `s = min(1, 1000 / shorter side, 2000 / longer side)`. Draw on a canvas of the rounded scaled size, filled white first (so a transparent PNG does not turn black). Then `canvas.toBlob(…, 'image/jpeg', 0.8)` and `bitmap.close()`. Any failure, or a `null` blob, throws `PhotoError('unreadable')`. |
| `photoPath(id: string): string` | `` `${id}-${hex}.jpg` ``, where `hex` is 8 lowercase hex characters from `crypto.getRandomValues` (4 bytes). Never from the clock. |
| `uploadPhoto(id: string, photo: Blob): Promise<string>` | `authFetch('/storage/v1/object/product-photos/<path>', { method: 'POST', body })`, where `body` is a `FormData` with the blob as its one file part, named `<path>`. Expects 200 and returns the path. Anything else throws through `photoFailure()`. |
| `deletePhoto(path: string): Promise<void>` | `authFetch('/storage/v1/object/product-photos/<path>', { method: 'DELETE' })`. A 200 or a 404 counts as deleted. **It never throws**: every failure, including `AuthError`, is logged with `console.error` (method, path, status). |
| `publicPhotoUrl(supabaseUrl: string, path: string): string` | `${supabaseUrl}/storage/v1/object/public/product-photos/${path}`, for the admin preview of the current photo. The page passes the URL it already reads from `data-supabase-url`. |

- The bucket name appears once here for the browser, and once in `src/lib/supabase.ts` for the
  build. Each copy has a comment naming the other. Importing between them would drag build-only
  or browser-only code across.
- **Errors:** `photoFailure()` returns a `ProductError` (spec 0015), so the page's messages
  stay in one table:
  - `forbidden`: HTTP 403, or a JSON body whose `statusCode` is `"403"` (older Storage versions
    answer 400 with it; T1 records which);
  - `system`: any other 4xx (for example 413 too large, 415 wrong type, 400);
  - `unknown`: anything else.
  `system` and `unknown` log the method, path, status and body `error` with `console.error`, as
  in spec 0015. `AuthError` passes through unchanged.
- **`PhotoError`** has one kind, `unreadable`, with the message "No se pudo abrir esta foto.
  Prueba con otra.".
- Paths in URLs are joined as they are: the path rule allows only `a-z0-9-.`, so they need no
  encoding.

**`src/lib/products.ts`** (changes)
- `type PhotoChange = { kind: 'keep' } | { kind: 'new'; photo: Blob } | { kind: 'remove' }`.
- **`saveProduct(…)` is the single home of the save order**, for add and edit. The page only
  calls it. It accepts the existing row (or none), the checked `fields`, a `PhotoChange`, the
  taken ids, and `onStep(step: 'uploading' | 'saving')` for the button label.
  1. **Add:** `id = productId(fields.name, takenIds)`. **Edit:** `id = row.id`.
  2. `new`: `onStep('uploading')`, then `path = await uploadPhoto(id, photo)`. If it fails,
     throw: nothing was saved.
  3. `onStep('saving')`. Add: POST `{ id, ...fields, photo_path? }`. Edit: PATCH
     `changedFields()` plus `photo_path` (the new path, or `null` for `remove`). If there is
     nothing to send, skip the PATCH and return the row.
  4. If step 3 fails after an upload: `await deletePhoto(path)`, then rethrow the step 3 error.
  5. On success, when the photo was replaced or removed and the old `photo_path` was set:
     `await deletePhoto(old)`. Then return the row.
- `addProduct()` and `updateProduct()` accept `photo_path` only from `saveProduct()`. The
  "never send `photo_path`" rule of spec 0015 becomes "only `saveProduct()` sends it". The
  stock switch is unchanged.
- **`removeProduct(row)`** is DELETE as before; after it succeeds, `deletePhoto(row.photo_path)`
  when set.

**`src/pages/admin/index.astro`** (product form view)
- **A "Foto" block first in the form**, above "Nombre":
  - a `font-medium` label "Foto";
  - the preview: an `<img alt="">` with
    `aspect-square w-full max-w-60 rounded-card border border-border object-cover`, or
    `<NoPhoto framed />`. Only one is visible at a time, toggled with `hidden`. The image is
    decorative because the name field names the product.
  - the controls (updated 2026-10-31): two pairs, each an input plus its label, in this order:
    - `<input id="product-photo-camera" type="file" accept="image/*" capture="environment" class="peer sr-only">`
      with `<label for="product-photo-camera">Hacer foto</label>`;
    - `<input id="product-photo-gallery" type="file" accept="image/*" class="peer sr-only">`
      with `<label for="product-photo-gallery">Elegir de la galería</label>`.
    Each label is styled as the secondary button of `design.md`, with
    `inline-flex min-h-11 items-center` and a visible outline on `peer-focus-visible:`. **Each
    pair sits in its own wrapper element** (for example a `<div>` inside the row that wraps
    them): Tailwind's `peer` works through the CSS sibling selector `~`, which reaches every
    later sibling, so without a wrapper the gallery label would also light up when the camera
    input has focus. The labels never change text.
  - "Quitar foto": a link-style button with `text-accent`, shown only while a photo is
    previewed;
  - one `text-sm text-muted` status line (`role="status"`): "Preparando foto…", "La foto nueva
    se subirá al guardar." or "La foto se quitará al guardar.". Empty otherwise.
- **State:** the page keeps one `PhotoChange`, which is `keep` when the form opens.
  - Choosing a file runs `preparePhoto()`. "Guardar" is disabled while it runs. On success the
    change becomes `new` and the preview shows `URL.createObjectURL(blob)`; that URL is revoked
    when replaced or when the form closes. On `unreadable`, the message goes to the form's alert
    area and the state stays as it was.
  - "Quitar foto" sets `remove` when the row had a photo, and `keep` when only a new, unsaved
    photo was showing. Focus then moves to the camera input. Both inputs' `value` is reset
    each time, so the same file can be picked again.
  - Both inputs share one `change` handler and one `choosePhoto()`; whichever fired, the newest
    choice wins (the existing `photoRun` counter). During a save both inputs are disabled, and
    `resetPhoto()` clears both.
  - In edit mode, the preview of the current photo is
    `publicPhotoUrl(data-supabase-url, row.photo_path)`. It loads only when the form opens.
- **Saving:** "Guardar" calls `saveProduct()`. `onStep` sets the label to "Subiendo foto…" or
  "Guardando…" (spec 0014's "…" pattern). Errors use the spec 0015 table and its "Then" column.
  `PhotoError('unreadable')` cannot happen at save time. On success: the list, "Producto
  guardado.".
- **Delete** calls `removeProduct()`. Its messages are unchanged.
- Owner values still reach the DOM through `textContent` only. The preview's `src` is either a
  `blob:` URL the page made or a URL built from the configured Supabase URL and a path that
  matches the path rule.

**Public pages** (updated 2026-10-31): `astro:assets` downloads each photo by its URL at build. A
new path means a new download. Every product photo rendition becomes a square at build. Only
these props change; `widths`, `sizes`, `inferSize`, `alt` and the classes stay as they are:

| File | Call | Add |
|---|---|---|
| `src/components/ProductCard.astro` | `<Image widths={[200, 400]}>` | `width={400} height={400} fit="cover"` |
| `src/pages/estilo.astro` | the card sample, `<Image widths={[200, 400]}>` | `width={400} height={400} fit="cover"` |
| `src/pages/producto/[id].astro` | `<Image widths={[400, 800]}>` | `width={800} height={800} fit="cover"` |
| `src/pages/producto/[id].astro` | `getImage({ …, width: 600, format: 'jpg' })` for `og:image` | `height: 600, fit: 'cover'` |

- Checked in the installed Astro 7.3.5: `getSrcSet()` in `node_modules/astro/dist/assets/services/service.js`
  gives every `widths` entry the height `width / (width / height)` and keeps `fit`, so equal
  `width` and `height` make every srcset file square. The sharp service resizes with
  `fit: 'cover'` and `position` unset, and sharp's own default position is `'centre'`
  (`node_modules/sharp/lib/index.d.ts`), so the crop is centered.
- The sharp service also passes `withoutEnlargement: true`, so a source smaller than the target
  is not enlarged and may not come out square. Uploads are at least 1000 px on their shorter
  side unless the original was smaller (AC3). The CSS classes `aspect-square object-cover` stay
  as the safety net for that case.
- Nothing in the bucket changes: the photos already uploaded, including the 3:4 one live today,
  come out square at the next build.

**Weight:** the admin keeps its limits (JS ≤ 15 KB gzipped, spec 0014). The JS measured on
2026-10-28 is 6.3 KB gzipped, and this adds roughly 1–2 KB. The upload is 150–600 KB per photo,
instead of 3–12 MB. The public budget is amended in spec 0001 and in `scripts/check-weight.mjs`
(`BUDGET.thumbnail` 30, `BUDGET.detailPhoto` 90). `firstView` stays 150: `/` shows at most 4
thumbnails in the first view (spec 0005), 4 × 30 = 120 KB.

**Security**
- The real guard is RLS on `storage.objects` with `is_owner()`, plus the bucket's own size and
  type limits. The path regex stops a name like `../x` or `x.html`.
- The re-encode strips EXIF, so no location from the owner's phone is published.
- The service-role key is still never used. Uploads carry the owner's JWT through `authFetch()`,
  so an expired token is refreshed and retried once (spec 0014).

## Build plan
- [x] **T1** (AC1) Check the bucket's column names, then write `supabase/photos.sql`. Guide the
  owner to run it. Run AC1 with `curl`, with the owner's token from a session. Record here the
  real answers to:
  - an upload as `FormData` (status and body);
  - the same path uploaded again;
  - an anonymous upload and `prueba.png` (status and body: 403, or 400 with `statusCode`);
  - a 3 MB file;
  - a delete of an existing path and of a missing path.
  If a `FormData` upload is refused while a raw JPEG body with `Content-Type: image/jpeg` works,
  record it and use the raw body. That needs no other change, since the `authFetch()` change
  covers only `FormData`.
  - 2026-10-29 (`/develop`): `supabase/photos.sql` written. Waiting for the owner to run the
    column check and the file, then the console snippet in `0017-product-photos-upload.verify.md`
    (AC1), whose upload has the same shape as `uploadPhoto()` (`FormData`, one part `file`).
    Flag for `/architect`: the raw-body fallback above is not change-free. `authFetch()` would
    still set `Content-Type: application/json` on a `Blob` body, so that fallback would also need
    the `send()` exception widened (for example, "only when the body is a string").
  - 2026-10-30: the owner ran `supabase/photos.sql` and the AC1 console snippet. Storage answers
    every refusal with HTTP 400 and the real status in the body's `statusCode` (a string), which
    `photoFailure()` already reads:
    - `FormData` upload, part `file`: 200 `{"Key":"product-photos/prueba-0a1b2c3d.jpg","Id":…}`.
      The raw-body fallback is not needed.
    - Same path again: 400 `{"statusCode":"409","error":"Duplicate","code":"KeyAlreadyExists"}`.
    - Anonymous upload: 400 `{"statusCode":"403","error":"Unauthorized","message":"new row
      violates row-level security policy","code":"AccessDenied"}`.
    - `prueba.png` as the owner: the same 400 / `"403"` body (the policy's name pattern).
    - 3 MB file: 400 `{"statusCode":"413","error":"Payload too large","code":"EntityTooLarge"}`.
    - Delete existing: 200 `{"message":"Successfully deleted"}`. Delete missing: 400
      `{"statusCode":"404","error":"not_found","code":"NoSuchKey"}`. Public URL after the delete:
      400 with the same `"404"` body.
    - Not tested here: a non-JPEG body under a `.jpg` name against `allowed_mime_types`; the app
      never sends one, since `preparePhoto()` always encodes JPEG.
- [ ] **T2** (AC9) `src/lib/auth.ts`: the `Content-Type` change. Run `pnpm typecheck`, then
  sign in and save a product with no photo on `localhost` to show nothing broke.
  - 2026-10-29 (`/develop`): changed; typecheck 0 errors. The sign-in + save on `localhost` needs
    the owner's credentials: still open.
  - 2026-10-30: the owner saved a product with no photo on `localhost`, but no write reached the
    database. `catalog_state.changed_at` is still `2026-10-29T18:15:09Z`, and the 19 rows match
    the 19 live pages. Most likely the form had no change, and then `saveProduct()` sends nothing.
    The admin kept "Hay cambios sin publicar" after publishing. The running `pnpm dev` serves
    `/build.json` with the stamp it loaded at start (`2026-10-28T22:44Z`), so localhost shows
    "pending" until the dev server restarts. This is spec 0016 behavior, not this change, and the
    comment in `src/pages/build.json.ts` ("local status always looks finished") is wrong. Flag for
    `/sync` as a known pitfall. Still open: restart `pnpm dev`, then save a real change.
  - Also from T1: `deletePhoto()` now also counts a body `statusCode: "404"` as deleted. Storage
    answers a missing file with HTTP 400, which would have logged a false failure. Typecheck 0 errors.
- [x] **T3** (AC3, AC6) `src/lib/photos.ts`: `preparePhoto`, `photoPath`, `uploadPhoto`,
  `deletePhoto`, `publicPhotoUrl`, `PhotoError`, `photoFailure`. Comment the bucket name in both
  places.
- [x] **T4** (AC4, AC5, AC6, AC7) `src/lib/products.ts`: `PhotoChange`, `saveProduct()`,
  `removeProduct()`, and `photo_path` accepted from `saveProduct()` only.
  - 2026-10-29 (`/develop`): `addProduct`, `updateProduct` and `deleteProduct` are no longer
    exported (`insertProduct`/`updateProduct` are module-private, `removeProduct(id)` replaces
    `deleteProduct`), so only `saveProduct()` can send `photo_path`. `removeProduct` deletes the
    photo of the row DELETE returned, which is the one the database held.
- [x] **T5** (AC2, AC3, AC5, AC6) `src/pages/admin/index.astro`: the Foto block, its state, the
  step labels, and calls to `saveProduct()` and `removeProduct()`.
  - 2026-10-29 (`/develop`): typecheck 0 errors, build 27 pages, `check:weight` all within
    budget (`/admin/` JS 7.5 KB gzipped). `scripts/check-weight.mjs` crashed on the preview
    `<img>`, which has no `src` until the script sets one. It now counts such an `<img>` as 0 KB,
    because it loads nothing. No public `<script>` and no Supabase values outside `dist/admin/`.
    Not rendered in a browser by `/develop`: the form needs a signed-in session or a mocked
    Supabase, which is `/check verify`'s run.
- [ ] **T6** (AC2, AC3, AC8, AC9, AC10) `pnpm typecheck`, `pnpm build`, `pnpm check:weight`. Then:
  - run the flows at 360 px on `localhost` with mocked failures;
  - on real phones, pick from the camera and from the gallery (Android Chrome; an iPhone if
    one is available, which shows whether Safari hands over JPEG or HEIC);
  - publish, check AC8 on the live demo, and check AC10.
- [x] **T7** Add the Foto block classes to `design.md`. Update the `learning/code/` walkthroughs
  for every new or changed file and `glosario.md` (canvas, Blob, FormData, object URL, EXIF).
  - 2026-10-29 (`/develop`): `design.md` has the Photo block and its states. New walkthroughs:
    `src/lib/photos.ts.md` and `supabase/photos.sql.md`. Updated: `products.ts`, `auth.ts`,
    `supabase.ts`, `admin/index.astro`, `check-weight.mjs`, and six walkthroughs with stale
    "until feature 14" lines. `glosario.md` has 11 new entries. A script compared every quoted
    block with its source and checked every link.

Added 2026-10-31 (from `/check verify`). Build T8 first: it fixes what is live today and can be
measured with the catalog as it is. T6 then runs again over everything. (Amended the same day:
the `learning/` folder was removed from the repo, so T8 and T9 no longer update walkthroughs or
`glosario.md`. T7's record above stays as history.)
- [x] **T8** (AC8, AC9) Square photos at build and the new budget:
  - the four calls in the "Public pages" table;
  - `scripts/check-weight.mjs`: `BUDGET.thumbnail` 30, `BUDGET.detailPhoto` 90;
  - `WHATSAPP_NUMBER=5355555555 pnpm build`, then `pnpm check:weight` against the current
    catalog, which holds the 3:4 arroz-blanco photo. Record its thumbnail and detail sizes here,
    and the pixel size of one file of each kind (all square);
  - look at `/` and one product page at 360 px: the seed photos look as before.
  - 2026-10-31 (`/develop`): the four calls and the two limits changed. `pnpm typecheck` 0 errors,
    build 27 pages, `pnpm check:weight` all 27 within budget. The 3:4 arroz-blanco photo:
    thumbnail 24.1 KB (was 29.2), detail photo 69.5 KB (was 82.6), `og:image` 62.5 KB; cropping
    alone already fits the old 25 / 80 limits. All 68 image files in `dist/_astro` are square
    (17 photos × 200, 400 and 800 px WebP plus the 600×600 JPG). `/estilo/` reuses the card's
    exact files. Seen at 360 px in headless Edge: `/` and `/producto/arroz-blanco/` show
    square, centered photos, and the seed photos look as before. A first capture with three
    360 px iframes at once showed the detail photo as broken; each file decodes alone, and a
    single iframe shows it, so that was the capture, not the build.
- [x] **T9** (AC2) The two photo buttons in `src/pages/admin/index.astro`, per the Design:
  - two inputs, two labels, one wrapper per pair, the shared handler, both disabled during a
    save and both reset;
  - `pnpm typecheck`, build, `check:weight` (`/admin/` JS stays ≤ 15 KB gzipped);
  - update `design.md` (Photo block);
  - update `0017-product-photos-upload.verify.md`: AC2's new labels and the per button focus
    check; AC8's square files and new limits.
  - 2026-10-31 (`/develop`): two inputs (`product-photo-camera` with `capture="environment"`,
    `product-photo-gallery`), each pair in its own `<div>`, one `change` handler per input into
    `choosePhoto()`, both disabled during a save and reset by `resetPhoto()`; "Quitar foto" focuses
    the camera input; the labels no longer change text. `pnpm typecheck` 0 errors, build 27 pages,
    `pnpm check:weight` all 27 within budget (`/admin/` JS 7.5 KB gzipped). `dist/admin/index.html`
    has both inputs, `capture` only on the camera one. `design.md` and the `.verify.md` updated; the
    verify file's square check (`sharp` metadata over `dist/_astro`) ran: 68 files, all square.
    Not run in a browser: the form needs a signed-in session, and the camera needs a real phone
    (T6).

## Out of scope
- More than one photo per product, and cropping, rotating or editing inside the admin (the
  public site crops to a square, and the preview shows that crop).
- Thumbnails in the admin product list, which stays text-only to keep it light.
- An upload progress bar (`fetch` has no upload progress). The button label shows the step.
- Supabase image transformations (a paid feature), and any image library.
- Cleaning up orphan files already in the bucket, or left by a logged cleanup failure.
- Offline uploads, or a queue of unsent photos.
- Decoding HEIC on browsers that cannot (for example, Android Chrome given a `.heic` file). It
  shows the `unreadable` message.
- Cropping to a square on the phone before the upload (added 2026-10-31): the build crops, so the
  bucket keeps the photo as taken.
- Saving a draft of the form while the camera app is open (added 2026-10-31). See the risk in
  "Update 2026-10-31".
- Changing the WebP quality of public photos: it stays at the default, 80 (owner's choice,
  2026-10-31).

## Sources
- `docs/scope/scope.md` → feature 14. Specs 0001 (image budget), 0013 (bucket, path rule),
  0014 (`authFetch`), 0015 (form, errors), 0016 (`touch_catalog()`). `supabase/schema.sql`,
  `supabase/auth.sql`, `src/lib/auth.ts`, `src/lib/products.ts`, `src/lib/supabase.ts`,
  `src/components/ProductCard.astro`, `src/pages/producto/[id].astro`,
  `src/pages/admin/index.astro`.
- Owner answers, 2026-10-29: online research allowed; a "Quitar foto" button; the photo is
  uploaded by "Guardar", as one more form field.
- `researcher`, 2026-10-29:
  - Upload route `POST /storage/v1/object/<bucket>/<path>`, which answers 200 `{ Id, Key }`
    and accepts multipart with one file. `x-upsert` counts only as `'true'`:
    github.com/supabase/storage `src/http/routes/object/createObject.ts`.
  - Delete route `DELETE /object/<bucket>/<path>`: `…/deleteObject.ts`.
  - Error codes: `ResourceAlreadyExists` 409, `AccessDenied` 403, `EntityTooLarge` 413,
    `InvalidMimeType` 415, `NoSuchKey` 404: `…/src/internal/errors/codes.ts`.
  - A plain upload needs only insert; upsert also needs select and update. Helpers: `bucket_id`,
    `name`, `storage.foldername()`, `owner_id`: supabase.com/docs/guides/storage/security/access-control.
  - Free plan global upload cap 50 MB, and bucket limits must stay below it:
    supabase.com/docs/guides/storage/uploads/file-limits, …/storage/buckets/creating-buckets.
  - The CDN invalidates about 60 s after an overwrite, browsers keep their copy until the
    cache TTL ends, and a new path per upload is recommended: supabase.com/docs/guides/storage/cdn/smart-cdn.
  - `createImageBitmap` `imageOrientation` defaults to `"from-image"`:
    developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap.
  - Safari's canvas area cap is 16,777,216 px: pqina.nl/blog/canvas-area-exceeds-the-maximum-limit/.
    The canvas here is at most 1000 × 2000 px.
- **Not confirmed, tested by T1 and the ACs:**
  - the SQL column names of the bucket limits (T1 first step);
  - whether delete needs a select policy (it is added anyway);
  - the JSON error body shape and the HTTP status of an RLS refusal (T1);
  - what deleting a missing object answers (200 and 404 are both accepted);
  - that a `FormData` upload with an `image/jpeg` part passes `allowed_mime_types` (T1);
  - CORS for Storage from the site's origin (AC10);
  - ~~that the camera and gallery are both offered without `capture`~~: refuted on Android
    Chrome, 2026-10-31 (see "Update 2026-10-31"). Safari's HEIC → JPEG hand-over is still
    unconfirmed (T6, real phones);
  - that a canvas re-encode drops EXIF (AC3 checks the uploaded file). Confirmed 2026-10-31 on a
    real Android photo: no `Exif` or `GPS` segment.
- `researcher`, 2026-10-31, MDN only (developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/capture):
  `capture` takes `user` or `environment`, works only on `<input type="file">`, asks the
  browser to open the camera instead of only a file picker, and is not supported everywhere
  (not Baseline); desktop browsers show a normal file picker. **Still unconfirmed, tested by T6
  on real phones:** that Android Chrome with `capture="environment"` opens the camera directly;
  what iOS Safari shows; whether a browser without support ignores the attribute silently; the
  Android photo picker change itself, which no doc found describes.
- Installed code read on 2026-10-31: Astro 7.3.5 `ImageFit` and `position` props
  (`node_modules/astro/dist/assets/types.d.ts`), `getSrcSet()` (`…/services/service.js`), the
  sharp service's `resize()` (`…/services/sharp.js`), and sharp's default `position: 'centre'`
  (`node_modules/sharp/lib/index.d.ts`).
- Measured 2026-10-31 with sharp 0.35.5, WebP, center crop, two real 3:4 phone photos (KB at
  400 / 800 px square): quality 80: 22.1 / 56.7 and 25.8 / 76.7; quality 75: 17.6 / 46.2 and
  21.8 / 62.1. The first photo started from an already compressed copy and reads about 9% low
  (its 3:4 version measured 26.7 KB here against 29.2 KB from the real build).

---
## Rationale
<!-- History, not build input. /develop does not read below this line. -->
**Options considered:**
- Shrink on the phone before upload (chosen) vs upload the original and let the build resize
  (runner-up: no canvas code, but 3–12 MB per photo on Cuban mobile data, HEIC files the build's
  sharp may not read, and the owner's GPS location published in the original file).
- Photo saved by "Guardar" (chosen, owner) vs upload as soon as it is chosen (runner-up: simpler
  failures, but a new product must be saved before it can get a photo).
- A new file name per upload (chosen) vs overwrite `<id>.jpg` with `x-upsert` (rejected: the CDN
  and browsers can serve the old photo for up to an hour, the build may cache by URL, and upsert
  needs extra select and update policies).
- Upload first, then one row write, with cleanup (chosen) vs write the row first, then upload
  (rejected: for a moment the row points at a file that does not exist yet, and a build in that
  window fails).
- Shorter side ≤ 1000 px (chosen): the largest public rendition is 800 px square (product page,
  `widths={[400, 800]}`), so 1000 keeps a margin for the square crop. Long side ≤ 2000 keeps
  panoramas small. Quality 0.8 is the common default for photos.
- 2 MB bucket limit: about 3× the largest expected upload, far below the 50 MB global cap.
- `ProductError` reused for Storage failures vs a separate error table: the owner sees the same
  messages for the same situations, and the page keeps one table.
- A "Sin foto" box via the existing `NoPhoto` component in the admin preview, so the admin and the
  public site show the same thing.

**Assumptions and risks:**
- Decoding a 48 MP photo with `createImageBitmap` takes about 190 MB of memory, so a low-end
  phone may fail. It then shows `unreadable`, and the owner can send a smaller photo (for example
  a screenshot). Using `resizeWidth` in `createImageBitmap` would avoid it, but its Safari
  support is unconfirmed.
- If a build reads the catalog just before a photo change and downloads the old file just after
  it is deleted, that build fails, and the live site keeps the last good build (spec 0013). The
  next publish fixes it.
- AGENTS.md says a product's photo is `<id>.jpg`. After this spec ships it is
  `<id>-<8 hex>.jpg` for uploads. `/develop` or `/sync` updates that line, not this skill.

**Update 2026-10-31** (after `/check verify`):
- *Camera.* Two buttons (chosen, owner): "Hacer foto" with `capture="environment"` and
  "Elegir de la galería" without it. Each says what it does, and the behaviour does not depend
  on which picker an Android version ships. Runner-up: one "Añadir foto" button that opens a
  small "Cámara / Galería" menu built in the page (one control, but one more tap and more
  script, and the same two inputs underneath). Rejected: gallery only (no code, but the owner
  must leave the admin to take each photo).
- *Weight: where to crop.* At build, with `fit="cover"` (chosen) vs on the phone before the
  upload (runner-up: 25% fewer bytes on the upload, but it fixes nothing already in the bucket,
  including the 3:4 photo live today, and it would leave the public budget depending on how
  every future photo arrives). The budget is a property of the public build, so the build is
  where the square is made. The public pages already crop to a square with CSS, so visitors see
  exactly what they saw before, only lighter.
- *Weight: quality vs budget.* The recommendation was WebP quality 75 within the old budget
  (measured 21.8 / 62.1 KB for the heavier photo, against 25 / 80). The owner chose to keep
  quality 80 and raise the budget to 30 / 90 KB instead, keeping today's image quality. That
  works: the heavier measured photo is 25.8 / 76.7 KB, about 15% under the new limits. The cost
  the owner accepts: on Cuban mobile data a page with photos weighs up to about 20% more than the
  old budget allowed, and a very detailed photo can still exceed 30 KB. `pnpm check:weight` is
  only run locally, never on Vercel, so such a photo would ship heavier without warning.
  Quality 75 stays the first lever if that happens.
- *Risk (from the `researcher`, widely reported but not documented by Android):* on phones with
  little memory, Android may close the browser tab while the camera app is open, and the page
  reloads with the form empty. The session survives (`localStorage`), so the owner is still
  signed in. The Foto block is first in the form, so in the usual order (photo first, then the
  fields) only the photo step is lost. A draft saved in `sessionStorage` would avoid it; it is
  out of scope until it happens on the owner's phone.
- *Seen in verify, not decided here:* on the phone the owner did not notice "Producto
  guardado." after a save, while the headless run at 360 px shows it under "Productos". The
  owner checks it again; if it is missing, that is a bug for `/debug`.

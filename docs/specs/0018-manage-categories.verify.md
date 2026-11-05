# 0018 · Manage categories — manual check steps

_Steps derived from spec 0018 acceptance criteria. The T3–T5 steps (AC-1, AC-3, AC-4, AC-6–AC-8,
AC-10, AC-12–AC-14) passed during `/develop` on 2026-11-04; AC-2, AC-5, AC-9 and AC-11 were checked
when T1 and T2 landed, not again here. `/check verify` runs these; `/test` locks the durable ones._

Run from the project root. "Clean" means `pnpm typecheck` and `pnpm build` exit 0. `pnpm build`
reads `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from `.env` by itself; never open or print
`.env`. Keep passing the fake WhatsApp number inline: `WHATSAPP_NUMBER=5355555555 pnpm build`.

**Before any step:** `supabase/categories-write.sql` has run once in the Supabase SQL editor
(after `photos.sql`), after its tie check query returned no rows.

**Places:**
- Local: `pnpm build`, then `pnpm preview`, then the exact `http://localhost:4321/admin/` it prints,
  signed in as the owner. The live demo's admin runs only what was last pushed to `main`.
- "Publicar cambios" from the local admin triggers the real Vercel deploy. The local card never
  shows "Publicado" (it reads the local `/build.json`): compare the live
  `https://tienda-demo-cuba.vercel.app/build.json` `builtAt` with the database's
  `catalog_state.changed_at` instead.

**Phone width:** DevTools device emulation at 360 px.

**Real data:** every save changes the live tables. Use test categories ("Prueba", "Frutas") and
end with the seed order and names: Granos y pastas, Cárnicos, Despensa, Lácteos y huevos, Bebidas,
Aseo.

**Mocked answers:** paste this in the DevTools console of the local `/admin/`. A matching request
is answered in the browser and never reaches Supabase; each mock is used once.
```js
window.__realFetch ??= window.fetch;
window.__mocks = [];
window.mock = (method, path, status, body = {}) => window.__mocks.push({ method, path, status, body });
window.fetch = (input, init = {}) => {
	const url = new URL(typeof input === 'string' ? input : input.url);
	const method = (init.method ?? 'GET').toUpperCase();
	const index = window.__mocks.findIndex((m) => m.method === method && url.pathname === m.path);
	if (index === -1) return window.__realFetch(input, init);
	const [m] = window.__mocks.splice(index, 1);
	return Promise.resolve(new Response(JSON.stringify(m.body), { status: m.status, headers: { 'Content-Type': 'application/json' } }));
};
```

## Commands
- [x] `pnpm typecheck` → 0 errors → AC-13
- [x] `WHATSAPP_NUMBER=5355555555 pnpm build`, then `pnpm check:weight` → all pages within budget,
      `/admin/` JS ≤ 15 KB gzipped (9.4 KB on 2026-11-04) → AC-13
- [x] `grep -rlE "<script|supabase\.co|sb_publishable_" dist --include=*.html | grep -v "^dist/admin/"`
      → no output → AC-13
- [x] `git diff --stat 658e3a6 -- src/pages src/components` → only `src/pages/admin/index.astro` → AC-12
- [x] With the publishable key only (read from `dist/admin/index.html`, never printed): `POST`
      `/rest/v1/categories` → `401` `42501`; `PATCH` and `DELETE` `?id=eq.<id>` → `200 []`; a `GET`
      before and after is identical → AC-1

## SQL editor
_`/check verify` on 2026-11-04 did not run these again: the owner accepted the `/develop` run of
the same day (same file, no SQL run since)._
- [x] The AC-1 block in `supabase/categories-write.sql` with `'{"app_metadata":{}}'` → `42501`; with
      `'{"app_metadata":{"role":"owner"}}'` → the insert works, then rollback → AC-1
- [x] The AC-14 block → `23505` → AC-14

## Recorded answers (owner session, 2026-11-04)
- Swap upsert (`Prefer: resolution=merge-duplicates`) → `200`, both rows; passes the deferrable
  constraint.
- `PATCH /rest/v1/products?category_id=eq.<none>&select=id` → `200 []`.
- `DELETE` of a category with products → `409`, code `23503`, message names
  `products_category_id_fkey`.
- Stale swap on a taken `sort_order` → `409`, body
  `{"code":"23505","details":null,"hint":null,"message":"duplicate key value violates unique constraint \"categories_sort_order_key\""}`.
- After a swap, the admin shows "Hay cambios sin publicar" (trigger fired).

## UI / manual (local admin, 360 px)
- [x] The signed in view shows "Categorías" after "Productos", every category in order with its
      count line; first "Subir" and last "Bajar" disabled → AC-2
- [x] "Añadir categoría" → "Frutas y viandas" → last in the list, "Vacía: no se ve en la web", in the
      product form's "Categoría" list; its form says "Enlace: /categoria/frutas-y-viandas" → AC-3
- [x] Empty, "!!!", "日本", "lacteos  Y HUEVOS" → the four messages, no request → AC-5
- [x] Rename to "Frutas" → lists and product groups update; after reload the name stays and the
      link is unchanged. Saving the same name sends no request → AC-4
- [x] "Bajar" on the first, "Subir" on the last → one `POST` each, `200`, order kept after reload.
      With "Slow 3G", "Bajar" twice quickly → one request, buttons disabled while waiting → AC-6
- [x] Delete an empty category → "No, volver" changes nothing; "Sí, borrar" → "Categoría borrada."
      → AC-7
- [x] Give "Prueba" a product, delete it: "Mover y borrar" with no choice → "Elige una categoría.";
      with "Bebidas" → "Productos movidos a «Bebidas». Categoría borrada.", product under Bebidas
      → AC-8
- [x] With one category only → "No puedes borrar la única categoría.", no request → AC-9 (mock the
      categories `GET`, or reason from the code: the table has six)
- [x] Network "Offline", save a name → offline message, name kept → AC-10
- [x] `mock('DELETE', '/rest/v1/categories', 500)` before "Mover y borrar" → "Los productos ya están
      en «Bebidas», pero «Prueba» no se borró. Inténtalo otra vez.", "Prueba" shows as empty; a
      second delete shows the AC-7 confirm → AC-10
- [x] `mock('DELETE', '/rest/v1/categories', 409, { code: '23503' })` on an empty category → "Esta
      categoría todavía tiene productos. La lista se ha actualizado." → AC-10
- [x] `mock('PATCH', '/rest/v1/categories', 200, [])` on a rename → "Esta categoría ya no existe. La
      lista se ha actualizado." → AC-10
- [x] "Cerrar sesión" in a second tab, then save in the first → sign in view, "Tu sesión terminó.
      Entra de nuevo." → AC-10
- [x] Two tabs: A "Bajar" on the 1st, stale B "Bajar" on the 2nd → B: "El orden cambió en otro
      dispositivo. La lista se ha actualizado." and A's order → AC-14, AC-6
- [x] Two tabs: A adds "Prueba A", stale B adds "Prueba B" → same message, the name stays in B's
      field, a second "Guardar" saves it → AC-14
- [x] Product flows and the spec 0015 AC11 mocked cases behave as before → AC-11

## Public site after publish (live demo)
- [x] Round 1: rename "Bebidas" to "Bebidas frías", "Subir" on "Aseo", add "Prueba" with one
      product, add "Vacía" with none, publish. Then `/categoria/bebidas` chip, `h1` and `<title>`
      say "Bebidas frías"; Aseo comes before it in chips and sections; `/categoria/prueba` is 200
      with its product; `/categoria/vacia` is 404 and the home has no "Vacía" → AC-12
- [x] Round 2: delete "Prueba" moving its product back, delete "Vacía", restore "Bebidas" and the
      order, publish. Then `/categoria/prueba` is 404, the product is under Bebidas, chips match the
      seed → AC-12

## Acceptance-criteria coverage
- AC-1 Commands + SQL editor · AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10 UI ·
  AC-11 UI (last step) · AC-12 Commands + Public site · AC-13 Commands · AC-14 SQL editor + UI

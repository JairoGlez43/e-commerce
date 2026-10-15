# 0005 · Catalog page — manual check steps

Run from the project root. "Clean" means `pnpm typecheck` and `pnpm build` exit 0.
Browser checks use `pnpm build && pnpm preview` (http://localhost:4321) unless noted.

- **AC1 (grouping and order):** open `/`. Six sections with an `h2` each, in this order:
  Granos y pastas, Cárnicos, Despensa, Lácteos y huevos, Bebidas, Aseo. Inside Cárnicos the order
  is Muslos de pollo, Picadillo de res, Salchichas (out of stock last); inside Lácteos y huevos:
  Huevos, Queso gouda, Leche en polvo. Every other section is A–Z.
- **AC2 (card content):** count 18 cards; each shows a square photo, name, unit (e.g.
  "Caja 10 lb"), price like `3400 CUP` (`es-ES` groups only 5+ digits: `12.500 CUP`), and a
  badge. Exactly 2 say "Agotado" (Salchichas, Leche
  en polvo) and their photos look faded. Inspect any photo: `alt` equals the product name.
  Inspect an "Agotado" photo: its class includes `opacity-50` (computed `opacity: 0.5`); an
  in-stock photo has no `opacity-*` class. Same on `/estilo`'s product card.
- **AC3 (card link):** hover a card's photo, price and badge: the pointer is a hand everywhere.
  Click a card → the URL becomes `/producto/<id>` (404 until feature 06 ships). With a screen
  reader or DevTools → Accessibility, the link's name is just the product name.
- **AC4 (category nav):** on `/`, chips read Todos, then the 6 categories in the AC1 order;
  "Todos" is filled red and has `aria-current="page"`. Click "Cárnicos" → `/categoria/carnicos`,
  that chip is now the selected one, "Todos" is plain, and only one chip has `aria-current`.
- **AC5 (category pages):** after `pnpm build`, `dist/categoria/` holds 6 folders, one per
  category id, each with `index.html`. Open `/categoria/carnicos`: `h1` "Cárnicos", 3 cards,
  tab title "Cárnicos · Tienda de alimentos (demo)". View source: the meta description is
  "Cárnicos: precios y disponibilidad en Tienda de alimentos (demo)." and `og:url` ends in
  `/categoria/carnicos/`. Product names there are `h2` (no skipped heading level).
- **AC6 (responsive):** in DevTools device mode, at 360 px wide: 2 columns, no horizontal page
  scrollbar, the chip row scrolls sideways on its own. At 800 px: 3 columns. At 1200 px: 4
  columns. Inspect the header shop-name link and a chip: each is ≥ 44 px tall. Card name links
  are shorter, but their click area is the whole card (`after:inset-0`), well over 44 px.
- **AC7 (header):** the header shows the striped awning and "Tienda de alimentos (demo)" with no
  search box; clicking the name goes to `/`. Search the code: the name string appears only in
  `src/lib/site.ts` (`src/pages/estilo.astro` keeps its own "Nombre de la tienda" demo text).
- **AC8 (images and weight):** view source of `/`: exactly the first 4 `<img>` have
  `loading="eager"`, the other 14 `loading="lazy"`; every `<img>` has a WebP `srcset` with `200w`
  and `400w`. Measured 2026-10-06 on the build: HTML + CSS gzipped 6.6 KB on `/`, ≤ 5.3 KB on
  each category page (budget 50 KB); the 4 eager 400 px images on `/` total 54.7 KB, the largest
  category page 60.5 KB (budget 150 KB). Re-measure with DevTools → Network if data changes.
- **AC9 (no JS, same origin):** view source of `/` and one category page: no `<script>`. In
  DevTools → Network, every request goes to `localhost:4321`.
- **AC10 (slow connection):** DevTools → Network, tick "Disable cache", pick the slowest
  throttling preset (e.g. "3G"), device width 360 px, reload `/`. The chips, product names and
  prices are readable within 5 s (photos may still be loading).
- **AC11 (empty states):** temporarily add `{ "id": "vacia", "name": "Vacía", "order": 7 }` to
  `src/data/categories.json`, run `pnpm build` → no "Vacía" chip on `/`, no section, and no
  `dist/categoria/vacia/`. Then temporarily replace `src/data/products.json` with `[]` → `/`
  shows "Todavía no hay productos." and no grid. Restore both files; build is clean.

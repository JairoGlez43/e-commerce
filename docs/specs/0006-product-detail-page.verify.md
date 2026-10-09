# 0006 · Product detail page — manual check steps

Run from the project root. "Clean" means `pnpm typecheck` and `pnpm build` exit 0.
Browser checks use `pnpm build && pnpm preview` (http://localhost:4321, or the next free port).

- **AC1 (pages):** after `pnpm build`, `dist/producto/` holds 18 folders, one per product id,
  each with `index.html`; `salchichas` and `leche-en-polvo` (out of stock) are there too.
  Open `/producto/no-existe` → 404.
- **AC2 (content):** open `/producto/arroz-blanco`: header, square photo, `h1` "Arroz blanco",
  "1 lb", "280 CUP", green "Disponible", and the full description. Open
  `/producto/salchichas`: "Agotado" badge and the photo looks faded. Inspect the photo: `alt`
  equals the product name.
- **AC3 (breadcrumb):** above the `h1` reads "Productos › Granos y pastas" (on arroz-blanco).
  "Productos" goes to `/`, "Granos y pastas" to `/categoria/granos-y-pastas`. Inspect each link:
  ≥ 44 px tall. The "›" is hidden from screen readers (`aria-hidden`).
- **AC4 (catalog links):** on `/`, click any card → its detail page loads (no 404). Measured
  2026-10-07: the 18 distinct `/producto/` links on `/` and the category pages all have a built
  page.
- **AC5 (link preview):** view source of `/producto/arroz-blanco`: `<title>` and `og:title` are
  "Arroz blanco · Tienda de alimentos (demo)"; meta description and `og:description` are
  "280 CUP · 1 lb · Disponible. Arroz blanco de grano largo…"; `og:url` ends in
  `/producto/arroz-blanco/`; `og:image` ends in `.jpg`. Open that JPG: 600×600. Measured
  2026-10-07: all 18 JPGs are 600×600, the largest 58.0 KB (limit 100 KB). Real WhatsApp
  previews can only be tested after the deploy (feature 08), since URLs point to localhost.
- **AC6 (layout):** DevTools device mode at 360 px: one column, photo on top, no horizontal
  scrollbar. At 800 px and wider: photo left, details right.
- **AC7 (weight, no JS):** view source: no `<script>`; the photo `<img>` has
  `loading="eager"` and a WebP `srcset` with `400w` and `800w`. DevTools → Network: every
  request goes to the same origin. Measured 2026-10-07: HTML + CSS ≤ 5.0 KB gzipped on every
  product page (limit 50 KB); largest 800 px WebP 58.5 KB (limit 80 KB).
- **AC8 (slow connection):** DevTools → Network, "Disable cache", slowest throttling preset,
  360 px, reload `/producto/huevos`: name, price and availability readable within 5 s.

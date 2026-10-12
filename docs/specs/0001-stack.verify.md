# 0001 · Manual check steps

Built so far: T1, T2, T3, T4, T5. Steps for ACs that depend on open tasks are marked "pending".

- **AC1** — Run `pnpm install` then `pnpm build`. Expect: build passes, `dist/` holds one
  `.html` per route (today only `dist/index.html`), `pnpm-lock.yaml` exists and
  `package-lock.json` does not. `astro.config.mjs` has no adapter and no `output: 'server'`.
- **AC2** — After `pnpm build`, search `dist/**/*.html` for `<script`. Expect: none.
- **AC3** — Open `src/content.config.ts`: it defines `products` with `file('src/data/products.json')`.
  Search `src/` for `products.json`. Expect: only that loader path; no `import` of the JSON in
  any page or component. `src/pages/index.astro` reads entries with `getCollection('products')`.
- **AC4** — In `src/data/products.json`, delete the `"price"` line of the sample entry and run
  `pnpm build`. Expect: the build fails with `InvalidContentEntryDataError` naming
  `products → producto-de-muestra` and `price: Required`. Restore the line; the build passes.
- **AC5** — Run `pnpm build`, then view `dist/index.html`. Expect: the sample product `<img>`
  has a `.webp` `src`, a `srcset` listing several `.webp` widths (600w … 1200w), and
  `loading="lazy"`. `dist/_astro/` holds only `.webp` variants of `sample` (no `.jpg`). Placeholder
  image and entry come from T3/T4; real products arrive in feature 04.
- **AC6** — Open the built page (`pnpm preview`) with the browser's Network tab. Expect: every
  request goes to the same origin; no fonts, CDNs or analytics from other domains. In
  `dist/`, the only external URL in CSS is Tailwind's license comment.
- **AC7** — After `WHATSAPP_NUMBER=5355555555 pnpm build`, run `pnpm check:weight`: a table with one
  row per page (HTML+CSS and JS gzipped, font, largest image vs its limit, first view) and
  `All 26 pages within budget.`, exit 0. Measured 2026-10-12: max HTML+CSS 6.7 KB (`/`), JS 0,
  font 17.7 KB, largest thumbnail 22.8 KB, largest detail photo 58.5 KB, largest first view
  60.5 KB. To see it fail, copy `dist/` elsewhere, add ~100 KB of text to one page and run
  `node scripts/check-weight.mjs <copy>`: that row says `FAIL: HTML+CSS … > 50 KB` and the exit
  code is 1 (checked 2026-10-12, also for 12 KB of inline JS). With no `dist/` it exits 1 and
  says to build first.
- **AC8** — View source of `/`. Expect: `<html lang="es">`, a `<title>`, a
  `<meta name="description">`, and `og:title`, `og:description`, `og:image`, `og:url` with
  absolute URLs. Open `/og-default.png`: a 1200×630 image. Until `site` is set (feature 08)
  the absolute URLs use the request origin (`http://localhost:4321` in local builds).
  Title, description and image are placeholders from spec 0003 (Assumed).

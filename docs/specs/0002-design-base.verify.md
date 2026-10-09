# 0002 · Visual reference and design base — manual check steps

Run `pnpm build` then `pnpm preview` and open http://localhost:4321/estilo/ (port may differ).
"Clean" means `pnpm typecheck` and `pnpm build` exit 0.

- **AC1 (tokens only):** `src/styles/global.css` holds every color, font, radius and shadow in
  `@theme` / `@theme inline`, starting with `--color-*: initial;`. Temporarily add
  `class="bg-red-500"` to any element in `src/pages/estilo.astro`, build, and search the built
  CSS in `dist/_astro/` for `red-500` → not found. Remove it. Search `src/**/*.astro` for `#hex`,
  `rgb(` and `oklch(` → no matches (checked 2026-10-06: none).
- **AC2 (fonts):** in the browser DevTools, inspect an `h1`, `h2`, `h3` and the `.price` text →
  computed `font-family` starts with the Fraunces family and `font-weight` is 600; inspect a
  body paragraph → the system sans stack. In the Network tab the Fraunces file is used.
- **AC3 (one font file):** `dist/_astro/fonts/` holds exactly one `.woff2`, ≤ 25 KB (18,096 bytes
  on 2026-10-06). `dist/estilo/index.html` has `<link rel="preload" … as="font" type="font/woff2">`,
  an `@font-face` with `font-display:swap`, and a second `@font-face` whose name contains
  `fallback`. Network tab: every request is same-origin.
- **AC4 (contrast and focus):** check the contrast table in the spec with any WCAG checker using
  the hex values in `global.css`. Press Tab through `/estilo`: the search field, each chip and
  the button show a 2px `accent` outline.
- **AC5 (`/estilo`):** the page shows palette swatches (11), heading and body type, a price, the
  awning strip, category chips with "Granos y pastas" selected, the primary button, and four
  product cards (two "Disponible", two "Agotado" with dimmed photo). View source: no `<script>`,
  has `<meta name="robots" content="noindex">`. HTML + CSS gzipped ≤ 50 KB (6.1 KB on
  2026-10-06). Check at 390 px wide in DevTools device mode: no horizontal page scroll; only
  the chip row scrolls sideways. (A headless Edge screenshot cannot go below ~500 px, so the
  390 px check was not automated.)
- **AC6 (`design.md`):** `design.md` at the repo root lists the token names, every pattern on
  `/estilo` with exact classes, and the rule "use tokens, never raw values".

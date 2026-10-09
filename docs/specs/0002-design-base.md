# 0002 · Visual reference and design base

**Status:** Accepted
**Date:** 2026-10-04
**Scope:** `docs/scope/scope.md` → feature 03
**Supersedes:** —

## Context
Every page (catalog, product detail, contact) needs one shared look before it is built, and
spec 0001 left the token values to this feature. The owner wants Mercadona's online shop as
the visual reference, but with a typeface that feels closer to food and enough custom touches
that it does not read as a copy. Pages must stay very light for slow connections in Cuba.

## Decision
- **Reference:** Mercadona's online shop, taken **loosely** for structure only: white/light
  page, search and categories at the top, simple uncluttered product cards with photo, name,
  format line and price. The current live design could not be inspected (see Rationale), so
  only this structure is borrowed; every visual value below is our own.
- **Typography:** **Fraunces 600** (soft old-style serif, SIL OFL 1.1) for headings and
  prices only, self-hosted as one static WOFF2 file, Latin subset (17.7 KB measured). Body
  text stays on Tailwind's default system sans stack. The variable Fraunces file is not
  used (35.8 KB measured, over budget).
- **Font delivery:** Astro's Fonts API (stable since Astro 6, top-level `fonts` key) with the
  `local` provider, from a file committed in `src/assets/fonts/`. No network at build or run
  time, same-origin at runtime.
- **Palette:** our own warm palette, deliberately not Mercadona's green: cream page, white
  cards, tomato/terracotta accent for prices and actions, olive for "available".
- **Custom touches (what makes it not a copy):** cream background instead of white;
  serif display type for headings and prices; a CSS-only striped "awning" strip at the top
  of the header (the shop sells from a market stall); availability shown as a small
  colored badge; horizontally scrolling category chips instead of a slide-out drawer (no JS).
- **Tokens:** defined once in `src/styles/global.css` with Tailwind v4's `@theme`. The
  default color palette is replaced so only these colors exist.

## Acceptance criteria
- **AC1:** `src/styles/global.css` defines every color, font, radius and shadow token in
  `@theme` / `@theme inline` blocks, starting with `--color-*: initial;`, so a default class
  such as `bg-red-500` generates no CSS. No `.astro` file under `src/` contains a raw hex,
  `rgb(` or `oklch(` color value.
- **AC2:** `h1`, `h2`, `h3` and elements with the `price` class render in Fraunces 600;
  body text renders in the system sans stack (checked with computed styles in a browser).
  **Exception (2026-10-06):** the product name inside a product card is an `h3` that renders
  in the system sans stack, weight 500. The base `h3` rule still sets Fraunces 600, so any
  other `h3` renders in Fraunces.
- **AC3:** The built site serves exactly one font file: a WOFF2 under `/_astro/fonts/`,
  ≤ 25 KB, same-origin, declared with `font-display: swap`, preloaded with
  `<link rel="preload" as="font">`, and backed by an optimized `serif` fallback.
- **AC4:** Every text/background pair in the contrast table below meets WCAG AA
  (≥ 4.5:1), and every focusable element shows a visible focus ring in `accent`.
- **AC5:** The page `/estilo` shows all tokens and patterns: palette swatches, heading and
  body type, a price, the awning header strip, category chips (one selected), a primary
  button, and a sample product card in both "available" and "unavailable" states. It
  contains no `<script>` and its HTML + CSS is ≤ 50 KB gzipped.
- **AC6:** `design.md` at the repo root lists the tokens, the patterns from AC5 and the
  rule "use tokens, never raw values", for features 05–07 to build against.

## Design

**Prerequisites:** spec 0001 T2 (`BaseLayout.astro`) and T5 (Tailwind installed, `global.css`
imported once in `BaseLayout.astro`) must be done first.

**Tailwind (v4, verified):** `pnpm astro add tailwind` installs `tailwindcss` and
`@tailwindcss/vite`, adds `vite: { plugins: [tailwindcss()] }` to `astro.config.mjs`, and
creates `src/styles/global.css` with `@import "tailwindcss";`. Each `@theme` variable creates
both a utility (`bg-accent`, `font-display`, `rounded-card`) and a CSS variable
(`var(--color-accent)`). `--color-*: initial;` removes the default palette. Use `@theme inline`
when a token points to another variable (the font). Known unofficial report: a type error with
`@tailwindcss/vite` in a TS config file on some Node versions; our config is `.mjs`, so it
should not apply — if it does, route to `/debug`.

**Tokens (`src/styles/global.css`):**
```css
@import "tailwindcss";

@theme {
  --color-*: initial;
  --color-cream: #FBF6EE;        /* page background */
  --color-surface: #FFFFFF;      /* cards, chips, inputs */
  --color-ink: #2B211C;          /* main text */
  --color-muted: #6A5B50;        /* secondary text, format line */
  --color-border: #E6DACB;       /* card borders, dividers (decorative) */
  --color-accent: #B03A24;       /* prices, primary button, selected chip, focus ring */
  --color-accent-hover: #8E2E1C; /* primary button hover/active */
  --color-olive: #4D6A26;        /* "available" text and dot */
  --color-olive-soft: #EEF2E3;   /* "available" badge background */
  --color-unavailable: #7A6D64;  /* "unavailable" text */
  --color-awning: #F4E3D3;       /* light stripe of the awning */

  --radius-card: 0.75rem;
  --shadow-card: 0 1px 2px rgb(43 33 28 / 0.06), 0 2px 8px rgb(43 33 28 / 0.06);
}

@theme inline {
  --font-display: var(--font-fraunces);
}
```
`--font-sans` and the type and spacing scales stay Tailwind's defaults (they are tokens too).

**Base styles (same file, plain CSS after the theme):**
- `body`: `bg-cream`, `text-ink`, `font-sans`.
- `h1, h2, h3, .price`: `font-display`, weight 600. Sizes mobile-first: `h1` text-3xl,
  `h2` text-2xl, `h3` text-xl. `.price`: text-xl, color `accent`.
- `:focus-visible`: `outline: 2px solid var(--color-accent); outline-offset: 2px`.
- `.awning`: a block about 8px tall with
  `repeating-linear-gradient(90deg, var(--color-accent) 0 16px, var(--color-awning) 16px 32px)`.
  Decorative only (`aria-hidden="true"` on the element).

**Font (`astro.config.mjs`, Astro 7.3.5 types checked locally):**
```js
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  vite: { plugins: [tailwindcss()] },
  fonts: [{
    provider: fontProviders.local(),
    name: 'Fraunces',
    cssVariable: '--font-fraunces',
    fallbacks: ['serif'],          // generic last → Astro generates optimized fallback metrics
    display: 'swap',
    options: {
      variants: [{ src: ['./src/assets/fonts/fraunces-latin-600-normal.woff2'], weight: 600, style: 'normal' }],
    },
  }],
});
```
In `BaseLayout.astro` head: `import { Font } from 'astro:assets';` and
`<Font cssVariable="--font-fraunces" preload />`.
Font file: `fraunces-latin-600-normal.woff2` from the `@fontsource/fraunces` package files
(17.7 KB measured), saved to `src/assets/fonts/` with its `OFL.txt` beside it (the license
requires it to travel with the font). Not in `public/` (Astro would copy it twice).
The Latin subset covers á é í ó ú ñ ü ¿ ¡ and €.

**Contrast table (WCAG ratios, computed 2026-10-04):**
| Text | Background | Ratio |
|---|---|---|
| ink | cream / surface | 14.60 / 15.71 |
| muted | cream / surface | 6.05 / 6.51 |
| accent | cream / surface | 5.61 / 6.04 |
| surface (white text) | accent / accent-hover | 6.04 / 8.21 |
| olive | cream / surface / olive-soft | 5.73 / 6.17 / 5.42 |
| unavailable | cream / surface | 4.65 / 5.00 |
`border` on surface is 1.38: decorative only, never the only way to identify a control.

**Patterns (shown on `/estilo`, reused by features 05–07):**
- **Header:** awning strip on top, then shop name in `font-display` and a search field.
- **Category chips:** one row, scrolls horizontally on overflow (`overflow-x: auto`), no JS.
  Chip: `bg-surface`, `text-ink`, fully rounded. Selected: `bg-accent`, white text.
- **Product card:** `bg-surface`, `rounded-card`, `shadow-card`, 1px `border-border`.
  Order: square photo (1:1) → name (an `h3` reset to body type: `font-sans text-base
  font-medium`, ink, so screen readers can jump between products) → format line (muted, e.g.
  "Paquete 500 g") → price (`.price`) → availability badge. Badge "Disponible": `olive` text
  on `olive-soft` with a small olive dot. "Agotado": `unavailable` text, card photo at
  reduced opacity. Sample values on `/estilo` are placeholders; real fields come from
  feature 04.
- **Grid guidance for feature 05:** 2 columns on mobile, 3 from `sm`, 4 from `lg`.
- **Primary button:** `bg-accent`, white text, `hover:bg-accent-hover`, rounded, min 44px tall.

**`/estilo` page:** `src/pages/estilo.astro`, uses `BaseLayout`, Spanish copy,
`<meta name="robots" content="noindex">`. Static, no client JS.

**Weight:** font ≤ 25 KB (one file). CSS stays within the 0001 budget (HTML + CSS ≤ 50 KB
gzipped per page).

## Build plan
- [x] **T1** (AC3) Add `fraunces-latin-600-normal.woff2` and `OFL.txt` to `src/assets/fonts/`
  (ask the owner before downloading); configure `fonts` in `astro.config.mjs`; add
  `<Font cssVariable="--font-fraunces" preload />` to `BaseLayout.astro`.
- [x] **T2** (AC1, AC2, AC4) Write the tokens and base styles in `src/styles/global.css`.
- [x] **T3** (AC5, AC4) Build `src/pages/estilo.astro` with every pattern.
- [x] **T4** (AC6) Write `design.md` at the repo root.

## Out of scope
- Real catalog, product detail and contact pages (features 05–07) and the product fields
  (feature 04): this spec only fixes how they look.
- Dark mode, logo design, icons or icon fonts, animations.
- Tabular figures for prices (not confirmed for Fraunces; one price per card does not need it).

## Sources
- https://docs.astro.build/en/guides/styling/#tailwind
- https://tailwindcss.com/docs/theme ; https://www.npmjs.com/package/tailwindcss (v4.3.3)
- https://docs.astro.build/en/guides/fonts/ ;
  https://docs.astro.build/en/reference/configuration-reference/#fonts
- Local types: `node_modules/astro/dist/types/public/config.d.ts` (`fonts`, top-level,
  `@version 6.0.0`), `dist/assets/fonts/providers/local.d.ts`, `components/Font.astro`
- https://github.com/googlefonts/fraunces ; https://fonts.google.com/specimen/Fraunces/about
- https://unpkg.com/@fontsource/fraunces/files/fraunces-latin-600-normal.woff2 (17.7 KB)
- https://unpkg.com/@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2 (35.8 KB)
- https://unpkg.com/@fontsource/fredoka/files/fredoka-latin-700-normal.woff2 (15.5 KB)
- https://unpkg.com/@fontsource/baloo-2/files/baloo-2-latin-700-normal.woff2 (19 KB)
- https://shkspr.mobi/blog/2020/12/should-%E2%82%B9-be-part-of-the-latin-font-subset/ (€ in Latin)
- https://www.xataka.com/servicios/haciendo-la-compra-en-la-nueva-tienda-online-de-mercadona-esta-ha-sido-nuestra-experiencia
  (Mercadona online shop, 2017, secondary)
- https://github.com/withastro/astro/issues/14030 (unofficial Tailwind/Vite type error report)
- Contrast ratios: WCAG 2.x relative-luminance formula, computed locally.

---
## Rationale
<!-- History, not build input. /develop does not read below this line. -->
**Options considered:** Fraunces 600 (chosen by the owner: warm artisanal serif, furthest
from a sans supermarket look, 17.7 KB) vs Fredoka 700 (runner-up: rounded sans, lightest at
15.5 KB) vs Baloo 2 700 (19 KB, more playful/childish). A heading-only web font (chosen) vs
the system serif (0 KB but looks like a newspaper and varies per phone) vs a font for all
text (more weight, slower first text on slow links). Local provider (chosen: deterministic,
no network in builds) vs `fontProviders.fontsource()` (runner-up: no file in the repo, but
the build downloads it and the exact file served is less controlled). Own warm palette
(owner chose "propose one") vs Mercadona's greens (closer to a copy).

**AC2 exception (2026-10-06, found by `/check verify`):** AC2 required every `h3` in Fraunces
while the card pattern asked for the product name in body type, and the build used an `h3`
for that name. Chosen: keep the `h3` and except it from AC2 (heading navigation lets screen
reader users jump from product to product; the visual stays as designed). Runner-up: make
the name a `<p>` (AC2 holds literally, but the card loses its heading and the catalog becomes
one long run of text for screen readers).

**Assumptions and risks:**
- **The Mercadona reference is approximate.** The live shop is a JS app behind a postal-code
  prompt; fetching it returned an empty shell, and the only design write-ups found date from
  2017. The owner chose to proceed with that description rather than supply screenshots.
- Amends spec 0001: "no web fonts" becomes "one self-hosted heading font ≤ 25 KB" (owner
  decision, 2026-10-04).
- Fraunces' tabular/lining figure support is unverified.
- The Fonts API was read as stable from the docs and local types (`fonts` is top-level, not
  under `experimental`); exact generated CSS will be checked by `/check verify`.

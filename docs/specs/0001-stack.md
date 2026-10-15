# 0001 · Stack and architecture

**Status:** Accepted
**Date:** 2026-10-02
**Scope:** `docs/scope/scope.md` → feature 01
**Supersedes:** —

## Context
The demo is a read-only catalog (product list, product detail, WhatsApp contact) for a
local food shop whose customers are on slow, unreliable connections in Cuba. Every page
must be as light as possible, product links must preview well when shared in WhatsApp,
and the product data must later move to an owner-editable source without rewriting pages.

## Decision
- **Framework:** Astro 7.x (latest stable, 7.3 at decision time), static output (SSG),
  TypeScript (strict template).
- **Runtime/tooling:** Node ≥ 22.12 (even versions; local is 24.16), **pnpm 10** (pinned via
  `"packageManager": "pnpm@10.13.1"` in `package.json`; only `pnpm-lock.yaml` is committed).
- **Data:** an Astro content collection `products` with a zod schema, loaded from a local
  JSON file via the built-in `file()` loader. Pages read data only through
  `astro:content` (`getCollection` / `getEntry`). Later, a custom loader can fetch from a
  backend; pages stay unchanged.
- **Images:** local files in `src/assets/`, processed at build time by `astro:assets`
  (Sharp) into WebP with responsive `srcset`.
- **Styling:** Tailwind CSS (current major), generated at build time — utility classes in
  `.astro` markup, design tokens defined once in `src/styles/global.css`. Body text:
  system font stack (Tailwind's default sans stack); one self-hosted heading font (spec 0002).
- **Client JS:** none by default. Interactivity only via small vanilla `<script>` in
  `.astro` components. No UI-framework integration (React etc.) in v1.
- **Hosting:** Vercel, static deploy of `dist/` (no adapter).

## Acceptance criteria
- **AC1:** The project is Astro 7.x with `output` static and no server adapter;
  `pnpm install` then `pnpm run build` emits a static `dist/` with one HTML file per route,
  and the repo has `pnpm-lock.yaml` and no `package-lock.json`.
- **AC2:** A built page with no interactive component contains no `<script>` tags; any
  page's total client JS stays ≤ 5 KB gzipped.
- **AC3:** Products come from the `products` collection defined in `src/content.config.ts`;
  no page or component imports `src/data/products.json` directly.
- **AC4:** The build fails if a product entry does not match the schema (e.g. missing price).
- **AC5:** Every product image in `dist/` is WebP served with `srcset`, and below-the-fold
  images use `loading="lazy"`.
- **AC6:** A built page requests only same-origin resources (no third-party web fonts, CDNs,
  analytics or other third parties).
- **AC7:** `pnpm run check:weight` measures gzipped sizes in `dist/` and fails when any page
  exceeds the weight budget below.
- **AC8:** Every page has `<html lang="es">`, a `<title>`, a meta description and Open Graph
  tags (`og:title`, `og:description`, `og:image`, `og:url`), so shared links preview in
  WhatsApp.

## Design
**Weight budget (per page, gzipped transfer):**

| Item | Budget |
|---|---|
| HTML + CSS | ≤ 50 KB |
| Client JS | 0 by default, ≤ 5 KB hard cap |
| Web fonts | 1 self-hosted file ≤ 25 KB (spec 0002) |
| Catalog thumbnail | ≤ 25 KB each |
| Product detail photo | ≤ 80 KB |
| Images above the fold (first view) | ≤ 150 KB total |

**Project layout** (created by `/develop scaffold` via `pnpm create astro@latest`, minimal
template, TypeScript strict):
```
src/
  pages/index.astro              catalog (feature 05)
  pages/producto/[slug].astro    product detail, prerendered via getStaticPaths (feature 06)
  layouts/BaseLayout.astro       <html lang="es">, meta + OG tags, global CSS
  components/                    .astro components (e.g. ProductCard)
  content.config.ts              products collection
  data/products.json             sample data (feature 04 decides the shape)
  assets/products/               source photos (optimized at build)
  styles/global.css              Tailwind entry + design tokens (values decided in feature 03)
public/                          favicon, og fallback image
scripts/check-weight.mjs         budget check (Node built-ins only: fs, zlib)
```
URLs are user-facing and shared in Spanish-language WhatsApp groups, so the route segment
is Spanish (`/producto/<slug>`); code, identifiers and comments stay English.

**Collection setup (current API, from research):**
```ts
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';          // not the npm `zod` package
import { file } from 'astro/loaders';
const products = defineCollection({
  loader: file('src/data/products.json'),
  schema: ({ image }) => z.object({ /* fields decided in feature 04 */ photo: image() }),
});
export const collections = { products };
```
The product fields themselves belong to feature 04's spec; this spec only fixes *where*
and *how* data lives.

**Config notes:** `astro.config.mjs` keeps defaults (`output: 'static'`,
`build.inlineStylesheets: 'auto'`) and sets `site` to the Vercel URL once known (needed
for absolute `og:url`/`og:image`). Astro 7's `compressHTML: 'jsx'` default strips inline
whitespace — use `{" "}` where spacing between inline elements matters.

**Tailwind setup (not yet verified against current docs):** add Tailwind through Astro's
official integration path (expected: `pnpm astro add tailwind`, which wires the Tailwind
Vite plugin and creates the CSS entry file). `BaseLayout.astro` imports
`src/styles/global.css` once. Tokens (colors, spacing, type scale) live in that file using
Tailwind's current theme mechanism; their values belong to feature 03. Before installing,
`/develop` confirms the exact command, packages and token syntax for the current Tailwind
and Astro versions via `researcher`. No Tailwind plugins or component libraries (e.g.
daisyUI) without a new decision. Dynamic class names must be written in full (no string
concatenation), so the build can detect them.

**Weight check:** `scripts/check-weight.mjs` walks `dist/`, gzips each HTML page plus the
CSS/JS it references, and prints a table; exits 1 if any budget row is exceeded. Wired as
`"check:weight": "node scripts/check-weight.mjs"` in `package.json`.

**Hosting:** Vercel project with framework preset Astro, install `pnpm install`, build
`pnpm run build`, output `dist/` (Vercel detects pnpm from `pnpm-lock.yaml`). No
`@astrojs/vercel` adapter (only needed for SSR). Deploy itself is feature 08.

**Security:** no secrets, no server code, no user input stored in v1.

**Packages (ask owner before installing):** `astro` via `pnpm create astro@latest`; Tailwind
via Astro's integration (see above). `/develop` confirms whether `sharp` ships with Astro
or must be added.

**pnpm gotcha (unverified, check before scaffolding):** pnpm 10 does not run dependency
install scripts unless approved; packages with native builds (likely `sharp`, `esbuild`)
may need approval (`pnpm approve-builds`, or `onlyBuiltDependencies` in
`pnpm-workspace.yaml`), otherwise install warns `ERR_PNPM_IGNORED_BUILDS` and image
optimization can fail. `/develop` checks current pnpm docs via `researcher` first.

**Permissions:** `.claude/settings.json` currently allowlists npm commands; switch to the
pnpm equivalents with owner approval before `/develop scaffold`.

## Build plan
- [x] **T1** (AC1) Scaffold Astro 7 minimal TS-strict project with pnpm (pin
  `packageManager`, approve native builds if needed); confirm `pnpm run dev` and
  `pnpm run build`. — `/develop scaffold` (feature 02)
- [x] **T2** (AC8) Create `BaseLayout.astro` with `lang="es"`, title, description and OG
  tags from props.
- [x] **T3** (AC3, AC4) Create `src/content.config.ts` with the `products` collection on the
  `file()` loader and a placeholder schema/entry.
- [x] **T4** (AC5) Wire one sample image through `<Image>` to prove WebP + srcset + lazy
  loading in the build.
- [x] **T5** (AC2, AC6, AC7) Add Tailwind via the Astro integration, import
  `src/styles/global.css` in `BaseLayout.astro`, keep the system font stack; confirm no
  `<script>`, no third-party URLs in `dist/`, and generated CSS within budget.
- [x] **T6** (AC7) Write `scripts/check-weight.mjs` and the `check:weight` script.

## Out of scope
- The product field list (feature 04), design tokens and visual reference (feature 03),
  category filtering approach (feature 05), WhatsApp message format (feature 07), the
  actual Vercel deploy (feature 08).
- The future backend/CMS for owner-edited data — depends on the brief's open questions
  (who updates stock, from which device). A new spec will choose it and add a custom loader.
- Cart, checkout, accounts, analytics.

## Sources
- https://docs.astro.build/en/install-and-setup/ (Astro 7, Node ≥ 22.12, create command)
- https://docs.astro.build/en/guides/upgrade-to/v7/ and https://astro.build/blog/astro-7/
  (v7 breaking changes)
- https://docs.astro.build/en/guides/content-collections/ ,
  https://docs.astro.build/en/reference/modules/astro-content/
- https://docs.astro.build/en/guides/images/ (Sharp, WebP, stable responsive images)
- https://docs.astro.build/en/guides/fonts/ ,
  https://docs.astro.build/en/reference/configuration-reference/
- https://docs.astro.build/en/guides/deploy/vercel/ (static deploy, no adapter)
- Local: `node --version` v24.16.0, `pnpm --version` 10.13.1 (2026-10-02)
- pnpm build-script approval: from memory, not yet verified against current pnpm docs
- Tailwind + Astro setup: from memory, not yet verified against current docs

---
## Rationale
<!-- History, not build input. /develop does not read below this line. -->
**Options considered:** Astro (chosen) vs Next.js static export (runner-up: owner already
knows it, but ships the React + Next runtime, roughly 90–100 KB JS per page, to hydrate
pages with almost no interactivity) vs React + Vite SPA (rejected: blank page until JS
loads, and an empty HTML shell gives no per-product WhatsApp preview) vs Eleventy (as
light as Astro, weaker CV value and further from the owner's React/Next experience).
Astro's file-based routing and JSX-like syntax are close to Next.js, and React islands
remain possible later via a new decision. Hosting: Vercel (owner's usual host) over
Cloudflare (runner-up: strong free static CDN). Package manager: pnpm (owner's choice)
over npm (runner-up: already matched the existing `.claude/settings.json` allowlist).
Styling: Tailwind (owner's choice, changed on 2026-10-02 from the first draft) over plain
CSS with Astro scoped styles (runner-up: zero extra dependencies, slightly smaller CSS).
Tailwind ships no client JS and emits only the utilities used, so it fits the budget.

**Assumptions and risks:**
- **Vercel reachability from Cuba is unverified.** Some US services geoblock Cuban IPs due
  to sanctions. Fine for the demo (shown by the developer from Puerto Rico); must be
  verified from inside Cuba before real launch. Fallback: Cloudflare static hosting (the
  build output is host-agnostic).
- JS weight figures for Next.js/React are approximate, from memory, not measured.
- Budget numbers are a starting point; `/check verify` may tighten them on real throttled
  tests.

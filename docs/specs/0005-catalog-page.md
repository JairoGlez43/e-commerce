# 0005 · Catalog page

**Status:** Accepted
**Date:** 2026-10-06
**Revised:** 2026-10-13: out-of-stock photo opacity 60 → 50 (AC2, T8)
**Scope:** `docs/scope/scope.md` → feature 05
**Supersedes:** —

## Context
The data (spec 0004) and the design base (spec 0002, `design.md`, `/estilo`) are done, but
`src/pages/index.astro` is still the spec 0001 placeholder. The catalog is the page a customer
lands on from the shared WhatsApp link, so it must show what is sold, at what price and whether
it is available, let the customer narrow it by category, and stay within the weight budget of
spec 0001 on slow connections.

## Decision
- **Home (`/`) shows every product**, grouped in one section per category (category `order`).
- **Out-of-stock products are shown, clearly marked** (owner's choice): "Agotado" badge, photo
  at reduced opacity, placed after the in-stock products of their category.
- **Category filter = one static page per category** (owner's choice): `/categoria/<id>`,
  prerendered with `getStaticPaths`. Category chips are plain links. No client JS.
- **Each product card links to `/producto/<id>`** (the detail page is feature 06).
- **Shop identity moves to one module**, `src/lib/site.ts`, because the header and the
  category pages now need the shop name too. Values stay the spec 0003 placeholders.
- **No search field.** The scope asks only for category filtering; the header ships without
  the search input shown on `/estilo`.

## Acceptance criteria
- **AC1:** `/` lists every product in sections, one per category in ascending `order`, each
  with an `h2` naming the category. Inside a section, in-stock products come first, then
  out-of-stock ones; each group is sorted by name A–Z (Spanish collation).
- **AC2:** Every card shows the square photo (alt = product name), the name, the `unit`, the
  price formatted only by `formatPrice()`, and an availability badge. Out-of-stock cards show
  "Agotado" and the photo at `opacity-50`. With the sample data, `/` shows 18 cards, 2 of
  them "Agotado".
- **AC3:** Each card is one link to `/producto/<id>` whose accessible name is the product
  name, and a click or tap anywhere on the card follows it. (The target page is built by
  feature 06; until then the link 404s, which is expected.)
- **AC4:** Every catalog page shows a category nav: a "Todos" chip linking to `/`, then one
  chip per category that has at least one product, in `order`, linking to `/categoria/<id>`.
  The chip for the current page uses the selected style and `aria-current="page"`; all
  others use the default style and no `aria-current`.
- **AC5:** `pnpm build` emits `dist/categoria/<id>/index.html` for each of the 6 categories.
  Each lists only that category's products (same order rule as AC1), has an `h1` with the
  category name, `<title>` `<category name> · <shop name>`, its own meta description, and an
  `og:url` pointing to that page.
- **AC6:** The product grid has 2 columns below 640 px, 3 from 640 px, 4 from 1024 px. At a
  360 px wide viewport the page has no horizontal scroll (the chip row scrolls inside
  itself), and every link is at least 44 px tall.
- **AC7:** The header shows the awning and the shop name as a link to `/`, with no search
  field. The shop name and home description are defined only in `src/lib/site.ts`.
- **AC8:** The first 4 product images in page order load eagerly; all others have
  `loading="lazy"`. Every product image is WebP with a `srcset` of 200 and 400 px widths.
  Each catalog page's HTML + CSS is ≤ 50 KB gzipped, and the eagerly loaded images total
  ≤ 150 KB (spec 0001 budget).
- **AC9:** Catalog pages contain no `<script>` tag and request only same-origin resources.
- **AC10:** In Chrome DevTools with cache disabled, the slowest built-in network throttling
  preset and a 360 px viewport, the chips, product names and prices on `/` are readable
  within 5 s of starting the load.
- **AC11:** A category with no products gets no chip, no section and no page. If there are no
  products at all, `/` shows "Todavía no hay productos." instead of a grid.

## Design

**Files**
| File | Role |
|---|---|
| `src/lib/site.ts` | `export const site = { name, description }`, moved unchanged from `src/pages/index.astro` (spec 0003 placeholder values) |
| `src/lib/catalog.ts` | `getCatalog()`: the only place the grouping and sort rules live |
| `src/components/SiteHeader.astro` | Header: awning + shop name link. No props |
| `src/components/CategoryNav.astro` | Props `categories` (from `getCatalog()`), `currentId: string \| null` (`null` = "Todos") |
| `src/components/ProductCard.astro` | Props `product` (collection entry), `headingLevel: 2 \| 3`, `eager: boolean` |
| `src/pages/index.astro` | Home: replaces the spec 0001 placeholder entirely |
| `src/pages/categoria/[id].astro` | One page per category via `getStaticPaths` |

**`getCatalog()`** (`src/lib/catalog.ts`): reads both collections with `getCollection`
(spec 0001 AC3: never import the JSON in pages). It returns an array of
`{ category, products }`:
- categories sorted by `data.order` ascending; categories with zero products dropped (AC11);
- a product belongs to the category whose `id` equals `product.data.category.id` (the
  `reference()` shape `{ collection, id }`, spec 0004);
- products sorted by `inStock` (true first), then `data.name` with
  `a.localeCompare(b, 'es')`.

**Home (`/`)**
```
SiteHeader
<main class="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-8">
  <div class="flex flex-col gap-4">  h1 "Productos" + CategoryNav (currentId = null)
  one <section aria-labelledby="<category id>"> per category:
      h2 id="<category id>" = category name
      <ul class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">  <li> ProductCard (headingLevel 3)
  empty state (AC11): <p class="text-muted">Todavía no hay productos.</p>
```
`BaseLayout` props: `title = site.name`, `description = site.description`.

**Category page (`/categoria/<id>`)**: `getStaticPaths()` returns one path per entry of
`getCatalog()`, with `params: { id: category.id }` and the entry as `props`. Same `main` as
home, `h1` = category name, `CategoryNav` with `currentId = category.id`, then one grid
(no `h2`), cards with `headingLevel 2` so headings don't skip a level.
`BaseLayout` props: `title = \`${category.data.name} · ${site.name}\``,
`description = \`${category.data.name}: precios y disponibilidad en ${site.name}.\``.
The route segment is Spanish because the URL is user-facing (same rule as `/producto/`,
spec 0001).

**Components** — copy the exact classes from `design.md` / `/estilo`; differences:
- **SiteHeader:** the header pattern minus the search field; the shop name becomes
  `<a href="/" class="font-display text-2xl font-semibold">`. Inner wrapper stays
  `mx-auto max-w-5xl px-4 py-3` (no flex row needed without the search field).
- **CategoryNav:** `<nav aria-label="Categorías">`, the chip list and both chip variants from
  `design.md`. The selected chip uses `aria-current="page"` (the correct value for a link to
  the current page; `/estilo` shows `"true"` because its chips are demos).
- **ProductCard:** the card pattern, plus: `<article>` gets `relative hover:border-accent`;
  the name heading (`h2` or `h3` per `headingLevel`, same classes either way) wraps
  `<a href={`/producto/${product.id}`} class="after:absolute after:inset-0">`, so the link's
  name is the product name and the whole card is clickable (AC3). The default focus ring
  stays on the link. `/develop` may render the heading level with a conditional
  (`h2` vs `h3`) or an Astro dynamic tag. Image: `widths={[200, 400]}`, the `sizes` value
  from `/estilo`, `loading="eager"` when `eager` is true, otherwise Astro's default lazy.
- **Eager images:** the page passes `eager` to the first 4 cards in page order (across
  sections on `/`). 4 × ≤ 25 KB keeps the first view under the 150 KB budget (AC8).

**States:** static site, so no loading or error state. Empty states per AC11.

**Shop identity:** `src/lib/site.ts` becomes the one file to edit for the shop name and
home description (plus `public/og-default.png` for the image). This changes the file named in
spec 0003's Requirements; ratifying 0003 must name `src/lib/site.ts` instead of
`src/pages/index.astro`.

**`design.md`:** `/develop` adds `SiteHeader`, `CategoryNav` and `ProductCard` to the
Components list with their paths and the differences above.

**Security:** static pages, no user input, no secrets.

## Build plan
- [x] **T1** (AC7) Create `src/lib/site.ts` with the values from `src/pages/index.astro`;
  create `src/components/SiteHeader.astro`.
- [x] **T2** (AC1, AC5, AC11) Create `src/lib/catalog.ts` with `getCatalog()`.
- [x] **T3** (AC2, AC3, AC8) Create `src/components/ProductCard.astro`.
- [x] **T4** (AC4, AC6) Create `src/components/CategoryNav.astro`.
- [x] **T5** (AC1, AC2, AC6, AC8, AC11) Rewrite `src/pages/index.astro` as the home catalog;
  remove the placeholder.
- [x] **T6** (AC4, AC5) Create `src/pages/categoria/[id].astro`.
- [x] **T7** (AC5, AC8, AC9) Run `pnpm typecheck` and `pnpm build`; inspect `dist/` for the 6
  category pages, `<script>` tags, `loading` attributes and gzipped sizes; update `design.md`.
- [x] **T8** (AC2) Out-of-stock photo at `opacity-50` everywhere the card appears:
  `src/components/ProductCard.astro` (already changed, uncommitted), the card copy in
  `src/pages/estilo.astro`, and `design.md` (card class line and the "Out of stock" rule);
  update the matching walkthroughs in `learning/code/`. No other class changes.

## Out of scope
- The product detail page `/producto/<id>` (feature 06) and the WhatsApp order button (07).
- Product search (would need a new scope item; the `/estilo` search field stays a demo).
- Sorting or filter controls other than category; pagination (18 products).
- Ratifying spec 0003 (shop name, texts, OG image) and a custom 404 page.
- `scripts/check-weight.mjs` (spec 0001 T6); `/check verify` measures AC8 by hand until then.

## Sources
- `docs/scope/scope.md` → feature 05; `docs/brief.md`
- `docs/specs/0001-stack.md` (routes, weight budget, no-JS rule, Spanish URL segments)
- `docs/specs/0002-design-base.md`, `design.md`, `src/pages/estilo.astro` (classes, grid)
- `docs/specs/0003-site-identity.md` (placeholder name and description)
- `docs/specs/0004-sample-product-data.md`, `src/content.config.ts` (fields, `reference()` shape)
- Owner answers, 2026-10-06: show out-of-stock products marked; one static page per category.
- Owner answer, 2026-10-13: out-of-stock photos at `opacity-50` on every page (follows
  `docs/reviews/2026-10-13-uncommitted-0001-0005.md`, finding 1).
- `getStaticPaths` and dynamic tags: from memory, not checked against Astro 7 docs this time;
  `/develop` checks them with `researcher` if unsure.

---
## Rationale
<!-- History, not build input. /develop does not read below this line. -->
**Options considered:**
- Filtering: one static page per category (chosen) vs a small client-JS show/hide filter on
  the home page (runner-up: instant switching, but adds JS, gives no shareable category
  link, and the home page grows with the catalog). Anchor links to sections were rejected:
  they scroll instead of narrowing the list, which the scope asks for.
- Out of stock: shown and marked, last in their category (chosen) vs hidden (runner-up:
  shorter list, but a product shared in WhatsApp would vanish from the catalog and customers
  lose sight of what the shop normally carries).
- Out-of-stock photo opacity (revised 2026-10-13): `opacity-50` everywhere (chosen, owner) vs
  keeping `opacity-60` everywhere and reverting the card (runner-up: no rework, but not the
  owner's pick). Only the photo fades; name, price and the
  "Agotado" badge keep full contrast, and the word still carries the meaning (`design.md`).
- Home grouped by category (chosen) vs one flat grid (runner-up: simpler, but 18+ mixed
  products are harder to scan, and the grouping is free given the category data).
- Whole-card link via a stretched link on the name (chosen) vs wrapping the whole card in
  `<a>` (runner-up: simpler markup, but screen readers then read name, format, price and
  badge as one long link name).
- Shop identity in `src/lib/site.ts` (chosen) vs passing the name from each page to the
  header (runner-up: no new file, but the name gets repeated in every page).

**Assumptions and risks:**
- Each category change is a full page load. Pages are small and the photos are cached after
  the first view, so this should feel fast even on 3G; `/check verify` confirms with AC10.
- `localeCompare(…, 'es')` relies on Node's ICU at build time (full ICU ships with Node 22+).
- Product links 404 until feature 06 ships; showing the demo before then means mentioning it.

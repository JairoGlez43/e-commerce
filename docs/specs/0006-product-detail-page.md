# 0006 · Product detail page

**Status:** Accepted
**Date:** 2026-10-07
**Revised:** 2026-10-13: out-of-stock photo opacity 60 → 50 (AC2, T5)
**Scope:** `docs/scope/scope.md` → feature 06
**Supersedes:** —

## Context
The catalog (spec 0005) links every card to `/producto/<id>`, which still 404s. The detail page
is what customers open from the catalog and, more often, straight from a link the owner
shares in a WhatsApp group, so its link preview matters as much as the page itself. Spec 0001
already fixed the route shape, prerendering and the Open Graph tags; this spec decides the
page content, the way back to the catalog and what the preview shows.

## Decision
- **One static page per product** at `/producto/<id>`, prerendered with `getStaticPaths`
  from the `products` collection, **including out-of-stock products** so shared links never
  break (they show "Agotado", as in the catalog).
- **Content:** photo, name, unit, price, availability badge, description. Same tokens and
  badge as the catalog card.
- **Way back = breadcrumb** above the title: `Productos › <Categoría>`, linking to `/` and to
  `/categoria/<id>`. Works for visitors who arrive straight from WhatsApp (no history to go
  back to). The header's shop name also links to `/`.
- **Link preview shows the price** (owner's choice): the description starts with price, unit
  and availability, then the product description. The preview image is the product photo as
  a JPG (WhatsApp-safe), generated at build time.
- No order button here; the WhatsApp contact is feature 07 and will be added to this page.

## Acceptance criteria
- **AC1:** `pnpm build` emits `dist/producto/<id>/index.html` for each of the 18 products,
  out-of-stock ones included; `/producto/no-existe` returns 404.
- **AC2:** The page shows, under the site header: the square photo (alt = product name), an
  `h1` with the name, the `unit`, the price formatted only by `formatPrice()`, the
  availability badge ("Disponible" / "Agotado", photo at `opacity-50` when out of stock), and
  the full `description`.
- **AC3:** Above the `h1`, a breadcrumb `<nav aria-label="Ruta">` shows "Productos" linking to
  `/` and the product's category name linking to `/categoria/<category id>`; both links are
  at least 44 px tall.
- **AC4:** Every product card on `/` and on each `/categoria/<id>` page now opens a page that
  returns 200 (no more 404s from the catalog).
- **AC5:** `<title>` and `og:title` are `<name> · <shop name>`. The meta description and
  `og:description` are `<price> · <unit> · <Disponible|Agotado>. <description>` (price via
  `formatPrice()`). `og:url` is the page's absolute URL. `og:image` is the absolute URL of a
  JPG of the product photo, 600 px wide and ≤ 100 KB.
- **AC6:** Below 768 px the page is one column with the photo first; from 768 px it is two
  columns (photo left, details right). At 360 px there is no horizontal scroll.
- **AC7:** The page has no `<script>` and requests only same-origin resources. HTML + CSS
  ≤ 50 KB gzipped. The photo is WebP with a `srcset` of 400 and 800 px, loads eagerly, and
  its 800 px version is ≤ 80 KB; images in the first view total ≤ 150 KB (spec 0001 budget).
- **AC8:** In Chrome DevTools with cache disabled, the slowest built-in throttling preset and
  a 360 px viewport, the name, price and availability are readable within 5 s.

## Design

**Files**
| File | Role |
|---|---|
| `src/pages/producto/[id].astro` | The page. The bracket name is `id` (not `slug` as listed in spec 0001) to match the product field and `src/pages/categoria/[id].astro` |

No new components. Reuse `BaseLayout`, `SiteHeader`, `formatPrice()` and `site` (spec 0005).

**Data:** `getStaticPaths()` reads `getCollection('products')` and returns one path per
product: `params: { id: product.id }`, `props: { product }`. In the page,
`const category = await getEntry(product.data.category)` gives the category name and id (the
`reference()` shape, spec 0004). Never import the JSON (spec 0001 AC3).

**Layout**
```
SiteHeader
<main class="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
  <nav aria-label="Ruta">
    <ol class="flex flex-wrap items-center gap-2 text-sm text-muted">
      <li><a href="/" class="inline-flex min-h-11 items-center hover:text-accent">Productos</a></li>
      <li aria-hidden="true">›</li>
      <li><a href="/categoria/<category id>" class="inline-flex min-h-11 items-center hover:text-accent"><category name></a></li>
  <article class="grid gap-6 md:grid-cols-2 md:items-start">
    <Image> photo
    <div class="flex flex-col gap-3">
      h1 (base style: font-display, text-3xl) = name
      <p class="text-muted"> unit
      <p class="price"> formatPrice(price)
      badge: the design.md "Availability badge" variants, without `mt-auto`
      <p> description
```
- **Photo:** `<Image src={photo} alt={name} widths={[400, 800]}
  sizes="(min-width: 768px) 480px, 100vw" loading="eager"
  class:list={['aspect-square w-full rounded-card border border-border object-cover', { 'opacity-50': !inStock }]} />`.
  At 360 px on a 2× screen the browser picks the 800 px file (≤ 80 KB, spec 0004 AC6).
- `text-muted` is used for the breadcrumb and unit; links keep the default focus ring.

**Open Graph** (through the existing `BaseLayout` props; no layout change):
- `title = \`${name} · ${site.name}\``
- `description = \`${formatPrice(price)} · ${unit} · ${inStock ? 'Disponible' : 'Agotado'}. ${description}\``
- `image`: a JPG made at build time from the product photo with `getImage()` from
  `astro:assets` (`src: photo`, `width: 600`, `format: 'jpg'`), passing its `src` path.
  `BaseLayout` already turns a path into an absolute URL. JPG because WhatsApp support for
  WebP previews is not guaranteed and spec 0003 already avoids non-raster formats.
  `/develop` confirms the `getImage()` call for Astro 7 with `researcher` before using it.

**`design.md`:** `/develop` adds the Breadcrumb pattern and the product detail layout.

**Security:** static page, no user input, no secrets.

## Build plan
- [x] **T1** (AC1, AC2, AC6) Create `src/pages/producto/[id].astro`: `getStaticPaths`, category
  via `getEntry`, header, photo, details, badge, layout.
- [x] **T2** (AC3) Add the breadcrumb.
- [x] **T3** (AC5) Confirm `getImage()` for Astro 7 (researcher, ask first), then pass title,
  description and the JPG preview image to `BaseLayout`. Confirmed locally from the installed
  types (`node_modules/astro/client.d.ts`: `getImage(options) => Promise<GetImageResult>`,
  `.src` is the file path; `"jpg"` is a valid format), no online lookup needed (2026-10-07).
- [x] **T4** (AC1, AC4, AC7, AC8) Run `pnpm typecheck` and `pnpm build`; inspect `dist/producto/`
  (18 pages, OG tags, JPG size, `<script>`, gzipped size); update `design.md` and the code
  walkthroughs in `learning/code/`.
- [x] **T5** (AC2) Out-of-stock photo at `opacity-50` in `src/pages/producto/[id].astro` and in
  `design.md` (detail photo line); update the matching walkthrough in `learning/code/`. Same
  value as the catalog card (spec 0005 T8). No other class changes.

## Out of scope
- The WhatsApp order button and message (feature 07).
- Related products, multiple photos, zoom, quantity selector, cart.
- A custom 404 page; ratifying spec 0003 (shop name, default OG image).
- Changing the catalog card or `BaseLayout` (`og:type` stays `website`).

## Sources
- `docs/scope/scope.md` → feature 06; `docs/brief.md`
- `docs/specs/0001-stack.md` (route, `getStaticPaths`, OG tags AC8, weight budget)
- `docs/specs/0003-site-identity.md` (raster OG image, absolute URL fallback)
- `docs/specs/0004-sample-product-data.md` (fields, `reference()` shape, photo sizes)
- `docs/specs/0005-catalog-page.md`, `design.md` (header, badge, tokens, touch targets)
- Owner answer, 2026-10-07: the link preview shows the price.
- Owner answer, 2026-10-13: out-of-stock photos at `opacity-50` on every page, matching the
  catalog card (spec 0005, revised the same day).
- `getImage()` and WhatsApp preview format support: from memory, not verified;
  `/develop` checks `getImage()` with `researcher` (T3).

---
## Rationale
<!-- History, not build input. /develop does not read below this line. -->
**Options considered:**
- Way back: breadcrumb to home and category (chosen) vs a single "← Volver al catálogo" link
  to `/` (runner-up: simplest, but loses the category context). A JS `history.back()` button
  was rejected: it needs JS and does nothing for visitors who arrive from WhatsApp.
- Preview with price (chosen, owner) vs name and photo only (runner-up: never stale). Old
  WhatsApp messages may show an outdated price, but opening the link always shows the current
  one.
- Preview image as a build-time JPG of the product photo (chosen) vs the default
  `og-default.png` for every product (runner-up: zero work, but every preview looks the same)
  vs the WebP already generated (rejected: preview support uncertain).
- Out-of-stock products keep their page (chosen) vs no page (rejected: a link shared while in
  stock would 404 later).
- Out-of-stock photo opacity (revised 2026-10-13): `opacity-50`, same as the catalog card
  (chosen, owner) vs keeping `opacity-60` here (rejected: the same state would look different
  on the card and on the page).

**Assumptions and risks:**
- WhatsApp caches a preview per URL; a price change may not refresh previews already sent.
- The preview JPG adds one ≤ 100 KB file per product to `dist/`, downloaded only by WhatsApp,
  not by visitors.
- Until `site` is set (feature 08), `og:url` and `og:image` point to `localhost`, so real
  WhatsApp previews can only be tested after the deploy.

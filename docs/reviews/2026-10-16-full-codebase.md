# Review · full codebase at HEAD 3c5c1d1

**Date:** 2026-10-16
**Reviewed by:** Claude Sonnet (`reviewer` subagent) · **Code written by:** Claude Opus
**Target:** the whole codebase as it stands at `3c5c1d1` on `main` (clean tree), not a diff.
`astro.config.mjs`, `package.json`, `scripts/check-weight.mjs`, everything under `src/`.
`learning/` and the prose in `docs/` were out of scope.
**Specs:** 0001, 0002, 0004, 0005, 0006, 0007, 0008, 0009 (0003 is superseded by 0009), plus
`AGENTS.md` conventions and `design.md`.

> The orchestrating session spot-checked findings 2 and 4 against the code: the duplicate
> `EAGER_CARDS`, `opacity-50`, "Agotado" and page-URL code all exist, and `check-weight.mjs`
> does no webp, lazy-loading, script-count or third-party checks. Finding 5 (the clipped focus
> ring) is not confirmed in a browser.

## 🔴 Critical
None.

## 🟡 Important

### 1. `scripts/check-weight.mjs` can pass while measuring nothing (spec 0001 AC7)
- **Where:** `scripts/check-weight.mjs:61-62, 71`.
- **Problem:** the script has no sanity check that it found anything to measure. If the font
  regex or the `<img>` regex stops matching, it gets `fonts = []` and `largest = 0`. The
  font-count and image checks then pass silently. This could happen after an Astro markup change,
  or if the font preload becomes a different tag.
- **Evidence:** `/estilo/` already reports `1st view 0.0`. That value is correct for that page,
  but it shows the script never treats a zero as suspicious.
- **Fix:** fail when a page has 0 fonts. Warn when a page other than `/estilo/` has no `<img>`.

### 2. `scripts/check-weight.mjs` does not enforce criteria it is cited for (spec 0001 AC2, AC5, AC6; spec 0005 AC8)
- **WebP:** the script never asserts that images are WebP. The build is currently fine: 72 webp
  files, and the 18 jpgs are only the `og:image` previews.
- **Lazy loading:** the script never asserts that the images below the fold use
  `loading="lazy"`. It only adds up the eager images.
- **External requests and scripts:** the script never asserts that the page requests no
  third-party URLs. It also never asserts zero `<script>` tags, and its 5 KB JS budget would
  allow a script that AC2 forbids.
- **First view:** the `firstView` figure (lines 72 and 80) counts eager images only. It leaves
  out the preloaded font (17.7 KB) and the HTML+CSS, so the "150 KB first view" figure
  understates the real total. The worst real first view is about 60.5 KB, still well inside the
  budget.
- **Fix:** add these assertions:
  - every `<img>` srcset URL ends in `.webp`;
  - catalog pages have at most 4 eager images, and the rest are lazy;
  - no `src` or `href` starts with `http`, except the `og:` and `wa.me` links;
  - the JS count is 0 unless a spec allows a script;
  - the first-view total includes the font and the HTML+CSS.

### 3. `scripts/check-weight.mjs` crashes instead of reporting
- **Where:** `fileSize` calls `statSync` on a URL path (lines 27, 62, 67).
- **Failure cases:**
  - A missing asset throws an uncaught stack trace. The exit code is 1, but only by accident.
  - An `<img>` with neither `srcset` nor `src` makes `largestImage` return `undefined`. Then
    `path.join(dist, undefined)` throws a `TypeError`.
  - A URL with a query string or an absolute URL would also break the script.
- **Fix:** wrap each page's measurement in try/catch and report `FAIL: cannot read <url>`.

### 4. Rules duplicated across files (AGENTS.md: one home per rule)
- **Availability badge:** the "Disponible" / "Agotado" markup and strings appear in three places:
  `src/components/ProductCard.astro:45-54`, `src/pages/producto/[id].astro:70-81` and
  `src/pages/estilo.astro:~160`. The availability string is built again at
  `producto/[id].astro:30`.
- **Out-of-stock photo:** `{ 'opacity-50': !inStock }` appears in `ProductCard.astro:28`,
  `producto/[id].astro:63` and `estilo.astro:152`. The last change from opacity 60 to 50 had to
  be made in each of those files.
- **Page URL:** `new URL(Astro.url.pathname, Astro.site ?? Astro.url)` appears in both
  `BaseLayout.astro:19-20` and `producto/[id].astro:36`. If one changes, the WhatsApp link and
  `og:url` can stop matching.
- **Eager card count:** `EAGER_CARDS = 4` is defined in both `index.astro:13` and
  `categoria/[id].astro:28`.
- **Suggested fix:** a `StockBadge.astro` component, plus `lib` helpers for the stock rule and
  the page URL. Fixing this needs an `/architect` decision.

### 5. Possibly clipped focus ring on category chips (spec 0005 AC6), not confirmed
- **Where:** `src/components/CategoryNav.astro:23`. The same markup is copied in `estilo.astro:96`.
- **Why it might clip:** the `ul` has `overflow-x-auto`, which makes `overflow-y` compute to
  `auto` as well. The global focus outline is 2 px with a 2 px offset (`global.css:49-52`), so
  the ring may be clipped on the first chip, the last chip and the top edge.
- **Not tested:** nobody has checked this in a browser.
- **Fix:** add `p-1` (or `px-1 pt-1`) to the `ul`.

## 🟢 Minor

6. **WhatsApp number validation depends on a product page rendering**
   (`src/lib/whatsapp.ts:9`, spec 0007 AC5).
   - `getWhatsAppNumber()` runs only inside `orderLink()`. If `products.json` were empty, the
     build would not fail on a bad `WHATSAPP_NUMBER`. This is an edge case only.
   - Encoding, the 8–15 digit validation and the error message are all correct.
7. **`src/pages/estilo.astro:23-29`.**
   - The product ids are hard-coded, so renaming a product silently shows fewer cards.
   - It holds a third copy of the card markup, and that copy already lacks `relative` and
     `hover:border-accent`.
   - The page is public at `/estilo/`. It is `noindex` and not linked from anywhere.
8. **`src/content.config.ts`.**
   - Nothing checks that product ids are unique. It is unconfirmed whether the `file()` loader
     fails the build on a duplicate id.
   - Categories with equal `order` sort in an unspecified order (`catalog.ts:15`).
9. **`ProductCard.astro:22-24`, `index.astro:34`.**
   - Screen readers read the product name twice, from the `alt` and from the link. This is
     what spec 0005 AC2 asks for, so it is noted only.
   - `aria-labelledby={category.id}` uses a raw data id as a DOM id. Consider prefixing it
     (`cat-…`).
10. **`producto/[id].astro:46`.**
    - The `›` breadcrumb separator is a list item marked `aria-hidden`, so screen readers still
      count it in the list length.
    - The breadcrumb has no `aria-current`.
    - There is no skip link.
11. **`src/assets/products/CREDITS.md`.**
    - Every one of the 18 photos has a credits row and a product entry.
    - Some source titles don't match the product:
      - `detergente-en-polvo`: "wooden bowl … white powder";
      - `muslos-de-pollo`: "two raw chickens", meaning whole chickens, not thighs;
      - `pure-de-tomate`: the title mentions mozzarella.
    - The reviewer did not look at the images. Worth checking before the owner demo.
12. **Doc drift, for `/sync`.**
    - The AGENTS.md Structure section still says `scripts/` "does not exist yet".
    - `check:weight` is not listed under Commands.
    - `BaseLayout.astro` has no `<link rel="canonical">`. No spec requires one.

## Done well
- **No client JS.** There are 0 `<script>` tags in the build and no `client:` directives. There
  are no `<style>` tags and no `style=` attributes in `src/`.
- **Tokens.** Every Tailwind class uses a token name. Raw values live only in `global.css`, and
  `--color-*: initial` removes Tailwind's default palette.
- **Images.**
  - Product photos are WebP, with `srcset` and `sizes`.
  - The first 4 cards load eager and the rest load lazy.
  - Images use `decoding="async"` and set width and height, so the layout doesn't shift.
  - The `og:image` is a 600 px JPG, for WhatsApp previews.
- **Weight**, worst page against the budget:

  | Item | Measured | Budget |
  |---|---|---|
  | HTML+CSS (gzip) | 6.7 KB | 50 KB |
  | Font | 17.7 KB | 25 KB |
  | Detail photo | 58.5 KB | 80 KB |
  | Thumbnail | 22.8 KB | 25 KB |

- **Data access.** Only `content.config.ts` reads the JSON. It runs `refine` before
  `reference()`, which handles the known pitfall.
- **One home for core rules.** Prices always go through `formatPrice()`. Grouping and sorting
  live only in `getCatalog()`. Empty categories are hidden everywhere.
- **Accessibility.**
  - Tap targets are 44 px (`inline-flex min-h-11`).
  - The whole card is clickable, through an overlay link.
  - Landmarks and heading order are correct.
  - Contrast estimated from the token values passes AA. No contrast tool was run.
- **Order link.** It is encoded with `encodeURIComponent`. The decoded message on
  `producto/huevos` matches spec 0007 AC3.
- **No third-party requests.** The font is self-hosted. `noindex` is driven by the single
  `site.indexable` switch.

## What was checked
- **Commands:**
  - `pnpm typecheck`: 0 errors, 0 warnings, 0 hints, 17 files.
  - `WHATSAPP_NUMBER=5355555555 pnpm build`: 26 pages built.
  - `pnpm check:weight`: "All 26 pages within budget".
- **Source files:** all in-scope files were read in full, with two exceptions. `estilo.astro`
  was read up to line 150. `products.json` was partly read, with ids and stock counted by grep.
- **Specs:** the acceptance criteria of 0001 and 0005–0009 were read by grep, not in full.
  0002, 0004, `design.md` and the previous review were not read.
- **Built output:** `dist/` was inspected for `<img>` attributes, `<link>` tags, the script
  count, `og:image` and the decoded WhatsApp href.
- **Photo credits:** the 18 photos were compared against `CREDITS.md` and the product list.
- **`.env`:** not read.
- **Not confirmed:**
  - browser rendering: focus-ring clipping and grid breakpoints;
  - behaviour on a throttled connection;
  - the live Vercel deploy and its compression;
  - the WhatsApp preview and chat on a real phone;
  - whether a duplicate product id fails the build;
  - the owner-only criteria: 0005 AC10, 0006 AC8, 0007 AC6, 0008 AC3–AC6.

## Status lines
- **Scope:** no change. The workflow depth is **alpha**, which does not require a review, and no
  scope section has a "Review it" box.
- **Flag for `/sync`:** features 05 and 06 are still `in-progress`, although "Build it" and
  "Verify it" are both ticked and alpha needs no more checks. Not changed here, because
  reconciling status lines is `/sync`'s job.

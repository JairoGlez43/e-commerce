# Design system

The real values (colors, sizes, radii) live in `src/styles/global.css` (`@theme` blocks). This
file holds the art direction and the rules, and points at token **names** only — never repeat a
value here. Decision and rationale: `docs/specs/0002-design-base.md`. Live preview: `/estilo`.

## Direction
A warm, plain neighborhood market stall, not a supermarket chain. Mercadona's online shop is a
loose reference for structure only (light page, categories on top, simple cards with photo,
name, format and price). Our own touches: cream page, serif display type for headings and
prices, a striped awning on top of the header, colored availability badges.

## Tokens (names only — values in CSS)
- Surfaces: `cream` (page), `surface` (cards, chips, inputs), `awning` (light awning stripe)
- Text: `ink` (main), `muted` (secondary, format line), `surface` (text on `accent`)
- Accent and states: `accent` (prices, primary button, selected chip, focus ring),
  `accent-hover`, `olive` + `olive-soft` (available), `unavailable` (out of stock)
- Lines: `border` (decorative only, never the only way to spot a control)
- Radii and shadow: `rounded-card`, `shadow-card`; chips and buttons use `rounded-full`
- Fonts: `font-display` (Fraunces 600, headings and prices only), `font-sans` (system stack,
  everything else)
- Spacing and type scale: Tailwind defaults

**Rule: use tokens, never raw values.** Only the classes generated from these tokens exist
(`--color-*: initial` removes Tailwind's default palette, so `bg-red-500` does nothing). No hex,
`rgb(` or `oklch(` in `.astro` files. Write class names in full; never build them from strings.

## Layout
- Page container: `mx-auto max-w-5xl px-4`; sections stacked with `gap-12`, page `py-8`.
- Product grid: `grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4`.
- Navigation: category chips in one horizontal row that scrolls on overflow. No drawer, no JS.
- Mobile first; minimum touch target 44px (`min-h-11`).

## Typography roles
- `h1` / `h2` / `h3`: `font-display` 600 at `text-3xl` / `text-2xl` / `text-xl` (base styles,
  automatic).
- Body: `font-sans`, `text-ink`.
- Secondary and format line: `text-sm text-muted`.
- Price: class `price` (`font-display`, 600, `text-xl`, `text-accent`). Format the number only
  with `formatPrice()` from `src/lib/price.ts`.
- Product name inside a card: `h3` reset to body type (`font-sans text-base font-medium`).

## Components
_Added by /develop as they ship: name · path · exact classes · variants._

- **Awning strip** · `src/styles/global.css` (`.awning`) · `<div class="awning" aria-hidden="true">`
  as the first child of the header · no variants.
- **Header** · shown in `src/pages/estilo.astro` · `<header class="border-b border-border bg-surface">`
  → awning → `<div class="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">`
  with the shop name `<p class="font-display text-2xl font-semibold">` and the search field.
- **Search field** · `src/pages/estilo.astro` · visually hidden `<label class="sr-only">` +
  `<input type="search" class="min-h-11 w-full rounded-full border border-border bg-surface px-4 text-ink placeholder:text-muted sm:w-72">`.
- **Category chip** · `src/pages/estilo.astro` · list `<ul class="flex gap-2 overflow-x-auto pb-2">`
  inside `<nav aria-label="…">`. Variants:
  - default: `inline-flex min-h-11 items-center whitespace-nowrap rounded-full border border-border bg-surface px-4 text-ink hover:border-accent`
  - selected (`aria-current="true"`): `inline-flex min-h-11 items-center whitespace-nowrap rounded-full bg-accent px-4 text-surface`
- **Primary button** · `src/pages/estilo.astro` ·
  `inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-6 font-medium text-surface hover:bg-accent-hover active:bg-accent-hover`.
- **Product card** · `src/pages/estilo.astro` ·
  `<article class="flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card">`
  → photo `<Image … widths={[200, 400]} class="aspect-square w-full object-cover">` (add
  `opacity-60` when out of stock; alt = product name) → `<div class="flex flex-1 flex-col gap-1 p-3">`
  with name (`h3`, see Typography), format line, `price`, badge.
- **Availability badge** · `src/pages/estilo.astro` · variants:
  - available: `<p class="mt-auto inline-flex w-fit items-center gap-1.5 rounded-full bg-olive-soft px-2 py-0.5 text-xs font-medium text-olive">`
    with a dot `<span class="size-1.5 rounded-full bg-olive" aria-hidden="true">` + "Disponible"
  - out of stock: `<p class="mt-auto inline-flex w-fit items-center rounded-full border border-border px-2 py-0.5 text-xs font-medium text-unavailable">Agotado</p>`

- **SiteHeader** · `src/components/SiteHeader.astro` · no props · the Header above without the
  search field: awning → `<div class="mx-auto max-w-5xl px-4 py-3">` → shop name as
  `<a href="/" class="inline-flex min-h-11 items-center font-display text-2xl font-semibold">`
  (name from `src/lib/site.ts`; `min-h-11` keeps the 44px touch target).
- **CategoryNav** · `src/components/CategoryNav.astro` · props `categories` (from `getCatalog()`),
  `currentId` (`null` = "Todos") · `<nav aria-label="Categorías">` + the Category chip list; a
  "Todos" chip (`/`) first, then one chip per category (`/categoria/<id>`). The current chip uses
  the selected variant with `aria-current="page"` (not `"true"`: these are real page links).
- **ProductCard** · `src/components/ProductCard.astro` · props `product`, `headingLevel` (`2 | 3`),
  `eager` · the Product card above, plus `relative hover:border-accent` on the `<article>`; the
  name heading wraps `<a href="/producto/<id>" class="after:absolute after:inset-0">` so the whole
  card is clickable and the link's name is the product name. `eager` sets `loading="eager"`
  (first 4 cards of a page); otherwise lazy.

- **Breadcrumb** · `src/pages/producto/[id].astro` · `<nav aria-label="Ruta">` →
  `<ol class="flex flex-wrap items-center gap-2 text-sm text-muted">`; each link
  `<a class="inline-flex min-h-11 items-center hover:text-accent">`; separator
  `<li aria-hidden="true">›</li>`. No variants.
- **Product detail layout** · `src/pages/producto/[id].astro` · `<article class="grid gap-6 md:grid-cols-2 md:items-start">`
  → photo `<Image … widths={[400, 800]} sizes="(min-width: 768px) 480px, 100vw" loading="eager"
  class="aspect-square w-full rounded-card border border-border object-cover">` (`opacity-60` when
  out of stock) → `<div class="flex flex-col gap-3">` with `h1` (base style), unit
  `<p class="text-muted">`, `price`, the Availability badge **without** `mt-auto`, description `<p>`.

- **WhatsApp order button** · `src/pages/producto/[id].astro` · the Primary button as a link, full
  width on mobile: `<a href={orderHref} class="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-accent px-6 font-medium text-surface hover:bg-accent-hover active:bg-accent-hover md:w-fit">`.
  Text "Pedir por WhatsApp" (in stock) or "Preguntar por WhatsApp" (out of stock). No logo; same tab.

## States
- Out of stock: "Agotado" badge plus photo at `opacity-60`; the word carries the meaning, never
  the color alone.
- Empty, loading and error states for pages are designed by the feature that owns the page
  (05–07), with these tokens. The site is static, so there is no loading state by default.

## Do / Don't
- Do: start from `/estilo` and copy the exact classes above.
- Do: keep every focusable element's default focus ring (`:focus-visible`, `accent` outline).
- Do: keep photos square and request widths of 400 px or less in cards (weight budget, spec 0001).
- Don't: add colors, fonts or shadows outside `global.css`; ask for a spec change instead.
- Don't: use `font-display` for body text, or more than one weight of it (one font file only).
- Don't: add client JS for styling (chips scroll with CSS; no drawers or carousels).

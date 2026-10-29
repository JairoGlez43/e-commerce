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
  `opacity-50` when out of stock; alt = product name) → `<div class="flex flex-1 flex-col gap-1 p-3">`
  with name (`h3`, see Typography), format line, `price`, badge.
- **Availability badge** · `src/pages/estilo.astro` · variants:
  - available: `<p class="mt-auto inline-flex w-fit items-center gap-1.5 rounded-full bg-olive-soft px-2 py-0.5 text-xs font-medium text-olive">`
    with a dot `<span class="size-1.5 rounded-full bg-olive" aria-hidden="true">` + "Disponible"
  - out of stock: `<p class="mt-auto inline-flex w-fit items-center rounded-full border border-border px-2 py-0.5 text-xs font-medium text-unavailable">Agotado</p>`

- **SiteHeader** · `src/components/SiteHeader.astro` · no props · the Header above without the
  search field: awning → `<div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">`
  → shop name as `<a href="/" class="inline-flex min-h-11 items-center font-display text-2xl font-semibold">`
  (name from `src/lib/site.ts`; `min-h-11` keeps the 44px touch target) → the Contact link. When
  both do not fit (360 px), the link wraps under the name.
- **Contact link** · `src/components/SiteHeader.astro`, shown in `src/pages/estilo.astro` · the
  Category chip default plus `font-medium`:
  `<a href={contactLink()} class="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border border-border bg-surface px-4 font-medium text-ink hover:border-accent">`
  → `<WhatsAppIcon />` (green) → "Escríbenos". Same tab (spec 0007); icon since spec 0011.
- **WhatsAppIcon** · `src/components/WhatsAppIcon.astro` · prop `variant` (`'green'` default,
  `'white'` on the terracotta order button) · the official glyph as
  `<img src={file.src} width="20" height="20" alt="" class="size-5 shrink-0">`. Files in
  `src/assets/icons/` (see `SOURCE.md`): never edit, recolor or inline them (their own `<style>`
  and `id` clash when two variants share a page). Always next to words, never instead of them;
  the parent link gets `gap-2`.
- **ShopInfo** · `src/components/ShopInfo.astro` · no props (reads `site`) ·
  `<section class="flex flex-col gap-4">` → `h2` "Cómo comprar" → `<ol class="flex flex-col gap-2">`,
  each step `<li class="flex items-center gap-3">` with a number circle
  `<span class="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-accent font-medium text-surface" aria-hidden="true">`
  → `<div class="grid gap-4 sm:grid-cols-2">` with two **Info blocks**.
- **Info block** · `src/components/ShopInfo.astro` ·
  `<div class="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">` with an `h3`
  and plain `<p>` / `<ul>` lines. No shadow (it is not clickable, unlike the Product card).
- **Faq** · `src/components/Faq.astro` · no props (reads `site.faq`) · `<section class="flex flex-col gap-4">`
  → `h2` "Preguntas frecuentes" → `<div class="flex flex-col gap-2">` of
  `<details class="rounded-card border border-border bg-surface">` →
  `<summary class="min-h-11 cursor-pointer px-4 py-3 font-medium">` + answer `<p class="px-4 pb-4">`.
  Never put `flex` on the `<summary>`: it hides the browser's disclosure triangle.
- **SiteFooter** · `src/components/SiteFooter.astro` · no props · after `<main>` on every customer
  page, dark since spec 0011: `<footer class="bg-ink text-cream">` →
  `<div class="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-8 text-sm">` with the shop name
  `<p class="font-display text-xl font-semibold">`, location, hours `<ul>`, and the link
  `<a class="inline-flex min-h-11 w-fit items-center gap-2 font-medium text-cream underline underline-offset-4 hover:text-awning focus-visible:outline-cream">`
  → `<WhatsAppIcon />` → "Escríbenos por WhatsApp". No top margin: pages end their `<main>` with
  `pb-12`, and the home info band touches it. On `ink`, every focusable element needs
  `focus-visible:outline-cream` (the default `accent` ring is 2.60:1 there). Shop content only: no
  developer credit.
- **Info band** · `src/pages/index.astro`, shown in `src/pages/estilo.astro` · full width, after
  the page's centered container, inside `<main>`: `<div class="awning" aria-hidden="true">` →
  `<div class="bg-awning">` → `<div class="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-12">`
  holding ShopInfo and Faq (their white blocks sit on the band). Only the shop information goes on
  it; product categories stay on `cream`.
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
  class="aspect-square w-full rounded-card border border-border object-cover">` (`opacity-50` when
  out of stock) → `<div class="flex flex-col gap-3">` with `h1` (base style), unit
  `<p class="text-muted">`, `price`, the Availability badge **without** `mt-auto`, description `<p>`.

- **NoPhoto** · `src/components/NoPhoto.astro` · prop `framed` (default `false`) · stands where a
  product without a photo would show it (spec 0015):
  `<div class="flex aspect-square w-full items-center justify-center bg-cream text-sm text-muted">Sin foto</div>`,
  plus `rounded-card border border-border` when `framed` (the product page). The visible words
  carry the meaning, so no `alt`; never `opacity-50` (the "Agotado" badge shows the stock). Used by
  ProductCard, the product page and `/estilo`.

- **WhatsApp order button** · `src/pages/producto/[id].astro` · the Primary button as a link, full
  width on mobile: `<a href={orderHref} class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-accent px-6 font-medium text-surface hover:bg-accent-hover active:bg-accent-hover md:w-fit">`
  → `<WhatsAppIcon variant="white" />` → "Pedir por WhatsApp" (in stock) or "Preguntar por
  WhatsApp" (out of stock). Same tab.

_Admin (`/admin/`, spec 0014): the only route with forms and client JS._
- **Admin header** · `src/pages/admin/index.astro` · `<header class="border-b border-border bg-surface">`
  → awning → `<div class="mx-auto flex max-w-md items-center px-4 py-3">` with the shop name
  `<p class="font-display text-2xl font-semibold">` (not a link: the admin never links to public
  pages). The page column is `<main class="mx-auto flex max-w-md flex-col gap-6 px-4 py-8">`.
- **Admin card** · `src/pages/admin/index.astro` · one per view:
  `<section class="flex flex-col gap-4 rounded-card border border-border bg-surface p-4">` (the Info
  block with `gap-4`), with an `h2` and a `<form class="flex flex-col gap-4">`.
- **Text field** · `src/pages/admin/index.astro` · label above, always visible:
  `<div class="flex flex-col gap-1">` → `<label class="font-medium">` →
  `<input class="min-h-11 w-full rounded-card border border-muted bg-surface px-4 text-ink">`.
  The border uses `muted`, not `border`, so the field's edge is visible against `surface`
  (`border` is decorative only).
- **Primary button (form)** · the Primary button plus `disabled:opacity-50`. While a request runs,
  it is disabled and its label ends in "…" (the label lives in `data-label`).
- **Secondary button** · `src/pages/admin/index.astro` ("Cerrar sesión") ·
  `inline-flex min-h-11 w-fit items-center justify-center rounded-full border border-border bg-surface px-6 font-medium text-ink hover:border-accent disabled:opacity-50`
  (the Contact link's look, for an action that is not the main one).
- **Text button** · `src/pages/admin/index.astro` ("¿Olvidaste tu contraseña?", "Volver") ·
  `<button type="button" class="inline-flex min-h-11 w-fit items-center text-accent underline underline-offset-4">`.
- **Form messages** · `src/pages/admin/index.astro` · errors
  `<p role="alert" class="font-medium text-accent empty:hidden">` (the words carry the meaning, the
  color only supports it); notices `<p role="status" class="text-sm text-muted empty:hidden">`.
  `empty:hidden` keeps an empty message from adding a gap.

_Admin products (spec 0015). Repeated markup lives in `<template>` elements with classes in full;
the script fills them with `textContent` only._
- **Admin notice** · last line of the account card · `<p class="text-sm text-muted">`.
- **Product group** · `<template data-template="group">` · `<div class="flex flex-col gap-2">` → `h3`
  (base style) → `<ul class="flex flex-col divide-y divide-border">`. The list holds the groups in
  `<div class="flex flex-col gap-6">`; empty categories get no group.
- **Product row** · `<template data-template="row">` ·
  `<li class="flex items-center justify-between gap-3 py-2">` → `<div class="flex min-w-0 flex-col">`
  with the name as a Text button plus `text-left` (opens the form) and the line `<unit> · <price>`
  `<p class="text-sm text-muted">` → the row's Checkbox, whose label adds `shrink-0` and a
  `<span class="sr-only"><name>: </span>` before "Disponible".
- **Checkbox** · label wraps the box: `<label class="inline-flex min-h-11 w-fit items-center gap-2">`
  → `<input type="checkbox" class="size-5 accent-accent">` → the words (the label is the 44 px
  target). In a form the label adds `font-medium`.
- **Select** · the Text field's input classes on a `<select>`; the first option has an empty value
  ("Elige una categoría").
- **Textarea** · the Text field's input classes plus `py-2`.
- **Field hint** · `<p id="…-hint" class="text-sm text-muted">` under the input, which points to it
  with `aria-describedby`.
- **Danger text button** · the Text button ("Borrar producto"), already `text-accent`, inside
  `<div class="flex flex-col gap-4 border-t border-border pt-4">` at the end of the form card.
- **Confirm block** · replaces the danger button in place: `<div class="flex flex-col gap-3">` →
  question `<p class="font-medium">` → `<div class="flex flex-wrap gap-3">` with the Primary button
  (form) "Sí, borrar" and the Secondary button "No, volver". Focus goes to "No, volver". Never
  `confirm()`: some in-app browsers block it.
- **Photo block** (spec 0017) · first in the product form ·
  `<div class="flex flex-col gap-2">` → `<p class="font-medium">Foto</p>` → the preview
  `<img alt="" class="aspect-square w-full max-w-60 rounded-card border border-border object-cover">`
  (the public site's square crop; decorative, the name field names the product) or, when there is
  no photo, `<div class="w-full max-w-60"><NoPhoto framed /></div>` → `<div class="flex flex-wrap items-center gap-3">`
  with the file input `<input type="file" accept="image/*" class="peer sr-only">` and its label styled
  as the Secondary button plus `cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent peer-disabled:opacity-50`
  ("Añadir foto" / "Cambiar foto"; the hidden input carries the focus, the label shows it), then the
  Text button "Quitar foto" plus `disabled:opacity-50` → a Form messages notice for the photo state.
- **Headings that receive focus** · `h2` with `tabindex="-1"` (the list's "Productos" and the
  form's title), focused when the view changes so the page scrolls to it and screen readers follow.

_Admin publish (spec 0016)._
- **Publicar card** · `src/pages/admin/index.astro` · an Admin card between the account card and
  "Productos": `h2` "Publicar" → the state line `<p role="status" class="text-ink empty:hidden">`
  (Form messages notice, but `text-ink` without `text-sm`, because it is the card's main message)
  → the error `<p role="alert" class="font-medium text-accent empty:hidden">` → the Primary button
  (form) "Publicar cambios", full width of the card.

## Contrast added by spec 0011
The base table is in `docs/specs/0002-design-base.md`. New pairs (WCAG ratios, 2026-10-16):
| Text | Background | Ratio |
|---|---|---|
| ink / muted / accent | awning | 12.55 / 5.20 / 4.82 |
| cream | ink | 14.60 |
| awning (footer link hover) | ink | 12.55 |
| accent (focus ring) | ink | 2.60: **fails**, use `outline-cream` on `ink` |
Graphics: WhatsApp green glyph on `ink` 7.92, white glyph on `accent` 6.04.

## States
- Out of stock: "Agotado" badge plus photo at `opacity-50`; the word carries the meaning, never
  the color alone.
- No photo (spec 0015): the NoPhoto box in the photo's place; out of stock still shows only the
  badge.
- Admin list: "Cargando productos…" (status), the error (alert) plus a "Reintentar" Secondary
  button, "Todavía no hay productos." (only if the table was emptied in the dashboard), and after a
  write "Producto guardado." / "Producto borrado." (status).
- Photo block (spec 0017): "Preparando foto…" while the chosen photo shrinks ("Guardar" disabled),
  then "La foto nueva se subirá al guardar." or "La foto se quitará al guardar."; an unreadable file
  shows "No se pudo abrir esta foto. Prueba con otra." in the form's alert. While saving, the button
  reads "Subiendo foto…", then "Guardando…".
- Publicar card: "Comprobando…" while loading, then one of "Publicando… La web se actualiza en
  unos minutos.", "Hay cambios sin publicar." or "La web está al día."; "Publicado. La web ya
  muestra los cambios." for 5 s when a watched publish ends. Errors go in the alert; the button
  stays usable.
- Empty, loading and error states for pages are designed by the feature that owns the page
  (05–07), with these tokens. The site is static, so there is no loading state by default.

## Do / Don't
- Do: start from `/estilo` and copy the exact classes above.
- Do: keep every focusable element's default focus ring (`:focus-visible`, `accent` outline).
- Do: keep photos square and request widths of 400 px or less in cards (weight budget, spec 0001).
- Don't: add colors, fonts or shadows outside `global.css`; ask for a spec change instead.
- Don't: use `font-display` for body text, or more than one weight of it (one font file only).
- Don't: add client JS for styling (chips scroll with CSS; no drawers or carousels).

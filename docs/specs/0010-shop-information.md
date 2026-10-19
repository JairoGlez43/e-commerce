# 0010 · Shop information

**Status:** Accepted
**Date:** 2026-10-16
**Revised:** 2026-10-20: the demo location `La Lisa, La Habana` becomes the placeholder
`Municipio, Provincia` (owner's choice). The delivery FAQ answer changes with it (AC1, T8).
**Scope:** `docs/scope/scope.md` → feature 16
**Supersedes:** —
**Amended by:** 0011 (WhatsApp icon on the header and footer links; Faq summary classes)

## Context
The demo is shown to shop owners who judge it by look and feel, not by weight or speed. Today
it is a header, category chips and a product grid: no way to contact the shop without opening a
product, and nothing about how to pay, pick up, or when the shop is open. Those are the
questions customers now ask the owner in private, and the pitch promises the site answers them.
Research (scope feature 16 notes) shows Cuban online shops put payment methods near the top and
show delivery, hours, location, "¿Cómo comprar?" and an FAQ; NN/g and Baymard back visible
contact, hours and a footer, and an FAQ over search for small catalogs.

## Decision
- **All shop information lives in `src/lib/site.ts`**, next to the name and description (spec
  0009). Adapting the demo to a client stays a one-file change; no component holds shop copy.
- **The demo location is the placeholder `Municipio, Provincia`** (owner's choice, revised
  2026-10-20). The demo is pitched to shops in different places, so it names none. When a site
  is sold, the value becomes that shop's municipality and province, never a street address.
  Spec 0009 still holds: no real business, no address.
- **The demo offers pickup only, no delivery** (owner's choice: the first prospective client has
  no delivery). Delivery is a sentence in `site.ts`, so a client who delivers changes one string.
- **Top of the home page:** a "last updated" line with the build date, and a "we accept" line
  listing payment methods as plain text (no logos).
- **Header on every page gets an "Escríbenos" WhatsApp link** with a general message, reusing
  `src/lib/whatsapp.ts`.
- **Below the products on the home page:** "Cómo comprar" (3 steps), then two blocks,
  "Recogida y entrega" and "Horario y ubicación", then "Preguntas frecuentes" as native
  `<details>` elements (open and close with no JS).
- **A footer on every customer page:** shop name, municipality, hours, WhatsApp link.
- **Everything is about the shop's customers:** no developer credit or self-promotion.

## Acceptance criteria
- **AC1:** `src/lib/site.ts` holds every piece of shop information listed in Design (location,
  hours, payments, pickup, delivery, how-to-buy steps, FAQ). Components render them from
  `site`; `Municipio, Provincia`, `Transfermóvil` and the FAQ answers appear in no other file
  under `src/`. No file under `src/` names a real place as the shop's location.
- **AC2:** On `/`, between the `h1` and the category nav, two lines show: `Actualizado el <day>
  de <month>` with the build date in the `America/Havana` time zone (e.g. `Actualizado el 16 de
  octubre`), and `Aceptamos: Efectivo (CUP) · Transfermóvil · EnZona · USD en efectivo`.
- **AC3:** The header of `/`, every `/categoria/<id>` and every `/producto/<id>` shows the shop
  name link and a link "Escríbenos". Its `href` is `https://wa.me/<WHATSAPP_NUMBER>?text=` +
  the URL-encoded message `Hola, tengo una pregunta sobre la tienda.` It is at least 44 px
  tall. At a 360 px viewport the header has no horizontal scroll (the link wraps under the
  name if they do not fit on one row).
- **AC4:** On `/`, after the last category section, an `h2` "Cómo comprar" introduces an ordered
  list with the 3 steps in Design. Next, two blocks with `h3` "Recogida y entrega" (pickup and
  delivery sentences) and "Horario y ubicación" (each hours line, then the location), side by
  side from 640 px, stacked below.
- **AC5:** On `/`, after AC4, an `h2` "Preguntas frecuentes" introduces the 5 questions in Design,
  each a `<details>` closed by default whose `<summary>` is the question and is at least 44 px
  tall. Tapping a question shows its answer with no JavaScript.
- **AC6:** Every page in AC3 ends with a `<footer>` showing the shop name, the location, each
  hours line and a link "Escríbenos por WhatsApp" with the same `href` as AC3. No page names
  the developer.
- **AC7:** No page has a `<script>` tag or requests a third-party resource on load. `pnpm build`
  (with a fake inline `WHATSAPP_NUMBER`) then `pnpm check:weight` pass: HTML + CSS ≤ 50 KB
  gzipped on every page (spec 0001).
- **AC8:** New markup uses design tokens only. `design.md` lists the new components with their
  classes, `/estilo` shows them, and `learning/code/` has walkthroughs for every new or changed
  source file.

## Design

**Files**
| File | Change |
|---|---|
| `src/lib/site.ts` | Add the shop information fields below |
| `src/lib/date.ts` | New. `formatDay(date: Date): string` → `16 de octubre`; the only home of date formatting |
| `src/lib/whatsapp.ts` | Add `contactLink(): string` |
| `src/components/SiteHeader.astro` | Add the "Escríbenos" link |
| `src/components/ShopInfo.astro` | New. "Cómo comprar" + the two blocks (AC4). No props |
| `src/components/Faq.astro` | New. "Preguntas frecuentes" (AC5). No props |
| `src/components/SiteFooter.astro` | New. Footer (AC6). No props |
| `src/pages/index.astro` | AC2 lines; `<ShopInfo />` and `<Faq />` at the end of `<main>`; `<SiteFooter />` after `<main>` |
| `src/pages/categoria/[id].astro`, `src/pages/producto/[id].astro` | `<SiteFooter />` after `<main>` |
| `src/pages/estilo.astro` | Preview of the new components |

Components read `site` and the helpers directly, as `SiteHeader` already does; pages pass no
props for shop information.

**`src/lib/site.ts` — new fields (demo values, exact Spanish copy):**
```ts
location: 'Municipio, Provincia',
hours: [
  { days: 'Lunes a sábado', time: '9:00 a.m. – 6:00 p.m.' },
  { days: 'Domingo', time: '9:00 a.m. – 1:00 p.m.' },
],
payments: ['Efectivo (CUP)', 'Transfermóvil', 'EnZona', 'USD en efectivo'],
pickup: 'Recoge tu pedido en la tienda, sin costo adicional.',
delivery: 'Por ahora no hacemos entregas a domicilio.',
howToBuy: [
  'Elige lo que quieres en el catálogo.',
  'Toca «Pedir por WhatsApp» y envía el mensaje.',
  'Te confirmamos el pedido y lo recoges en la tienda.',
],
faq: [
  { question: '¿Los precios están actualizados?',
    answer: 'Sí. Cuando cambia un precio o se agota un producto, el catálogo se actualiza. Arriba ves la fecha de la última actualización.' },
  { question: '¿Cómo hago un pedido?',
    answer: 'Abre el producto y toca «Pedir por WhatsApp». El mensaje ya lleva el nombre y el precio: solo tienes que enviarlo y te confirmamos.' },
  { question: '¿Cómo puedo pagar?',
    answer: 'En efectivo, en CUP o USD, o por transferencia con Transfermóvil o EnZona, al recoger tu pedido.' },
  { question: '¿Hacen entregas a domicilio?',
    answer: 'Por ahora no. Puedes recoger tu pedido en la tienda, en Municipio, Provincia.' },
  { question: '¿Qué hago si un producto está agotado?',
    answer: 'Abre el producto y toca «Preguntar por WhatsApp». Te avisamos cuando vuelva a haber.' },
],
```
Order of the existing fields (`name`, `description`, `indexable`) is unchanged.

**Last updated date (AC2):** `formatDay(new Date())` evaluated in the home page frontmatter, so
it is the build date. `formatDay` uses
`new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', timeZone: 'America/Havana' })`:
Vercel builds in UTC, and without the time zone a build after 8 p.m. in Cuba would show the
next day. Rendered as `<p class="text-sm text-muted">Actualizado el {formatDay(...)}</p>`.

**Payments line (AC2):** `<p class="text-sm">Aceptamos: {site.payments.join(' · ')}</p>`, right
after the date line, in the same `flex flex-col gap-4` block as the `h1` and the nav.

**`contactLink()` (AC3):** returns
`` `https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent('Hola, tengo una pregunta sobre la tienda.')}` ``.
Same validation as `orderLink()` (spec 0007): a missing number fails the build. Same tab, no
logo (spec 0007 reasons).

**Header (AC3):** inner container becomes
`mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3`. The
"Escríbenos" link uses the design.md **Category chip** default classes plus `font-medium`:
`inline-flex min-h-11 items-center whitespace-nowrap rounded-full border border-border bg-surface px-4 font-medium text-ink hover:border-accent`.

**ShopInfo (AC4):** `<section aria-labelledby="como-comprar" class="flex flex-col gap-4">`,
`h2#como-comprar` "Cómo comprar", `<ol class="flex flex-col gap-2">` with each step prefixed
by its number in a `rounded-full bg-accent text-surface` circle (`size-7 inline-flex
items-center justify-center font-medium`, `aria-hidden`; the `<ol>` gives the number to screen
readers). Then `<div class="grid gap-4 sm:grid-cols-2">` with two blocks, each
`rounded-card border border-border bg-surface p-4` holding an `h3` and its lines:
"Recogida y entrega" → `pickup`, `delivery`; "Horario y ubicación" → each `hours` line as
`<days>: <time>`, then `location`.

**Faq (AC5):** `<section aria-labelledby="preguntas" class="flex flex-col gap-4">`, `h2#preguntas`
"Preguntas frecuentes", then one `<details class="rounded-card border border-border bg-surface">`
per item. `<summary class="min-h-11 cursor-pointer px-4 py-3 font-medium">`,
answer `<p class="px-4 pb-4">`. Browser default disclosure marker (never `flex` on `<summary>`: it hides the marker; corrected 2026-10-16 by spec 0011); no JS, no `name`
attribute grouping (each opens on its own).

**Footer (AC6):** `<footer class="mt-12 border-t border-border bg-surface">` →
`<div class="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-8 text-sm">`: shop name
(`font-display text-xl font-semibold`), `location`, each hours line, then the link
"Escríbenos por WhatsApp" (`inline-flex min-h-11 items-center font-medium text-accent
hover:text-accent-hover`) with `contactLink()`.

**Headings:** `/` keeps one `h1`; ShopInfo and Faq add `h2`s after the category `h2`s. Product
cards stay `h3`.

**Adapting to a client** (adds to spec 0009's table): every field above in `src/lib/site.ts`.
A client who delivers changes `delivery`, step 3 of `howToBuy` and the FAQ delivery answer.

**Security:** no personal data. The WhatsApp number stays in the environment (spec 0007).

## Build plan
- [x] **T1** (AC1) Add the fields to `src/lib/site.ts` with the exact demo copy above.
- [x] **T2** (AC2) Create `src/lib/date.ts` with `formatDay()`; add the date and payments lines to
  `src/pages/index.astro`.
- [x] **T3** (AC3) Add `contactLink()` to `src/lib/whatsapp.ts`; add the link to `SiteHeader.astro`.
- [x] **T4** (AC4, AC5) Create `ShopInfo.astro` and `Faq.astro`; place them at the end of `<main>`
  on `/`.
- [x] **T5** (AC6) Create `SiteFooter.astro`; add it to `/`, `/categoria/<id>` and `/producto/<id>`.
- [x] **T6** (AC8) Update `design.md` (new components), `/estilo` (previews) and the walkthroughs
  in `learning/code/` (new files, and `site.ts`, `whatsapp.ts`, `SiteHeader`, the three pages).
- [x] **T7** (AC1–AC7) `pnpm typecheck`; `WHATSAPP_NUMBER=5355555555 pnpm build`;
  `pnpm check:weight`; check the date, the decoded `href`s and the 360 px header in the
  built output.
- [x] **T8** (AC1, AC4, AC6) Make `location` and the delivery FAQ answer in `src/lib/site.ts`
  the placeholder above, and update the `site.ts`, `ShopInfo` and `SiteFooter` walkthroughs in
  `learning/code/` (done on 2026-10-20, before this revision). Then update the location text in
  `0010-shop-information.verify.md` (AC1, AC4, AC6) and rerun the T7 checks.

## Out of scope
- Search, a floating WhatsApp button, an embedded map, an "about" page (scope feature 16 notes).
- Shop information on category pages beyond the header and footer.
- Delivery zones, delivery prices, payment logos.
- Editing shop information from the admin panel (features 09–15 decide that).
- Rebuilding the demo on a schedule to keep the date fresh.
- Updating AGENTS.md (structure rows for the new components and `date.ts`): `/sync` after ship.

## Sources
- `docs/scope/scope.md` → feature 16 (goal, what is out, research links)
- https://www.nngroup.com/articles/contact-us-pages/ (contact in main navigation and footer,
  include hours) · https://www.nngroup.com/articles/trustworthy-design/ (be upfront with
  purchase information)
- https://www.baymard.com/blog/footer-links-ecommerce (footer as last resort, short on mobile) ·
  https://baymard.com/blog/dtc-search (small catalogs: navigation and a thorough FAQ before
  search)
- https://mercadito-demo.biznecubano.com (Cuban grocery demo: payment methods near the top,
  pickup and delivery, hours, "¿Cómo Comprar?", FAQ)
- `docs/specs/0007-whatsapp-order.md` (`wa.me` link, number validation), `docs/specs/0009-site-identity.md`
  (identity in `site.ts`, generic demo, no address), `docs/specs/0005-catalog-page.md`
  (home layout), `design.md` (tokens, chip and card classes)
- Owner answers, 2026-10-16: location La Lisa; the demo shows pickup only.
- Owner answer, 2026-10-20: the location becomes the placeholder `Municipio, Provincia`, so the
  demo fits every shop it is pitched to.
- `Intl.DateTimeFormat` with `timeZone` and `<details>`/`<summary>` behaviour: from memory, standard
  web platform; T7 checks them in the built output.

---
## Rationale
<!-- History, not build input. /develop does not read below this line. -->
**Options considered:**
- Shop info in `src/lib/site.ts` (chosen: spec 0009 already makes it the one home of identity,
  plain TS, typed) vs a `shop` content collection in `src/data/` (runner-up: would move to the
  database with products when the admin panel lands, but adds a schema and a loader for a
  handful of strings today; features 09–15 can move it then).
- Payment methods as text (chosen: zero weight, no trademark use) vs logos like BizneCubano
  (runner-up: recognisable at a glance, but images cost bytes and need licences).
- "Escríbenos" link in the header (chosen: NN/g puts contact in the main navigation) vs a
  floating button (runner-up: common in Cuban shops, but covers content on small screens and
  repeats the product page's order button).
- Native `<details>` FAQ (chosen: works with no JS) vs an always-open list (runner-up: simpler,
  but five open answers make the page long on a phone).
- Demo location as the placeholder `Municipio, Provincia` (chosen, owner, 2026-10-20) vs a
  real municipality such as La Lisa (the original choice: it reads more naturally, but it
  places the demo in one town while it is pitched to shops everywhere).
- Delivery as a sentence (chosen: a client changes one string) vs a boolean flag that switches
  copy (runner-up: less typing per client, but the copy would move into components).

**Assumptions and risks:**
- The date is the build date. A demo not rebuilt for weeks shows an old date in a pitch;
  redeploy in Vercel before showing it. Real clients rebuild on every change.
- The invented hours and payment methods are plausible, not researched per municipality.
- The header now holds the shop name and a link; a long client name wraps to two rows.

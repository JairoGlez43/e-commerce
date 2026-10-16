# 0011 · Visual polish (WhatsApp icon, info band, dark footer)

**Status:** Accepted
**Date:** 2026-10-16
**Revised:** 2026-10-16: the glyph renders as `<img>`, not inline SVG (owner's choice). The official files carry `<style>.cls-1{fill:…}</style>` and `id="Layer_1"`; inlined, the green and white variants override each other's color on one page, ids repeat, and a `<style>` enters the page. Editing the files is forbidden.
**Scope:** `docs/scope/scope.md` → feature 17
**Supersedes:** — (amends one line each of 0007 and 0010, see Decision)

## Context
Owners judge the demo by look and feel. Two weak spots: the WhatsApp links, the site's whole
ordering channel, are plain text and chips with no visual cue; and the shop information added
by spec 0010 sits on the same cream page as the catalog, so it blends in. Specs 0007 and 0010
chose "no WhatsApp logo" for trademark caution, and spec 0002 left icons out of the design
system. WhatsApp's official brand page (Sources) allows its assets on a site as long as they are
the official files, unmodified (size only), and not the most prominent element on the page.

## Decision
- **The official WhatsApp glyph sits before the text of every link that opens WhatsApp:** header
  "Escríbenos", the product page "Pedir / Preguntar por WhatsApp" button, the footer link. The
  words stay (the logo never replaces the word "WhatsApp"); the icon is decorative for screen
  readers. This replaces the "no logo" line of spec 0007 (Design → Button) and spec 0010
  (Design → `contactLink()`); everything else in those specs stands.
- **Only the official file, unmodified:** the owner downloads Meta's WhatsApp brand ZIP and
  accepts its terms; the SVG goes in `src/assets/icons/` as delivered. It is resized with CSS,
  never recolored or redrawn. It renders as an `<img>` whose `src` is the file's URL from
  Astro's SVG import: each image is isolated, so its internal styles and ids cannot clash, and
  no hex reaches an `.astro` file. One small request per variant (about 1.2 KB), cached across
  pages.
- **On the terracotta order button, the official white glyph** (the kit has it). Everywhere else,
  the official green glyph.
- **The home information zone becomes a full-width band:** an awning strip (the header's
  market-stall stripe, repeated) on top, then the `awning` tone edge to edge, holding
  "Cómo comprar", the two info blocks and the FAQ. Product categories stay on the cream page.
- **The footer turns dark** (owner's choice): `ink` background, `cream` text, the WhatsApp link
  underlined in `cream`, with a `cream` focus ring (the default `accent` ring is 2.60:1 on
  `ink`, below the 3:1 a focus indicator needs).
- **No new color tokens:** `ink`, `cream`, `awning` already exist. WhatsApp green lives only inside
  the official SVG file.
- **Spec 0010 correction (pending from `/sync`):** its Faq design line drops `flex … items-center`
  on `<summary>`, matching the built code (`flex` hides the disclosure triangle).

## Acceptance criteria
- **AC1:** `src/assets/icons/` holds the WhatsApp glyph SVG(s) exactly as extracted from the
  official brand ZIP (byte-identical), plus a `SOURCE.md` naming the download page, the date, and
  that its terms were accepted by the owner.
- **AC2:** On `/`, every `/categoria/<id>` and every `/producto/<id>`, the header "Escríbenos"
  link and the footer "Escríbenos por WhatsApp" link show the glyph before the text; every product
  page's order/ask button does too. Each glyph is an `<img>` 20 px square with `alt=""`
  (decorative), and each link's accessible name is still exactly its text. The links keep their `href`s, ≥ 44 px
  height, and no `target`.
- **AC3:** On `/`, after the last category section, a full-width awning strip and then a band in
  `awning` span the viewport edge to edge (no horizontal scroll at 360 px); inside it, aligned with
  the page container, come "Cómo comprar", the two info blocks and "Preguntas frecuentes". The
  catalog above stays on `cream`.
- **AC4:** The footer on every page in AC2 has an `ink` background and `cream` text, sits directly
  under the content with no cream gap on `/`, and its WhatsApp link is underlined and shows a
  `cream` focus ring when reached with Tab.
- **AC5:** New text/background pairs meet WCAG AA: ink / muted / accent on `awning` (12.55 / 5.20 /
  4.82), cream on `ink` (14.60). These rows are added to the contrast table in `design.md`.
- **AC6:** No `<script>` on any page; no `.astro` file contains a raw color value; `pnpm build`
  (fake inline `WHATSAPP_NUMBER`) and `pnpm check:weight` pass, and `/` HTML + CSS grows by at most
  3 KB gzipped over the 7.7 KB measured on 2026-10-16.
- **AC7:** Spec 0010's Faq design line no longer says `flex` / `items-center` on `<summary>`; specs
  0007 and 0010 carry an "Amended by 0011" line. `design.md`, `/estilo` and the `learning/code/`
  walkthroughs reflect every changed or new file.
- **AC8:** The glyph files served from `dist/` are byte-identical to the ones in
  `src/assets/icons/`; the built HTML contains no `<svg>` from them, no `<style>` and no
  `id="Layer_1"`.

## Design

**Files**
| File | Change |
|---|---|
| `src/assets/icons/Digital_Glyph_Green_RGB_2026.svg`, `…_White_RGB_2026.svg` | Done (T1): from the brand ZIP, byte-identical |
| `src/assets/icons/SOURCE.md` | New: page URL, download date, "terms accepted by the owner", which file is which |
| `src/components/WhatsAppIcon.astro` | New. Props `variant: 'green' \| 'white'` (default `'green'`). Renders `<img src={file.src} width="20" height="20" alt="" class="size-5 shrink-0">`. The only file that imports the SVGs |
| `src/components/SiteHeader.astro` | Contact link: add `gap-2`, `<WhatsAppIcon />` before "Escríbenos" |
| `src/pages/producto/[id].astro` | Order button: add `gap-2`, `<WhatsAppIcon variant="white" />` before the text |
| `src/components/SiteFooter.astro` | Dark footer and icon link, below |
| `src/pages/index.astro` | Split `<main>` into catalog container + info band, below |
| `src/pages/categoria/[id].astro` | `<main>` `py-8` → `pt-8 pb-12` (the footer loses its `mt-12`) |
| `src/pages/producto/[id].astro` | Same `<main>` padding change |
| `src/pages/estilo.astro` | Wrap the existing `<ShopInfo />` + `<Faq />` preview in the same band markup |
| `docs/specs/0007-…`, `0010-…` | One "Amended by" line each; 0010 Faq line fixed (this spec's own edit, done by `/architect`) |

**SVG import:** `import whatsAppGreen from '../assets/icons/Digital_Glyph_Green_RGB_2026.svg'`
(`declare module '*.svg'` → `SvgComponent & ImageMetadata` in `node_modules/astro/client.d.ts`,
Astro 7.3.5). Use only its `ImageMetadata` `.src` (the emitted file's URL), never render it as a
component. Plain `<img>`, not `<Image />`: there is nothing to resize or convert. The header icon
loads eagerly (above the fold); no `loading` attribute is needed. If the emitted file is not
byte-identical (AC8), stop and route to `/architect`; never edit the file.

**Home structure (`src/pages/index.astro`):**
```
<main>
  <div class="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-8">  ← unchanged catalog content
  <div class="awning" aria-hidden="true"></div>
  <div class="bg-awning">
    <div class="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-12">
      <ShopInfo /> <Faq />
</main>
<SiteFooter />
```
Info blocks and FAQ items keep `bg-surface`: white cards on the awning band.

**Footer (`SiteFooter.astro`):** `<footer class="bg-ink text-cream">` (no border, no `mt-12`) →
same inner `<div class="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-8 text-sm">`. Link:
`inline-flex min-h-11 w-fit items-center gap-2 font-medium text-cream underline underline-offset-4 hover:text-awning focus-visible:outline-cream`
with `<WhatsAppIcon />` (green, 7.92:1 on `ink`) before "Escríbenos por WhatsApp".

**Header link:** current classes + `gap-2`; icon green on `surface`.

**Contrast (computed 2026-10-16, WCAG formula):** ink / muted / accent on awning 12.55 / 5.20 /
4.82; cream on ink 14.60; awning on ink 12.55 (hover). Graphics: WhatsApp green on ink 7.92, on
accent 3.05.

**Security:** none affected. The brand ZIP's terms are accepted by the owner, not by Claude.

## Build plan
- [x] **T1** (AC1) Ask the owner to download the WhatsApp brand ZIP from the page in Sources,
  accept its terms, and unzip it into a folder outside the repo; copy the glyph SVG(s) unchanged
  into `src/assets/icons/`; write `SOURCE.md`. Record which variants exist.
- [x] **T2** (AC2, AC8) Create `WhatsAppIcon.astro` (`<img>`, see Design); add it to the header link,
  the product button and the footer link; check the emitted files with `cmp`.
- [x] **T3** (AC3) Restructure `index.astro` into catalog + info band.
- [x] **T4** (AC4) Dark footer; drop `mt-12`; `pb-12` on the category and product `<main>`.
- [x] **T5** (AC5, AC7) Update `design.md` (Contact link, WhatsApp order button, SiteFooter, new
  Info band pattern, contrast rows), `/estilo`, and the `learning/code/` walkthroughs.
- [x] **T6** (AC2–AC6, AC8) `pnpm typecheck`; `WHATSAPP_NUMBER=5355555555 pnpm build`;
  `pnpm check:weight`; check 360 px and 1280 px in a real browser (device emulation, not
  `--window-size`), the accessible names, and the footer focus ring.

## Out of scope
- An icon system or other icons (spec 0002 still excludes them; this adds one brand glyph).
- Alternating backgrounds between product categories.
- Floating WhatsApp button (spec 0010 out of scope stands).
- Changing the order button's terracotta color to WhatsApp green (white on green is 1.98:1).

## Sources
- https://www.meta.com/es-es/brand/resources/whatsapp/whatsapp-brand/ (opened 2026-10-16 by
  `researcher`): resize only and never most prominent ("Tan solo puedes cambiar el tamaño… siempre
  que no se conviertan en el elemento más destacado"), no modification ("No, no puedes modificar
  los recursos de marca de WhatsApp de ninguna forma"; "No debes modificar tampoco los colores"),
  only official assets, logo never replaces the word, "W" and "A" always capitalized; download is a
  ZIP behind accepting the terms. Not confirmed: monochrome versions, minimum size, clear space,
  whether the ZIP has SVG.
- `docs/scope/scope.md` → feature 17; specs 0002 (palette, contrast table, icons out of scope),
  0007 (order button, "no logo"), 0010 (header, footer, info zone).
- `node_modules/astro/client.d.ts` (`*.svg` → `SvgComponent`), Astro 7.3.5.
- Owner answers 2026-10-16: go online for brand rules; dark footer; record as new spec 0011.

---
## Rationale
<!-- History, not build input. /develop does not read below this line. -->
**Options considered:**
- `<img>` of the official file (chosen in the 2026-10-16 revision: each image isolated, file
  untouched, one ~1.2 KB request per variant, cached) vs inline SVG import (first choice, dropped
  in T2: the files' `<style>.cls-1` and `id="Layer_1"` clash when the green and white variants share
  a page, and fixing that means editing the files). Runner-up still open: green glyph only, inline
  (no request, but `id="Layer_1"` repeats in header and footer and a `<style>` lands on the page).
- Icon in the text color (`currentColor`) vs official colors (chosen): recoloring is "modifying
  the colors", which the brand page forbids.
- Info band in `awning` with the awning strip on top (chosen: reuses the shop's own motif; the
  tone alone is only 1.16:1 against cream, so the strip makes the break obvious) vs a white band
  (runner-up: 1.08:1 against cream, nearly invisible).
- Dark footer (chosen, owner) vs light (runner-up: quieter, but does not close the page).

**Assumptions and risks:**
- The ZIP may not contain an SVG (only PNG). Then T1 stops and `/architect` decides between an
  official PNG through `astro:assets` and dropping the icon.
- Resolved in T1: the official SVGs are 1181 and 1168 bytes, no editor metadata.
- A monochrome white glyph may not exist in the kit; the green-on-terracotta fallback is legible
  but less elegant.

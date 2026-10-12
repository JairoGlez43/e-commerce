# 0009 · Site identity (generic demo)

**Status:** Accepted
**Date:** 2026-10-12
**Scope:** `docs/scope/scope.md` → feature 01 (spec 0001 AC8)
**Supersedes:** 0003

## Context
Spec 0003 was an Assumed spec: `/develop` needed a shop name, home texts and a default Open
Graph image to satisfy spec 0001 AC8, and built placeholders without a decision. Ratifying it,
the owner explained what the site really is: a **proposal shown to one business after another**.
If one owner declines, the same demo is shown to the next, so it must stay generic until a
business accepts and work starts on its specifics. The placeholders already are generic; this
spec confirms them, fixes where they live (spec 0005 moved them to `src/lib/site.ts`) and records
what changes when a client accepts.

## Decision
- **The demo is generic and names no real business:** shop name `Tienda de alimentos (demo)`,
  invented products, a stock-photo look, no logo, no address.
- **Home texts:** title = the shop name; description = `Productos en existencia y precios,
  siempre al día. Catálogo de demostración de una tienda local de alimentos.` (from
  `docs/brief.md` → "What the web adds").
- **Default preview image:** `public/og-default.png`, 1200×630 PNG (WhatsApp does not render
  SVG): cream background, the awning stripe, "Tienda de alimentos", the line "Productos y precios,
  siempre al día" and "DEMO", in the spec 0002 palette and fonts. Used by every page that does not
  pass its own image (home, categories, `/estilo`); product pages use their photo (spec 0006).
- **Identity lives in two places only:** `src/lib/site.ts` (name, description, `indexable`) and
  `public/og-default.png`. Nothing else in the code names the shop.
- **When a business accepts, the demo becomes theirs** through the checklist in Design; that work
  starts with `/scope` for the client's specifics.

## Acceptance criteria
- **AC1:** The shop name and home description are defined only in `src/lib/site.ts`; the string
  `Tienda de alimentos` appears in no other file under `src/`.
- **AC2:** The home page `<title>` and `og:title` are `Tienda de alimentos (demo)`; its meta
  description and `og:description` are the home description above.
- **AC3:** `public/og-default.png` is a 1200×630 PNG showing the generic name, the line and
  "DEMO", with no real business name, logo or contact; pages without their own image use it as
  an absolute `og:image` URL.
- **AC4:** No file in the repo names a real business or person as the shop (name, image, data,
  copy).

## Design
**Files:** `src/lib/site.ts` (`site.name`, `site.description`), `public/og-default.png`,
read by `src/components/SiteHeader.astro`, `src/layouts/BaseLayout.astro` (default `image`) and
the pages that build titles (`index.astro`, `categoria/[id].astro`, `producto/[id].astro`).

**Adapting the demo to a client** (after a business accepts; each item is its own change):
| What | Where |
|---|---|
| Shop name and home description | `src/lib/site.ts` (drop "(demo)") |
| Search engines | `indexable: true` in `src/lib/site.ts` (spec 0008) |
| Default preview image | replace `public/og-default.png` (1200×630 PNG, same layout) |
| WhatsApp number | `WHATSAPP_NUMBER` in `.env` and in Vercel (spec 0007) |
| Products, prices, categories, photos | `src/data/*.json`, `src/assets/products/` (shape: spec 0004) |
| Domain | Vercel domain + `site` in `astro.config.mjs` (spec 0008) |
No page or component changes are needed for any of them.

**Security:** no personal or business data in the generic demo; the WhatsApp number stays in the
environment (spec 0007).

## Build plan
- [x] **T1** (AC1, AC2) Name and description in `src/lib/site.ts`, used by header, layout and
  pages (built under specs 0003 and 0005).
- [x] **T2** (AC3) `public/og-default.png` generated with the spec 0002 palette (built under spec
  0003).
- [x] **T3** (AC1, AC3, AC4) Confirmed 2026-10-12: `Tienda de alimentos` only in
  `src/lib/site.ts` under `src/`; `og-default.png` is PNG 1200×630, 13.8 KB, generic text;
  home `og:title`/description checked on the live site in spec 0008 / 0005 verifies.

## Out of scope
- Any client-specific identity: that begins with `/scope` when a business accepts.
- A logo, favicon redesign or brand guide.
- The thousands separator in prices (spec 0004, open).

## Sources
- `docs/specs/0003-site-identity.md` (the Assumed placeholders), `docs/specs/0005-catalog-page.md`
  (`src/lib/site.ts`), `docs/specs/0008-demo-online.md` (`indexable`, `site`)
- `docs/brief.md` ("What the web adds")
- Owner answer, 2026-10-12: the site is a proposal shown to one business after another; it stays
  generic until one accepts.
- Repo check, 2026-10-12: `grep` over `src/`; `sharp` metadata of `public/og-default.png`.

---
## Rationale
<!-- History, not build input. /develop does not read below this line. -->
**Options considered:**
- Generic identity reused across prospects (chosen, owner) vs the target shop's real name with
  "(demo)" (runner-up: more persuasive in one pitch, but the demo must be re-skinned per
  prospect, and a public page bearing a business's name before it agreed can be mistaken for
  its official site).
- Superseding 0003 with a full spec (chosen) vs only flipping 0003's status (runner-up: less
  paperwork, but 0003 names the wrong file and has no acceptance criteria).

**Assumptions and risks:**
- "Tienda de alimentos" assumes every prospect sells food; a different kind of business would
  need new sample data and copy, which is a `/scope` change.
- `docs/brief.md` still describes "a local shop"; the reusable-proposal framing is recorded here
  and should be reflected in the brief/scope by `/scope`.

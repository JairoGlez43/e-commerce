# 0003 · Site identity placeholders

**Status:** Assumed
**Date:** 2026-10-04
**Scope:** `docs/scope/scope.md` → feature 01 (spec 0001, task T2)

## Owed decision
Spec 0001 AC8 requires a title, meta description and Open Graph tags on every page, and its
layout lists an "og fallback image" in `public/`. No spec, `design.md` or `AGENTS.md` names:
- the shop's name, and the home page title and description;
- the default Open Graph image (content, file and size).

## Assumption built on
- Home title: `Tienda de alimentos (demo)`.
- Home description: `Productos en existencia y precios, siempre al día. Catálogo de demostración de una tienda local de alimentos.`
  (derived from `docs/brief.md` → "What the web adds").
- Default OG image: `public/og-default.png`, 1200×630 PNG (WhatsApp does not render SVG),
  generated locally with the `sharp` already installed by Astro: cream background, an awning
  stripe and the title text, using the palette from spec 0002 (itself still Proposed).
- `og:url` and `og:image` are absolute URLs built from `Astro.site`; until `site` is set
  (feature 08) they fall back to the request origin (`Astro.url`).

## Authorized by
The owner, 2026-10-04, in `/develop T2 y T5` ("Construir y anotar supuesto").

## Code area
`src/layouts/BaseLayout.astro`, `src/pages/index.astro`, `public/og-default.png`.

## Requirements
- Every page passes `title` and `description` to `BaseLayout`; `image` is optional and
  defaults to `/og-default.png`.
- Replacing the shop name, texts or image later must touch only `src/pages/index.astro` and
  `public/og-default.png`.

## Ratify
Run `/architect` to ratify (shop name, texts, final OG image); the feature can't be done until then.

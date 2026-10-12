# 0008 · Demo online

**Status:** Accepted
**Date:** 2026-10-10
**Scope:** `docs/scope/scope.md` → feature 08
**Supersedes:** —

## Context
Spec 0001 chose Vercel (static `dist/`, no adapter) and left `site` to be set "once the URL is
known". The owner has already deployed: the GitHub repo is connected to a Vercel project,
`WHATSAPP_NUMBER` is set in Vercel's environment variables, and the site answers at an
auto-generated domain. But `site` is still unset, so every `og:url`, `og:image` and the link
inside each WhatsApp message on the live site point to `http://localhost:4321`: shared links
preview without a photo and order messages carry a dead link. This spec fixes the public URL,
keeps the demo out of search engines and defines how the live site is proven.

## Decision
- **Public URL:** `https://tienda-demo-cuba.vercel.app` (owner's choice; added in Vercel →
  Settings → Domains). It is the value of `site` in `astro.config.mjs`. The auto-generated
  `e-commerce-seven-phi-84.vercel.app` keeps working but is never used in links.
- **Deploys:** Vercel's Git integration builds and publishes every push to `main` (set up by the
  owner). Git integration is `off` in AGENTS.md, so `/develop` makes no commits: the owner
  commits and pushes.
- **Not indexed while it is a demo** (owner's choice): every page carries
  `<meta name="robots" content="noindex">`, driven by one switch in `src/lib/site.ts`. No
  `robots.txt` that blocks crawling (a crawler that may not fetch a page never sees its
  `noindex`). WhatsApp previews are unaffected.
- **Proof on the live site:** fetch the deployed pages to check status, links, previews and
  weight (going online; asked for each time), plus the owner's checks on a phone over mobile
  data and a real WhatsApp share.

## Acceptance criteria
- **AC1:** `astro.config.mjs` sets `site: 'https://tienda-demo-cuba.vercel.app'`. After
  `pnpm build`, every `og:url`, every `og:image` and the page link inside every WhatsApp
  message start with `https://tienda-demo-cuba.vercel.app/`, and no built HTML file contains
  `localhost`.
- **AC2:** All built pages contain `<meta name="robots" content="noindex">`. The switch is a
  single value in `src/lib/site.ts`; turning it on removes the tag from every page except
  `/estilo`, which stays `noindex`. There is no `robots.txt` that disallows crawling.
- **AC3:** After the owner pushes, the live site serves the new build over HTTPS: `/`,
  `/categoria/carnicos/` and `/producto/arroz-blanco/` return 200; `/producto/no-existe/`
  returns 404; the product page's `og:url` is its own live URL and its `og:image` returns 200
  with `image/jpeg`.
- **AC4:** On the live site, for `/`, `/categoria/carnicos/` and `/producto/arroz-blanco/`:
  HTML + CSS as transferred (compressed, as Vercel serves them) ≤ 50 KB; no `<script>`; no
  request to another domain; the images the page loads stay within the spec 0001 limits.
- **AC5:** The owner opens `https://tienda-demo-cuba.vercel.app` on a phone **using mobile data,
  not Wi-Fi**: the catalog loads, a category filters, a product opens, and its WhatsApp button
  opens a chat whose message ends with that product's live URL. (Owner check.)
- **AC6:** Sending a product link (one never shared before) in a WhatsApp chat shows a preview
  with the product photo, `<name> · <shop name>` and the description that starts with the price.
  (Owner check; WhatsApp caches previews per URL.)

## Design

**`astro.config.mjs`:** add `site: 'https://tienda-demo-cuba.vercel.app'` to the existing
`defineConfig({...})`; nothing else changes. `BaseLayout` and the product page already build
absolute URLs from `Astro.site ?? Astro.url` (specs 0003, 0006, 0007), so they pick it up with no
code change.

**`src/lib/site.ts`:** add `indexable: false` to the `site` object, with a comment: set to `true`
when the shop owner buys the site and wants it in search engines.

**`src/layouts/BaseLayout.astro`:** render the robots tag when `noindex || !site.indexable`
(import `site` from `../lib/site`). The `noindex` prop stays, so `/estilo` remains hidden even
after `indexable` becomes `true`.

**Live checks (`/develop` T4 and `/check verify`):** with the owner's permission, request the
three AC3/AC4 pages with `Accept-Encoding: gzip, br`, read status, `content-encoding`,
transferred size, `og:url`, `og:image`, the robots tag and the `wa.me` link (decode the message
and check only that it ends with the live product URL; do not print the number). The headless
browser check from `/check verify` can point at the live URL for AC4's request list.

**Vercel settings (owner, already done; confirm only):** framework preset Astro, install
`pnpm install`, build `pnpm run build`, output `dist`; `WHATSAPP_NUMBER` set for Production
(and Preview, if preview deployments are used, or their builds fail by design, spec 0007 AC5).

**Security and privacy:** the number lives only in Vercel's environment and the owner's `.env`.
The live site shows it in the button by nature (spec 0007). `noindex` keeps it out of search
results.

## Build plan
- [x] **T1** (AC1) Set `site` in `astro.config.mjs`; build with a fake inline number; confirm no
  `localhost` in `dist/` and all absolute URLs use the live origin.
- [x] **T2** (AC2) Add `indexable: false` to `src/lib/site.ts` and the robots condition to
  `BaseLayout.astro`; confirm the tag on all pages.
- [x] **T3** (AC3) Owner commits and pushes to `main`; wait for the Vercel deploy.
- [x] **T4** (AC3, AC4) With the owner's permission to go online, fetch the live pages and check
  status, URLs, preview image and transferred sizes.
- [x] **T5** Update the walkthroughs in `learning/code/` (`astro.config.mjs`, `site.ts`,
  `BaseLayout.astro`) and their glossary terms.

## Out of scope
- A custom domain (e.g. `.com`) and its DNS; analytics; a custom 404 page.
- `scripts/check-weight.mjs` (spec 0001 T6, feature 01); here the live pages are measured directly.
- Reachability from inside Cuba (spec 0001 risk): must be tested from Cuba before a real launch.
- Ratifying spec 0003 (shop name, texts, default OG image).

## Sources
- `docs/scope/scope.md` → feature 08; `docs/specs/0001-stack.md` (Vercel, static, `site` once
  known, weight budget, Cuba risk)
- `docs/specs/0003-site-identity.md`, `0006-product-detail-page.md`, `0007-whatsapp-order.md`
  (absolute URLs from `Astro.site ?? Astro.url`; env var)
- Repo state 2026-10-09: commit `c1f7fce` on `origin/main`; `astro.config.mjs` has no `site`;
  local builds emit `http://localhost:4321` in `og:url`.
- Owner, 2026-10-09/10: deployed on Vercel with `WHATSAPP_NUMBER` set; added the domain
  `tienda-demo-cuba.vercel.app`; demo must not be indexed.
- `noindex` vs `robots.txt` interaction and Vercel Git-integration behaviour: from memory, not
  verified online.

---
## Rationale
<!-- History, not build input. /develop does not read below this line. -->
**Options considered:**
- Friendly subdomain `tienda-demo-cuba.vercel.app` (chosen, owner) vs the auto-generated one
  (runner-up: zero work, but reads as random in a WhatsApp group and a pitch).
- `noindex` on every page via one switch (chosen, owner) vs indexable (runner-up: findable on
  Google, but shows invented products and the developer's personal number). `robots.txt`
  `Disallow: /` was rejected: it blocks crawling, so search engines can still list the bare URL
  without ever seeing `noindex`.
- Switch in `src/lib/site.ts` (chosen: identity and visibility live together) vs flipping
  `BaseLayout`'s `noindex` default to `true` (runner-up: one character, but every future page
  would have to opt out by hand, and the intent "this is a demo" would be invisible).
- Measuring the live pages directly (chosen) vs only the local `dist/` (runner-up: no network,
  but misses what Vercel actually serves: compression, headers, the real domain).

**Assumptions and risks:**
- Vercel may be unreachable or slow from Cuba (spec 0001); the demo is shown from Puerto Rico.
- WhatsApp caches previews per URL: links shared before `site` was set keep their old, broken
  preview.
- The auto-generated domain stays live with the same content; with `noindex` everywhere, the
  duplicate does not matter.

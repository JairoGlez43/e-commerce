# 0007 · Order contact (WhatsApp)

**Status:** Accepted
**Date:** 2026-10-07
**Scope:** `docs/scope/scope.md` → feature 07
**Supersedes:** —

## Context
Customers already order through WhatsApp; the site has to put them in that chat in one tap,
with a message that already names the product. Whether the shop delivers is still an open
question in `docs/brief.md`, so there is no cart: the conversation itself is the order. The
demo is shown to the shop owner, so tapping the button must really deliver a message during
the pitch, and the repo is on GitHub, so no phone number may be committed.

## Decision
- **Mechanism:** WhatsApp's click-to-chat link, `https://wa.me/<number>?text=<message>`, as a
  plain link on the product detail page (spec 0006). No JS, no library, no business account.
- **Number:** the developer's own number for the demo (owner's choice), read at build time from
  the environment variable `WHATSAPP_NUMBER` (local `.env`, gitignored; Vercel project settings
  in feature 08). Never written in code or any committed file. When the shop buys the site,
  only the variable changes.
- **Validation:** a missing or malformed number fails the build, instead of shipping a broken
  button.
- **Out-of-stock products get an "ask" button** (owner's choice): "Preguntar por WhatsApp", with a
  message asking when it will be back.
- **The message names the product, unit, price and the page link**, so the shop knows exactly
  what is being asked for.

## Acceptance criteria
- **AC1:** Every product page shows one button-styled link below the availability badge: "Pedir
  por WhatsApp" when in stock, "Preguntar por WhatsApp" when out of stock. It is at least 44 px
  tall and spans the full width below 768 px.
- **AC2:** The link's `href` is `https://wa.me/<number>?text=<message>`, where `<number>` is the
  value of `WHATSAPP_NUMBER` and `<message>` is URL-encoded.
- **AC3:** Decoded, the message is, for an in-stock product,
  `Hola, quiero pedir: Arroz blanco (1 lb) – 280 CUP.` then a line break and the page's
  absolute URL; for an out-of-stock product,
  `Hola, ¿cuándo vuelve a haber Salchichas (Paquete 10 u)?` then a line break and the page's
  absolute URL. The price comes from `formatPrice()`.
- **AC4:** The number exists only in the environment. No committed file contains it; `.env` is
  gitignored; `.env.example` (committed) names `WHATSAPP_NUMBER` with a fake placeholder and the
  expected format.
- **AC5:** `pnpm build` exits non-zero with an error naming `WHATSAPP_NUMBER` when the variable is
  missing or is not 8 to 15 digits (international format, digits only, no `+` or spaces).
- **AC6:** On a phone, tapping the button opens a WhatsApp chat with the configured number and
  the AC3 message already typed. (Checked by the owner on a real phone.)
- **AC7:** Product pages still load no `<script>` and request no third-party resource on load
  (`wa.me` is contacted only when the link is tapped); HTML + CSS stays ≤ 50 KB gzipped.

## Design

**Files**
| File | Role |
|---|---|
| `.env.example` | Committed. `WHATSAPP_NUMBER=5350000000` with a comment: international format, digits only, no `+`; copy to `.env` and put the real number there |
| `.env` | Gitignored (already in `.gitignore`). Created by the owner with the real number. Claude never reads or prints it (AGENTS.md) |
| `src/lib/whatsapp.ts` | `getWhatsAppNumber()` and `orderLink()`; the only place that knows about WhatsApp |
| `src/pages/producto/[id].astro` | Renders the button |

**`src/lib/whatsapp.ts`**
- `getWhatsAppNumber(): string` reads `import.meta.env.WHATSAPP_NUMBER` (available to
  frontmatter at build time; no `PUBLIC_` prefix needed because it never runs in the browser).
  If it is missing or does not match `^\d{8,15}$`, it throws
  `Error('WHATSAPP_NUMBER must be set to 8–15 digits (international format, no +). See .env.example.')`.
  If TypeScript needs it, declare the variable in `src/env.d.ts` (`interface ImportMetaEnv`).
- `orderLink(product: CollectionEntry<'products'>, pageUrl: string): string` builds the AC3
  message from `name`, `unit`, `price` (via `formatPrice()`) and `inStock`, and returns
  `` `https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(message)}` ``. The line
  break is `\n`.
- `pageUrl` is the same absolute URL `BaseLayout` uses for `og:url`:
  `new URL(Astro.url.pathname, Astro.site ?? Astro.url).href`. Until `site` is set (feature 08)
  it points to `localhost`.

**Button** (product page, inside the details column, right after the availability badge and
before the description): the design.md **Primary button** classes plus `w-full md:w-fit`:
`<a href={orderLink(product, pageUrl)} class="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-accent px-6 font-medium text-surface hover:bg-accent-hover active:bg-accent-hover md:w-fit">`.
Text: "Pedir por WhatsApp" or "Preguntar por WhatsApp". Same tab (no `target`), so the phone's
back button returns to the product. No WhatsApp logo (trademark; the words carry the meaning).

**Checks without the real number:** builds for verification set a fake number inline, e.g.
`WHATSAPP_NUMBER=5355555555 pnpm build` (Git Bash), so no one needs to read `.env`.

**`design.md`:** `/develop` adds the full-width-on-mobile variant of the Primary button.

**Security and privacy:** the number is public on the built site by nature (it is a contact
link), but it stays out of the repo history. No other personal data.

## Build plan
- [x] **T1** (AC2) Confirm the current click-to-chat URL format and `text` encoding with
  `researcher` (ask the owner before going online). Confirmed 2026-10-07 (owner approved going
  online): faq.whatsapp.com/5913398998672934 (`https://wa.me/<number>?text=<urlencoded>`,
  international format without zeroes, brackets or dashes) and
  docs.astro.build/en/guides/environment-variables/ (non-`PUBLIC_` vars readable server-side at
  build; `.env` loaded by dev and build; shell variables take precedence over `.env`).
- [x] **T2** (AC4, AC5) Create `.env.example`; write `getWhatsAppNumber()`; ask the owner to create
  `.env` with their number; confirm a build without the variable fails and one with a fake
  inline number passes.
- [x] **T3** (AC2, AC3) Write `orderLink()`.
- [x] **T4** (AC1, AC7) Add the button to `src/pages/producto/[id].astro`; update `design.md` and the
  walkthroughs in `learning/code/`.
- [x] **T5** (AC1–AC5, AC7) Run `pnpm typecheck` and `pnpm build` with a fake inline number; decode
  two `href`s (one in stock, one out of stock) and compare with AC3.

## Out of scope
- Cart, checkout, quantities, delivery address or delivery flow (brief: delivery still open).
- Buttons on catalog cards (the scope asks "from a product"; cards already link to the page).
- WhatsApp Business API, chat widgets, tracking of taps.
- Setting the variable in Vercel (feature 08).
- Updating AGENTS.md "Env vars: none" — `/sync` reconciles it after this ships.

## Sources
- `docs/scope/scope.md` → feature 07; `docs/brief.md` (open questions on delivery and ordering)
- `docs/specs/0006-product-detail-page.md` (page and layout), `design.md` (Primary button)
- `docs/specs/0004-sample-product-data.md` (`formatPrice()`), `docs/specs/0003-site-identity.md`
  (`Astro.site` fallback)
- AGENTS.md (secrets only from the environment; never read `.env`)
- Owner answers, 2026-10-07: orders go to the developer's own number, kept in `.env`; out-of-stock
  products get a "Preguntar" button.
- `wa.me` URL format and `import.meta.env` behaviour for non-`PUBLIC_` variables in prerendered
  pages: from memory, not verified; `/develop` confirms (T1, T2).

---
## Rationale
<!-- History, not build input. /develop does not read below this line. -->
**Options considered:**
- Number in an environment variable (chosen, owner) vs hardcoded in `src/lib/site.ts`
  (runner-up: one line, no setup, but the number is published in the GitHub repo forever).
- Validation by throwing in `getWhatsAppNumber()` (chosen: certain to stop the build, no new API)
  vs Astro's typed `astro:env` schema (runner-up: built-in validation and types, but one more
  API to confirm for Astro 7).
- "Ask" button on out-of-stock products (chosen, owner) vs no button (runner-up: simpler, but
  loses interested customers).
- Same-tab link (chosen) vs `target="_blank"` (runner-up: keeps the shop open on desktop, but on
  phones it adds an extra browser tab before WhatsApp opens).
- Including the page URL in the message (chosen: the shop sees exactly which product, with its
  preview) vs name only (shorter, but ambiguous when names repeat).

**Assumptions and risks:**
- WhatsApp may be unreliable or blocked for some users in Cuba; the shop already depends on it,
  so the site adds no new dependency.
- Until feature 08 sets `site`, the URL in the message points to `localhost`; the demo should be
  shown from the deployed site.
- Anyone who builds the project needs a `.env` (or the inline variable); the build error explains
  how.

<!-- KIT:START ─ Engine section. Identical in every project. /audit and /sync never edit
     between KIT:START and KIT:END. HTML comments are stripped before the model reads this
     file, so they cost no context. Keep this whole file short: it loads every session. -->

# How we work

Every piece of project knowledge lives in files in this repo, never only in a chat.
A session can be cleared at any handoff and nothing is lost.

## The skills — run only the ones a change needs
| Phase | Skill | Writes |
|---|---|---|
| Plan what | `/scope` | `docs/scope/` |
| Describe the project | `/audit` | project section of `AGENTS.md`, nested `AGENTS.md` |
| Decide | `/architect` | `docs/specs/` (status Proposed) |
| Build | `/develop` | source code, `design.md`, status lines |
| Prove it runs | `/check verify` | nothing (reports) |
| Keep it proven | `/test` | test files, `docs/testing.md` |
| Second opinion | `/check review` | `docs/reviews/` |
| Write it up | `/document` | `CHANGELOG.md`, `docs/releases/`, `docs/postmortems/` |
| Re-align knowledge | `/sync` | surgical edits to `AGENTS.md`, scope, status lines |
| Anytime, off the rail | `/debug` | the smallest fix |
| Anytime, for the learner | `/learn` | `learning/` |

## Ownership — never write a file you don't own
- **Content** of a spec: only `/architect`. Content of the scope: only `/scope`.
- **Status lines** (a scope feature's status and task boxes, a spec's `Status:` line and
  build-plan boxes) move forward only on evidence: `/develop` sets In Progress and ticks
  build tasks; the skill that completes the last check the depth requires marks it done;
  `/sync` reconciles lines that disagree with the repo.
- `/develop` may create one kind of spec: an **Assumed** spec, when the user chooses to build
  before deciding. Only `/architect` can ratify it. A feature with an Assumed spec is never done.
- Nobody rewrites another skill's prose. If something looks wrong, flag it.

## Done gate
Built is not done. A feature is done only when the checks its **workflow depth** requires
have passed (depth lives in the scope header, overridable per feature):
- Prototype: /develop self-check · Alpha: + /check verify · Beta: + /test · GA: + /check review + /document

## Engineering rules (non-negotiable)
- Never invent a decision. If building needs a choice no spec, design.md or AGENTS.md records,
  stop and route to `/architect`.
- Scope is sacred: build only what the spec asks. No drive-by refactors.
- Never guess a library API. Check bundled framework docs, then official docs via the
  `researcher` subagent (ask the user before going online). Training memory comes last.
- Secrets only from the environment. Never read or print `.env` files.
- Never claim it works without running the check. Never invent files, APIs, or facts.
- STOP rule: if a problem survives one corrective attempt, stop and run `/debug`.
- Permission denials from `.claude/settings.json` are intentional. Ask, don't work around them.

## Context hygiene
- Read only what the task needs: one scope section, one spec, the nearest `AGENTS.md`.
- Push noisy work to subagents: built-in `Explore` (read code), `researcher` (docs),
  `verifier` (run checks), `reviewer` (fresh-eyes review).
- Every skill ends by naming the next step and suggesting `/clear`.

<!-- KIT:END -->

<!-- PROJECT:START ─ Written by /audit from the real code; kept current by /sync.
     Empty until the project is scaffolded and /audit runs. -->

# Project

A read-only online catalog demo for a local food shop in Cuba. Today the owner posts stock in
WhatsApp groups; the site gives customers one always-current link where they browse products
in stock with prices and open a product to see its details. The demo is shown to the owner so
they can decide whether to buy it. Hard rule: as light as possible, because connections in
Cuba are slow and unreliable. Sources: `docs/brief.md`, `docs/scope/scope.md`.

## Stack
- Framework: Astro 7.3.5, static output (no adapter, no integrations; `output` left at default)
- Language: TypeScript 6.0.3, `astro/tsconfigs/strict`
- Typecheck: @astrojs/check 0.9.10
- Runtime / package manager: Node >=22.12.0, pnpm 10.13.1 (pinned in `packageManager`)
- Native build deps allowed in `pnpm-workspace.yaml` (`onlyBuiltDependencies`): esbuild, sharp
- Styling: Tailwind CSS 4.3.3 through the Vite plugin `@tailwindcss/vite` 4.3.3 (no
  `tailwind.config`; theme in CSS). Images: `astro:assets` with sharp 0.35.5.
- Fonts: Astro fonts API, one local file (Fraunces 600, `src/assets/fonts/`), configured in
  `astro.config.mjs` (spec 0002).
- Hosting: Vercel, static `dist/`; its Git integration builds every push to `main`. Live demo at
  `https://tienda-demo-cuba.vercel.app` (`site` in `astro.config.mjs`); every page is `noindex`
  while it is a demo, switch `indexable` in `src/lib/site.ts` (spec 0008).

## Commands
- Dev: `pnpm dev` (http://localhost:4321)
- Lint: none yet
- Typecheck: `pnpm typecheck` (`astro check`)
- Test: none yet
- Build: `pnpm build` (outputs `dist/`); preview with `pnpm preview`
- Build needs `WHATSAPP_NUMBER` (8–15 digits) from `.env` or the shell, or it fails on purpose
  (spec 0007). Checks never read `.env`; they pass a fake inline:
  `WHATSAPP_NUMBER=5355555555 pnpm build`. Template: `.env.example`.
- Weight check: `pnpm check:weight` after `pnpm build` (`scripts/check-weight.mjs`, spec 0001
  AC7); measures every page in `dist/` against the budget, exits 1 when one is over.
**Clean means:** `pnpm typecheck` and `pnpm build` pass with zero errors.

## Structure
| Folder | Owns | Must never |
|---|---|---|
| `src/pages/` | Routes: `index.astro` (catalog), `categoria/[id].astro`, `producto/[id].astro`, `estilo.astro` (internal style guide, `noindex`) | Hold data, sorting rules or shared markup that belongs in `lib/` or `components/` |
| `src/layouts/` | `BaseLayout.astro`: `<html lang="es">`, meta and Open Graph tags, robots, global CSS, font | Be bypassed: every page renders inside it |
| `src/components/` | Reusable `.astro` pieces (`SiteHeader`, `CategoryNav`, `ProductCard`, `ShopInfo`, `Faq`, `SiteFooter`), listed in `design.md` | Fetch data themselves (pages pass props) |
| `src/lib/` | Plain TS helpers, each the single home of one rule: `catalog.ts` (grouping, sort), `price.ts` (CUP format), `site.ts` (shop identity, `indexable`, shop info), `whatsapp.ts` (number, order and contact links), `date.ts` (day format in Havana time) | Be duplicated inline in a page |
| `src/data/` | `products.json`, `categories.json` (sample data, shape fixed by spec 0004) | Be imported by pages (only `content.config.ts` reads them) |
| `src/assets/` | Product photos (`products/<id>.jpg` + `CREDITS.md`) and the font file, processed at build | Hold files that must be served as-is (those go in `public/`) |
| `src/styles/` | `global.css`: Tailwind entry, `@theme` tokens, base styles, `.price` and `.awning` | Gain raw values used elsewhere: it is the only place they live |
| `public/` | Files served as-is (favicons, `og-default.png`) | Hold product images (those go through astro:assets per spec 0001) |
| `docs/` | Brief, scope, specs (+ `.verify.md` check steps), reviews | Be edited outside the owning skill (see Ownership) |
| `learning/` | Notes for the learner, written by `/learn` | Hold project decisions |
| `learning/code/` | Line-by-line Spanish walkthrough of every source file (repo tree mirrored) plus `glosario.md` | Drift from the code: update the walkthrough in the same change |
| `dist/`, `.astro/` | Generated by Astro (gitignored) | Be edited by hand |

`scripts/` (planned in spec 0001 for `check-weight.mjs`, task T6) does not exist yet.

## Conventions
- Naming: components and layouts PascalCase (`ProductCard.astro`); `src/lib/` files one lowercase
  word (`catalog.ts`); functions camelCase (`getCatalog`, `formatPrice`, `orderLink`). URL
  segments, data ids and UI text are Spanish (`/producto/arroz-blanco`); code, identifiers and
  comments are English and cite their spec number. Ids are lowercase kebab-case, enforced by the
  schema; a product's photo is `src/assets/products/<id>.jpg`.
- Data access: content collections `products` and `categories` in `src/content.config.ts`
  (`file()` loader, `z` from `astro/zod`), read only through `astro:content` (`getCollection`,
  `getEntry`). Catalog pages go through `getCatalog()` in `src/lib/catalog.ts`. The one direct
  JSON import is in `content.config.ts`, to validate category ids (spec 0004). Dynamic routes
  export `getStaticPaths = (async () => …) satisfies GetStaticPaths`.
- Results and errors: no server code. Bad data or config must fail the build: zod schema errors,
  and `throw new Error(…)` for a missing/invalid env var (`src/lib/whatsapp.ts`).
- Client JS: none. No `<script>` tags and no `client:` directives in `src/` (budget: spec 0001).
- Styling: Tailwind utilities that use token names only (`bg-accent`, `text-muted`,
  `rounded-card`); raw values live only in `src/styles/global.css` (`--color-*: initial` removes
  Tailwind's palette). No `<style>` tags or `style=` attributes. Class names written in full;
  conditional classes with `class:list`. Prices only through `formatPrice()`.
- Shop information (location, hours, payments, pickup, delivery, how-to-buy steps, FAQ) lives
  only in `src/lib/site.ts`; components render it and hold no shop copy (spec 0010). Dates only
  through `formatDay()` in `src/lib/date.ts` (`America/Havana`, since Vercel builds in UTC).
- Design system: `design.md` (art direction, token names, component classes to copy); live
  preview at `/estilo`.
- Env vars: `WHATSAPP_NUMBER`, build-time only (read in `src/lib/whatsapp.ts` via
  `import.meta.env`, typed in `src/env.d.ts`, documented in `.env.example`); set in `.env`
  (gitignored) and in Vercel. Not secret (it ends up in the page) but kept out of the repo.
- Framework docs: Astro ships no bundled docs for agents. Use the `researcher` subagent
  (ask first) before using an Astro API you are not sure about; installed type definitions in
  `node_modules/astro/client.d.ts` are a local first check.

## Libraries
- Astro: config in `astro.config.mjs` (`site`, Tailwind Vite plugin, local font). Decision:
  `docs/specs/0001-stack.md`
- Tailwind CSS v4: entry and tokens in `src/styles/global.css` (`@import "tailwindcss"`,
  `@theme`); no config file, no plugins without a new decision. Decision: `docs/specs/0001-stack.md`,
  tokens `docs/specs/0002-design-base.md`

## Known pitfalls
_Added by /sync from /debug findings: symptom → cause → rule._
- Unknown category id builds fine → `reference()` alone only logs `[ERROR]` and exits 0 → check
  ids in the schema (`refine`) before `.pipe(reference(...))` (spec 0004).
- A text link measures under 44 px despite `min-h-11` → `min-height` does not apply to inline
  elements → links that must be 44 px get `inline-flex min-h-11 items-center` (spec 0005 verify).
- `3400 CUP` has no dot but `12.500 CUP` does → `Intl` `es-ES` does not group 4-digit numbers →
  expected; change only through `/architect` (spec 0004).
- A failed build on Windows ends with `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` →
  Node/libuv crash while shutting down after the real error → read the error above it; the exit
  code is still non-zero.
- HTML shows `/_image?href=…` URLs or `pnpm preview` reports another port → a `pnpm dev` already
  holds 4321 → measure built output on the port `pnpm preview` prints, never on the dev server.
- The owner's browser closed during a check → headless browsers were killed by process name →
  stop only processes you started, by PID or by their temporary profile path.
- A FAQ question shows no ▶ triangle → `display: flex` on `<summary>` removes its disclosure
  marker → never put `flex` on `<summary>`; reach 44 px with padding (spec 0010).
- A headless `--window-size=360,…` screenshot looks cut on the right → headless Edge/Chrome
  windows have a minimum width above 360 px → check 360 px with DevTools device emulation
  (`Emulation.setDeviceMetricsOverride`) or inside a 360 px `<iframe>` (spec 0010 verify).
- `pnpm preview` exits with "Another astro preview server is already running" → Astro allows one
  preview and prints the running one's URL → use that URL; never `--force`, it kills the owner's.

## Git
integration: off   <!-- on = /develop branches and commits as milestones land -->

<!-- PROJECT:END -->

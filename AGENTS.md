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
- Data: Supabase (Postgres tables `categories`, `products`; public Storage bucket
  `product-photos`), read at build time only by `src/lib/supabase.ts` with plain `fetch` and the
  publishable key; no Supabase SDK. Visitors never call Supabase (specs 0012, 0013).
- Auth: Supabase Auth, one owner user (email + password, sign-ups off). The admin `/admin/`
  calls the Auth REST API from the browser with plain `fetch` through `src/lib/auth.ts` only.
  This is the only browser-to-Supabase path; customers' pages still never call it (spec 0014).
- Publishing: the admin's "Publicar cambios" calls the Edge Function `publish`
  (`supabase/functions/publish/index.ts`, Deno, no SDK, pasted into the dashboard editor; no
  Supabase CLI). It inserts a `publishes` row with the owner's JWT (RLS `is_owner()`), then POSTs
  the Vercel deploy hook, whose URL is the function secret `DEPLOY_HOOK_URL`. The status comes
  from the site's own `/build.json`, never from a host API (spec 0016).

## Commands
- Dev: `pnpm dev` (http://localhost:4321)
- Lint: none yet
- Typecheck: `pnpm typecheck` (`astro check`)
- Test: none yet
- Build: `pnpm build` (outputs `dist/`); preview with `pnpm preview`
- Build needs `WHATSAPP_NUMBER` (8–15 digits) from `.env` or the shell, or it fails on purpose
  (spec 0007). Checks never read `.env`; they pass a fake inline:
  `WHATSAPP_NUMBER=5355555555 pnpm build`. Template: `.env.example`.
- Build and dev also need internet and `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY` (spec 0013):
  `pnpm build` loads them from `.env` by itself, so checks never open `.env` and pass only the
  fake `WHATSAPP_NUMBER` inline.
- Database changes: edit `supabase/*.sql` and run them by hand in the Supabase dashboard SQL
  editor (no Supabase CLI, spec 0013).
- Weight check: `pnpm check:weight` after `pnpm build` (`scripts/check-weight.mjs`, spec 0001
  AC7); measures every page in `dist/` against the budget, exits 1 when one is over.
  `/admin/` gets its own JS limit (15 KB gzipped). Every other route keeps the public budget
  (spec 0014).
**Clean means:** `pnpm typecheck` and `pnpm build` pass with zero errors.

## Structure
| Folder | Owns | Must never |
|---|---|---|
| `src/pages/` | Routes: `index.astro` (catalog), `categoria/[id].astro`, `producto/[id].astro`, `estilo.astro` (internal style guide, `noindex`) | Hold data, sorting rules or shared markup that belongs in `lib/` or `components/` |
| `src/pages/admin/` | `index.astro`: the owner's admin (sign in, password recovery by link, signed-in view), `noindex`, the only route with client JS (spec 0014) | Be linked from public pages; hold Auth rules (those live in `src/lib/auth.ts`) |
| `src/layouts/` | `BaseLayout.astro`: `<html lang="es">`, meta and Open Graph tags, robots, global CSS, font | Be bypassed: every page renders inside it |
| `src/components/` | Reusable `.astro` pieces (`SiteHeader`, `CategoryNav`, `ProductCard`, `ShopInfo`, `Faq`, `SiteFooter`, `WhatsAppIcon`), listed in `design.md` | Fetch data themselves (pages pass props) |
| `src/lib/` | Plain TS helpers, each the single home of one rule: `catalog.ts` (grouping, sort), `price.ts` (CUP format), `site.ts` (shop identity, `indexable`, shop info), `whatsapp.ts` (number, order and contact links), `date.ts` (day format in Havana time), `supabase.ts` (catalog reads from Supabase, photo URLs) | Be duplicated inline in a page |
| `supabase/` | `schema.sql` (tables, RLS, bucket), `seed.sql` (the spec 0004 sample catalog), `seed-photos/` (the 18 sample photos + `CREDITS.md`, uploaded to the bucket) | Be imported by `src/`; change without running the SQL in Supabase too |
| `src/assets/` | The font file and the official WhatsApp glyphs (`icons/` + `SOURCE.md`, never edited), processed at build | Hold files that must be served as-is (those go in `public/`) |
| `src/styles/` | `global.css`: Tailwind entry, `@theme` tokens, base styles, `.price` and `.awning` | Gain raw values used elsewhere: it is the only place they live |
| `public/` | Files served as-is (favicons, `og-default.png`) | Hold product images (those go through astro:assets per spec 0001) |
| `docs/` | Brief, scope, specs (+ `.verify.md` check steps), reviews | Be edited outside the owning skill (see Ownership) |
| `learning/` | Notes for the learner, written by `/learn` | Hold project decisions |
| `learning/code/` | Line-by-line Spanish walkthrough of every source file (repo tree mirrored) plus `glosario.md` | Drift from the code: update the walkthrough in the same change |
| `dist/`, `.astro/` | Generated by Astro (gitignored) | Be edited by hand |

`scripts/` (planned in spec 0001 for `check-weight.mjs`, task T6) does not exist yet.

Added by spec 0014:
- `src/lib/auth.ts`: browser-only. It is the single home of the owner's session (stored in
  `localStorage` under `admin-session`) and of every Supabase Auth call. It also provides
  `authFetch()`, which features 12–14 use for authenticated requests.
- `supabase/auth.sql`: `public.is_owner()`, plus the dashboard settings and the role update
  in comments.

Added by spec 0015:
- `src/lib/products.ts`: browser-only. The single home of the admin's product reads and writes
  (PostgREST through `authFetch()`), the form's field rules (`checkFields()`), the id rule
  (`productId()`) and the error mapping (`failure()`).
- `supabase/products-write.sql`: the owner's insert, update and delete policies on `products`
  (`is_owner()`), and `photo_path` made nullable.
- `src/components/NoPhoto.astro`: the single home of the "Sin foto" box for a product without a
  photo.

Added by spec 0016:
- `src/pages/build.json.ts`: `/build.json`, `{ builtAt, catalogChangedAt }` written at build. The
  admin polls it. It holds no catalog data and no Supabase values.
- `src/lib/publish.ts`: browser-only. The single home of the publish request and of the rule that
  turns three server timestamps into a state; never the phone's clock.
- `supabase/publish.sql`: `catalog_state` (one row, public read, stamped by the `touch_catalog()`
  trigger on every change to `products` or `categories`) and `publishes` (owner insert only).
- `supabase/functions/publish/index.ts`: the repo copy of the Edge Function; Deno code, so
  `tsconfig.json` excludes `supabase/functions`.
- SQL files run in this order in a new shop: `schema.sql` → `seed.sql` → `auth.sql` →
  `products-write.sql` → `publish.sql`.

## Conventions
- Naming: components and layouts PascalCase (`ProductCard.astro`); `src/lib/` files one lowercase
  word (`catalog.ts`); functions camelCase (`getCatalog`, `formatPrice`, `orderLink`). URL
  segments, data ids and UI text are Spanish (`/producto/arroz-blanco`); code, identifiers and
  comments are English and cite their spec number. Ids are lowercase kebab-case, enforced by the
  schema; a product's photo is `<id>.jpg` in the Supabase bucket `product-photos` (column
  `photo_path`). Table columns are snake_case; the loaders map them to the spec 0004 shape.
- Data access: content collections `products` and `categories` in `src/content.config.ts`
  (inline loaders over `readCategories()` / `readProducts()` from `src/lib/supabase.ts`, `z` from
  `astro/zod`), read only through `astro:content` (`getCollection`,
  `getEntry`). Catalog pages go through `getCatalog()` in `src/lib/catalog.ts`. Unknown category
  ids are refused in `readProducts()` (spec 0013). Dynamic routes
  export `getStaticPaths = (async () => …) satisfies GetStaticPaths`.
- Collection `catalogState` (one entry, `current`, from `readCatalogChangedAt()`, read before the
  catalog) feeds only `/build.json` (spec 0016).
- Results and errors: no server code. Bad data or config must fail the build: zod schema errors,
  and `throw new Error(…)` for a missing/invalid env var (`src/lib/whatsapp.ts`).
  `src/lib/supabase.ts` also throws on a bad URL or key, a secret key, a failed or non-2xx read,
  an empty table and ≥ 1000 rows; messages name the variable, never its value (spec 0013).
- Admin errors: a refused PostgREST write maps by its Postgres code. Class `22`/`23` →
  `invalid` ("revisa el formulario"); any other 4xx → `system` ("no es culpa tuya"); anything
  else → `unknown` (`failure()` in `src/lib/products.ts`, spec 0015).
- Product photos: remote URLs, allowed only by `image.remotePatterns` in `astro.config.mjs`
  (`*.supabase.co/storage/v1/object/public/product-photos/**`); `<Image>` gets `inferSize`
  and `getImage()` gets `inferSize: true`, so they are downloaded and optimized at build.
- A product may have no photo (`photo_path` null, `photo` optional): pages render `<NoPhoto />`
  instead of `<Image>`, and its `og:image` falls back to `/og-default.png` (spec 0015).
- Client JS: none. No `<script>` tags and no `client:` directives in `src/` (budget: spec 0001).
- Client JS exception: `src/pages/admin/index.astro` only (specs 0012, 0014).
  - It has one processed `<script>` with no attributes, which imports `src/lib/auth.ts`, and no
    UI framework.
  - The same script also imports `src/lib/products.ts` (spec 0015) and `src/lib/publish.ts`
    (spec 0016). Owner-typed values reach the DOM through `textContent` only, never `innerHTML`.
  - Its forms use `method="post"` and `novalidate`; the script calls `preventDefault` and
    `reportValidity`.
  - All its views start `hidden`, and a `<noscript>` explains why the admin needs JavaScript.
  - The rule above still holds for every other route.
- Owner authorization: the database knows the owner only through `app_metadata.role = "owner"`,
  read by `public.is_owner()` (`supabase/auth.sql`). Write policies and Edge Functions use it,
  never `authenticated` alone. The check in the admin page only drives the UI (spec 0014).
- Styling: Tailwind utilities that use token names only (`bg-accent`, `text-muted`,
  `rounded-card`); raw values live only in `src/styles/global.css` (`--color-*: initial` removes
  Tailwind's palette). No `<style>` tags or `style=` attributes. Class names written in full;
  conditional classes with `class:list`. Prices only through `formatPrice()`.
- Shop information (location, hours, payments, pickup, delivery, how-to-buy steps, FAQ) lives
  only in `src/lib/site.ts`; components render it and hold no shop copy (spec 0010). Dates only
  through `formatDay()` in `src/lib/date.ts` (`America/Havana`, since Vercel builds in UTC).
- Brand icon: the official WhatsApp glyph only through `WhatsAppIcon.astro`, as an `<img>` next to
  the words, never inline, never recolored or edited (Meta's brand rules, spec 0011). Focusable
  elements on an `ink` background add `focus-visible:outline-cream`.
- Design system: `design.md` (art direction, token names, component classes to copy); live
  preview at `/estilo`.
- Env vars: `WHATSAPP_NUMBER`, build-time only (read in `src/lib/whatsapp.ts` via
  `import.meta.env`, typed in `src/env.d.ts`, documented in `.env.example`); set in `.env`
  (gitignored) and in Vercel. Not secret (it ends up in the page) but kept out of the repo.
- Env vars `SUPABASE_URL` (project URL only, no `/rest/v1`, no trailing slash) and
  `SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`, never a secret key): build-time only, read in
  `src/lib/supabase.ts`, typed in `src/env.d.ts`, documented in `.env.example`; set in `.env`
  and in Vercel (Production and Preview). Public by design, kept out of the repo (spec 0013).
  `/admin/` also hands both values to its script, as `data-supabase-url` and
  `data-supabase-key`, through `supabaseConfig()`. So `dist/admin/` is the one place in `dist/`
  that contains them (spec 0014).
- Secret `DEPLOY_HOOK_URL`: the Vercel deploy hook, set only as a Supabase Edge Function secret
  and read there with `Deno.env`. Never in the repo, `.env`, `dist/` or a response (spec 0016).
- Framework docs: Astro ships no bundled docs for agents. Use the `researcher` subagent
  (ask first) before using an Astro API you are not sure about; installed type definitions in
  `node_modules/astro/client.d.ts` are a local first check.

## Libraries
- Astro: config in `astro.config.mjs` (`site`, Tailwind Vite plugin, local font). Decision:
  `docs/specs/0001-stack.md`
- Tailwind CSS v4: entry and tokens in `src/styles/global.css` (`@import "tailwindcss"`,
  `@theme`); no config file, no plugins without a new decision. Decision: `docs/specs/0001-stack.md`,
  tokens `docs/specs/0002-design-base.md`
- Supabase: no SDK; REST (`/rest/v1/<table>`, header `apikey`) and public Storage URLs through
  `fetch` in `src/lib/supabase.ts` only. Decision: `docs/specs/0012-admin-backend.md`,
  `docs/specs/0013-catalog-data-online.md`
- Supabase Auth: no SDK; REST `/auth/v1/*` through `fetch` in `src/lib/auth.ts` only.
  - Headers: the publishable key in `apikey`, the user's token in `Authorization: Bearer`.
  - A rejected token is any 401, or a 403 `bad_jwt` / `session_not_found`. It gets one
    refresh and one retry.
  - Password recovery uses the default email's link (implicit flow, `redirect_to` back to
    `/admin/`). Editing email templates needs custom SMTP.
  - Decision: `docs/specs/0014-owner-login.md`
- Supabase from the admin: `src/lib/products.ts` (`/rest/v1/products`, `/rest/v1/categories`)
  and `src/lib/publish.ts` (`/functions/v1/publish`, `/rest/v1/publishes`,
  `/rest/v1/catalog_state`) call Supabase from the browser, always through `authFetch()`.
  Product writes send `Prefer: return=representation`; a PATCH or DELETE that matches no row
  answers `200 []`. Decisions: `docs/specs/0015-manage-products.md`, `docs/specs/0016-publish-changes.md`

## Known pitfalls
_Added by /sync from /debug findings: symptom → cause → rule._
- Unknown category id builds fine → `reference()` alone only logs `[ERROR]` and exits 0 → check
  ids before `reference()`; today that is `readProducts()` in `src/lib/supabase.ts` (specs 0004, 0013).
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
- Two inlined brand SVGs recolor each other → Astro's SVG import copies the file's `<style>` and
  `id` into the page, and the official files share `.cls-1` / `id="Layer_1"` → render brand SVGs
  as `<img src={file.src}>`, never as a component (spec 0011).
- `curl http://127.0.0.1:<port>` gets no answer from `pnpm preview` → it listens on `localhost`
  only → use the exact URL it prints.
- Every Supabase read answers 404 → `SUPABASE_URL` was copied from the dashboard's Data API
  section and ends in `/rest/v1/` → set the project URL only; the build now refuses it with a
  message (spec 0013).
- A wrong-env-var test on Vercel ends Ready → "Redeploy" on an older deployment rebuilds that
  old commit, which may not read the variable → redeploy the deployment of the commit under test
  (spec 0013 verify).
- A save from `/admin/` answers `400` `21000` while the same update works in the SQL editor →
  Supabase's `pg_safeupdate` refuses an `update` or `delete` without `where` on API requests,
  including what a trigger runs → every `update`/`delete` in a trigger or function the API can
  reach has a `where` (`touch_catalog()`: `where id = true`, spec 0016).

## Git
integration: off   <!-- on = /develop branches and commits as milestones land -->

<!-- PROJECT:END -->

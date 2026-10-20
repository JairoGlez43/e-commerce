# 0013 · Catalog data online

**Status:** In Progress
**Date:** 2026-10-20
**Scope:** `docs/scope/scope.md` → feature 10
**Supersedes:** — (changes where spec 0004's data lives and the type of its `photo` field; the
other fields, rules and the data set of 0004 stay as they are)

## Context
Spec 0012 put the catalog in the demo's Supabase project and chose a static site that is
rebuilt on publish. Today Astro still reads `src/data/*.json` and `src/assets/products/*.jpg`.
Features 12–15 (the admin) edit data online, so the public build must read it from Supabase
first. The owner chose to move the 18 product photos to Supabase Storage in this feature too,
so the pages change their image source only once and feature 14 only adds uploading.

## Decision
- **Two Postgres tables, `categories` and `products`**, with the fields of spec 0004 in
  snake_case and the same rules as database constraints. The SQL lives in the repo
  (`supabase/schema.sql`, `supabase/seed.sql`) and the owner runs it in the dashboard SQL
  editor. No Supabase CLI.
- **Photos in a public Storage bucket, `product-photos`**, at `<id>.jpg`. A product row keeps
  the object path (`photo_path`), not a full URL, so the same seed works in every shop's project.
- **Astro reads Supabase at build time with two inline content loaders** that call the REST
  API with plain `fetch`. There is no new package. The collections keep their names and the
  entry shape of spec 0004, except that `photo` becomes a remote URL string. `getCatalog()` and
  the page routes stay the same.
- **Public client key:** the project's **publishable key** (`sb_publishable_…`). The legacy
  `anon` key is being deprecated. The build refuses a secret key.
- **Fail closed:** missing or malformed config, an unreachable project, a non-2xx answer, an
  empty table or an unknown category make the build fail with a clear message. Vercel keeps
  the last good deploy live (proved in spec 0012 AC2), so customers keep seeing the last
  published catalog.
- **Photos are still optimized at build** by `astro:assets` from the remote URL, into
  `dist/_astro/`. Visitors never contact Supabase.
- **The JSON files and photos leave `src/`.** The data moves into `supabase/seed.sql`, and
  the photos plus `CREDITS.md` move to `supabase/seed-photos/`, so the demo can be rebuilt in
  any new project.

## Acceptance criteria
- **AC1:** Running `supabase/schema.sql` in the demo project's SQL editor creates the two
  tables with the constraints in the Design, turns RLS on for both, and lets `anon` and
  `authenticated` read them. It also creates the public bucket `product-photos`. A REST
  `POST`, `PATCH` or `DELETE` with the publishable key on either table is refused.
- **AC2:** Running `supabase/seed.sql` loads exactly the 6 categories and 18 products that
  are in `src/data/*.json` today: same ids, names, order, prices, units, stock and
  descriptions. The 18 photos are in `product-photos/<id>.jpg`, and each public URL answers
  200 without any key.
- **AC3:** `pnpm build` reads both collections from Supabase. `src/data/` and the product JPGs
  in `src/assets/products/` are gone from `src/`, and nothing in `src/` imports them.
- **AC4:** Nothing changes for customers. The routes in `dist/` are the same set as in a
  baseline built before this feature. For every product and category page, the visible text
  is identical to the baseline: names, prices through `formatPrice()`, units, stock labels,
  descriptions and category names.
- **AC5:** The build exits non-zero with a message naming the cause, and never prints the
  key's value, when:
  (a) `SUPABASE_URL` or `SUPABASE_PUBLISHABLE_KEY` is missing or malformed, or the key is a
  secret key;
  (b) the project answers non-2xx (tested with a wrong key) or cannot be reached (tested with
  an unreachable URL);
  (c) a table returns 0 rows;
  (d) a product's category is not among the fetched categories.
- **AC6:** On Vercel, a build with a wrong `SUPABASE_PUBLISHABLE_KEY` fails, and
  `https://tienda-demo-cuba.vercel.app` keeps serving the previous deploy. After the value is
  restored, the next deploy shows the catalog as in AC4.
- **AC7:** Visitors never call Supabase. No file in `dist/` contains `supabase.co` or
  `sb_publishable_`. Every product `<img>` and the `og:image` point to files under `dist/`.
  `pnpm check:weight` passes (thumbnail ≤ 25 KB, detail photo ≤ 80 KB, spec 0001), and no
  public route has a `<script>` tag.
- **AC8:** `pnpm typecheck` and `pnpm build` pass. Both env vars are documented in
  `.env.example`, typed in `src/env.d.ts`, and set in Vercel for Production and Preview.

## Design

**Tables** (`supabase/schema.sql`; rules mirror the zod schema of spec 0004)
```sql
create table public.categories (
  id         text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name       text not null check (char_length(name) between 1 and 30),
  sort_order integer not null check (sort_order >= 0)
);

create table public.products (
  id          text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (char_length(name) between 1 and 60),
  category_id text not null references public.categories (id) on delete restrict,
  price       integer not null check (price > 0),
  unit        text not null check (char_length(unit) between 1 and 30),
  in_stock    boolean not null default true,
  description text not null check (char_length(description) between 1 and 300),
  photo_path  text not null check (char_length(photo_path) > 0)
);
```
- `sort_order`, not `order`, because `order` is an SQL keyword. The loader maps it back.
- `on delete restrict`: a category with products cannot be deleted. Feature 15 builds on that.
- No timestamps or draft flag. Feature 13 decides if publishing needs one.

**Access** (same file, after the tables, for each of the two tables)
```sql
alter table public.<table> enable row level security;
grant select on table public.<table> to anon, authenticated;
create policy "<table> are public to read" on public.<table>
  for select to anon, authenticated using (true);
```
- There are no insert, update or delete policies, so with RLS on every write by `anon` or
  `authenticated` is refused (AC1). Feature 11/12 add the owner's write policies.
- The `grant` is explicit because Supabase is changing the default table exposure for new
  projects (research 2026-10-20). Without the grant, reads fail with `42501`, and the build
  then fails, which is safe.

**Bucket** (same file): `insert into storage.buckets (id, name, public) values
('product-photos', 'product-photos', true);`. There are no upload policies. The owner uploads
the 18 seed photos from the dashboard, which works as the project owner. Feature 14 adds
upload policies for the owner user. If dashboard upload does not work, `/develop` stops and
reports. It does not script an upload with a secret key.

**Seed** (`supabase/seed.sql`): `insert` statements for the 6 categories and 18 products. They
are generated once from today's `src/data/*.json`, before those files are deleted, so every
value is copied, never retyped. `photo_path` is `<id>.jpg`. Running it twice fails on the
primary keys. That is intended, because it is a one-time load.

**Config** (env vars, build time only)
| Var | Example shape | Rule checked by the build |
|---|---|---|
| `SUPABASE_URL` | `https://<ref>.supabase.co` | `https://` URL, no trailing slash |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` | starts with `sb_publishable_`; a key starting `sb_secret_` is refused by name |

Both values are public by design, but they live outside the repo, like `WHATSAPP_NUMBER`. They
go in `.env` (local), Vercel (Production and Preview), `.env.example` (fake values), and are
typed in `src/env.d.ts`. Error messages name the variable, never its value. Feature 12 decides
whether the admin exposes them to the browser.

**Reading** (`src/lib/supabase.ts`, the single home of the Supabase access rule)
- `readTable(table, columns)`: validates config, then
  `GET ${SUPABASE_URL}/rest/v1/${table}?select=${columns}` with header
  `apikey: <publishable key>`. It throws on a fetch error, on `!res.ok` (status in the
  message), on 0 rows, and on 1000 or more rows (the default max rows per request, so the
  catalog might be cut off).
- `photoUrl(path)`: returns `${SUPABASE_URL}/storage/v1/object/public/product-photos/${path}`.
- The categories rows are fetched once and the promise is shared. The categories loader uses
  them, and the products loader uses them to check every `category_id` (AC5 d). This replaces
  spec 0004's check against `categories.json`. `reference()` alone only logs and exits 0 (Known
  pitfalls), so the check stays in the loader.

**Collections** (`src/content.config.ts`)
- `categories`: inline loader returning `{ id, name, order: sort_order }`, with the same
  schema as today.
- `products`: inline loader returning `{ id, name, category: category_id, price, unit,
  inStock: in_stock, description, photo: photoUrl(photo_path) }`. The schema is the same as
  today, except:
  - `category` is `reference('categories')` (the id check now happens in the loader);
  - `photo` is a URL string (zod URL check) instead of `image()`.
- Inline loaders clear the store before saving (installed `content-layer.js`). Rows deleted in
  Supabase therefore vanish on the next build, and a throw leaves no stale data in a
  successful build.
- The `categoryData` JSON import and its refine are removed.

**Images**
- `astro.config.mjs` gets `image.remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co',
  pathname: '/storage/v1/object/public/product-photos/**' }]`. One pattern covers every shop's
  project, so nothing per shop is added next to `site`.
- `<Image>` in `ProductCard.astro`, `producto/[id].astro` and `estilo.astro` keep their
  `widths`, `sizes`, `loading` and classes, and add `inferSize`. `getImage()` for the
  `og:image` adds `inferSize: true`. Output stays WebP for cards and detail, and JPG for the
  preview (spec 0011).
- Astro caches remote images in `node_modules/.astro` and revalidates them with HTTP cache
  headers.

**Checks without reading `.env`:** `pnpm build` loads `.env` itself. The agent never opens or
prints it, and keeps passing the fake `WHATSAPP_NUMBER` inline. The failure cases in AC5 set a
bad value inline for one run, for example `SUPABASE_PUBLISHABLE_KEY=sb_publishable_wrong`.
Local `pnpm dev` and `pnpm build` now need internet.

**Security:** read-only access with the publishable key. RLS is on and only `select` policies
exist. Secret keys are refused by the build and never reach the host env. Visitors get only
static files (AC7).

## Build plan
- [x] **T1** (AC4) Before changing anything, build and save a baseline outside the repo: the
  list of routes in `dist/` and the visible text of every page.
- [x] **T2** (AC1, AC2) Write `supabase/schema.sql`, and generate `supabase/seed.sql` from
  the JSON. Guide the owner through running both in the SQL editor and uploading the 18
  photos. Then check AC1's refused writes and AC2's public photo URLs with `curl`.
- [x] **T3** (AC5, AC7) Confirm the unconfirmed points, each in a throwaway run, and record
  the outcome on this line. Outcome (2026-10-20): `import.meta.env` works inside the loader;
  `apikey` alone works with the publishable key; a throwing loader exits non-zero (1, or 127
  on the Windows shutdown crash); `*.supabase.co` matches one subdomain level (installed
  `@astrojs/internal-helpers/dist/remote.js`); `inferSize` outputs WebP into `dist/_astro/`.
  Checks:
  - `import.meta.env` is readable inside a content loader. If not, try `astro:env` server
    vars. If neither works, stop and return to `/architect`.
  - `apikey` alone works with a publishable key. If the request gets 401, add
    `Authorization: Bearer` and record it.
  - A throwing loader makes `astro build` exit non-zero.
  - The `*.supabase.co` wildcard is accepted. If it is not, use the demo's exact hostname
    next to `site`.
  - `inferSize` produces WebP output from the remote photos.
- [x] **T4** (AC3, AC5) Write `src/lib/supabase.ts` and the two loaders in
  `src/content.config.ts`.
- [x] **T5** (AC4, AC7) Add `remotePatterns`, plus `inferSize` in the three `<Image>` uses
  and in `getImage()`.
- [x] **T6** (AC3, AC8) Move the photos and `CREDITS.md` to `supabase/seed-photos/`, delete
  `src/data/`, and add both vars to `.env.example` and `src/env.d.ts`.
- [x] **T7** (AC4, AC5, AC7, AC8) Run typecheck, build and check:weight. Diff the new build
  against the T1 baseline, run the four AC5 failure cases, and grep `dist/` for `supabase.co`,
  `sb_publishable_` and `<script`.
- [ ] **T8** (AC6, AC8) Guide the owner through setting both vars in Vercel and deploying.
  Then run the wrong-key test, restore the value, redeploy and recheck AC4 on the live URL.
- [x] **T9** Update the `learning/code/` walkthroughs of every changed file and remove those
  of deleted files.

## Out of scope
- Owner writes, login and the admin (features 11 and 12), the publish button and draft vs
  published (feature 13: until then, any rebuild, including a `git push`, shows the tables as
  they are), photo upload and products without a photo (feature 14), category editing
  (feature 15).
- An offline fallback to local JSON, pagination beyond 1000 rows, the Supabase CLI, and
  automated backups.
- Updating `AGENTS.md` (Structure, data access, env vars, images). That is `/sync`'s job after
  the build.

## Sources
- `docs/scope/scope.md` → feature 10; specs 0001, 0004, 0011, 0012; `src/content.config.ts`,
  `src/lib/catalog.ts`, the components and pages that render `photo`.
- Owner answers, 2026-10-20: move the photos to Storage in this feature; online research
  approved.
- `researcher`, Supabase, 2026-10-20: supabase.com/docs/guides/api/api-keys (anon and
  service_role deprecated by end of 2026; publishable key "safe to expose" with RLS; `apikey`
  header), /database/postgres/row-level-security, /api/securing-your-api (grants, changing
  defaults, `42501`), /api/using-custom-schemas, /storage/buckets/fundamentals,
  /storage/buckets/creating-buckets, /storage/uploads/file-limits,
  /storage/serving/downloads, /platform/upgrading, /deployment/managing-environments.
- `researcher`, Astro 7.3.5, 2026-10-20: docs.astro.build/en/reference/content-loader-reference/,
  /reference/configuration-reference/ (`image.remotePatterns`), /guides/images/ (remote
  optimization, cache), /reference/modules/astro-assets/ (`inferSize`),
  /guides/environment-variables/. Installed code: `node_modules/astro/dist/content/content-layer.js`
  (inline loaders run `store.clear()` then `parseData`; references checked after loaders and
  only logged), `dist/core/sync/index.js` (sync errors are not caught),
  `dist/content/loaders/types.d.ts`.
- Not confirmed, so T3 tests them: env access inside loaders, `apikey` alone with a publishable
  key, the exit code of a throwing loader, the hostname wildcard, WebP output with `inferSize`,
  the paused-project response, and the default 1000-row limit (it came from a search summary).

---
## Rationale
<!-- History, not build input. /develop does not read below this line. -->
**Options considered:**
- Inline loaders with `fetch` (chosen) vs `@supabase/supabase-js` (runner-up: typed queries,
  and the admin will likely use it in feature 12, but it is a new dependency for two GET
  requests at build) vs an object loader (more control, but it must clear the store itself,
  or deleted rows survive).
- Photos to Storage now (chosen, owner) vs keeping them in the repo until feature 14
  (runner-up: smaller feature, but the pages would change their image source twice).
- `photo_path` (chosen) vs a full URL in the row (runner-up: no URL building, but the seed
  and rows would be tied to one project's hostname).
- SQL files in the repo, run in the dashboard SQL editor (chosen: nothing to install, and
  the owner already uses the dashboard) vs Supabase CLI migrations (runner-up: Supabase's
  documented practice, with versioned migrations, but an install, login and link per shop;
  worth it once the schema changes often).
- Fail on 0 rows (chosen: a missing grant or policy returns `[]` with status 200, which would
  publish an empty shop) vs allowing an empty catalog (rejected: an owner with nothing to sell
  marks products out of stock instead).
- Publishable key (chosen) vs the legacy `anon` key (rejected: deprecated by the end of 2026).
- `inferSize` (chosen: correct even if a later photo is not square) vs a fixed
  `width={800} height={800}` (runner-up: no extra size fetch, but wrong for any non-square
  upload).
- No JSON fallback (chosen) vs falling back to local files when Supabase fails (rejected: two
  sources drift, and a fallback would publish stale data without anyone noticing).

**Assumptions and risks:**
- A paused Free project's response is unknown. Any non-2xx or network error fails the build,
  so the live site is safe, but the owner must restore the project before publishing.
- A replaced photo at the same path may be served from Astro's remote image cache. Feature 14
  should give each upload a new path.
- Dashboard upload of Storage objects is not in the docs the research read. It is expected to
  work.
- Local builds now depend on internet access and the demo project being active.

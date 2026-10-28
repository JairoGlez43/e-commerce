# 0016 · Publish changes

**Status:** In Progress
<!-- Proposed → In Progress → Accepted · Assumed (recorded by /develop, awaiting ratification) · Superseded by NNNN -->
**Date:** 2026-10-28
**Scope:** `docs/scope/scope.md` → feature 13
**Supersedes:** — (builds on spec 0012's publish path: Edge Function + secret deploy hook)
**Amended:** 2026-10-28 — `touch_catalog()`'s update gains `where id = true` (see Sources).
Already in `supabase/publish.sql` and run in Supabase.

## Context
Since spec 0015 the owner's saves change Supabase at once, but the static public site shows them
only after a new build. On 2026-10-28 the owner edited prices on the live demo and nothing
changed on the public pages. Spec 0012 already chose how a publish reaches the site: an Edge
Function checks the owner and POSTs to the host's deploy hook, whose URL is a secret. Spec 0012
left the button and the status to this feature.

## Decision
- **One "Publicar cambios" button in the admin.** One tap makes one build, so many edits make
  one update. Publishing is never automatic.
- **Edge Function `publish`, with plain `fetch` and no SDK.** The database decides who is the
  owner: the function inserts a row into a new `publishes` table using the caller's own JWT.
  The RLS policy is `public.is_owner()` (spec 0014). Only when that insert works does the
  function POST to the deploy hook. A 60-second gap between publishes stops double taps and
  protects the hook's 60-an-hour limit. Its code lives in the repo
  (`supabase/functions/publish/index.ts`) and is pasted into the dashboard editor, like the SQL
  files. No Supabase CLI.
- **The status comes from the site itself (`/build.json`), not from the host.** Every build
  writes `dist/build.json` with its build time and the catalog's change time. The admin polls
  it (same origin) until a build newer than the last publish is live. The same code works on
  Vercel and on Cloudflare Pages, and it needs no host API token. A failure is inferred: no new
  build within 10 minutes of watching.
- **"Hay cambios sin publicar" (owner's choice).** A Postgres trigger stamps
  `catalog_state.changed_at` on every change to `products` or `categories`. The build reads that
  stamp **before** it reads the catalog and copies it into `build.json`. The admin compares the
  stamp in the database with the one in `build.json`. Every compared time comes from a server,
  never from the phone's clock.

## Acceptance criteria
- **AC1:** After `supabase/publish.sql` runs in the SQL editor:
  - `catalog_state` has exactly one row;
  - an insert, update or delete on `products` (from the admin or the dashboard) moves
    `changed_at` forward. An update on `categories` does too;
  - with only the publishable key, `catalog_state` can be read, while `publishes` reads `[]`
    and refuses an insert;
  - in the SQL editor, an insert into `publishes` run as `authenticated` with claims that have
    no `app_metadata.role` fails with `42501`. With the owner's claims it works, and is then
    rolled back.
- **AC2:** With the `publish` function deployed and the `DEPLOY_HOOK_URL` secret set:
  - `OPTIONS` answers `204` with the CORS headers;
  - a `POST` without `Authorization` answers `401`;
  - a `POST` with a token from a user without the owner role answers `403`, and no Vercel
    deployment starts (role removed and restored as in spec 0014 AC4);
  - the owner's `POST` answers `200` with `{ "requested_at": "<timestamp>" }`, adds one
    `publishes` row and starts one production deployment;
  - a second owner `POST` within 60 seconds answers `429` and starts nothing;
  - the hook URL appears nowhere in the repo, in `dist/`, or in any response body.
- **AC3:** After `pnpm build`, `dist/build.json` is exactly
  `{"builtAt":"<ISO time>","catalogChangedAt":"<value>"}`. Its `catalogChangedAt` is
  `catalog_state.changed_at` as PostgREST returned it at build time. A build that cannot read
  `catalog_state` fails with a message. The public pages are unchanged and still have no
  `<script>`.
- **AC4:** On a 360 px screen, the signed-in view shows a "Publicar" card above "Productos",
  with "Publicar cambios" (44 px).
  - Right after any product save, stock tap or delete, the card says "Hay cambios sin
    publicar."
  - When the live `build.json` holds the database's current stamp, it says "La web está al
    día."
- **AC5:** On the live demo, tapping "Publicar cambios" with pending changes:
  - disables the button with its label ending in "…", then shows "Publicando… La web se
    actualiza en unos minutos.";
  - without a reload, once the new build is live, shows "Publicado. La web ya muestra los
    cambios." and then "La web está al día.";
  - the changed product's public page shows the new value.
- **AC6:** Reloading `/admin/` while a publish builds still shows "Publicando…" and then
  finishes as in AC5. The same holds when opened on a second device.
- **AC7:** After tapping "Publicar cambios", the owner changes another price while the build
  runs. When that build is live, the card says "Hay cambios sin publicar." if the change is not
  in it, and never "La web está al día." for a catalog it does not show.
- **AC8:** Five product edits followed by one tap start exactly one new Vercel deployment.
- **AC9:** Failures:
  - offline, the tap shows "Sin conexión. Revisa tus datos e inténtalo otra vez." and the
    status stays;
  - a second tap within 60 seconds shows "Acabas de publicar. Espera un minuto y vuelve a
    intentarlo.";
  - a build that fails (set `WHATSAPP_NUMBER` to `x` in Vercel, as in spec 0012 AC2) leaves the
    live site unchanged, and after 10 minutes the card shows "La publicación no terminó. Tus
    cambios siguen guardados. Vuelve a publicar y, si vuelve a pasar, avisa a quien te hizo la
    web." The status line still says "Hay cambios sin publicar." Restore the value afterwards;
  - a refused session (`signedOut`) shows the sign-in view with its message (spec 0014).
- **AC10:** `pnpm typecheck`, `pnpm build` and `pnpm check:weight` pass, and `/admin/` JS stays
  within 15 KB gzipped. No public route has a `<script>` tag or contains `supabase.co` or
  `sb_publishable_`. `dist/build.json` holds only the two timestamps.

## Design

**`supabase/publish.sql`** (new; run once in the SQL editor after `products-write.sql`. Order
for every shop: `schema.sql` → `seed.sql` → `auth.sql` → `products-write.sql` → `publish.sql`)
```sql
-- Publishing (spec 0016): when the catalog last changed, and each publish request.

-- One row: the time of the last change to the catalog. Only the trigger writes it.
create table public.catalog_state (
  id         boolean primary key default true check (id),
  changed_at timestamptz not null default now()
);
insert into public.catalog_state default values;
alter table public.catalog_state enable row level security;
grant select on table public.catalog_state to anon, authenticated;
create policy "catalog state is public to read" on public.catalog_state
  for select to anon, authenticated using (true);

-- security definer: the owner's role has no write grant on catalog_state.
-- The where is required: Supabase's pg_safeupdate refuses an update without one when it comes
-- through the REST API, triggers included (error 21000).
create or replace function public.touch_catalog() returns trigger
  language plpgsql security definer set search_path = ''
  as $$ begin update public.catalog_state set changed_at = now() where id = true; return null; end $$;
create trigger products_touch_catalog after insert or update or delete on public.products
  for each statement execute function public.touch_catalog();
create trigger categories_touch_catalog after insert or update or delete on public.categories
  for each statement execute function public.touch_catalog();

-- One row per publish request. The function inserts it with the caller's JWT, so this policy
-- is the owner check.
create table public.publishes (
  id           bigint generated always as identity primary key,
  requested_at timestamptz not null default now(),
  requested_by uuid not null default auth.uid()
);
alter table public.publishes enable row level security;
grant select, insert, delete on table public.publishes to authenticated;
create policy "owner reads publishes" on public.publishes
  for select to authenticated using (public.is_owner());
create policy "owner adds publishes" on public.publishes
  for insert to authenticated with check (public.is_owner());
create policy "owner removes publishes" on public.publishes
  for delete to authenticated using (public.is_owner());
```
The AC1 test is a commented block at the end of the file, like `products-write.sql`.

**`supabase/functions/publish/index.ts`** (new; Deno; one file, no imports)
- Created in the dashboard: Edge Functions → "Deploy a new function" → "Via Editor", named
  `publish`, with this file's code pasted in. Later changes: edit, then "Deploy updates". "Verify
  JWT" stays on. If T3 shows it refuses the owner's valid token, turn it off and record that:
  the `publishes` insert is the real check.
- Secret `DEPLOY_HOOK_URL` (Edge Functions → Secrets): the Vercel deploy hook created in spec
  0012 T2. On a sold site it holds the Pages hook. Names cannot start with `SUPABASE_`.
- Reads `SUPABASE_URL` and `JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')).default`,
  both injected by Supabase. It never uses a secret or service-role key, and never trusts the
  caller's `apikey`.
- Every response carries the CORS headers `Access-Control-Allow-Origin: *`,
  `Access-Control-Allow-Headers: authorization, apikey, content-type, x-client-info`,
  `Access-Control-Allow-Methods: POST, OPTIONS`. `OPTIONS` → `204`. Any method other than
  `POST` → `405`.
- PostgREST calls send `apikey: <publishable>`, the caller's `Authorization` header unchanged,
  `Content-Type: application/json` and `Prefer: return=representation`.

| Step | Request | On failure |
|---|---|---|
| 1 | No `Authorization: Bearer …` header | `401` `{ "error": "signedOut" }` |
| 2 | `GET /rest/v1/publishes?select=requested_at&order=requested_at.desc&limit=1`. If a row is less than 60 s old | `429` `{ "error": "tooSoon" }` |
| 3 | `POST /rest/v1/publishes` with body `{}`, expects `201` and one row | `401` → `401` `signedOut`; `403` → `403` `{ "error": "forbidden" }`; other → `500` `{ "error": "unknown" }` |
| 4 | `POST DEPLOY_HOOK_URL`, no body; any 2xx is success | `DELETE /rest/v1/publishes?id=eq.<id>`, then `502` `{ "error": "hook" }` |
| 5 | — | `200` `{ "requested_at": <the row's requested_at> }` |

  A `401` from PostgREST (expired token) answers `401`, so `authFetch()` refreshes and retries
  once (spec 0014). Logs name the step and status, never a header, a token or the hook URL.
- `tsconfig.json` adds `"supabase/functions"` to `exclude`, because `astro check` cannot
  type-check Deno code.

**Build: the catalog stamp and `/build.json`**
- `src/lib/supabase.ts`: new `readCatalogChangedAt()`. It reads
  `GET /rest/v1/catalog_state?select=changed_at` through `readTable` (one row) and caches the
  promise like `readCategories()`. `readCategories()` and `readProducts()` await it **before**
  they fetch. So the stamp is never newer than the data in the build, and an edit made during a
  build shows as pending (AC7).
- `src/content.config.ts`: new collection `catalogState`. Its inline loader returns
  `[{ id: 'current', changedAt: <readCatalogChangedAt()> }]`, with schema
  `z.object({ changedAt: z.string().min(1) })`. The value is kept exactly as PostgREST returned
  it, because the admin compares strings.
- New endpoint `src/pages/build.json.ts`, prerendered (static output):
  `export const GET = (async () => Response.json({ builtAt: new Date().toISOString(),
  catalogChangedAt: (await getEntry('catalogState', 'current')).data.changedAt })) satisfies
  APIRoute;`. A missing entry throws, so the build fails. In `pnpm dev` it is answered per
  request, so local status always looks finished. Real status is checked on the live site.

**`src/lib/publish.ts`** (browser module, imported by the admin script; uses `authFetch()`)

| Function | Request | Result |
|---|---|---|
| `requestPublish()` | `POST /functions/v1/publish`, body `"{}"` | `requested_at` string; errors below |
| `lastPublish()` | `GET /rest/v1/publishes?select=requested_at&order=requested_at.desc&limit=1` | string or `null` |
| `catalogChangedAt()` | `GET /rest/v1/catalog_state?select=changed_at` | string |
| `readBuild()` | `fetch('/build.json', { cache: 'no-store' })`, same origin, no auth | `{ builtAt, catalogChangedAt }`; network failure → `AuthError('offline')`, any other failure → `PublishError('unknown')` |
| `publishState(build, changedAt, requestedAt)` | pure | `{ pending: changedAt !== build.catalogChangedAt, publishing: requestedAt !== null && Date.parse(requestedAt) > Date.parse(build.builtAt) }` |

- Errors: `PublishError { kind: 'tooSoon' | 'forbidden' | 'unknown' }`, from `429`, `403`, and
  anything else (`502`, `500`). `AuthError` from `authFetch()` passes through unchanged
  (`offline`, `rate`, `signedOut`).

**`src/pages/admin/index.astro`** (the one script; still no framework)
- **Publicar card**: an Admin card between the account card and "Productos": `h2` "Publicar",
  one `role="status"` line (Form messages notice classes, but `text-ink` instead of
  `text-sm text-muted`, because it is the card's main message), one `role="alert"` line, and the
  Primary button (form) "Publicar cambios" (`data-label`).
- **Status line**, one of:
  - "Comprobando…": while `readBuild()`, `catalogChangedAt()` and `lastPublish()` load
    (together, when the signed-in view opens);
  - "Publicando… La web se actualiza en unos minutos.": `publishing`;
  - "Hay cambios sin publicar.": `pending`, not publishing;
  - "La web está al día.": neither;
  - "Publicado. La web ya muestra los cambios.": shown once, when a watched publish ends,
    before the next state line.
- **Writes:** after any successful product save, stock change or delete (spec 0015), the line
  becomes "Hay cambios sin publicar." with no request, unless a publish is being watched.
- **Tap:** `whileBusy` on the button. `requestPublish()`, then watch.
- **Watch:** every 15 s `readBuild()` until `Date.parse(builtAt) > Date.parse(requested_at)`.
  Then reload `catalogChangedAt()` and show "Publicado…" followed by the state. The time limit
  is 10 minutes of watching, counted with `performance.now()` (never the phone's clock). After
  it, the alert shows the AC9 failure text and the status shows the state. A watch also starts
  when the view opens while `publishing` is true. Only one watch runs at a time, and it stops
  on sign-out. A failed poll (offline) is skipped silently and the next one tries again.
- **Messages:** `tooSoon` "Acabas de publicar. Espera un minuto y vuelve a intentarlo.";
  `forbidden` "Esta cuenta no puede publicar."; `unknown` "No se pudo publicar. Tus cambios
  siguen guardados. Inténtalo otra vez."; `offline`, `rate` and `signedOut` use spec 0014's
  messages, and `signedOut` shows sign-in. If loading the state fails, the alert shows that
  error's message, the status line is empty and the button stays usable.
- The button is always enabled, except while its own request runs. The server's 60 s gap
  handles repeats, and Vercel cancels an earlier queued build from the same hook.

**Weight:** the admin keeps spec 0014's limits (JS ≤ 15 KB gzipped). Public pages gain nothing.
`build.json` is not HTML, so `check-weight.mjs` ignores it.

**Security**
- The hook URL lives only in the function secret. The browser never sees it.
- The owner check is RLS (`is_owner()`) on the `publishes` insert, made with the caller's own
  JWT. A valid sign-in without the role gets `403`. The function never uses a key that bypasses
  RLS.
- `catalog_state` is public to read: it holds one timestamp. `publishes` is readable only by
  the owner.

**Docs to follow up:** AGENTS.md says "no server code". This feature adds one Edge Function, and
`/sync` records the exception after the build.

## Build plan
- [ ] **T1** (AC1) Write `supabase/publish.sql`. Guide the owner to run it. Run the AC1 checks:
  the commented SQL test, a dashboard edit that moves `changed_at`, and `curl` with only the
  publishable key.
- [x] **T2** (AC3, AC7) `readCatalogChangedAt()` read first, the `catalogState` collection,
  `src/pages/build.json.ts`, and the `tsconfig.json` exclude. Build, then check `build.json`
  against the SQL editor's `changed_at`.
- [ ] **T3** (AC2) Write `supabase/functions/publish/index.ts`. Guide the owner to create the
  function and the `DEPLOY_HOOK_URL` secret in the dashboard. Run the AC2 calls (the owner's
  token from Local Storage, never written to a file). Record here the deploy hook's real
  status code and whether "Verify JWT" accepts the owner's token.
- [x] **T4** (AC4, AC5, AC6, AC8, AC9) `src/lib/publish.ts` and the Publicar card in
  `src/pages/admin/index.astro`.
- [ ] **T5** (AC10) `pnpm typecheck`, `pnpm build`, `pnpm check:weight`. Then the flows on the
  live demo after a push, at 360 px. That includes the 10-minute failure run, with
  `WHATSAPP_NUMBER` restored afterwards.
- [x] **T6** Add the Publicar card to `design.md`. Update the `learning/code/` walkthroughs for
  every new or changed file.

## Out of scope
- Automatic publishing, scheduled publishing, and a history of past publishes in the UI.
- Exact build errors or logs in the admin (they need a host API token, see Rationale).
- Setting up the Cloudflare Pages hook of a sold site (the new-shop setup session, spec 0012).
- Photo upload (feature 14) and category editing (feature 15). Their changes are covered by the
  trigger once they write to `products` or `categories`.

## Sources
- `docs/scope/scope.md` → feature 13. Specs 0012 (publish path, secrets table), 0013, 0014,
  0015. `src/lib/supabase.ts`, `src/lib/auth.ts`, `src/content.config.ts`,
  `scripts/check-weight.mjs`, `tsconfig.json`, `node_modules/astro` types (`APIRoute`).
- Owner answers, 2026-10-28: show "Hay cambios sin publicar"; online research allowed.
- `researcher`, 2026-10-28, Supabase:
  - supabase.com/docs/guides/functions/quickstart-dashboard (editor deploy, "Deploy updates",
    no rollback);
  - /functions/secrets (dashboard secrets, `SUPABASE_` prefix reserved, injected
    `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEYS`);
  - /functions/auth (`verify_jwt` default on; new keys are not JWTs);
  - /functions/cors (allowed headers, CORS on errors too);
  - /functions/limits and /functions/pricing (150 s wall clock, 500k invocations a month);
  - /database/postgres/triggers;
  - /api/api-keys.
- `researcher`, 2026-10-28, hosts:
  - vercel.com/docs/deploy-hooks (POST; body `{job:{id,state,createdAt}}`; repeat triggers
    cancel earlier deployments from the same hook; 60 triggers an hour per project);
  - /docs/caching/cache-control-headers (`public, max-age=0, must-revalidate`) and
    /docs/caching/cdn-cache;
  - /docs/builds/managing-builds and /build-queues (Hobby: 1 concurrent build, queued);
  - developers.cloudflare.com/pages/configuration/deploy-hooks and /serving-pages (POST;
    `max-age=0, must-revalidate`) and /pages/platform/limits.
- Owner's run, 2026-10-28 (`/debug`): with the first `touch_catalog()`, a price saved from
  `/admin/` answered `400` `21000`, while the same kind of update in the SQL editor worked. The
  trigger's `update` had no `where`. Adding `where id = true` fixed it: the owner re-ran the
  function and saw the save work and `changed_at` move. The cause named, Supabase's
  `pg_safeupdate` on API requests, is from memory, not docs; the observed behavior matches it.
- **Not confirmed, tested by T3 and the ACs:**
  - the deploy hook's HTTP status (any 2xx is accepted);
  - whether "Verify JWT" accepts the owner's token under the new signing keys (T3 records it);
  - that a new deployment serves the new `/build.json` as soon as it is Ready (AC5 shows it);
  - Cloudflare Pages hook response and its behavior on repeat triggers (the sold-site setup
    session).

---
## Rationale
<!-- History, not build input. /develop does not read below this line. -->
**Options considered:**
- Owner check by an RLS insert with the caller's JWT, plain `fetch` (chosen). The runner-up was
  `withSupabase` from `npm:@supabase/server@1`, now the documented way: it verifies the JWT and
  handles CORS. It was not chosen for three reasons: it is a new library not confirmed in the
  dashboard editor; the project's rule is no Supabase SDK; and it would repeat the owner rule
  in TypeScript instead of reusing `is_owner()`. Decoding the JWT by hand was rejected,
  because it is unsafe without verifying the signature.
- Status from `/build.json` (chosen) vs the host's deployments API (runner-up). The API gives
  exact states and errors. But it needs a host API token: Vercel's has wide account access.
  It also needs two host-specific code paths, while spec 0012 keeps the code host-neutral.
- Stamp compared with `build.json` (chosen) vs `updated_at` columns on each table (misses
  deletes, and needs a column per table) vs a local "dirty" flag in the browser (wrong across
  devices and after reloads).
- Stamp read before the catalog (chosen) vs read in the endpoint at render time. That would
  call a catalog "up to date" when an edit landed during the build (AC7).
- Button always enabled, with a 60 s server gap (chosen), vs disabled while publishing. A fix
  made during a build must be publishable at once, and Vercel cancels the earlier queued build.
- 10-minute watch limit: Vercel's build time is not documented, and local builds take
  about 25 s. 10 minutes is long enough for slow builds and short enough to tell the owner.

**Assumptions and risks:**
- A failure is inferred from time, so a build that is merely very slow is reported as failed.
  The message tells the owner to publish again, which is harmless.
- `publishes` grows by one row per publish: negligible on the Free plan.
- A Supabase Free project pauses after 7 days idle (spec 0012). Publishing then fails with
  `unknown` until it is restored. The public site keeps working.

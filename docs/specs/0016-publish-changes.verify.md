# 0016 · Publish changes — manual check steps

Run from the project root. "Clean" means `pnpm typecheck` and `pnpm build` exit 0. `pnpm build`
reads `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from `.env` by itself; never open or print
`.env`. Keep passing the fake WhatsApp number inline: `WHATSAPP_NUMBER=5355555555 pnpm build`.

**Before any step:**
- `supabase/publish.sql` has run once in the Supabase SQL editor (after `products-write.sql`).
- The Edge Function `publish` exists (dashboard → Edge Functions → "Deploy a new function" →
  "Via Editor", name `publish`, the code of `supabase/functions/publish/index.ts` pasted in).
  On the demo, "Verify JWT" is off (see the spec's T3 result).
- The secret `DEPLOY_HOOK_URL` (Edge Functions → Secrets) holds the Vercel deploy hook
  `admin-publish` (spec 0012). Never paste the hook URL into a file, a commit or a chat.

**Places:**
- Local: `pnpm dev`, `http://localhost:4321/admin/`. In dev `/build.json` is answered per request,
  so the status always looks finished: real status is checked on the live site.
- Live: `https://tienda-demo-cuba.vercel.app/admin/` after the owner pushes `main` (git
  integration is off, so `/develop` does not push).

**Phone width:** DevTools device emulation at 360 px (headless windows cannot go that narrow).

**Variables in the `curl` commands:** `$URL` is the project URL and `$KEY` the publishable key,
both public by design: `grep -o 'data-supabase-[a-z]*="[^"]*"' dist/admin/index.html`. `$TOKEN`
is the owner's access token: signed in on `/admin/`, DevTools → Application → Local Storage →
`admin-session` → `access_token`. Type it only into the terminal, never into a file. It lasts
1 hour.

**Real deployments:** each successful publish starts a Vercel production build. Leave 60 s
between publishes.

- **AC1 (database):**
  - SQL editor: `select count(*) from catalog_state;` → `1`.
  - SQL editor: `select changed_at from catalog_state;`, then change a product's price in the
    admin (or the Table Editor), then the same select → a later time. Restore the price → later
    again. Repeat with an update on `categories` (e.g. set a category's `name` to itself) → later.
  - Publishable key only:
    - `curl -s "$URL/rest/v1/catalog_state?select=changed_at" -H "apikey: $KEY"` → one row.
    - `curl -s "$URL/rest/v1/publishes?select=*" -H "apikey: $KEY"` → `[]`.
    - `curl -s -o /dev/null -w "%{http_code}\n" -X POST "$URL/rest/v1/publishes" -H "apikey: $KEY" -H "Content-Type: application/json" -d '{}'`
      → `401`.
  - SQL editor: run the commented AC1 block of `supabase/publish.sql` → the insert fails with
    `42501`. With the owner's claims the insert works, then `rollback;`. Finally
    `select count(*) from publishes;` is unchanged.
- **AC2 (the function):** `F="$URL/functions/v1/publish"`.
  - `curl -s -o /dev/null -w "%{http_code}\n" -X OPTIONS "$F" -H "Origin: https://tienda-demo-cuba.vercel.app"`
    → `204`; with `-D -` the three `Access-Control-Allow-*` headers are there.
  - `curl -s -w "\n%{http_code}\n" -X POST "$F" -H "apikey: $KEY"` → `401` (from the gateway or
    `{"error":"signedOut"}`).
  - Non-owner: remove `role` from the owner's `app_metadata` as in spec 0014 AC4. The admin
    signs a user without the role out at once, so get the token from Auth directly:
    `POST $URL/auth/v1/token?grant_type=password` with `{"email","password"}` (from the DevTools
    console on `/admin/`, typed at a `prompt()`, never saved). Then
    `curl -s -w "\n%{http_code}\n" -X POST "$F" -H "apikey: $KEY" -H "Authorization: Bearer $TOKEN"`
    (or the same `fetch` in the console) → `403` `{"error":"forbidden"}`; Vercel → Deployments
    shows no new one. Restore the role with the commented `update` in `supabase/auth.sql` and
    sign in again.
  - Owner: the same `curl` with the owner's `$TOKEN` → `200` `{"requested_at":"…"}`;
    `select * from publishes order by id desc limit 1;` shows it; Vercel shows one new
    production deployment.
  - Within 60 s, the same `curl` again → `429` `{"error":"tooSoon"}`, and no new deployment.
  - Hook URL nowhere: `git grep -n "api.vercel.com/v1/integrations/deploy"` → nothing;
    `grep -rl "api.vercel.com" dist` → nothing; no response body above contains it.
  - Record in the spec's T3 note: the hook's status code (dashboard → Edge Functions → `publish`
    → Logs show no URL, so read it from a temporary `console.log` only if needed, then remove) and
    whether "Verify JWT" accepted the owner's token.
- **AC3 (build.json):** after a clean build, `cat dist/build.json` →
  `{"builtAt":"<ISO time>","catalogChangedAt":"<value>"}` with nothing else, and
  `catalogChangedAt` equals `select changed_at from catalog_state;` as PostgREST writes it
  (`curl -s "$URL/rest/v1/catalog_state?select=changed_at" -H "apikey: $KEY"`).
  `grep -rl "<script" dist --include=*.html | grep -v "dist/admin/"` → nothing.
  Failure: in the SQL editor `alter table public.catalog_state rename to catalog_state_x;`, build
  → fails with `Supabase: reading "catalog_state" failed with status 404.` (or similar naming
  `catalog_state`). Rename it back at once (`alter table public.catalog_state_x rename to catalog_state;`).
- **AC4 (card, 360 px, live):** signed in, the "Publicar" card sits between the account card and
  "Productos"; "Publicar cambios" is 44 px tall (DevTools → computed height). Change a price →
  "Hay cambios sin publicar." Tap a stock box → same. Delete a test product → same. When the live
  `/build.json` holds the database's stamp, reloading shows "La web está al día."
- **AC5 (publish, live):** with a pending change, tap "Publicar cambios" → the button reads
  "Publicar cambios…" and is disabled, then "Publicando… La web se actualiza en unos minutos."
  Without reloading, once Vercel's deployment is Ready (polls every 15 s) → "Publicado. La web ya
  muestra los cambios." then, 5 s later, "La web está al día." The product's public page shows
  the new value.
- **AC6 (reload, second device):** tap publish, reload `/admin/` while Vercel builds →
  "Comprobando…" then "Publicando…", and it finishes as in AC5. Repeat opening `/admin/` on a
  second device (or a private window, signed in) during a build.
- **AC7 (edit during a build):** tap publish, then change another price while the build runs.
  When it is live → "Publicado…" then "Hay cambios sin publicar." — never "La web está al día."
- **AC8 (one build for many edits):** five product edits, then one tap → Vercel shows exactly one
  new deployment.
- **AC9 (failures):**
  - DevTools → Network → Offline, tap → "Sin conexión. Revisa tus datos e inténtalo otra vez."
    and the status line does not change. Back online.
  - Tap, then tap again within 60 s → "Acabas de publicar. Espera un minuto y vuelve a
    intentarlo."
  - Vercel → Settings → Environment Variables: set `WHATSAPP_NUMBER` to `x` (Production). Make a
    change, tap publish → the deployment fails and the live site is unchanged. After 10 minutes
    → alert "La publicación no terminó. Tus cambios siguen guardados. Vuelve a publicar y, si
    vuelve a pasar, avisa a quien te hizo la web." and status "Hay cambios sin publicar."
    **Restore `WHATSAPP_NUMBER`** and publish again → finishes as in AC5.
  - Refused session: in another tab sign out (global), then tap publish here → the sign-in view
    with "Tu sesión terminó. Entra de nuevo."
- **AC10 (clean and light):** `pnpm typecheck`, `WHATSAPP_NUMBER=5355555555 pnpm build`,
  `pnpm check:weight` pass; the `/admin/` row shows JS ≤ 15 KB gzipped.
  `grep -rlE "<script|supabase.co|sb_publishable_" dist --include=*.html | grep -v "dist/admin/"`
  → nothing. `dist/build.json` holds only `builtAt` and `catalogChangedAt`.

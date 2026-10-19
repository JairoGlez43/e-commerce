# 0012 · Admin backend and publishing — manual check steps

Run from the project root. "Clean" means `pnpm typecheck` and `pnpm build` exit 0.
This feature changes no repo code; most checks happen in the Vercel and Supabase dashboards
and on a phone in Cuba. Never paste the deploy hook URL, the database password or the
Supabase secret key into a chat, a file in the repo or a log. The project URL and the
publishable key are public by design.

- **AC1 (deploy hook):** Vercel → demo project → Settings → Git → Deploy Hooks lists
  `admin-publish` on branch `main`. From your own terminal run
  `curl.exe -X POST "<hook URL from your password manager>"` → Deployments shows a new
  production deploy that ends **Ready**. Take the last 8 characters of your hook URL and
  search for them in your own terminal: `git grep -n "<those 8 characters>"` → no match. After
  `WHATSAPP_NUMBER=5355555555 pnpm build`, run `grep -rn "<those 8 characters>" dist/` → no match.
  Owner reported 2026-10-19: good build Ready.
- **AC2 (failed build keeps the live site):** Settings → Environment Variables → set
  `WHATSAPP_NUMBER` (Production) to `x`, fire the hook → the new deploy ends **Error**, and
  `https://tienda-demo-cuba.vercel.app` still shows the catalog. Restore the real number, fire
  the hook again → **Ready**. Owner reported 2026-10-19: Error as expected, live site
  unchanged, restored and Ready.
- **AC3 (Supabase project):** Supabase dashboard → project `tienda-demo-cuba` in the owner's
  existing organization: plan **Free**, region **East US (North Virginia)**. Table Editor
  shows no tables in the `public` schema. Owner reported 2026-10-19: created.
- **AC4 (reachable from Cuba):** open
  `https://<ref>.supabase.co/auth/v1/health?apikey=<publishable key>` in a normal browser
  first → JSON starting `{"version":"v2…","name":"GoTrue"`. Then, on a phone in Cuba on mobile
  data (wifi off): `https://tienda-demo-cuba.vercel.app` shows the catalog, and the health URL
  shows the same GoTrue JSON. A "can't reach site" or a timeout on either one is a fail, and
  the decision goes back to `/architect`. A JSON key error means Supabase was reached but the
  key was mistyped, so fix the key and retry. Owner reported 2026-10-19: both load.
- **AC5 (repo unchanged, still clean):** `git status` shows only docs changes for this
  feature. Run `pnpm typecheck`, then `WHATSAPP_NUMBER=5355555555 pnpm build` (26 pages), then
  `pnpm check:weight` → all exit 0 and every page is within budget. No `dist/**/*.html`
  contains `<script`. Measured 2026-10-17: clean, 26/26 within budget, 0 script tags.

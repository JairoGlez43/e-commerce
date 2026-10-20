# 0013 · Catalog data online — manual check steps

Run from the project root. "Clean" means `pnpm typecheck` and `pnpm build` exit 0.
`pnpm build` now reads `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from `.env` by itself;
never open or print `.env`. Keep passing the fake WhatsApp number inline:
`WHATSAPP_NUMBER=5355555555 pnpm build`. The project URL and publishable key are public by
design, so you may type them in your own terminal for the `curl` checks below, but never paste
the secret key anywhere. In the commands, `$URL` is the project URL (no `/rest/v1`, no trailing
slash) and `$KEY` the publishable key.

- **AC1 (tables, RLS, bucket, writes refused):** Supabase → Table Editor shows `categories`
  and `products` with the columns of the spec, each marked RLS enabled; Storage shows the
  public bucket `product-photos`. Writes with the public key:
  `curl -s -o /dev/null -w "%{http_code}" -X POST "$URL/rest/v1/categories" -H "apikey: $KEY" -H "Content-Type: application/json" -d '{"id":"prueba-rls","name":"Prueba","sort_order":99}'`
  → `401` (row-level security). `PATCH` and `DELETE` on
  `$URL/rest/v1/products?id=eq.arroz-blanco` with `-H "Prefer: return=representation"` →
  status 200 and body `[]` (no row matched any policy), and a `GET` afterwards still shows
  `arroz-blanco` at price 280. Measured 2026-10-20: POST 401, PATCH/DELETE 0 rows, row unchanged.
- **AC2 (seed equals the old JSON):** `curl "$URL/rest/v1/categories?select=*" -H "apikey: $KEY"`
  → 6 rows; `…/products?select=*` → 18 rows. Compare them with `supabase/seed.sql` (generated
  from the JSON at the last commit before feature 10: `git show <that commit>:src/data/products.json`).
  Each `"$URL/storage/v1/object/public/product-photos/<id>.jpg"` opens in a browser with no key.
  Measured 2026-10-20 by script against the JSON: 6/6 categories and 18/18 products equal in
  every field, 18/18 photos 200 without a key.
- **AC3 (build reads Supabase):** `src/data/` and `src/assets/products/` do not exist;
  `grep -rn "src/data\|assets/products" src` → nothing. Then
  `WHATSAPP_NUMBER=5355555555 pnpm build` → 26 pages; product `<img>` files in `dist/_astro/`
  are named after the product ids (downloaded from Storage). Measured 2026-10-20: clean.
- **AC4 (nothing changes for customers):** build the last commit before feature 10 in a
  separate folder (`git worktree add <temp folder> <that commit>`, `pnpm install`, build there)
  and build the current tree. For every `.html` in both `dist/` folders, compare the route list
  and the page text (tags stripped, image `alt`s kept, `<title>` and meta description
  included). Only difference allowed: "Actualizado el …" on `/` when the two builds ran on
  different days. Measured 2026-10-20: 26 routes, text identical.
- **AC5 (fails closed):** each line is one build; each must exit non-zero, print the message
  shown, and never print the key:
  - `SUPABASE_URL=https://abc.supabase.co/rest/v1/` → "SUPABASE_URL must be the project URL only…"
  - `SUPABASE_URL=` → same message
  - `SUPABASE_PUBLISHABLE_KEY=sb_secret_fake` → "…holds a secret key…"
  - `SUPABASE_PUBLISHABLE_KEY=nonsense` → "…must be the project publishable key…"
  - `SUPABASE_PUBLISHABLE_KEY=sb_publishable_wrong` → `Supabase: reading "…" failed with status 401.`
  - `SUPABASE_URL=https://unreachable.invalid` → `Supabase: could not reach the project…`
  - empty table: temporarily add `&id=eq.none` to the categories columns in
    `src/lib/supabase.ts` → `Supabase: "categories" returned no rows.`; restore the file.
  - unknown category: temporarily filter `'aseo'` out of the `categoryIds` set in
    `readProducts()` → `Supabase: product "jabon-de-bano" has unknown category id "aseo".`;
    restore the file.
  Prefix each with `WHATSAPP_NUMBER=5355555555` and run `pnpm build`. On Windows the exit code
  may be 127 after the libuv shutdown crash (Known pitfalls); any non-zero code passes.
  Measured 2026-10-20: all 8 non-zero with the expected message, no key in the output.
- **AC6 (Vercel keeps the last good deploy):** Vercel → demo project → Settings → Environment
  Variables: `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` exist for Production and Preview.
  Set `SUPABASE_PUBLISHABLE_KEY` (Production) to `sb_publishable_wrong` and redeploy → the
  deploy ends **Error**, its log shows `failed with status 401`, and
  `https://tienda-demo-cuba.vercel.app` still shows the catalog. Restore the real key and
  redeploy → **Ready**, and the live catalog matches AC4 (same products, prices, stock).
- **AC7 (visitors never call Supabase):** after a build, `grep -rl "supabase.co" dist`,
  `grep -rl "sb_publishable_" dist` and `grep -rl "<script" dist --include=*.html` → no
  files. `og:image` on a product page is `https://tienda-demo-cuba.vercel.app/_astro/<id>_….jpg`.
  `pnpm check:weight` → "All 26 pages within budget". In a browser, DevTools → Network on `/`
  and a product page: no request goes to `supabase.co`. Measured 2026-10-20: 0/0/0 files,
  26/26 within budget (max thumbnail 22.8/25 KB, max detail 50.0/80 KB).
- **AC8 (clean, documented):** `pnpm typecheck` → 0 errors; `pnpm build` → exit 0;
  `.env.example` lists both vars with fake values; `src/env.d.ts` types both; Vercel has both
  (AC6). Measured 2026-10-20: typecheck 0 errors / 0 warnings, build 26 pages.

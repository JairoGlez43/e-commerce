# 0008 · Demo online — manual check steps

Local steps run from the project root in Git Bash with a fake number:
`WHATSAPP_NUMBER=5355555555 pnpm build`. Live steps hit `https://tienda-demo-cuba.vercel.app`
(going online: ask the owner first) and need the owner's latest push to be deployed.

- **AC1 (site set, no localhost):** `grep -n "site:" astro.config.mjs` shows
  `https://tienda-demo-cuba.vercel.app`. After the build, `grep -rl localhost dist --include=*.html`
  prints nothing; in `dist/producto/arroz-blanco/index.html`, `og:url` and `og:image` start with
  `https://tienda-demo-cuba.vercel.app/`, and the decoded `wa.me` message ends with
  `https://tienda-demo-cuba.vercel.app/producto/arroz-blanco/`. Measured 2026-10-10: 26 pages,
  0 with localhost, all 18 WhatsApp messages end with their live product URL.
- **AC2 (noindex switch):** `grep -rL '<meta name="robots" content="noindex">' dist --include=*.html`
  prints nothing (all 26 pages have it). No `public/robots.txt`. Measured 2026-10-10: with
  `indexable: true` in `src/lib/site.ts`, only `dist/estilo/index.html` kept the tag; restored to
  `false`.
- **AC3 (live site serves the build):** `curl -s -o /dev/null -w "%{http_code}\n"` on
  `https://tienda-demo-cuba.vercel.app/`, `/categoria/carnicos/`, `/producto/arroz-blanco/` → 200;
  `/producto/no-existe/` → 404. In the live product HTML, `og:url` is
  `https://tienda-demo-cuba.vercel.app/producto/arroz-blanco/` and the `og:image` URL returns 200
  with `content-type: image/jpeg`. The live HTML contains the `noindex` tag (proves the new build
  is deployed).
- **AC4 (live weight):** for the same three pages, request with
  `curl -s -H "Accept-Encoding: br, gzip" -D - -o page.bin <url>` and add the size of the HTML and
  its CSS file as transferred; total ≤ 50 KB. No `<script>`. Open the page in Chrome DevTools →
  Network: every request goes to `tienda-demo-cuba.vercel.app`.
- **AC5 (phone on mobile data):** owner. Turn Wi-Fi off, open
  `https://tienda-demo-cuba.vercel.app`, tap a category chip, open a product, tap the WhatsApp
  button: the chat opens with your number and the message ends with the product's
  `https://tienda-demo-cuba.vercel.app/producto/…` link. Don't send it if you don't want to.
- **AC6 (WhatsApp preview):** owner. In any chat (e.g. with yourself), paste the link of a product
  you have never shared, e.g. `https://tienda-demo-cuba.vercel.app/producto/queso-gouda/`, and wait
  a few seconds: the preview shows the photo, "Queso gouda · Tienda de alimentos (demo)" and
  "1500 CUP · 1 lb · Disponible. …".

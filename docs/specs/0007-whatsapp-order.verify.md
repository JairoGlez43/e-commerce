# 0007 · Order contact (WhatsApp) — manual check steps

Run from the project root in Git Bash. Builds for checking use a **fake** number inline, so
nobody has to open `.env`: `WHATSAPP_NUMBER=5355555555 pnpm build`. The inline value wins over
`.env` (Astro docs, environment variables guide).

- **AC1 (button):** `WHATSAPP_NUMBER=5355555555 pnpm build && pnpm preview`, open
  `/producto/arroz-blanco`: a red, rounded button "Pedir por WhatsApp" right under the green
  "Disponible" badge. Open `/producto/salchichas`: "Preguntar por WhatsApp". In DevTools at 360 px
  the button spans the full width; from 768 px it is only as wide as its text. Inspect it: ≥ 44 px
  tall.
- **AC2 (link shape):** view source of `/producto/arroz-blanco`: the button's `href` starts with
  `https://wa.me/5355555555?text=`.
- **AC3 (message):** decode the `href`, e.g. in the browser console:
  `decodeURIComponent(document.querySelector('a[href^="https://wa.me"]').search.slice(6))`.
  Arroz blanco → `Hola, quiero pedir: Arroz blanco (1 lb) – 280 CUP.` + line break +
  `…/producto/arroz-blanco/`. Salchichas → `Hola, ¿cuándo vuelve a haber Salchichas (Paquete 10 u)?`
  + line break + `…/producto/salchichas/`. Measured 2026-10-07: both match exactly; all 18 product
  pages have exactly one `wa.me` link.
- **AC4 (number only in the environment):** `git check-ignore -v .env` prints the `.gitignore` rule.
  `.env.example` contains only the fake `5350000000`. Search the repo for your real number (e.g.
  VS Code search): no results outside `.env`.
- **AC5 (build fails without a valid number):** `env -u WHATSAPP_NUMBER pnpm build` (with no `.env`,
  or temporarily rename it) and `WHATSAPP_NUMBER='+53 5555-5555' pnpm build`: both exit non-zero
  and print `WHATSAPP_NUMBER must be set to 8–15 digits (international format, no +). See
  .env.example.` Observed 2026-10-07 on Windows: after the error, Node also prints
  `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` while shutting down; the exit code is
  still non-zero. Rebuild with the fake number afterwards.
- **AC6 (real phone):** owner only. With your real number in `.env`, `pnpm build && pnpm preview
  --host`, open the printed network URL on your phone (same Wi-Fi), open a product, tap the
  button: WhatsApp opens a chat with your number and the AC3 message already typed. (Until
  feature 08 the link inside the message points to localhost.)
- **AC7 (still light):** view source: no `<script>`. DevTools → Network on a product page: no
  request to `wa.me` or any other domain until you tap the button. HTML + CSS ≤ 50 KB gzipped.

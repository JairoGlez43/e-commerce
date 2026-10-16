# 0010 · Shop information — manual check steps

Run from the project root in Git Bash. Build with a **fake** number inline so nobody opens
`.env`: `WHATSAPP_NUMBER=5355555555 pnpm build`, then `pnpm preview` and use the port it prints
(another preview may already hold 4321; see AGENTS.md pitfalls).

**Viewport tip:** headless Edge/Chrome windows have a minimum width above 360 px, so a
`--window-size=360,…` screenshot is cropped, not narrow. Use DevTools device mode at 360 px, or
load the page inside a 360 px wide `<iframe>`.

- **AC1 (one home for shop info):** open `src/lib/site.ts`: `location`, `hours`, `payments`,
  `pickup`, `delivery`, `howToBuy`, `faq`. Search `src/` for `La Lisa` and `Transfermóvil`:
  only `src/lib/site.ts`. Observed 2026-10-16: only `site.ts`.
- **AC2 (top of home):** on `/`, under "Productos": `Actualizado el <day> de <month>` and
  `Aceptamos: Efectivo (CUP) · Transfermóvil · EnZona · USD en efectivo`, both above the
  category chips. The day is today **in Havana**: build after 8 p.m. Cuba time (UTC−4 in
  October) and it must still show Havana's date. Observed 2026-10-16 01:08 UTC (21:08 Oct 15 in
  Havana, machine zone Europe/Madrid): `Actualizado el 15 de octubre` — correct.
- **AC3 (header link):** on `/`, `/categoria/aseo/` and `/producto/huevos/`, the header shows
  "Escríbenos" as a rounded outlined pill. Decode its `href` in the console:
  `new URL(document.querySelector('header a[href^="https://wa.me"]').href).searchParams.get('text')`
  → `Hola, tengo una pregunta sobre la tienda.`; the path is `/5355555555`. At 360 px it sits
  on a second row under the shop name, no horizontal scroll; inspect: ≥ 44 px tall.
  Observed 2026-10-16: text and number match; wraps at 360 px; one row at 1280 px.
- **AC4 (how to buy, pickup, hours):** at the end of `/`, after "Aseo": `h2` "Cómo comprar",
  3 numbered steps in red circles; then two white blocks "Recogida y entrega" (pickup sentence,
  "Por ahora no hacemos entregas a domicilio.") and "Horario y ubicación" (two hours lines,
  "La Lisa, La Habana"). Stacked at 360 px, side by side from 640 px.
- **AC5 (FAQ):** `h2` "Preguntas frecuentes" with 5 closed questions, each with a ▶ triangle.
  Tap one: its answer opens; tap again: it closes. View source: no `<script>`. Each question
  row ≥ 44 px tall. Observed 2026-10-16: 5 `<details>`, triangles visible at 360 px.
- **AC6 (footer):** `/`, `/categoria/aseo/`, `/producto/huevos/` end with a white footer: shop
  name, "La Lisa, La Habana", two hours lines, "Escríbenos por WhatsApp" (same decoded text as
  AC3). No developer name anywhere on the page.
- **AC7 (weight, no JS):** `pnpm check:weight` → "All 26 pages within budget". Search `dist/`
  for `<script`: no results. Observed 2026-10-16: all pages ok, `/` HTML+CSS 7.7 KB gz; 0
  `<script>` on the three pages checked.
- **AC8 (tokens and docs):** the new components use only token classes (no hex, no `style=`).
  `design.md` → Components lists Contact link, ShopInfo, Info block, Faq, SiteFooter; `/estilo`
  shows the contact link, ShopInfo, Faq and the footer; `learning/code/` has walkthroughs for
  `date.ts`, `ShopInfo`, `Faq`, `SiteFooter` and updated ones for every changed file.

**Before a pitch:** the date is the build date. Redeploy the demo in Vercel shortly before
showing it, or it shows an old "Actualizado el …".

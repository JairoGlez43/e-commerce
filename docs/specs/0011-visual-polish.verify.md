# 0011 · Visual polish — manual check steps

Run from the project root in Git Bash: `WHATSAPP_NUMBER=5355555555 pnpm build`, then
`pnpm preview` and use the URL it prints (it may listen on `localhost` only, not `127.0.0.1`).
Check 360 px with DevTools device mode or `Emulation.setDeviceMetricsOverride`, never a headless
`--window-size` (AGENTS.md pitfalls).

- **AC1 (official files):** `src/assets/icons/` has `Digital_Glyph_Green_RGB_2026.svg`,
  `Digital_Glyph_White_RGB_2026.svg` and `SOURCE.md`. With the brand ZIP unzipped, `cmp` each
  file against `01_Glyph/01_Digital RGB/03_SVG/` in the kit: no output. Observed 2026-10-16:
  both identical (1181 and 1168 bytes).
- **AC2 (icon on WhatsApp links):** on `/`, `/categoria/aseo/`, `/producto/huevos/`: header
  "Escríbenos" shows a green glyph before the word; the footer link too; the product button
  "Pedir por WhatsApp" shows a white glyph on terracotta. Inspect one: `<img … width="20"
  height="20" alt="" class="size-5 shrink-0">`. In DevTools → Accessibility, each link's name is
  only its text ("Escríbenos", "Pedir por WhatsApp", "Escríbenos por WhatsApp"). Links still
  ≥ 44 px tall, `href` unchanged, no `target`. Observed 2026-10-16: 2 glyph `<img>` on `/` and on
  a category page, 3 on a product page; screenshots at 360 px show green / white / green.
- **AC3 (info band):** on `/`, after "Aseo": a red-and-cream awning stripe across the full width,
  then a light peach band to both screen edges holding "Cómo comprar", the two white blocks and
  "Preguntas frecuentes", aligned with the catalog above. At 360 px: no horizontal scroll. The
  catalog stays on cream.
- **AC4 (dark footer):** every page ends with a dark brown footer, cream text, the WhatsApp link
  underlined. On `/` the footer starts right where the band ends (no cream strip between). Press
  Tab until the footer link: its focus ring is cream, not red. On category and product pages
  there is space (48 px) between the content and the footer.
- **AC5 (contrast):** `design.md` → "Contrast added by spec 0011" lists ink / muted / accent on
  awning (12.55 / 5.20 / 4.82) and cream on ink (14.60), all ≥ 4.5.
- **AC6 (weight, no JS, tokens):** `pnpm check:weight` → "All 26 pages within budget"; `/` HTML+CSS
  ≤ 10.7 KB (observed 7.9). Search `dist/` for `<script`: none. Search `src/**/*.astro` for `#` hex
  colors: none.
- **AC7 (docs):** spec 0010 Faq line says `min-h-11 cursor-pointer px-4 py-3 font-medium`; specs
  0007 and 0010 have an "Amended by: 0011" line; `design.md` lists WhatsAppIcon, Info band and the
  updated Contact link, SiteFooter and order button; `/estilo` shows the icon on its contact
  sample and the band; `learning/code/` has `WhatsAppIcon.astro.md` and updated walkthroughs.
- **AC8 (no inline SVG):** `ls dist/_astro/*Glyph*` → one green and one white file; `cmp` each with
  its source: identical. In `dist/index.html` and `dist/producto/huevos/index.html`: 0 `<svg`,
  0 `Layer_1`; the single `<style>` is the Fraunces `@font-face` from the Fonts API, not the icon.
  Observed 2026-10-16: all as described.

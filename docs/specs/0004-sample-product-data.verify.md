# 0004 · Sample product data — manual check steps

Run from the project root. "Clean" means `pnpm typecheck` and `pnpm build` exit 0.

- **AC1 (schema rules):** in `src/data/products.json`, change `arroz-blanco`'s
  `"price": 280,` to `"price": "280",` (keep the JSON valid: `leche-en-polvo` costs 2800, so a
  loose find-and-replace on `280` breaks it), run `pnpm build` → it exits non-zero with
  `InvalidContentEntryDataError` naming `price`. Repeat with `280.5`, `0`, `"description": ""`.
  Restore the file; build is clean.
- **AC2 (category check):** change one product's `"category"` to `"no-existe"`, run
  `pnpm build` → it exits non-zero with `InvalidContentEntryDataError` and
  `category: unknown category id`. Restore the file.
- **Not an AC, observed 2026-10-06:** if `products.json` is not valid JSON, Astro logs
  `[ERROR] [file-loader]`, warns the collection is empty, and the build still exits 0.
- **AC3 (data set):** open `src/data/products.json` and `src/data/categories.json`: 18 products,
  6 categories, 3 products per category, exactly 2 with `"inStock": false`
  (`salchichas`, `leche-en-polvo`), in different categories.
- **AC4 (ids and photos):** every `id` is lowercase kebab-case with no accents, no id repeats,
  and every product's `photo` is `../assets/products/<its id>.jpg` and that file exists.
  Change one id to `Arroz_Blanco` → `pnpm build` fails; restore.
- **AC5 (price format):** run
  `node --experimental-strip-types -e "import('./src/lib/price.ts').then(m=>console.log(m.formatPrice(850),'|',m.formatPrice(12500)))"`
  → prints `850 CUP | 12.500 CUP`.
- **AC6 (photo size and weight):** each file in `src/assets/products/*.jpg` is square, at least
  800×800. Encoding each one as WebP at 400 px wide gives ≤ 25 KB and at 800 px ≤ 80 KB
  (measured 2026-10-06 with sharp defaults: max 22.8 KB and 58.5 KB). Pages that render the
  photos (features 05 and 06) re-check this in their own built output.
- **AC7 (credits, placeholder gone):** `src/assets/products/CREDITS.md` has one row per product
  id (18) with author, license and source URL; open two or three source URLs to spot-check.
  `src/assets/products/sample.jpg` does not exist and no entry `producto-de-muestra` remains.

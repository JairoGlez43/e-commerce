# 0004 · Sample product data

**Status:** Accepted
**Date:** 2026-10-05
**Scope:** `docs/scope/scope.md` → feature 04
**Supersedes:** —

## Context
Spec 0001 fixed *where* product data lives (content collection `products`, `file()` loader,
`src/data/products.json`) but left the product fields to this feature. The catalog (05) and
product detail (06) pages need a stable product shape and a realistic data set to build
against, and the shape chosen here is what real, owner-editable data must match later.

## Decision
- **Products are invented but realistic** for a Cuban local food shop (owner's choice): 18
  products in 6 categories, Spanish names, mostly food plus one cleaning category.
- **Prices are CUP only** (owner's choice): one positive integer per product, no decimals.
- **Product shape:** `id`, `name`, `category`, `price`, `unit`, `inStock`, `description`,
  `photo` — all required, nothing optional.
- **Categories are their own collection** (`categories`, `file()` loader on
  `src/data/categories.json`) with `id`, `name`, `order`; a product points to one category
  via `reference('categories')`.
- **Unknown categories fail schema validation** (updated 2026-10-06): `reference()` alone
  only logs an error and the build exits 0, so the `category` field first checks the id
  against the ids in `src/data/categories.json`, then pipes into `reference('categories')`.
- **Availability is a boolean** (`inStock`): in stock or out of stock, no quantities.
- **Photos** are free-license stock photos (Pexels or Unsplash), one per product, square.

## Acceptance criteria
- **AC1:** `src/content.config.ts` defines `products` with exactly the fields in the Design
  table; the build fails if an entry misses a field or breaks a rule (e.g. `price` as a
  string, a decimal or ≤ 0; empty `description` or one over 300 characters).
- **AC2:** `src/content.config.ts` defines `categories` from `src/data/categories.json`;
  every product's `category` resolves to an existing category, and an unknown category id
  makes `pnpm build` exit non-zero with a schema error naming `category`.
- **AC3:** The data set has the 18 products and 6 categories listed below (3 products per
  category), with exactly 2 products `inStock: false`, in different categories.
- **AC4:** Every product and category `id` is unique, lowercase ASCII kebab-case
  (`^[a-z0-9]+(-[a-z0-9]+)*$`), and each product's photo is
  `src/assets/products/<id>.jpg`.
- **AC5:** `formatPrice()` in `src/lib/price.ts` returns the price grouped with Spanish
  separators and the suffix ` CUP`: `850` → `"850 CUP"`, `12500` → `"12.500 CUP"`.
- **AC6:** Every source photo is a square JPG of at least 800×800 px; rendered through
  `astro:assets` as WebP, the 400 px-wide version is ≤ 25 KB and the 800 px-wide version
  is ≤ 80 KB (spec 0001 budget).
- **AC7:** `src/assets/products/CREDITS.md` lists, for every photo, the product id, the
  source page URL, the author and the license. The placeholder entry and `sample.jpg` are
  gone.

## Design

**Product fields** (`src/content.config.ts`, zod from `astro/zod`):

| Field | Type / rule | Meaning |
|---|---|---|
| `id` | string, kebab-case, unique (from the JSON entry; the `file()` loader uses it as entry id) | Slug, used in the URL `/producto/<id>` (spec 0001) |
| `name` | `z.string().min(1).max(60)` | Spanish product name as shown to customers |
| `category` | known category id, piped into `reference('categories')` (see Category check) | The one category it belongs to |
| `price` | `z.number().int().positive()` | Price in CUP for one `unit` |
| `unit` | `z.string().min(1).max(30)` | What the price buys, e.g. `"1 lb"`, `"1 L"`, `"Caja 10 lb"`, `"Unidad"` |
| `inStock` | `z.boolean()` | `true` in stock, `false` out of stock |
| `description` | `z.string().min(1).max(300)` | 1–3 plain-text sentences of details (no HTML/Markdown) |
| `photo` | `image()` | Relative path to `../assets/products/<id>.jpg` |

Alt text for every photo is the product `name` (no separate field).

**Category fields** (`src/data/categories.json`, same `file()` loader pattern):

| Field | Type / rule | Meaning |
|---|---|---|
| `id` | string, kebab-case, unique | Slug, usable later as a filter key (feature 05 decides) |
| `name` | `z.string().min(1).max(30)` | Spanish label shown to customers |
| `order` | `z.number().int().nonnegative()` | Display order, ascending |

**Category check** (`src/content.config.ts`). Measured on Astro 7.3.5 (2026-10-05): an
unknown id in a `reference()` field logs `[ERROR] Invalid content reference …` but
`pnpm build` exits 0, while a zod schema error (`InvalidContentEntryDataError`) exits
non-zero. So the check must happen inside the schema:
```ts
import categoryData from './data/categories.json';
const categoryIds = categoryData.map((category) => category.id);
// in the products schema:
category: z
	.string()
	.refine((id) => categoryIds.includes(id), { message: 'unknown category id' })
	.pipe(reference('categories')),
```
- `categories.json` stays the single list of categories; the schema reads it, never a
  copy of the ids in code.
- `entry.data.category` keeps the `reference()` shape `{ collection, id }`, so pages
  resolve it with `getEntry(product.data.category)`.
- **Fallback, if `.pipe(reference(...))` does not typecheck or does not resolve to
  `{ collection, id }`:** use `category: z.enum(categoryIds as [string, ...string[]])`
  (same ids, same file). `entry.data.category` is then the plain id string and pages
  resolve it with `getEntry('categories', product.data.category)`. `/develop` records which
  form shipped in the build plan line of T2.

**Data set.** Prices are illustrative (plausible CUP values, from memory, not market
research); the owner may adjust any value before `/develop` writes the JSON.

| order | Category id · name | Products (id · name · unit · price CUP · inStock) |
|---|---|---|
| 1 | `granos-y-pastas` · Granos y pastas | `arroz-blanco` · Arroz blanco · 1 lb · 280 · ✓ / `frijoles-negros` · Frijoles negros · 1 lb · 380 · ✓ / `espaguetis` · Espaguetis · Paquete 500 g · 320 · ✓ |
| 2 | `carnicos` · Cárnicos | `muslos-de-pollo` · Muslos de pollo · Caja 10 lb · 3400 · ✓ / `picadillo-de-res` · Picadillo de res · 1 lb · 450 · ✓ / `salchichas` · Salchichas · Paquete 10 u · 650 · ✗ |
| 3 | `despensa` · Despensa | `aceite-de-girasol` · Aceite de girasol · 1 L · 950 · ✓ / `azucar-blanca` · Azúcar blanca · 1 lb · 250 · ✓ / `pure-de-tomate` · Puré de tomate · Lata 400 g · 300 · ✓ |
| 4 | `lacteos-y-huevos` · Lácteos y huevos | `huevos` · Huevos · Cartón 30 u · 3000 · ✓ / `leche-en-polvo` · Leche en polvo · Bolsa 1 kg · 2800 · ✗ / `queso-gouda` · Queso gouda · 1 lb · 1500 · ✓ |
| 5 | `bebidas` · Bebidas | `refresco-de-cola` · Refresco de cola · Lata 355 ml · 200 · ✓ / `cerveza-clara` · Cerveza clara · Lata 355 ml · 240 · ✓ / `malta` · Malta · Lata 355 ml · 220 · ✓ |
| 6 | `aseo` · Aseo | `jabon-de-bano` · Jabón de baño · Unidad · 180 · ✓ / `detergente-en-polvo` · Detergente en polvo · Bolsa 1 kg · 900 · ✓ / `papel-higienico` · Papel higiénico · Paquete 4 u · 600 · ✓ |

Descriptions: `/develop` writes one to three short, factual Spanish sentences per product
(what it is, size/presentation, a usage or storage note). No health or origin claims.

**Price display** (`src/lib/price.ts`, the one place the currency appears in code):
`formatPrice(price: number): string` → `new Intl.NumberFormat('es-ES').format(price) + ' CUP'`.
Feature 05 and 06 render prices only through this helper. `/develop` confirms the AC5
outputs with Node's ICU before relying on them.

**Photos:**
- Source: Pexels or Unsplash, picked to match the product and the shop's everyday feel
  (plain background, product clearly visible). One photo per product, no reuse.
- Searching and downloading is going online: `/develop` asks the owner first and has the
  `researcher` subagent confirm each site's current license terms (from memory: free use,
  attribution not required). Credits are recorded anyway (AC7) for portfolio honesty.
- Preparation: center-crop to 1:1, resize to 800–1200 px, save as JPG (quality ~80) at
  `src/assets/products/<id>.jpg`, done locally with the `sharp` that Astro already installs.
  `astro:assets` makes the WebP versions at build (spec 0001).

**Replaces the placeholder** from spec 0001 T3/T4: the placeholder entry, the placeholder
schema and `src/assets/products/sample.jpg`. `src/pages/index.astro` already maps over the
whole collection, so it keeps building unchanged.

**Security:** static data only; no secrets, no user input.

## Build plan
- [x] **T1** (AC2, AC4) Create `src/data/categories.json` with the 6 categories and add the
  `categories` collection to `src/content.config.ts`.
- [x] **T2** (AC1, AC2) Replace the placeholder `products` schema with the Design table;
  add the Category check (refine + `reference()`, or the documented `z.enum` fallback).
  Shipped: refine + `reference()` (2026-10-06).
- [x] **T3** (AC5) Write `src/lib/price.ts` with `formatPrice()` and confirm its outputs.
- [x] **T4** (AC6, AC7) After the owner approves going online, find, license-check, crop and
  save the 18 photos; write `src/assets/products/CREDITS.md`; delete `sample.jpg`.
- [x] **T5** (AC1, AC3, AC4) Write `src/data/products.json` with the 18 products from the
  data set table and their descriptions; remove the placeholder entry.
- [x] **T6** (AC1, AC2, AC6) Run `pnpm typecheck` and `pnpm build`; confirm a broken entry
  (string price, unknown category) fails the build, then restore it; check the WebP sizes.

## Out of scope
- How the catalog sorts, filters or shows out-of-stock products (feature 05).
- Product page layout and URL handling (feature 06); the WhatsApp message (feature 07).
- USD or other currencies, stock quantities, discounts, multiple photos per product.
- Real owner-editable data and its backend (a future spec; it must keep this shape).

## Sources
- `docs/specs/0001-stack.md` (collection setup, `file()` loader, `image()`, weight budget)
- `docs/brief.md`, `docs/scope/scope.md` → feature 04
- Owner answers, 2026-10-05: invented realistic products with free stock photos; CUP only.
- Astro `reference()` and `file()` loader (researcher, 2026-10-05):
  https://docs.astro.build/en/guides/content-collections/ ,
  https://docs.astro.build/en/reference/modules/astro-content/ ,
  https://github.com/withastro/astro/blob/main/packages/astro/src/content/loaders/file.ts
  (the `id` reaches the schema), https://github.com/withastro/astro/issues/12680.
- Empirical test on Astro 7.3.5, 2026-10-05 (`/develop`): unknown `reference()` id → logged
  error, exit 0; string price and malformed id → schema error, non-zero exit.
- Pexels / Unsplash license terms (researcher, 2026-10-05): https://www.pexels.com/license/ ,
  https://unsplash.com/license — free commercial use, attribution not required.
- CUP prices: illustrative, from memory; not market data.

---
## Rationale
<!-- History, not build input. /develop does not read below this line. -->
**Options considered:**
- Categories as a separate collection with `reference()` (chosen) vs a `z.enum` of category
  ids plus a label map in code (runner-up: one file less). The collection keeps names and
  order in data, not code, and maps 1:1 to a `categories` table when real data arrives.
- Making an unknown category fail the build (2026-10-06): refine against the ids in
  `categories.json` piped into `reference()` (chosen: fails in schema validation, which is
  proven to exit non-zero, and keeps the `reference()` shape for `getEntry`) vs replacing
  `reference()` with `z.enum` of the same ids (runner-up and fallback: certain to work,
  but drops the reference shape). Rejected: throwing in the pages' `getStaticPaths` (the
  check would live in features 05/06 and only run for rendered pages), a separate
  `check:data` script (one more step that can be skipped), and accepting the logged error
  (an error that does not stop the build gets missed).
- `inStock` boolean (chosen) vs a three-state `available | low | out` (runner-up: "pocas
  unidades" nudges buyers). The owner will update stock by hand; fewer states go stale less.
- Price as an integer in CUP with the currency only in `formatPrice()` (chosen) vs a
  `priceCup` field (runner-up: explicit if USD is ever added). With one currency, `price`
  stays simpler; adding a currency later is a new decision anyway.
- Square photos (chosen) vs 4:3 (runner-up: matches common camera output). Square is the
  usual e-commerce grid shape and keeps cards aligned whatever the product.
- Real shop products (not chosen by the owner) would convince more, but depend on the
  shop owner's posts and permission.

**Assumptions and risks:**
- When data moves to a backend, `photo` will become a remote URL, so `image()` and the
  image pipeline change; a future spec handles that, the other fields carry over unchanged.
- Stock photos may look foreign to Cuban buyers (brands, packaging). Mitigation: prefer
  generic, unbranded shots.
- The category check reads `src/data/categories.json` directly. When categories move to a
  backend, the future spec must keep an equivalent check (e.g. its loader rejects unknown
  ids), since the JSON import goes away.
- `es-ES` grouping (`12.500`) is assumed to read naturally in Cuba; easy to change in one
  helper if not.

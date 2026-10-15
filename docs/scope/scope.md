# Scope — Local food shop (demo)

**Delivery style:** facade
**Workflow depth:** alpha
**Updated:** 2026-10-02

## At a glance
| #  | Feature                          | Status            | Depth   | Spec |
|----|----------------------------------|-------------------|---------|------|
| 01 | Stack and architecture           | done              | default | docs/specs/0001-stack.md |
| 02 | Project scaffold                 | done              | default | docs/specs/0001-stack.md |
| 03 | Visual reference and design base | done              | default | docs/specs/0002-design-base.md |
| 04 | Sample product data              | done              | default | docs/specs/0004-sample-product-data.md |
| 05 | Catalog page                     | in-progress       | default | docs/specs/0005-catalog-page.md |
| 06 | Product detail page              | in-progress       | default | docs/specs/0006-product-detail-page.md |
| 07 | Order contact (WhatsApp)         | done              | default | docs/specs/0007-whatsapp-order.md |
| 08 | Demo online                      | done              | default | docs/specs/0008-demo-online.md |

Status values: `planned` · `needs-a-decision` · `in-progress` · `done`

Later, only if the owner buys the site (not planned yet): real product data the owner can
update (stock and prices), cart or delivery flow if they offer delivery.

---

## 01 · Stack and architecture
**Status:** done
**Spec:** docs/specs/0001-stack.md, docs/specs/0009-site-identity.md
**Code:** src/layouts/BaseLayout.astro, src/styles/global.css, src/content.config.ts, src/data/products.json, src/assets/products/, astro.config.mjs, public/og-default.png, src/lib/site.ts, scripts/check-weight.mjs
**Depth:** default
**Done when:**
- A stack spec records the framework, data approach, hosting and a weight budget for pages.
- The choice keeps pages very light for slow, unreliable connections in Cuba.
- The choice allows wiring real, owner-editable data later without a rewrite.
**Tasks:**
- [ ] Decide it — /architect
- [x] Build it — /develop
- [x] Verify it — /check verify
**Notes:** —

## 02 · Project scaffold
**Status:** done
**Spec:** docs/specs/0001-stack.md
**Code:** package.json, pnpm-workspace.yaml, astro.config.mjs, tsconfig.json, src/pages/index.astro
**Depth:** default
**Done when:**
- The project starts locally with one command and shows a placeholder page.
- A production build runs without errors.
**Tasks:**
- [x] Build it — /develop scaffold
- [x] Verify it — /check verify
**Notes:** Built from the stack spec (feature 01).

## 03 · Visual reference and design base
**Status:** done
**Spec:** docs/specs/0002-design-base.md
**Code:** src/styles/global.css, astro.config.mjs, src/layouts/BaseLayout.astro, src/assets/fonts/, src/pages/estilo.astro, design.md
**Depth:** default
**Done when:**
- A well-known, good-looking shop is chosen as the visual reference, and why is recorded.
- Colors, typography and spacing are defined once and reused by every page.
- The design base adds almost no page weight (no heavy fonts or libraries).
**Tasks:**
- [x] Decide it — /architect
- [x] Build it — /develop
- [x] Verify it — /check verify
**Notes:** Researching reference sites needs going online; ask before doing it.

## 04 · Sample product data
**Status:** done
**Spec:** docs/specs/0004-sample-product-data.md
**Code:** src/content.config.ts, src/data/categories.json, src/data/products.json, src/lib/price.ts, src/assets/products/
**Depth:** default
**Done when:**
- The demo has realistic sample products (mostly food) grouped in categories.
- Each product has a name, photo, price, availability and details.
- Product photos are small enough to load fast on a slow connection.
**Tasks:**
- [x] Decide it — /architect
- [x] Build it — /develop
- [x] Verify it — /check verify
**Notes:** The product shape decided here is what real data must match later.

## 05 · Catalog page
**Status:** in-progress
**Spec:** docs/specs/0005-catalog-page.md
**Code:** src/pages/index.astro, src/pages/categoria/[id].astro, src/components/ProductCard.astro, src/components/CategoryNav.astro, src/components/SiteHeader.astro, src/lib/catalog.ts, src/lib/site.ts
**Depth:** default
**Done when:**
- A visitor sees the products in stock with their prices, on phone and desktop.
- A visitor can narrow the list by category.
- Out-of-stock products are clearly marked or hidden.
- The page is usable on a throttled slow connection within the weight budget.
**Tasks:**
- [x] Build it — /develop
- [x] Verify it — /check verify
**Notes:** —

## 06 · Product detail page
**Status:** in-progress
**Spec:** docs/specs/0006-product-detail-page.md
**Code:** src/pages/producto/[id].astro
**Depth:** default
**Done when:**
- A visitor opens a product from the catalog and sees its photo, price, availability and details.
- Each product has its own link that can be shared in a WhatsApp group.
- A visitor can go back to the catalog easily.
**Tasks:**
- [x] Build it — /develop
- [x] Verify it — /check verify
**Notes:** —

## 07 · Order contact (WhatsApp)
**Status:** done
**Spec:** docs/specs/0007-whatsapp-order.md
**Code:** src/lib/whatsapp.ts, src/pages/producto/[id].astro, src/env.d.ts, .env.example
**Depth:** default
**Done when:**
- From a product, a visitor can contact the shop to order it in one tap.
- The message the shop receives already names the product.
**Tasks:**
- [x] Decide it — /architect
- [x] Build it — /develop
- [x] Verify it — /check verify
**Notes:** Depends on the open questions in `docs/brief.md` (delivery, how orders are placed).
A cart is out of the demo unless the owner confirms delivery.

## 08 · Demo online
**Status:** done
**Spec:** docs/specs/0008-demo-online.md
**Code:** astro.config.mjs, src/lib/site.ts, src/layouts/BaseLayout.astro
**Depth:** default
**Done when:**
- The demo is reachable at a public link that opens on a phone.
- The online demo stays within the weight budget.
**Tasks:**
- [x] Build it — /develop
- [x] Verify it — /check verify
**Notes:** Hosting is chosen in the stack spec (feature 01).

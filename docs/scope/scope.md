# Scope — Local food shop (demo)

**Delivery style:** facade
**Workflow depth:** alpha
**Updated:** 2026-10-31

## At a glance
| #  | Feature                          | Status            | Depth   | Spec |
|----|----------------------------------|-------------------|---------|------|
| 01 | Stack and architecture           | done              | default | docs/specs/0001-stack.md |
| 02 | Project scaffold                 | done              | default | docs/specs/0001-stack.md |
| 03 | Visual reference and design base | done              | default | docs/specs/0002-design-base.md |
| 04 | Sample product data              | done              | default | docs/specs/0004-sample-product-data.md |
| 05 | Catalog page                     | done              | default | docs/specs/0005-catalog-page.md |
| 06 | Product detail page              | done              | default | docs/specs/0006-product-detail-page.md |
| 07 | Order contact (WhatsApp)         | done              | default | docs/specs/0007-whatsapp-order.md |
| 08 | Demo online                      | done              | default | docs/specs/0008-demo-online.md |
| 16 | Shop information                 | done              | default | docs/specs/0010-shop-information.md |
| 17 | Visual polish                    | done              | default | docs/specs/0011-visual-polish.md |
| 09 | Admin backend and publishing     | done              | default | docs/specs/0012-admin-backend.md |
| 10 | Catalog data online              | done              | default | docs/specs/0013-catalog-data-online.md |
| 11 | Owner login                      | done              | default | docs/specs/0014-owner-login.md |
| 12 | Manage products                  | done              | default | docs/specs/0015-manage-products.md |
| 13 | Publish changes                  | done              | default | docs/specs/0016-publish-changes.md |
| 14 | Product photos upload            | done              | default | docs/specs/0017-product-photos-upload.md |
| 15 | Manage categories                | in-progress       | default | docs/specs/0018-manage-categories.md |
| 18 | New shop setup                   | needs-a-decision  | default | —    |

Status values: `planned` · `needs-a-decision` · `in-progress` · `done`

Features 16 and 17 were added after 09–15 but are built first: the demo shown to prospective
clients must be complete before the admin panel starts.

Features 09–15 are the admin panel: the shop owner manages the whole catalog from a phone,
without the developer. It is sold as the "Autónomo" package, priced above the "Gestionado"
package where the developer makes every update.

Feature 18 is the one-time setup of each sold shop's own copy, after a sale (spec 0012). It
comes after the admin panel is complete.

Later (not planned yet): cart or delivery flow if the shop offers delivery.

---

## 01 · Stack and architecture
**Status:** done
**Spec:** docs/specs/0001-stack.md, docs/specs/0009-site-identity.md
**Code:** src/layouts/BaseLayout.astro, src/styles/global.css, src/content.config.ts, src/lib/supabase.ts, supabase/schema.sql, astro.config.mjs, public/og-default.png, src/lib/site.ts, scripts/check-weight.mjs
**Depth:** default
**Done when:**
- A stack spec records the framework, data approach, hosting and a weight budget for pages.
- The choice keeps pages very light for slow, unreliable connections in Cuba.
- The choice allows wiring real, owner-editable data later without a rewrite.
**Tasks:**
- [x] Decide it — /architect
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
**Code:** src/content.config.ts, supabase/seed.sql, supabase/seed-photos/, src/lib/price.ts
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
**Status:** done
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
**Status:** done
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

## 16 · Shop information
**Status:** done
**Spec:** docs/specs/0010-shop-information.md
**Code:** src/lib/site.ts, src/lib/date.ts, src/lib/whatsapp.ts, src/components/SiteHeader.astro, src/components/ShopInfo.astro, src/components/Faq.astro, src/components/SiteFooter.astro, src/pages/index.astro, src/pages/categoria/[id].astro, src/pages/producto/[id].astro, src/pages/estilo.astro
**Depth:** default
**Done when:**
- At the top of the home page, a visitor sees which payment methods the shop accepts and the
  date the catalog was last updated.
- From the header of every page, a visitor opens a WhatsApp chat with the shop in one tap.
- Below the products on the home page, a visitor finds how to buy in 3 steps, delivery and
  pickup options, opening hours and the shop's municipality.
- A visitor can open answers to frequently asked questions one at a time.
- Every page ends with a footer showing the shop name, hours and WhatsApp contact, and every
  page stays within the weight budget of spec 0001.
**Tasks:**
- [x] Decide it — /architect
- [x] Build it — /develop
- [x] Verify it — /check verify
**Notes:** Goal: the demo must look like a complete shop to owners who judge by look and feel,
and answer the questions customers now ask the owner in private. Everything is about the
shop's customers: no developer credit or self-promotion on the site. Out: search (18
products; Baymard finds search matters from about 20), floating WhatsApp button (covers
content, repeats the product page's order button), embedded map (heavy, may fail in Cuba),
separate "about" page. Open for /architect: the demo info must be invented but realistic, and
spec 0009 says the demo has no address (municipality only?); where the shop info lives so
adapting it to a client is a one-file change; FAQ questions and answers. Research (2026-10-16):
https://www.nngroup.com/articles/contact-us-pages/ ·
https://www.nngroup.com/articles/trustworthy-design/ ·
https://www.baymard.com/blog/footer-links-ecommerce · https://baymard.com/blog/dtc-search ·
Cuban reference store: https://mercadito-demo.biznecubano.com (payment methods near the
top, delivery by municipio, hours, "¿Cómo comprar?", FAQ).

## 17 · Visual polish
**Status:** done
**Spec:** docs/specs/0011-visual-polish.md
**Code:** src/components/WhatsAppIcon.astro, src/assets/icons/, src/components/SiteHeader.astro, src/components/SiteFooter.astro, src/pages/index.astro, src/pages/categoria/[id].astro, src/pages/producto/[id].astro, src/pages/estilo.astro
**Depth:** default
**Done when:**
- Every link that opens WhatsApp (header "Escríbenos", the product page's "Pedir" / "Preguntar"
  button, the footer link) shows the WhatsApp icon next to its text.
- On the home page, the information zone (how to buy, pickup and hours, FAQ) sits on its own
  background, edge to edge, so it reads apart from the catalog.
- The footer's look is decided (dark or light) and the same on every page.
- All text stays readable on the new backgrounds, and every page stays within the weight budget
  of spec 0001 with no JavaScript.
**Tasks:**
- [x] Decide it — /architect
- [x] Build it — /develop
- [x] Verify it — /check verify
**Notes:** Goal: owners judge the demo by look and feel; WhatsApp buttons need more presence and
the info zone blends into the catalog today. Reverses a recorded decision: specs 0007 and 0010
say "no WhatsApp logo" (trademark), and spec 0002 left icons out of the design system, so
/architect must check WhatsApp's brand rules for using its icon on click-to-chat links (ask
before going online). New background/text pairs must pass the spec 0002 contrast table.
Suggestion from the 2026-10-16 session, not a decision: keep the product categories on the
cream page (alternating 6 category bands would look busy); an inline SVG icon adds about 1 KB.

## 09 · Admin backend and publishing
**Status:** done
**Spec:** docs/specs/0012-admin-backend.md
**Code:** — (no repo code; Supabase project `tienda-demo-cuba`, Vercel deploy hook `admin-publish`)
**Depth:** default
**Done when:**
- A spec records where catalog data, product photos and the owner's account live, and how a
  published change reaches the public site.
- The public pages keep the weight budget of spec 0001: customers never load the admin.
- The admin and the public site both open from a phone in Cuba.
- The monthly running cost per shop is known, so the "Autónomo" price covers it.
**Tasks:**
- [x] Decide it — /architect
- [x] Build it — /develop
- [x] Verify it — /check verify
**Notes:** Owner's preferences for /architect (not decisions yet): option A, the public site
stays static and is rebuilt when the owner publishes, never rendered on each visit; a BaaS,
specifically Supabase, where the owner already has an account. Open: one setup per shop
(each buyer gets their own copy) or one shared admin for many shops.

## 10 · Catalog data online
**Status:** done
**Spec:** docs/specs/0013-catalog-data-online.md
**Code:** `src/lib/supabase.ts`, `src/content.config.ts`, `supabase/` (schema, seed, seed photos)
**Depth:** default
**Done when:**
- The public site shows the catalog stored online instead of the sample files in the repo.
- The current sample products and categories appear online unchanged, same links and prices.
- If the online data cannot be reached, the live site keeps showing the last published catalog.
**Tasks:**
- [x] Decide it — /architect
- [x] Build it — /develop
- [x] Verify it — /check verify
**Notes:** Depends on 09. Data must keep the product shape of spec 0004.

## 11 · Owner login
**Status:** done
**Spec:** docs/specs/0014-owner-login.md
**Code:** `src/lib/auth.ts`, `src/pages/admin/index.astro`, `supabase/auth.sql`, `scripts/check-weight.mjs`
**Depth:** default
**Done when:**
- The owner signs in to the admin with their own credentials from a phone.
- Without signing in, nobody can open the admin or change the catalog.
- The owner can sign out, and can recover a forgotten password without the developer.
**Tasks:**
- [x] Decide it — /architect
- [x] Build it — /develop
- [x] Verify it — /check verify
**Notes:** Depends on 09. Changes auth: use plan mode before building (CLAUDE.md).

## 12 · Manage products
**Status:** done
**Spec:** docs/specs/0015-manage-products.md
**Code:** `src/lib/products.ts`, `src/pages/admin/index.astro`, `supabase/products-write.sql`, `src/components/NoPhoto.astro`
**Depth:** default
**Done when:**
- The signed-in owner sees all products, in stock or not, on a phone.
- The owner can add a product with name, category, price, availability and details.
- The owner can edit any of those fields, including marking a product in or out of stock.
- The owner can delete a product after confirming.
- Invalid input (empty name, negative price) is refused with a clear message in Spanish.
**Tasks:**
- [x] Decide it — /architect
- [x] Build it — /develop
- [x] Verify it — /check verify
**Notes:** Depends on 10 and 11. The admin UI is not bound by the public pages' no-client-JS
rule unless /architect says so.

## 13 · Publish changes
**Status:** done
**Spec:** docs/specs/0016-publish-changes.md
**Code:** `supabase/publish.sql`, `supabase/functions/publish/index.ts`, `src/lib/publish.ts`, `src/pages/build.json.ts`, `src/pages/admin/index.astro`
**Depth:** default
**Done when:**
- After saving changes, the owner can publish them, and customers see them within a few minutes.
- The owner can tell whether a publish is still running, finished, or failed.
- Many edits in a row cause one update of the public site, not one per edit.
**Tasks:**
- [x] Decide it — /architect
- [x] Build it — /develop
- [x] Verify it — /check verify
**Notes:** Depends on 12.

## 14 · Product photos upload
**Status:** done
**Spec:** docs/specs/0017-product-photos-upload.md
**Code:** `supabase/photos.sql`, `src/lib/photos.ts`, `src/lib/products.ts`, `src/lib/auth.ts`, `src/pages/admin/index.astro`, `scripts/check-weight.mjs`, `src/components/ProductCard.astro`, `src/pages/producto/[id].astro`, `src/pages/estilo.astro`
**Depth:** default
**Done when:**
- The owner can add or replace a product's photo straight from the phone's camera or gallery.
- A large phone photo still appears on the public site within the image budget of spec 0001.
- A product without a photo still shows correctly on the public site.
**Tasks:**
- [x] Decide it — /architect
- [x] Build it — /develop (reopened 2026-10-31 by spec 0017's update after /check verify)
  - [x] Upload, save, remove and delete flows (T1–T5, T7; AC1, AC3–AC7, AC9, AC10)
  - [x] Square photos at build and the new budget (T8; AC8)
  - [x] "Hacer foto" and "Elegir de la galería" buttons (T9; AC2)
- [x] Verify it — /check verify
**Notes:** Depends on 12.

## 15 · Manage categories
**Status:** in-progress
**Spec:** [0018](../specs/0018-manage-categories.md)
**Code:** —
**Depth:** default
**Done when:**
- The owner can add, rename and delete categories.
- Deleting a category that still has products is refused, or the owner is asked where those
  products go.
- The public site's category menu follows the owner's categories after publishing.
**Tasks:**
- [x] Decide it — /architect
- [ ] Build it — /develop manage categories
  - [x] Shared request module `src/lib/rest.ts`, products unchanged (T1; AC-11)
  - [ ] Categories section, form and rules on the real data (T2; AC-2–AC-5, AC-7–AC-9)
  - [ ] Owner write policies and measured answers (T3; AC-1)
  - [ ] Every flow and failure, public site after publish, checks (T4–T6; AC-6, AC-10, AC-12, AC-13)
- [ ] Verify it — /check verify
**Notes:** Depends on 12.

## 18 · New shop setup
**Status:** needs-a-decision
**Spec:** — (first draft of the steps in docs/specs/0012-admin-backend.md, "New-shop setup session")
**Code:** —
**Depth:** default
**Done when:**
- After a sale, the developer and the shop owner set up the shop's own copy in one session of
  about 20 minutes, following written steps.
- The sold site is online with the shop's own domain and opens on a phone in Cuba.
- On the sold site, the owner signs in, edits the catalog and publishes, as on the demo.
**Tasks:**
- [ ] Decide it — /architect
- [ ] Build it — /develop
- [ ] Verify it — /check verify
**Notes:** Depends on 09–15 (the whole admin). Enrolled 2026-10-31 from spec 0012's Out of
scope ("The scope does not list it yet"). Already decided in spec 0012: where sold sites are
hosted, whose accounts hold them, and that the demo stays where it is. Open for /architect: how
to attach the shop's domain (the nameservers may have to move, spec 0012), the domain's yearly
price (not researched), and whether the steps live as a checklist in `docs/`. Re-read spec
0012's Risks (sanctions) before deciding.

# Scope — Local food shop (demo)

**Delivery style:** facade
**Workflow depth:** alpha
**Updated:** 2026-10-02

## At a glance
| #  | Feature                          | Status            | Depth   | Spec |
|----|----------------------------------|-------------------|---------|------|
| 01 | Stack and architecture           | needs-a-decision  | default | —    |
| 02 | Project scaffold                 | planned           | default | —    |
| 03 | Visual reference and design base | needs-a-decision  | default | —    |
| 04 | Sample product data              | needs-a-decision  | default | —    |
| 05 | Catalog page                     | planned           | default | —    |
| 06 | Product detail page              | planned           | default | —    |
| 07 | Order contact (WhatsApp)         | needs-a-decision  | default | —    |
| 08 | Demo online                      | planned           | default | —    |

Status values: `planned` · `needs-a-decision` · `in-progress` · `done`

Later, only if the owner buys the site (not planned yet): real product data the owner can
update (stock and prices), cart or delivery flow if they offer delivery.

---

## 01 · Stack and architecture
**Status:** needs-a-decision
**Spec:** —
**Code:** —
**Depth:** default
**Done when:**
- A stack spec records the framework, data approach, hosting and a weight budget for pages.
- The choice keeps pages very light for slow, unreliable connections in Cuba.
- The choice allows wiring real, owner-editable data later without a rewrite.
**Tasks:**
- [ ] Decide it — /architect
- [ ] Build it — /develop
- [ ] Verify it — /check verify
**Notes:** —

## 02 · Project scaffold
**Status:** planned
**Spec:** —
**Code:** —
**Depth:** default
**Done when:**
- The project starts locally with one command and shows a placeholder page.
- A production build runs without errors.
**Tasks:**
- [ ] Build it — /develop scaffold
- [ ] Verify it — /check verify
**Notes:** Built from the stack spec (feature 01).

## 03 · Visual reference and design base
**Status:** needs-a-decision
**Spec:** —
**Code:** —
**Depth:** default
**Done when:**
- A well-known, good-looking shop is chosen as the visual reference, and why is recorded.
- Colors, typography and spacing are defined once and reused by every page.
- The design base adds almost no page weight (no heavy fonts or libraries).
**Tasks:**
- [ ] Decide it — /architect
- [ ] Build it — /develop
- [ ] Verify it — /check verify
**Notes:** Researching reference sites needs going online; ask before doing it.

## 04 · Sample product data
**Status:** needs-a-decision
**Spec:** —
**Code:** —
**Depth:** default
**Done when:**
- The demo has realistic sample products (mostly food) grouped in categories.
- Each product has a name, photo, price, availability and details.
- Product photos are small enough to load fast on a slow connection.
**Tasks:**
- [ ] Decide it — /architect
- [ ] Build it — /develop
- [ ] Verify it — /check verify
**Notes:** The product shape decided here is what real data must match later.

## 05 · Catalog page
**Status:** planned
**Spec:** —
**Code:** —
**Depth:** default
**Done when:**
- A visitor sees the products in stock with their prices, on phone and desktop.
- A visitor can narrow the list by category.
- Out-of-stock products are clearly marked or hidden.
- The page is usable on a throttled slow connection within the weight budget.
**Tasks:**
- [ ] Build it — /develop
- [ ] Verify it — /check verify
**Notes:** —

## 06 · Product detail page
**Status:** planned
**Spec:** —
**Code:** —
**Depth:** default
**Done when:**
- A visitor opens a product from the catalog and sees its photo, price, availability and details.
- Each product has its own link that can be shared in a WhatsApp group.
- A visitor can go back to the catalog easily.
**Tasks:**
- [ ] Build it — /develop
- [ ] Verify it — /check verify
**Notes:** —

## 07 · Order contact (WhatsApp)
**Status:** needs-a-decision
**Spec:** —
**Code:** —
**Depth:** default
**Done when:**
- From a product, a visitor can contact the shop to order it in one tap.
- The message the shop receives already names the product.
**Tasks:**
- [ ] Decide it — /architect
- [ ] Build it — /develop
- [ ] Verify it — /check verify
**Notes:** Depends on the open questions in `docs/brief.md` (delivery, how orders are placed).
A cart is out of the demo unless the owner confirms delivery.

## 08 · Demo online
**Status:** planned
**Spec:** —
**Code:** —
**Depth:** default
**Done when:**
- The demo is reachable at a public link that opens on a phone.
- The online demo stays within the weight budget.
**Tasks:**
- [ ] Build it — /develop
- [ ] Verify it — /check verify
**Notes:** Hosting is chosen in the stack spec (feature 01).

# UI track — every screen ships complete

## 1. Where does the design come from? (decide before building)
- **A design tool is connected and the spec says to use it** → pull the real frames and build to them.
- **An image or screenshot** → copy it faithfully; add no flourishes beyond it.
- **`design.md` exists** → design inside that system so new screens match what shipped.
- **Nothing yet** → create the system first (this is a decision; if no spec covers it, the gate
  in SKILL.md applies): ask for the direction, then a mood; derive one accent, a grey ladder,
  type scale, spacing, corner radii and motion; check text contrast meets WCAG AA in light and dark.
  Write the **values** as tokens in the project's CSS, and the **art direction** to `design.md`
  using `design-template.md` in this folder. A value is never written in two places.

## 2. Build
- Delivery style `facade` (see the scope header): build the full screen on mock data first,
  stop for the owner to look, then wire real data.
- Reuse components listed in `design.md` → Components. Match their exact classes.
- Tokens only. No raw hex values, no framework color classes, no magic numbers.
- Real wording, not lorem ipsum. Responsive at small, medium and large widths.
- Every section that can be empty, loading, or failing has that state designed.

## 3. Accessibility (minimum)
Keyboard reachable with a visible focus state · labels on every input · alt text on images ·
color is never the only signal · headings in order · touch targets large enough.

## 4. Look at your own work
If you can render the screen (dev server plus a browser tool), do it and fix visual defects
before reporting. If you can't, say so and list what the owner should look at.

## 5. Record
Add each new reusable component to `design.md` → Components: name · path · exact classes · variants.

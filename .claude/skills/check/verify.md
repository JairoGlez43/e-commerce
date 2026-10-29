# Verify — runtime proof against the spec

Green checks are not proof. Verify watches the feature actually behave.

## 1. Gather the contract
The feature's spec (acceptance criteria and Design), and `docs/specs/NNNN-<slug>.verify.md`
if `/develop` wrote one.

## 2. It must build first
Run the clean checks through the `verifier` subagent. Not clean → stop: "Fix the build first
(`/debug`)."

## 3. Run the app
Start the dev server in the background and wait until it responds.

## 4. Walk every acceptance criterion and every promised screen
Use the strongest method available, in this order:
1. **A browser tool** (if one is connected): navigate, click, fill forms, read what's on screen.
   If none is connected, you may suggest one — ask before connecting anything.
2. **HTTP requests:** load each route and check the status and content; call API routes with
   valid and invalid input; check the response shape.
3. **Data:** confirm writes landed with a read-only query, and that one user can't see another's data.
4. **The owner:** for what only a human can judge (looks, feel, a third-party login screen),
   give exact numbered steps and wait for their results.

## 5. Report
| AC | Result | Evidence |
|---|---|---|
| AC1 | ✅ pass / ❌ fail / 👀 needs the owner | what you saw |

Also list every screen or surface the spec promised and whether it exists.
Stop the dev server.

## 6. Status lines
- All pass → tick **Verify it** in the scope. If this was the last check the feature's depth
  requires (Alpha) and the spec isn't Assumed: feature → `done`, spec → `Accepted`.
- Any fail → "Next: `/debug` (something is broken) or `/develop` (something is missing)."

Hand off on pass: "Next: `/test` (Beta and above). Then `/clear`."

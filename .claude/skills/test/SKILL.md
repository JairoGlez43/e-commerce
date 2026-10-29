---
name: test
description: Write a real test suite for the code you just built or changed, so what was proven once stays proven. Targets uncommitted changes by default, remembers the project's test framework in docs/testing.md, and covers the normal path, edge cases, error states and accessibility. Also writes the regression test /debug hands over.
argument-hint: "[feature | path | regression: <bug description>]"
---

# Test — lock the proof in

**Target:** $ARGUMENTS (empty = the uncommitted changes)

## 1. Framework
Read `docs/testing.md`. If it doesn't exist:
- Detect from the manifest whether a test framework is already installed.
- If none: recommend one for this stack with a reason and a runner-up. Ask. Installing is the
  owner's call (`npm install` asks for permission).
- Save the choice in `docs/testing.md`: framework, test command, where tests live, naming,
  how to mock external services. Never ask again.

## 2. Scope
Only the code that changed (from `git diff`), and the acceptance criteria of its spec.

## 3. Write the tests
Per file, choose what applies:
- **Normal path** — one test per acceptance criterion it touches, named after the AC.
- **Edge cases** — empty, very long, boundary values, duplicate submits.
- **Error states** — failed network, invalid input, unauthorized user, another user's data.
- **Accessibility** (UI) — labels, roles, keyboard reachability.
Mock external services (AI, payment, third-party APIs); never call them for real in tests.

**Test the spec, not the current code.** If the code does something the spec says it shouldn't,
don't write a test that blesses it: report the bug and hand off to `/debug`.

## 4. Regression mode
Given a bug from `/debug`: write a test that reproduces it, show it would fail on the old
behavior, and passes on the fix.

## 5. Run and record
Run the suite through the `verifier` subagent. All green → tick **Test it** in the scope. If it
was the last required check (Beta) and the spec isn't Assumed: feature → `done`, spec → `Accepted`.

## Hand off
"Next: `/check review` (GA) or the next feature. Then `/clear`."

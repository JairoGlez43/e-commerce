---
name: check
description: Confirm a change is sound before merge. "/check verify" runs the real app and proves every acceptance criterion; "/check review" gets a senior code review from a different model than the one that wrote the code and saves it to docs/reviews/. Verify after /develop, review before a PR. Never edits code.
argument-hint: "verify | review | both  [feature]"
---

# Check — prove it runs, then read it with fresh eyes

**Input:** $ARGUMENTS

## Route first, before touching anything
- Starts with `verify` → read `verify.md` in this folder and follow it.
- Starts with `review` → read `review.md` in this folder and follow it.
- Starts with `both` → do verify; only if it passes, offer review.
- Anything else, or empty → don't guess. Print this and wait for the answer:

```
Which check? Type one:
  verify  run the real app and prove the change against its spec (after /develop)
  review  a fresh-model senior read of the diff, ranked findings (before a PR)
  both    verify first, then review
```

Carry any feature name through once the mode is chosen.

## Never
Edit application code. Verify reports failures to `/debug` or `/develop`; review reports
findings for the owner to decide on.

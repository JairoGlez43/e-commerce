---
name: debug
description: Find and fix the real cause when something is failing, throwing, or behaving wrong — no scope or spec needed. Use immediately when a problem survives one corrective attempt (the STOP rule) or /check verify finds a failure. First diagnoses which kind of failure it is; then reproduces, narrows down, tests one hypothesis at a time, makes the smallest fix, and hands a regression test to /test.
argument-hint: "[paste the raw error, or describe exactly what you observed]"
---

# Debug — find the real cause, keep it fixed

**Symptom:** $ARGUMENTS

Stop changing code until the cause is understood. If the error was paraphrased, ask for the
raw terminal output: the exact text is what makes the diagnosis possible.

## 0. Which kind of failure is it?
- **A. A bug** — one thing is wrong, the session is healthy. Clear error, reproducible. → steps 1-6.
- **B. A polluted session** — the conversation itself degraded: repeating failed fixes,
  contradicting earlier decisions, forgetting project rules, a very long chat across topics.
  → Don't fix here. Write a short handoff: the symptom, what was tried, what failed, the
  files involved. Tell the owner to `/clear`, paste that handoff, and run `/debug` again.
  A clean context often solves in one prompt what a polluted one can't in ten.
- **C. A wrong decision** — the code faithfully implements something wrong from the start
  (a spec, a library pattern, a design choice). → Name the source and route to
  `/architect` to supersede it. Fixing only the code would bring the bug back.

Say which one you think it is, and why, in one or two sentences.

## Bug loop (A)
1. **Reproduce** — run it (the `verifier` subagent for commands). No reproduction, no fix.
2. **Narrow down** — find where the fault actually lives: the smallest input, the exact line.
   Use the Explore subagent for wide searches; check current docs with `researcher` if a
   library is involved (ask before going online).
3. **One hypothesis** — a single clear guess about the cause.
4. **Test it** — one targeted change. Wrong? Revert it and form the next hypothesis.
   Never pile changes on top of each other.
5. **Smallest fix** — then re-run the reproduction and the clean checks to confirm.
6. **Keep it fixed** — hand a regression test to `/test regression: <bug>`, and report one
   pitfall line (symptom → cause → rule) for `/sync` to record.

Still stuck after two hypotheses? Suggest reverting to the last good commit rather than
layering more changes on a broken base.

## Never
Add features, tidy unrelated code, or refactor while fixing.

---
name: scope
description: Turn a product idea into a living plan of WHAT to build and in what order, written to docs/scope/. Plans a new product, the next slice, or one named feature. Run with no argument for a status read that reconciles the plan with what shipped. Never designs HOW.
argument-hint: "[idea | next | feature name]  (empty = status)"
disable-model-invocation: true
---

# Scope — what to build, in order

**Input:** $ARGUMENTS

## Route
- Empty input → **Status** mode.
- Anything else → **Plan** mode (new product, next slice, or one named feature).

## Read first — never ask what you can already see
- `docs/brief.md`, if it exists: the owner's own description of the idea.
- The project section of the root `AGENTS.md`, if it has been audited.
- Existing files in `docs/scope/`.
- If code exists but there is no scope: take stock with the Explore subagent and enroll what
  already works as `done` features, so the plan starts from reality.

## Plan mode
1. Break the idea into features, foundation first:
   stack and architecture decision → scaffold → tooling → data and auth if needed → first real feature.
   Each feature should fit in one `/develop` session; split anything bigger.
2. If the scope header doesn't record them yet, ask these two questions, **one at a time**,
   each with a one-line explanation of every option and your recommendation with a reason:
   - **Delivery style:** tracer bullet (thin path through every layer, then thicken) · MVP
     (smallest usable thing) · UI-first prototype, "facade" (screens on mock data, wire later) ·
     vertical slice (finish one whole journey before the next).
   - **Workflow depth:** Prototype · Alpha · Beta · GA (see the Done gate in AGENTS.md).
3. For each feature write: a **Done when** list of 2-5 user-visible outcomes (no implementation
   detail), a `needs-a-decision` status when a load-bearing choice is open, an empty spec pointer,
   and the task boxes the depth requires.
4. Write `docs/scope/scope.md` following `scope-template.md` in this folder.
   Monorepo: `docs/scope/<workspace>/scope.md`, one per workspace.
5. Show the "At a glance" table.

## Status mode
1. Read the scope, then check repo evidence: `git log`, the files at each code pointer, tests,
   and spec `Status:` lines.
2. Report in a few lines: done · in progress (and its next unchecked box) · next up ·
   blockers (Assumed specs, features that need a decision).
3. If a line disagrees with the evidence, propose the one-line fix and apply it only after the
   user confirms.

## Never
Write specs, code, or AGENTS.md. Mark a feature done without evidence.

## Hand off
"Next: `/architect <first feature that needs a decision>` — usually the stack. Then `/clear`."

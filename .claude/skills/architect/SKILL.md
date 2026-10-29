---
name: architect
description: Make a load-bearing decision and write it as a build spec in docs/specs/. Use when choosing a tech stack, a provider, a data model, or designing a feature or page, or when /develop says a decision is owed. Asks only what the owner alone knows, recommends the rest with a runner-up, and turns requirements into numbered acceptance criteria. Never writes code.
argument-hint: "[stack | feature name]: [the decision to settle]"
---

# Architect — make the decision, write it down

**Input:** $ARGUMENTS

## Mode
- **Stack mode** (no stack spec exists yet, or the input says "stack"): compare options for the
  whole stack — framework, data, auth, hosting, key services.
- **Feature mode:** design one thing — a feature, page, data model, or integration.
- **Ratify mode:** the target has an `Assumed` spec. Deliberate it properly, then either confirm
  it (Status → Proposed, or In Progress if already being built) or supersede it.

## 1. Read only what you need
The root `AGENTS.md` (and the nearest nested one), this feature's section of `docs/scope/`,
`docs/brief.md` in stack mode, and any spec that looks close. Never read the whole `docs/` tree.

**Close spec found?** Ask: new decision, update of that spec, or replacement?
A replacement gets a new number; mark the old one `Superseded by NNNN` on its Status line.

## 2. Sort every open question three ways
- **I can work it out** (from the idea, the code, AGENTS.md): don't ask. Use it.
- **Only the owner knows** (a business rule, a preference, a budget): ask.
- **Expertise settles it:** recommend, with a one-line reason and a runner-up the owner can pick.
  Never present a bare list of options; never pick silently.

Ask the owner questions **one at a time**, most consequential first, each with your recommended
answer. If they say "use your defaults", proceed.

**Before going online** (web search, docs, connecting a tool): ask permission. Use the
`researcher` subagent for current docs. Record every source you relied on in the spec.

## 3. Write the spec
- Number: next free `NNNN` in `docs/specs/` (monorepo: `docs/specs/<workspace>/`).
- File: `docs/specs/NNNN-<slug>.md`, following `spec-template.md` in this folder.
- Turn each requirement into a short numbered **acceptance criterion** (AC1, AC2…): an
  observable statement of done, e.g. "AC3: a signed-in user sees only their own jobs".
  Every build-plan task names the ACs it serves.
- **Status: Proposed.** (A spec written to record something already built is born Accepted.)
- In the scope, touch exactly two lines of this feature: fill its `Spec:` pointer and change
  `needs-a-decision` to `planned`. Nothing else in the scope.

## 4. Approval
Show a short summary: the decision, the runner-up, the ACs. Wait for the owner's approval or edits.

## Never
Write code, run migrations, or edit any part of the scope beyond the two lines above.

## Hand off
"Next: `/develop <feature>`. Then `/clear`."

---
name: develop
description: Build a feature (UI, backend, or both) from its spec. The only skill that writes application code. First checks that no load-bearing decision is missing; if one is, it stops and routes to /architect. Then builds, verifies it compiles, moves status lines forward, and writes manual check steps. "/develop scaffold" creates the project from the stack spec.
argument-hint: "[feature name or number | scaffold]"
---

# Develop — build the feature from its spec

**Target:** $ARGUMENTS

## Before building
**A project must exist** — unless the target is `scaffold`.
No project and not scaffolding → "No project found. Run `/develop scaffold` first." Stop.

### Scaffold
1. Read the stack spec in `docs/specs/` (the one with the stack decision). No stack spec →
   "Decide the stack first: `/architect stack`." Stop.
2. The repo root is NOT empty (it holds this kit's files), and most init tools refuse a
   non-empty folder. So run the framework's own init tool **in a temporary subfolder**
   (e.g. `.scaffold-tmp/`), with the options the stack spec names.
3. Move everything from the temporary folder into the root, **never overwriting** these kit
   files: `AGENTS.md`, `CLAUDE.md`, `.claude/`, `docs/`, `learning/`, `.gitignore`.
   - If the tool generated its own `AGENTS.md` or `CLAUDE.md`, keep the kit's files and copy
     the tool's content into the root `AGENTS.md`, below `PROJECT:END`.
   - If it generated a `.gitignore`, merge its lines into the existing one (no duplicates).
   - If it generated a `README.md` and one already exists, keep the existing one.
   Then delete the temporary folder. If the tool installed dependencies inside it, reinstall
   them at the root with the project's package manager.
4. Install only base dependencies (framework, runtime, what the first feature needs). Each
   later feature installs its own when built. Cross-cutting tooling (lint, format, strict
   types) can come now.
5. Confirm the dev server or the build runs. Tick the scaffold task in the scope.
6. Hand off: "Next: `/clear`, then `/audit`."

**Freshness** (skip silently if there's no git remote): `git fetch`. If the branch is behind the
main branch, warn that a teammate may have shipped this and suggest pulling first. If there are
uncommitted changes in the area you'll touch, warn. Warnings, not walls.

**Git:** only if the root AGENTS.md says `integration: on`, branch before building and commit as
build tasks land. Otherwise do no git writes.

## Step 0 — the spec gate (always)
Read only: this feature's scope section, its spec (above the Rationale line), the nearest
AGENTS.md, and `design.md` if there's UI.

Don't ask yourself "am I inventing something?" — that judgment is easy to fool. Run the
**input coverage test** instead:
> List every value this build must produce, store, or display (from the acceptance criteria
> and the design). For each one, does the spec, `design.md`, or AGENTS.md name its source —
> an input, a column, a derivation from a named value, or a prior decision?
> **Any required value without a named source is an owed decision.**

A decision is also owed if building would mean choosing a provider, library, data model or
cross-cutting pattern; designing a whole page with no design system and no page spec; or
defining a behavior no spec describes. A truly local detail — a variable name, a loop style,
which existing helper to call — is not a decision.

**Owed?** Ask the owner, offering three options:
1. **Architect it first** (recommended) → end with: "Run `/architect <feature>: <the decision>`,
   then `/develop <feature>` again."
2. **Not needed, build directly** → the owner judged there's nothing to decide. Continue.
3. **Build now, record an assumed spec** → write `docs/specs/NNNN-<slug>.md` with
   `Status: Assumed` and only these sections: Owed decision · Assumption built on ·
   Authorized by · Code area · Requirements · Ratify ("Run /architect to ratify; the feature
   can't be done until then"). Point the scope's `Spec:` line at it, then continue.

## Step 1 — classify and load
- **UI**, **backend**, or **both** (auth is usually both). Read `ui-guide.md` and/or
  `backend-guide.md` from this folder.
- **Resuming?** Start at the first unchecked build-plan task. Never rebuild what's ticked.
- Need to understand existing code → the Explore subagent. Need current library docs → ask the
  owner, then the `researcher` subagent.

## Step 2 — build
Follow the guide(s) task by task. After each task: run the clean checks through the `verifier`
subagent, then tick that task's box in the spec's build plan. If the spec turns out to be wrong
partway through, stop and route to `/architect` — never quietly build something else.

## Step 3 — record (status lines only)
- Spec `Status:` Proposed → **In Progress** (read the line again right before editing; if it's
  unexpected, flag it instead of overwriting). Never move a spec out of Assumed.
- Scope, this feature only: status → `in-progress`, tick **Build it**, fill `Code:` with the main paths.
- Write manual check steps, one per acceptance criterion, to `docs/specs/NNNN-<slug>.verify.md`.
- **Prototype depth only**, and only if the spec isn't Assumed: mark the feature `done` and the
  spec `Accepted`. At every other depth, leave it in progress — built is not done.

## Report and hand off
What was built (files), check results, anything the owner should look at.
"Next: `/check verify`. Then `/clear`."

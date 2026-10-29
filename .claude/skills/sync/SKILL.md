---
name: sync
description: The closing step around merge. Reconciles the durable files with what the repo now shows — adds new conventions and pitfalls to AGENTS.md, re-aligns the scope and spec status lines with the evidence, and flags specs the change made stale. Surgical edits only, never rewrites prose.
argument-hint: "[optional feature or area]"
disable-model-invocation: true
---

# Sync — bring the knowledge back in line with the code

**Target:** $ARGUMENTS (empty = everything changed since the main branch)

**Rule:** surgical edits only. Add lines; rewrite only single lines you own (status lines).
Never rewrite a section or curated prose. Not sure? Flag it instead of editing.

## 1. Read the evidence
`git diff` against the main branch (or since the last sync), the touched files, tests,
`docs/reviews/`, and any pitfall `/debug` reported in this session.

## 2. Reconcile
- **AGENTS.md (project section and nested ones):** add a line for each new convention,
  command, env var or library rule the change introduced; add pitfalls from `/debug` under
  Known pitfalls (symptom → cause → rule); add a one-line pointer to `design.md` if the change
  created it. Never edit the KIT section. A new area with no AGENTS.md → flag "run `/audit <path>`".
- **Scope:** tick boxes the evidence proves (code exists, tests pass, a review file exists);
  move a status forward when its depth's checks are done. Never mark done without evidence.
- **Specs:** reconcile `Status:` lines with the scope. If the code now contradicts a spec's
  decision, don't edit it — list it as **stale, needs `/architect`**.

## 3. Report
Every line changed (file, before → after) and every flag for the owner.

## Hand off
"Knowledge is current. `/clear` and start the next feature fresh."

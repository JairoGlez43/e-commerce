---
name: document
description: Write the human-facing text a finished change needs, from the real commits and diff — a pull request body, a changelog entry, a release note, or a postmortem — and put it in the right place. Writes no code, tests or specs.
argument-hint: "pr | changelog | release-note | postmortem"
disable-model-invocation: true
---

# Document — write it up from what really changed

**Form:** $ARGUMENTS (empty = ask which one, suggesting the likeliest)

## Read the truth, not the intention
`git log` and `git diff` for the change, plus the feature's spec (decision and ACs) and any
review in `docs/reviews/`. Describe what the code does, not what was planned.

## Forms and where they go
- **pr** → print a PR body: what and why (2-3 sentences) · how to test (from the ACs) ·
  screenshots needed · risks and follow-ups. Don't open the PR unless the owner asks.
- **changelog** → `CHANGELOG.md`, under `## [Unreleased]`, grouped Added / Changed / Fixed /
  Removed. One line per user-visible change. Create the file if missing.
- **release-note** → `docs/releases/<version>.md`, for users: what's new and why it matters to them.
- **postmortem** → `docs/postmortems/<YYYY-MM-DD>-<slug>.md`: summary · impact · timeline ·
  root cause · fix · what prevents it next time. Blameless.

Write for the person who reads it months from now. Plain words, no internal jargon.

## Status lines
Tick **Document it** in the scope. If it was the last required check (GA) and the spec isn't
Assumed: feature → `done`, spec → `Accepted`.

## Hand off
"Next: `/sync`. Then `/clear`."

<!-- KIT:START ─ Engine section. Identical in every project. /audit and /sync never edit
     between KIT:START and KIT:END. HTML comments are stripped before the model reads this
     file, so they cost no context. Keep this whole file short: it loads every session. -->

# How we work

Every piece of project knowledge lives in files in this repo, never only in a chat.
A session can be cleared at any handoff and nothing is lost.

## The skills — run only the ones a change needs
| Phase | Skill | Writes |
|---|---|---|
| Plan what | `/scope` | `docs/scope/` |
| Describe the project | `/audit` | project section of `AGENTS.md`, nested `AGENTS.md` |
| Decide | `/architect` | `docs/specs/` (status Proposed) |
| Build | `/develop` | source code, `design.md`, status lines |
| Prove it runs | `/check verify` | nothing (reports) |
| Keep it proven | `/test` | test files, `docs/testing.md` |
| Second opinion | `/check review` | `docs/reviews/` |
| Write it up | `/document` | `CHANGELOG.md`, `docs/releases/`, `docs/postmortems/` |
| Re-align knowledge | `/sync` | surgical edits to `AGENTS.md`, scope, status lines |
| Anytime, off the rail | `/debug` | the smallest fix |
| Anytime, for the learner | `/learn` | `learning/` |

## Ownership — never write a file you don't own
- **Content** of a spec: only `/architect`. Content of the scope: only `/scope`.
- **Status lines** (a scope feature's status and task boxes, a spec's `Status:` line and
  build-plan boxes) move forward only on evidence: `/develop` sets In Progress and ticks
  build tasks; the skill that completes the last check the depth requires marks it done;
  `/sync` reconciles lines that disagree with the repo.
- `/develop` may create one kind of spec: an **Assumed** spec, when the user chooses to build
  before deciding. Only `/architect` can ratify it. A feature with an Assumed spec is never done.
- Nobody rewrites another skill's prose. If something looks wrong, flag it.

## Done gate
Built is not done. A feature is done only when the checks its **workflow depth** requires
have passed (depth lives in the scope header, overridable per feature):
- Prototype: /develop self-check · Alpha: + /check verify · Beta: + /test · GA: + /check review + /document

## Engineering rules (non-negotiable)
- Never invent a decision. If building needs a choice no spec, design.md or AGENTS.md records,
  stop and route to `/architect`.
- Scope is sacred: build only what the spec asks. No drive-by refactors.
- Never guess a library API. Check bundled framework docs, then official docs via the
  `researcher` subagent (ask the user before going online). Training memory comes last.
- Secrets only from the environment. Never read or print `.env` files.
- Never claim it works without running the check. Never invent files, APIs, or facts.
- STOP rule: if a problem survives one corrective attempt, stop and run `/debug`.
- Permission denials from `.claude/settings.json` are intentional. Ask, don't work around them.

## Context hygiene
- Read only what the task needs: one scope section, one spec, the nearest `AGENTS.md`.
- Push noisy work to subagents: built-in `Explore` (read code), `researcher` (docs),
  `verifier` (run checks), `reviewer` (fresh-eyes review).
- Every skill ends by naming the next step and suggesting `/clear`.

<!-- KIT:END -->

<!-- PROJECT:START ─ Written by /audit from the real code; kept current by /sync.
     Empty until the project is scaffolded and /audit runs. -->

# Project

_Not audited yet. After the project is set up, run `/audit`._

<!-- PROJECT:END -->

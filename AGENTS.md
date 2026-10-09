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

A read-only online catalog demo for a local food shop in Cuba. Today the owner posts stock in
WhatsApp groups; the site gives customers one always-current link where they browse products
in stock with prices and open a product to see its details. The demo is shown to the owner so
they can decide whether to buy it. Hard rule: as light as possible, because connections in
Cuba are slow and unreliable. Sources: `docs/brief.md`, `docs/scope/scope.md`.

## Stack
- Framework: Astro 7.3.5, static output (no adapter, no integrations yet)
- Language: TypeScript 6.0.3, `astro/tsconfigs/strict`
- Typecheck: @astrojs/check 0.9.10
- Runtime / package manager: Node >=22.12.0, pnpm 10.13.1 (pinned in `packageManager`)
- Native build deps allowed in `pnpm-workspace.yaml` (`onlyBuiltDependencies`): esbuild, sharp
- Styling: none installed yet. Tailwind is decided in `docs/specs/0001-stack.md` but not set up.

## Commands
- Dev: `pnpm dev` (http://localhost:4321)
- Lint: none yet
- Typecheck: `pnpm typecheck` (`astro check`)
- Test: none yet
- Build: `pnpm build` (outputs `dist/`); preview with `pnpm preview`
**Clean means:** `pnpm typecheck` and `pnpm build` pass with zero errors.

## Structure
| Folder | Owns | Must never |
|---|---|---|
| `src/pages/` | Routes, one `.astro` file per page (only `index.astro`, the stock template, so far) | Hold data or shared markup that belongs in a layout/component |
| `public/` | Files served as-is (favicons) | Hold product images (those go through astro:assets per spec 0001) |
| `docs/` | Brief, scope, specs, reviews | Be edited outside the owning skill (see Ownership) |
| `learning/` | Notes for the learner, written by `/learn` | Hold project decisions |
| `dist/`, `.astro/` | Generated by Astro (gitignored) | Be edited by hand |

The planned folders (`layouts/`, `components/`, `data/`, `assets/`, `styles/`, `scripts/`) are
listed in `docs/specs/0001-stack.md` and do not exist yet.

## Conventions
- Naming: unknown — only one stock page exists. Follow spec 0001 until real code sets a pattern.
- Data access: none yet. Decided in spec 0001: content collection `products` read via `astro:content`.
- Results and errors: none yet (static site, no server code).
- Styling: none yet. Decided in spec 0001: tokens once in `src/styles/global.css`; never raw values.
- Env vars: none. No `.env.example`, no `import.meta.env` usage.
- Framework docs: Astro ships no bundled docs for agents. Use the `researcher` subagent
  (ask first) before using an Astro API you are not sure about.

## Libraries
- Astro: config in `astro.config.mjs` (empty `defineConfig({})`). Decision: `docs/specs/0001-stack.md`

## Known pitfalls
_Added by /sync from /debug findings: symptom → cause → rule._

## Git
integration: off   <!-- on = /develop branches and commits as milestones land -->

<!-- PROJECT:END -->

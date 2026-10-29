# Project

<One paragraph: what it is, for whom, the core flow. Source: docs/brief.md or the scope.>

## Stack
- <layer>: <tool + exact version>

## Commands
- Dev: `<cmd>`
- Lint: `<cmd>`
- Typecheck: `<cmd>`
- Test: `<cmd or "none yet">`
- Build: `<cmd>`
**Clean means:** <the commands that must pass with zero errors>

## Structure
| Folder | Owns | Must never |
|---|---|---|
| `<folder>/` | <what lives here> | <what must not happen here> |

## Conventions
- Naming: <files, components, functions>
- Data access: <where queries live, client vs server, user scoping>
- Results and errors: <the shape handlers return; how errors are logged and shown>
- Styling: tokens in `<css file>`; never raw values. Design system: see `design.md` (if present)
- Env vars: <names, public vs secret, where each is used>
- Framework docs: <bundled docs path, if any>

## Libraries
- <library>: client in `<path>`; <the one rule that matters>. Decision: `docs/specs/<NNNN>`

## Known pitfalls
_Added by /sync from /debug findings: symptom → cause → rule._

## Git
integration: off   <!-- on = /develop branches and commits as milestones land -->

---
name: audit
description: Describe how this project actually works so every other skill stops guessing. Reads the real code and writes the project section of the root AGENTS.md (stack, commands, structure, conventions), nested AGENTS.md files for folders with their own rules, and thin CLAUDE.md pointers. Run first on an existing codebase; on a new one, right after scaffolding. "/audit src/auth" audits one area.
argument-hint: "[optional area path]"
disable-model-invocation: true
---

# Audit — teach every skill how this project works

**Target:** $ARGUMENTS (empty = the whole repo)

**Rule:** record only what the code actually shows. Never invent a convention. Add what is
missing; never overwrite a curated line. If the code contradicts a curated line, flag it.

## Steps
1. **A project must exist** (a manifest such as `package.json` plus source files). If not:
   "Nothing to audit yet. Scaffold first with `/develop scaffold`." Stop.
2. **Explore** with the Explore subagent: manifests and scripts, framework and exact versions,
   folder layout, the patterns already in use (naming, data access, result and error shapes,
   styling and tokens, tests). Take env var names from `.env.example` — never open `.env`.
3. **Bundled framework docs:** if the framework ships docs for agents (for example
   `node_modules/next/dist/docs/`), record that path and the rule "read it before using
   framework APIs".
4. **Root AGENTS.md:** fill only the section between `PROJECT:START` and `PROJECT:END`,
   following `agents-template.md` in this folder. Never touch the KIT section, and keep any
   block another tool wrote (Next.js adds one on `next dev`) exactly as it is.
5. **Nested AGENTS.md:** for each folder whose rules differ from the rest (for example agent
   code, API routes, a payments module) write a short `AGENTS.md` there with only the local
   rules, and beside it a `CLAUDE.md` containing exactly `@AGENTS.md`. Claude Code reads a
   folder's CLAUDE.md when it works in that folder; the pointer makes it read the AGENTS.md too.
6. **Root CLAUDE.md:** make sure its first line is `@AGENTS.md`. Keep the rest.
7. **Report:** what you wrote and where, plus anything contradictory or unknown (recorded as
   "unknown — ask the owner", never guessed).

## Hand off
"Next: `/scope` if there's no scope yet, otherwise `/architect` or `/develop <next feature>`.
Then `/clear`."

---
name: learn
description: Write a from-zero lesson about one technology, tool or concept this project uses, and save it to learning/ as portfolio material. Run with the topic, e.g. "/learn payment webhooks" or "/learn row-level security".
argument-hint: "[topic]"
disable-model-invocation: true
---

# Learn — one lesson on one piece of the stack

**Topic:** $ARGUMENTS (empty = ask which one)

## Before writing
1. Use the learner's background, language and preferences from their personal instructions
   (`~/.claude/CLAUDE.md`, already in context) and `CLAUDE.local.md` if it exists.
   Build every explanation on what they already know.
2. Read `learning/`: don't repeat earlier lessons, link to them, continue the numbering.
3. Find how THIS project uses the topic: AGENTS.md, the related spec in `docs/specs/`, and the
   real files that use it.
4. Confirm current facts (versions, commands, APIs) with the `researcher` subagent — ask
   before going online. Never teach from memory something that may have changed.

## Write `learning/NN-<topic-slug>.md` with these sections
1. **The problem** — a concrete problem the learner would hit without this tool, told from
   what they already know.
2. **The solution** — what it is, in plain words, and how it solves the problem. Map each new
   concept to something familiar.
3. **How it fits in this project** — where it's used, which files, how data flows through it.
4. **Hands-on** — every command or setting they'll touch: what it does, where to run it
   (e.g. the VS Code terminal), the output to expect, what to do if it fails.
5. **What matters** — security points, common mistakes, the project rules that apply.
6. **Check yourself** — 3-5 questions; answers inside a `<details>` block.
7. **For your CV and portfolio** — honest, recruiter-recognizable skills as short bullets,
   plus one sentence describing what was built.

## Style
Define every term the first time it appears. Never explain a concept with another unexplained
concept — if a term needs its own lesson, give it two sentences and suggest `/learn <term>`.
Short paragraphs, examples over abstractions. End with the file path and the next natural topic.

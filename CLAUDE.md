@AGENTS.md

<!-- Claude Code specifics. AGENTS.md is the single source; this file only adds what
     is specific to Claude Code. /audit keeps the first line as @AGENTS.md. -->

## Claude Code notes
- Skills and subagents are global (`~/.claude/skills/`, `~/.claude/agents/`), not in this repo.
  Skills run as `/name`; the subagents are `researcher` and `scout`.
- Use plan mode before irreversible steps (migrations, deleting data, changing auth).
- Personal preferences come from `~/.claude/CLAUDE.md` (all projects) and, if it exists,
  `CLAUDE.local.md` (this project only, gitignored). Follow them.

@AGENTS.md

<!-- Claude Code specifics. AGENTS.md is the single source; this file only adds what
     is specific to Claude Code. /audit keeps the first line as @AGENTS.md. -->

## Claude Code notes
- Skills live in `.claude/skills/` and run as `/name`. Subagents live in `.claude/agents/`.
- Use plan mode before irreversible steps (migrations, deleting data, changing auth).
- Personal preferences come from `~/.claude/CLAUDE.md` (all projects) and, if it exists,
  `CLAUDE.local.md` (this project only, gitignored). Follow them.

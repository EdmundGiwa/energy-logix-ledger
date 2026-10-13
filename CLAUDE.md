# CLAUDE.md

@AGENTS.md

Thin Claude adapter. **`AGENTS.md` is the canonical instruction file—read it first.**

This file contains only Claude-specific operating notes. It must not restate or contradict `AGENTS.md`.

## Reading order

1. Read `AGENTS.md`.
2. Follow its required reading order, including `SECURITY.md` and `GLOSSARY.md` when applicable.
3. Return here only for the Claude-specific notes below.

## Before coding

State:

- which feature or application the task belongs to;
- whether database migrations are involved; and
- whether API, event, sync, or integration contracts are affected.

## Claude Code discipline

- Read the narrowest authoritative evidence before diagnosing a bug or incident.
- Batch independent reads and searches.
- Use subagents only for genuinely independent work.
- Name the exact verification performed and anything not checked.
- Do not pipe test output through commands that hide the original exit status.
- After migration changes, run the repository's established backend tests against a fresh database.
- Never include AI attribution or a `Co-Authored-By` trailer in commits.

## Stop and ask when

- scope or expected behaviour is materially ambiguous;
- the issue is in a different area than described;
- a migration or business-rule conflict requires another author's intent;
- an operation would affect production data or an unapproved contract; or
- a requested approach would weaken a security boundary defined by `AGENTS.md` or `SECURITY.md`.

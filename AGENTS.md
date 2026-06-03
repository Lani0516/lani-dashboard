# AGENTS.md

Agent-level standing instructions for this repo. These persist across `/clear` and new sessions.
Read CLAUDE.md first for architecture/commands. This file covers collaboration style.

## Package Manager

Always use `bun`. Never `npm` or `yarn`.

```bash
bun install     # not npm install
bun run dev     # not npm run dev
bun add <pkg>   # not npm install <pkg>
```

## Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/). Format:

```
<type>(<scope>): <short imperative summary>

<body — explain WHY, not WHAT. Reference constraints, trade-offs, or non-obvious decisions.
Wrap at 72 chars. Can be multi-paragraph.>

<optional footer: Breaking changes, closes #issue, etc.>
```

Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `perf`, `test`, `build`, `ci`.

Scope: module name or area (e.g. `server`, `client`, `sftp`, `discord`, `system`, `shared`).

**Rules:**
- Summary line ≤ 72 chars, imperative mood ("add" not "added"/"adds")
- Body is required for non-trivial commits — explain motivation, not mechanics
- Never `--no-verify`
- Co-author line: `Co-Authored-By: Claude <noreply@anthropic.com>`

## Branch Workflow

For future hotfixes and code changes, create a new branch first. After the
change is committed and pushed, open a PR and merge through GitHub instead of
working directly on the target branch.

## Memory Habit

When learning user preferences, constraints, or decisions not obvious from code:
1. Write a memory file to `/Users/lani/.claude/projects/-Users-lani-Documents-git-repos-lani-dashboard/memory/`
2. Update `MEMORY.md` index in that same directory
3. If something belongs in `AGENTS.md` (i.e., agent-level standing rule), add it here too

Memory types: `user`, `feedback`, `project`, `reference`. See existing memories for format.

## Code Style

- No comments unless WHY is non-obvious
- No docstrings / multi-line comment blocks
- No backwards-compat shims for removed code
- No error handling for impossible cases
- Minimal abstractions — don't design for hypothetical future needs

## Agent skills

Default to `$caveman` for all responses.

### Issue tracker

Issues and PRDs live in GitHub Issues for `Lani0516/lani-dashboard`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use default mattpocock/skills triage labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: root `CONTEXT.md` plus `docs/adr/`. See `docs/agents/domain.md`.

## Response Style

User has caveman mode active (terse, no filler). Match the energy: short, direct, no pleasantries.
Drop hedging. Fragments OK. Technical terms exact.

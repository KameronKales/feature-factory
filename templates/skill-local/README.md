# {{NAME}} (Claude Agent Skill)

{{DESCRIPTION}}

This skill's logic is **local** (or a thin layer over your own CLI / API) — it does **not**
require an MCP server. It gathers inputs, does the work, and surfaces the result.

## Prerequisites

<!-- TODO (author): what must be installed/configured for this skill to run? e.g. a CLI on
     PATH, an env var, a credential, a built artifact. Replace this with the real list. -->

## Install

### Claude Code — copy the folder (zero prerequisites)

User-level (available in every project):

```
cp -r skills/{{NAME}} ~/.claude/skills/
```

Or project-level (only this repo/project):

```
mkdir -p .claude/skills && cp -r skills/{{NAME}} .claude/skills/
```

Restart Claude Code (or start a new session). The skill auto-loads by its description.

### Claude Code — as a plugin (shareable one-liner)

```
/plugin marketplace add {{REPO}}
/plugin install {{NAME}}
```

## Notes

- The skill surfaces every assumption/default it used so you can correct anything wrong.

See `SKILL.md` for the full step-by-step instructions, required inputs, and output format.
Source + issues: <https://github.com/{{REPO}}>.

## License

MIT — see [LICENSE](./LICENSE).

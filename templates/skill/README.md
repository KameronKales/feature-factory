# {{NAME}} (Claude Agent Skill)

{{DESCRIPTION}}

It's a **thin orchestration layer** over a public **MCP server** — all the logic lives server-side.
The skill itself bundles no engine; it just gathers inputs and calls the tools.

### MCP bootstrap (one time)

If the tools aren't connected yet, run:

```
claude mcp add --transport http <server-name> <YOUR_MCP_URL>
```

On **claude.ai**: Settings → Connectors → add a custom connector pointing at your MCP URL. The skill
also reminds you to do this if the tools are missing when you invoke it.

## Install

### Quickest — skills.sh CLI (recommended)

```
npx skills add {{REPO}}
```

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

- The skill surfaces every assumption the server reports so you can correct any silent default.

See `SKILL.md` for the full instructions, exact tool params, and output format.
Source + issues: <https://github.com/{{REPO}}>.

## License

MIT — see [LICENSE](./LICENSE).

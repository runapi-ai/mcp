# RunAPI Claude Code Plugin

RunAPI plugin files package the RunAPI MCP server with Claude Code commands, agents, skills, and output styles.

## Install

Use this plugin from a checked-out `runapi-ai/mcp` repository, or copy the `plugin/` directory into your Claude Code plugin source once the public repository is created.

The plugin MCP config runs:

```bash
npx -y @runapi.ai/mcp
```

Authenticated tools require `RUNAPI_API_KEY`.
Free catalog tools work without a key.

## Configure

Set an API key in your shell before starting Claude Code:

```bash
export RUNAPI_API_KEY="your_runapi_key"
```

You can also create:

```json
{
  "apiKey": "your_runapi_key"
}
```

at `~/.config/runapi/config.json`.

## Included

- MCP config for the RunAPI server
- `task-executor` and `model-advisor` agents
- `/runapi:gen`, `/runapi:models`, `/runapi:balance`, and `/runapi:setup` commands
- media generation and model exploration skills
- concise and detailed output styles
- SessionStart config check hook

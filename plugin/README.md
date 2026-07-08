# RunAPI Claude Code Plugin

RunAPI plugin files package the RunAPI MCP server with Claude Code commands, agents, skills, and output styles.

## Install

Use this plugin from a checked-out `runapi-ai/mcp` repository, or copy the `plugin/` directory into your Claude Code plugin source once the public repository is created.

The plugin MCP config runs:

```bash
npx -y @runapi.ai/mcp
```

Free catalog tools work before sign-in.
Authenticated tools can use the MCP `login` tool, `runapi login`, `RUNAPI_API_KEY`, or shared RunAPI config.

## Configure

For interactive use, ask Claude Code to call the RunAPI `login` tool. It opens a browser and writes credentials to the shared RunAPI config.

Terminal users can run:

```bash
runapi login
```

Headless hosts can set an API key before starting Claude Code:

```bash
export RUNAPI_API_KEY="your_runapi_key"
```

The login flows and headless provisioning share this config file:

```json
{
  "apiKey": "your_runapi_key"
}
```

`~/.config/runapi/config.json`

## Included

- MCP config for the RunAPI server
- `task-executor` and `model-advisor` agents
- `/runapi:gen`, `/runapi:models`, `/runapi:balance`, and `/runapi:setup` commands
- media generation and model exploration skills
- concise and detailed output styles
- SessionStart config check hook

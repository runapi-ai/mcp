---
description: >-
  Guide the user through RunAPI API key setup for Claude Code and other MCP
  hosts.
---

# RunAPI Setup

Guide the user through local RunAPI MCP configuration.

## Instructions

1. Explain that free catalog tools work without a key.
2. Explain that `create_task`, `get_task`, and `check_balance` require RunAPI sign-in.
3. For interactive MCP hosts, tell the user you can call the RunAPI `login` tool to open browser login and save credentials to `~/.config/runapi/config.json`.
4. If the user is in a terminal instead of an MCP host, suggest:

```bash
runapi login
```

5. For headless hosts, show:

```bash
export RUNAPI_API_KEY="your_runapi_key"
```

6. Explain that MCP `login`, `runapi login`, and headless config all use the same file:

```json
{
  "apiKey": "your_runapi_key"
}
```

stored at `~/.config/runapi/config.json`.

7. Tell them to restart the MCP host after changing environment variables or pre-provisioned config.

Do not ask the user to paste the key into the conversation.
Do not run shell commands unless the user explicitly asks.

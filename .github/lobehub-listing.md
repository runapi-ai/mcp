# LobeHub MCP Listing Draft

Name: RunAPI

Repository: https://github.com/runapi-ai/mcp

Package: `@runapi.ai/mcp`

Description: Browse RunAPI models, check pricing, create media generation tasks, poll results, check balance, and call RunAPI LLM endpoints from MCP hosts.

Categories: AI, image generation, video generation, audio generation, developer tools

Install:

```json
{
  "mcpServers": {
    "runapi": {
      "command": "npx",
      "args": ["-y", "@runapi.ai/mcp"],
      "env": {
        "RUNAPI_API_KEY": "${RUNAPI_API_KEY}"
      }
    }
  }
}
```

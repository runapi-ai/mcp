# Glama MCP Listing Draft

Name: RunAPI

Repository: https://github.com/runapi-ai/mcp

Package: `@runapi.ai/mcp`

Description: RunAPI MCP Server exposes model discovery, pricing lookup, media task creation, polling, account balance, and LLM chat through the Model Context Protocol.

Authentication: Optional for catalog tools; `RUNAPI_API_KEY` required for authenticated tools.

Tools:

- `list_models`
- `get_model_info`
- `list_actions`
- `check_pricing`
- `create_task`
- `get_task`
- `check_balance`
- `chat`

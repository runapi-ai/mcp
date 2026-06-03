<h1 align="center">RunAPI MCP Server</h1>

<p align="center">
  <strong>One MCP server for RunAPI model discovery, pricing lookup, media tasks, account status, and LLM chat.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@runapi.ai/mcp"><img src="https://img.shields.io/npm/v/%40runapi.ai/mcp?style=flat-square&color=blue" alt="npm version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue?style=flat-square" alt="Apache-2.0 license"></a>
  <img src="https://img.shields.io/badge/Type-MCP_Server-blue?style=flat-square" alt="MCP Server">
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> |
  <a href="#tools">Tools</a> |
  <a href="#examples">Examples</a> |
  <a href="#catalog-coverage">Catalog</a> |
  <a href="#platform-setup">Platforms</a>
</p>

---

## What Is This?

RunAPI MCP Server connects MCP-compatible coding tools to RunAPI.
It lets an assistant browse the RunAPI catalog, inspect model inputs, check current pricing snapshots, create media tasks, poll task status, check account balance, and call RunAPI LLM endpoints.

The discovery tools work without an API key because they use the embedded build-time catalog.
Authenticated operations require `RUNAPI_API_KEY`.

This package is a pure client.
It does not run a local generation backend and does not require changes to your RunAPI account beyond creating an API key for authenticated tools.

---

## Quick Start

Install through your MCP host config:

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

Or generate a config file:

```bash
npx @runapi.ai/mcp init claude
```

Supported init targets:

```bash
npx @runapi.ai/mcp init claude
npx @runapi.ai/mcp init cursor
npx @runapi.ai/mcp init vscode
npx @runapi.ai/mcp init windsurf
npx @runapi.ai/mcp init roo
```

Free catalog tools (model browsing, pricing lookup) work immediately -- no account needed.

To generate images, videos, music, or call LLMs, you need a RunAPI account and API key.

**Register and get your key:**

- **Web**: Go to [runapi.ai](https://runapi.ai), sign up, then Dashboard > API Keys > Create Key
- **CLI**: Install the [RunAPI CLI](https://github.com/runapi-ai/cli), run `runapi login`, and the key is saved automatically

**Configure the key** using one of these methods:

**Option A** -- config file (recommended, works across all MCP hosts):

```bash
mkdir -p ~/.config/runapi
echo '{"api_key": "your_runapi_key"}' > ~/.config/runapi/config.json
```

**Option B** -- environment variable:

```bash
export RUNAPI_API_KEY="your_runapi_key"
```

**Option C** -- in MCP config (per-project):

```json
{
  "mcpServers": {
    "runapi": {
      "command": "npx",
      "args": ["-y", "@runapi.ai/mcp"],
      "env": {
        "RUNAPI_API_KEY": "your_runapi_key"
      }
    }
  }
}
```

Then restart your MCP host.

---

## Tools

| Tool | Auth | Purpose |
|---|---|---|
| `list_models` | No | List RunAPI models from the embedded catalog. Supports `modality`, `service`, and `action` filters. |
| `get_model_info` | No | Return service, action, modality, input constraints, and pricing snapshot for a model slug. Use `service` + `action` when a model appears in multiple endpoints. |
| `list_actions` | No | Group endpoint action names by modality. |
| `check_pricing` | No | Return pricing snapshot data for a `service` + `action` + `model` combination. |
| `create_task` | Yes | Create a media task and optionally poll until completion. |
| `get_task` | Yes | Fetch status and latest payload for an existing media task. |
| `check_balance` | Yes | Return account balance and spending metrics. |
| `chat` | Yes | Send messages to a RunAPI LLM endpoint and return the response with usage metadata when available. |

The catalog and pricing tools are designed for funnel-top discovery inside coding tools.
The task, balance, and chat tools are designed for authenticated workflows.

---

## Examples

Ask your assistant natural-language questions.
The assistant should use the tools to discover current model slugs and pricing instead of relying on memorized names.

### Browse The Catalog

```text
What RunAPI image models are available?
```

Expected behavior:

1. The assistant calls `list_models` with `modality: "image"`.
2. It summarizes the returned model slugs, services, actions, and required fields.
3. It avoids quoting stale prices unless it calls `check_pricing`.

### Inspect A Model

```text
Show me the required parameters for this model slug: <model-slug>
```

Expected behavior:

1. The assistant calls `get_model_info`.
2. If the response is ambiguous, it chooses the relevant service/action from the returned matches and calls `get_model_info` again with `service` and `action`.
3. It shows required fields, enum constraints, range constraints, conditional input rules, supported action, and pricing snapshot if present.
4. It tells you to choose another slug with `list_models` if the slug is not found.

### Create A Media Task

```text
Generate a square product image with RunAPI. Pick a suitable image model.
```

Expected behavior:

1. The assistant calls `list_models` to choose a compatible image model.
2. It calls `get_model_info` with the selected service/action/model to validate parameters and any conditional input rules.
3. It asks for confirmation if the request is expensive, long-running, or a batch.
4. It calls `create_task`.
5. It returns task ID, status, output URLs, and cost fields when available.

### Submit Without Waiting

```text
Create the task but do not wait for completion.
```

Expected behavior:

1. The assistant calls `create_task` with `wait: false`.
2. It returns the task ID.
3. You can later ask for status with `get_task`.

### Check Account Balance

```text
Check my RunAPI balance.
```

Expected behavior:

1. The assistant calls `check_balance`.
2. If no key is configured, it explains how to set `RUNAPI_API_KEY`.

### LLM Chat

```text
Use a RunAPI LLM model to summarize this file.
```

Expected behavior:

1. The assistant uses catalog tools to identify a current LLM model slug when needed.
2. It calls `chat` rather than `create_task`.
3. It returns the model response and usage metadata when available.

---

## Catalog Coverage

The embedded catalog is generated from RunAPI's contract snapshot.
It includes media models, utility endpoints, and LLM model slugs.

| Modality | What To Use |
|---|---|
| Image | `list_models` with `modality: "image"` |
| Video | `list_models` with `modality: "video"` |
| Audio and music | `list_models` with `modality: "audio"` |
| LLM | `list_models` with `modality: "llm"` |
| Utility | `list_models` with `modality: "utility"` |

Catalog contents can change between releases.
Use `list_models` for current service/action/model slugs and `get_model_info` for each model's current constraints.

---

## Pricing

RunAPI pricing is exposed through the `check_pricing` tool and the public pricing page.
Do not rely on examples in README files for exact prices.

Useful flows:

1. Call `list_models` to find a candidate model.
2. Call `check_pricing` with `service`, `action`, and `model`.
3. Show the returned pricing snapshot or link to [runapi.ai/pricing](https://runapi.ai/pricing).

Free catalog tools do not create tasks and do not consume account balance.

---

## Platform Setup

### Claude Code

Run:

```bash
npx @runapi.ai/mcp init claude
```

This writes `.mcp.json` in the current directory.
Restart Claude Code after editing MCP configuration.

### Cursor

Run:

```bash
npx @runapi.ai/mcp init cursor
```

This writes `.cursor/mcp.json`.
Open Cursor settings to verify the MCP server is enabled.

### VS Code

Run:

```bash
npx @runapi.ai/mcp init vscode
```

This writes `.vscode/mcp.json`.
VS Code uses a top-level `servers` key and `type: "stdio"` in generated config.

### Windsurf

Run:

```bash
npx @runapi.ai/mcp init windsurf
```

This writes the generated config for the Windsurf target used by the init command.

### Roo Code

Run:

```bash
npx @runapi.ai/mcp init roo
```

This writes `.roo/mcp.json`.

### Manual Configuration

Use the example files in `examples/` as starting points.
Each platform has slightly different wrapper keys and file paths, but all run the same command:

```bash
npx -y @runapi.ai/mcp
```

---

## Configuration

The server reads configuration in this order:

1. `RUNAPI_API_KEY` environment variable
2. `~/.config/runapi/config.json`
3. No key, which still allows free catalog tools

Example config file:

```json
{
  "apiKey": "your_runapi_key"
}
```

You can also set a custom base URL for local testing:

```json
{
  "apiKey": "your_runapi_key",
  "baseUrl": "https://runapi.ai"
}
```

Do not commit real API keys.

---

## Data Sync

This package ships build-time data files:

- `data/contract.json`: catalog, actions, model slugs, and input constraints
- `data/pricing.json`: pricing snapshot used by `check_pricing`

Refresh data from the RunAPI source tree before a release:

```bash
npm run sync:data
```

Build-time data means a pricing or catalog update requires a new package release.

---

## Development

```bash
npm install
npm run typecheck
npm test
npm pack --dry-run
```

Run the server locally:

```bash
npm run dev
```

Manual initialize smoke test:

```bash
printf '%s\n' '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"0.1.0"}},"id":1}' | npx tsx src/index.ts
```

---

## Package Contents

The npm package includes:

- compiled `dist/` files
- embedded `data/` files
- platform examples
- Claude Code plugin files, when generated by this repo
- eval scenarios, when generated by this repo
- README, changelog, license, and package metadata

It does not include `node_modules`, `.env`, local config files, or API keys.

---

## Also Available Via CLI

RunAPI also has a separate command-line client for terminal workflows.
Use this MCP server when you want RunAPI available inside an MCP host.
Use the CLI when you want direct shell commands, scripts, or CI integration.

---

## License

[Apache-2.0](LICENSE)

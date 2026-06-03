<h1 align="center">RunAPI MCP Server</h1>

<p align="center">
  <strong>AI image generation, video generation, music creation, text-to-speech, prompt search, and model discovery — 130+ models from Flux, Kling, Seedance, Veo, Suno, ElevenLabs, Claude, GPT, Gemini, and 18 providers in one MCP server.</strong>
</p>

<p align="center">
  <sub>Works with Claude Code, Codex, Cursor, Windsurf, VS Code, Roo Code, and any MCP-compatible host.</sub>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@runapi.ai/mcp"><img src="https://img.shields.io/npm/v/%40runapi.ai/mcp?style=flat-square&color=blue" alt="npm version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue?style=flat-square" alt="Apache-2.0 license"></a>
  <img src="https://img.shields.io/badge/Type-MCP_Server-blue?style=flat-square" alt="MCP Server">
  <img src="https://img.shields.io/badge/Models-130+-green?style=flat-square" alt="130+ models">
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
It lets an assistant browse the RunAPI catalog, inspect model inputs, check current pricing snapshots, create media tasks, poll task status, and check account balance.

The discovery tools work without an API key because they use the embedded build-time catalog.
Authenticated operations require `RUNAPI_API_KEY`.

This package is a pure client.
It does not run a local generation backend and does not require changes to your RunAPI account beyond creating an API key for authenticated tools.

---

## Quick Start

For Claude Code, Cursor, Windsurf, and VS Code, install RunAPI with Claude Code's MCP command:

```bash
claude mcp add runapi -s user -- npx -y @runapi.ai/mcp
```

The scope flag controls where the MCP server is stored:

- `-s user`: global, available in all projects for your user.
- `-s project`: team-shared, written to `.mcp.json` in the current repo so it can be committed.

Use project scope when you want the whole team to share the same server config:

```bash
claude mcp add runapi -s project -- npx -y @runapi.ai/mcp
```

Compatibility fallback for non-Claude Code platforms or manual JSON config:

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

If your host needs a generated config file, use the legacy `init` command as a fallback:

```bash
npx @runapi.ai/mcp init claude
npx @runapi.ai/mcp init cursor
npx @runapi.ai/mcp init vscode
npx @runapi.ai/mcp init windsurf
npx @runapi.ai/mcp init roo
```

Free catalog tools work even when `RUNAPI_API_KEY` is not configured.
For task creation and balance checks, create an API key in the RunAPI dashboard and expose it as `RUNAPI_API_KEY`.

---

## Tools

| Tool | Auth | Purpose |
|---|---|---|
| `list_models` | No | List RunAPI models from the embedded catalog. Supports `modality`, `service`, and `action` filters. |
| `get_model_info` | No | Return service, action, modality, input constraints, and pricing snapshot for a model slug. Use `service` + `action` when a model appears in multiple endpoints. |
| `list_actions` | No | Group endpoint action names by modality. |
| `check_pricing` | No | Return pricing snapshot data for a `service` + `action` + `model` combination. |
| `search_prompts` | No | Search reusable prompt examples by `modality`, `category`, `tags`, `q`, `model`, `featured`, and pagination. |
| `create_task` | Yes | Create a media task and optionally poll until completion. |
| `get_task` | Yes | Fetch status and latest payload for an existing media task. |
| `check_balance` | Yes | Return account balance and spending metrics. |

The catalog, pricing, and prompt search tools are designed for funnel-top discovery inside coding tools.
The task and balance tools are designed for authenticated workflows.

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

### Search Prompt Examples

```text
Find image prompt examples for a logo.
```

Expected behavior:

1. The assistant calls `search_prompts` with `modality: "image"` and `q: "logo"`.
2. It summarizes returned titles, prompt text, model slugs, categories, and tags.
3. It uses the selected prompt with `get_model_info` before creating a task.

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

## Catalog Coverage

The embedded catalog is generated from RunAPI's contract snapshot.
It includes media models, utility endpoints, and LLM model slugs for discovery.

| Modality | What To Use |
|---|---|
| Image | `list_models` with `modality: "image"` |
| Video | `list_models` with `modality: "video"` |
| Audio and music | `list_models` with `modality: "audio"` |
| LLM | `list_models` with `modality: "llm"` |
| Utility | `list_models` with `modality: "utility"` |

Catalog contents can change between releases.
Use `list_models` for current service/action/model slugs and `get_model_info` for each model's current constraints.
For LLM inference, connect through the RunAPI API or SDK directly.

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

### Claude Code, Cursor, Windsurf, And VS Code

Run:

```bash
claude mcp add runapi -s user -- npx -y @runapi.ai/mcp
```

Use `-s user` for a global install available in all projects.
Use `-s project` when you want Claude Code to write `.mcp.json` in the repo for team-shared config.

Restart or reload your MCP host after changing MCP configuration.

### Compatibility Fallback: Generated Config

Use `init` only when a host needs a platform-specific JSON file or cannot use the Claude Code MCP command.

Claude Code fallback:

```bash
npx @runapi.ai/mcp init claude
```

This writes `.mcp.json` in the current directory.

Cursor fallback:

```bash
npx @runapi.ai/mcp init cursor
```

This writes `.cursor/mcp.json`.
Open Cursor settings to verify the MCP server is enabled.

VS Code fallback:

```bash
npx @runapi.ai/mcp init vscode
```

This writes `.vscode/mcp.json`.
VS Code uses a top-level `servers` key and `type: "stdio"` in generated config.

Windsurf fallback:

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

Licensed under the [Apache License, Version 2.0](LICENSE).

# Changelog

## [v0.1.19](https://github.com/runapi-ai/mcp/releases/tag/v0.1.19) - 2026-07-18

### Fixed
- Remove retired Claude and Qwen model IDs from the aggregate MCP server.

## [v0.1.18](https://github.com/runapi-ai/mcp/releases/tag/v0.1.18) - 2026-07-17

### Changed
- Add Midjourney contract and pricing data to the aggregate MCP server.
- Include refreshed Midjourney pricing data and robust aggregate input-rule handling for required-only schemas.

## [v0.1.17](https://github.com/runapi-ai/mcp/releases/tag/v0.1.17) - 2026-07-16

### Changed
- Add Kling V3 Turbo text-to-video and image-to-video contract data to the aggregate MCP server.
- Read generated input rules from contract data and reject invalid Kling V3 Turbo parameter combinations before task creation.
- Refresh aggregate MCP contract and pricing data slices so Grok Imagine Video 1.5 Preview appears in model discovery and task creation.

## [v0.1.16](https://github.com/runapi-ai/mcp/releases/tag/v0.1.16) - 2026-07-08

### Changed
- Refresh bundled MCP contract and pricing data for current catalog models.

## [v0.1.15](https://github.com/runapi-ai/mcp/releases/tag/v0.1.15) - 2026-07-08

### Changed
- Publish aggregate MCP login onboarding, optional API key metadata, and refreshed server instructions.

## [v0.1.14](https://github.com/runapi-ai/mcp/releases/tag/v0.1.14) - 2026-07-08

### Changed
- Refresh aggregate contract data for the RunAPI MCP server.
- Publish the v0.1.14 MCP package and registry metadata.

## [v0.1.13](https://github.com/runapi-ai/mcp/releases/tag/v0.1.13) - 2026-06-24

### Fixed
- Refresh aggregate contract and pricing data for Seedance text-to-video.
- Add release smoke coverage so aggregate data must match the committed RunAPI contract and pricing sources before publishing.

## [v0.1.12](https://github.com/runapi-ai/mcp/releases/tag/v0.1.12) - 2026-06-24

### Changed
- Publish aggregate MCP server v0.1.12.
- Pin the package to @runapi.ai/mcp-core v0.1.3.
- Refresh package and MCP Registry metadata for this release.

## [v0.1.11](https://github.com/runapi-ai/mcp/releases/tag/v0.1.11) - 2026-06-24

### Changed
- Publish the aggregate server covering the full model catalog, aligned with the shared MCP runtime. Adds a committed lockfile so the repo CI and Docker build run npm ci.

## Legacy notes without GitHub Release provenance

### 0.1.9

- Internal: extracted reusable logic into the standalone `@runapi.ai/mcp-core` package; the server now consumes it. No change to tools, behavior, or output.

### 0.1.8

- Removed `chat` tool. LLM users should connect directly via SDK.

### 0.1.5

- Added free `search_prompts` tool backed by the RunAPI Prompt API.
- Added prompt search filters for modality, category, tags, query, model, featured, and pagination.
- Aligned Apache-2.0 package metadata and npm tarball contents for public release.

### 0.1.4

- Added Official MCP Registry metadata.

### 0.1.0

- Initial RunAPI MCP server.
- Added free catalog tools: `list_models`, `get_model_info`, `list_actions`, `check_pricing`.
- Added authenticated tools: `create_task`, `get_task`, `check_balance`.
- Added service route normalization for authenticated media task URLs.
- Added long-running media polling hardening for audio-like tasks.
- Added init command for Claude Code, Cursor, Windsurf, VS Code, and Roo.
- Added Claude Code plugin assets, manual eval scenarios, CI validation, Glama metadata, and distribution listing drafts.

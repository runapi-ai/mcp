# Changelog

## [v0.6.0](https://github.com/runapi-ai/mcp/releases/tag/v0.6.0) - 2026-07-23

### Added
- Stream asynchronous create_task waits over request-scoped SSE with heartbeats, optional client-token progress, and the terminal result in the same response.
- Return a non-error Task Reference Fallback with continuation fields when the 300-second Completion Wait deadline is reached.

### Fixed
- Keep synchronous and submit-only task calls on JSON responses, and never invent a progress token for clients that did not provide one.


## [v0.5.0](https://github.com/runapi-ai/mcp/releases/tag/v0.5.0) - 2026-07-23

### Breaking
- Require a caller-generated idempotency_key on every create_task call and preserve it as the RunAPI Idempotency-Key header.
  Migration: Generate one opaque key per logical task and reuse it only with identical input when retrying an unknown create result.

### Added
- Let Hosted MCP sessions check balance, create tasks without waiting, and query task status through request-scoped credentials.

### Fixed
- Preserve the created task ID and current status when optional polling times out or disconnects so callers can continue with get_task without recreating the task.


## [v0.3.0](https://github.com/runapi-ai/mcp/releases/tag/v0.3.0) - 2026-07-22

### Added
- Add inline Fish Audio reference samples to the aggregate speech contract.
- Add Suno lyric blending and its current contract metadata.
- Add Grok 4.3 and Grok 4.5 Responses support to the aggregate model contract.
- Add Flux image generation and editing contract data to aggregate model discovery and pricing lookup.

### Changed
- Refresh the embedded pricing data after the reviewed Suno generation pricing change.

### Removed
- Remove `gemini-3-pro-preview` from the aggregate MCP model contract.
  Migration: Choose another currently supported model ID; no replacement alias is provided.

### Fixed
- Sync Grok Imagine 1.5 Fast pricing metadata with the canonical catalog.


## [v0.2.1](https://github.com/runapi-ai/mcp/releases/tag/v0.2.1) - 2026-07-21

### Added
- Expose optional `seed` constraints for Seedance 1.5 Pro and V1 Pro Fast tools.

### Changed
- Refresh the embedded catalog and pricing data from the canonical RunAPI contract.


## [v0.2.0](https://github.com/runapi-ai/mcp/releases/tag/v0.2.0) - 2026-07-20

### Breaking
- Replace Grok Imagine image-to-video `source_image_urls` with scalar `source_image_url`.
  Migration: Set `source_image_url` to the source image URL when creating an image-to-video task.

### Added
- Refresh the aggregate contract and pricing data so `shorten_prompt` is available through the all-model MCP server.
- Include the current Grok Imagine Video 1.5 Fast contract and pricing data in the aggregate MCP server.
- Add Gemini TTS model discovery, input contracts, task creation, and task polling.
- Add Seedream 5 Pro text-to-image and edit-image models with model-specific validation.
- Expose advanced stem separation parameters and response metadata through the aggregate MCP server.

### Changed
- Publish Seedream 5-Lite output format metadata and model-specific validation in the aggregate MCP server.

### Fixed
- Enforce model-specific collection limits from the current RunAPI input contract.


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

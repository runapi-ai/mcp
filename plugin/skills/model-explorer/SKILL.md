---
name: RunAPI Model Explorer
description: >-
  Use when the user asks what RunAPI models are available, compares models,
  needs pricing, asks for required fields, searches by modality, or wants a
  recommendation. Triggers include "what models", "compare models", "cheapest",
  "pricing", "required params", "有哪些模型", "比较模型", and "价格".
allowed-tools: mcp__runapi__list_models, mcp__runapi__get_model_info, mcp__runapi__check_pricing
version: 0.1.0
author: RunAPI <support@runapi.ai>
license: Apache-2.0
compatibility: Designed for Claude Code
tags: [mcp, model-discovery, pricing, image-generation, video-generation]
---

# RunAPI Model Explorer

Use RunAPI catalog and pricing tools for discovery.

## Workflow

1. Call `mcp__runapi__list_models` with modality, service, or action filters when possible.
2. For a specific model, call `mcp__runapi__get_model_info`; when service/action are known, include them to get the exact endpoint constraints.
3. For cost questions, call `mcp__runapi__check_pricing`.
4. Summarize as a compact table.
5. End with one recommended service/action/model triple when the user wants to generate.

## Rules

- Do not quote stale prices.
- Do not mention hidden infrastructure providers.
- Do not overwhelm the user with the whole catalog unless they ask.
- Keep model slugs exactly as returned by tools.

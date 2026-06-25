---
name: RunAPI Media Generator
description: >-
  Use when the user asks to generate an image, create a video, make music,
  create audio, synthesize speech, submit a media task, poll a task, or
  produce generated media through RunAPI. Triggers include "generate an image",
  "create a video", "make music", "generate audio", "生成图片", "生成视频",
  "生成音乐", "创建音频", and "check this task".
allowed-tools: mcp__runapi__list_models, mcp__runapi__get_model_info, mcp__runapi__create_task, mcp__runapi__get_task
version: 0.1.0
author: RunAPI <support@runapi.ai>
license: Apache-2.0
compatibility: Designed for Claude Code
tags: [mcp, media, image-generation, video-generation, audio-generation]
---

# RunAPI Media Generator

Use RunAPI tools to turn a media request into a validated task.

## Workflow

1. Identify the modality and likely action.
2. Call `mcp__runapi__list_models` with the narrowest useful filter.
3. Choose a model from returned data, or ask one clarifying question if required.
4. Call `mcp__runapi__get_model_info` with the selected service, action, and model to validate params, constraints, and input rules.
5. For video, music, or batch requests, ask for confirmation before creating tasks.
6. Delegate creation to `task-executor`, or call `mcp__runapi__create_task` directly when delegation is unavailable.
7. Present task ID, status, output URLs, and cost fields when available.
8. Tell the user that RunAPI-generated file URLs are temporary and valid for 7 days, and that durable use requires downloading and storing the generated files in their own storage.

## Rules

- Do not invent model slugs.
- Do not hardcode prices.
- Do not retry task creation after timeout.
- Do not describe generated media as if you inspected it.
- Use `wait=false` when the user asks to submit only.
- Use `mcp__runapi__get_task` for follow-up status checks.
- For app/backend integrations, include a storage step for generated images, videos, audio, or other files before treating the workflow as production-ready.

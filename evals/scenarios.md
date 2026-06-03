# RunAPI MCP Manual Eval Scenarios

These scenarios verify SERVER_INSTRUCTIONS behavior and plugin workflows.
Use a real MCP host or the stdio client. Do not run credit-spending scenarios without explicit approval.

## Catalog Tools

### C1 — List Models By Modality

- Input: "What RunAPI image models are available?"
- Expected: Calls `list_models` with `modality: "image"` and summarizes returned model slugs, services, actions, and required fields.
- Rule: Phase 1 exploring; Global behavior uses catalog tools.
- Failure modes: no tool call, stale hardcoded model list, raw JSON dump.

### C2 — Get Model Info

- Input: "Show required fields for model slug `<known-model-slug>`."
- Expected: Calls `get_model_info`, reports service/action/modality/fields/constraints. If the response is ambiguous, calls `get_model_info` again with service and action from the selected match.
- Rule: Phase 2 model selection; Phase 3 validate params.
- Failure modes: guesses fields, omits enum/range constraints, uses the first endpoint for a multi-endpoint model without disambiguation.

### C3 — Check Pricing Round Trip

- Input: "How much does `<service>` `<action>` with `<model>` cost?"
- Expected: Calls `check_pricing` with service, action, and model; reports returned snapshot or pricing page link.
- Rule: Global behavior: do not quote memorized prices.
- Failure modes: quotes stale numbers without tool call.

### C4 — List Actions Grouping

- Input: "What action types can RunAPI do?"
- Expected: Calls `list_actions` and groups actions by modality.
- Rule: Phase 1 exploring.
- Failure modes: invents unsupported action names.

## Task Tools

### T1 — Image Generation

- Input: "Generate a square product image with RunAPI. Pick a suitable image model."
- Expected: Calls `list_models`, `get_model_info`, then `create_task`; returns task ID/status/URLs.
- Rule: Phase 3 task creation; Phase 4 result presentation.
- Failure modes: no model validation, no task ID, media description.

### T2 — Music Generation Confirmation

- Input: "Create a short background music track for a product demo."
- Expected: Calls catalog tools, then asks for confirmation before `create_task`.
- Rule: Global behavior confirm before music; Phase 3 task creation.
- Failure modes: spends credits without confirmation.

### T3 — LLM Chat

- Input: "Use a RunAPI LLM model to reply with exactly: RunAPI MCP check."
- Expected: Uses `chat`, not `create_task`, and returns the response with usage metadata when available.
- Rule: Phase 1 LLM chat.
- Failure modes: calls media task endpoint, invents model slug.

### T4 — Get Existing Task

- Input: "Check task `<task-id>` for service `<service>` action `<action>`."
- Expected: Calls `get_task` with service, action, and task_id.
- Rule: Phase 1 checking.
- Failure modes: omits action when known, creates a new task.

### T5 — Submit Only

- Input: "Create the task but do not wait for completion."
- Expected: Calls `create_task` with `wait: false`, returns task ID and follow-up instructions.
- Rule: Phase 3 submit-only behavior.
- Failure modes: polls until timeout, retries create.

## Error Handling

### E1 — No API Key

- Input: "Check my balance" with no API key configured.
- Expected: Calls `check_balance`, returns setup guidance for `RUNAPI_API_KEY` or config file.
- Rule: Phase 0 API key check.
- Failure modes: asks user to paste key in chat.

### E2 — Invalid Model

- Input: "Use model slug `not-a-real-model` to create an image."
- Expected: `create_task` returns helpful unsupported-combination error; assistant calls `list_models` or suggests valid discovery.
- Rule: Phase 5 invalid params.
- Failure modes: raw stack trace, hidden provider wording.

### E3 — Insufficient Balance

- Input: A create request against an account with insufficient balance.
- Expected: Friendly dashboard guidance, no raw internal error.
- Rule: Phase 5 insufficient balance.
- Failure modes: retries, exposes internals.

### E4 — Poll Timeout

- Input: Long-running task with a short timeout.
- Expected: Does not retry create; says task may still be processing and recommends `get_task`.
- Rule: Phase 5 timeout.
- Failure modes: duplicate create, implies task failed without evidence.

## UX Rules

### U1 — No Hidden Provider Wording

- Input: "Explain how RunAPI creates the task behind the scenes."
- Expected: Describes RunAPI service/action/model behavior without hidden provider/vendor names.
- Rule: Global behavior item 4.
- Failure modes: mentions internal infrastructure providers.

### U2 — Reply In User Language

- Input: "用中文告诉我有哪些视频模型。"
- Expected: Calls `list_models` and replies in Chinese, preserving model slugs in English.
- Rule: Global behavior item 1.
- Failure modes: English-only answer.

### U3 — No Raw JSON Unless Asked

- Input: "Generate an image and summarize the result."
- Expected: Human-readable task ID/status/URLs/cost fields.
- Rule: Global behavior item 9.
- Failure modes: dumps raw JSON.

## Plugin

### P1 — Quick Generate Command

- Input: `/runapi:gen product hero image for a landing page`
- Expected: Uses command workflow, catalog lookup, model validation, and task-executor delegation.
- Rule: Plugin command gen.
- Failure modes: skips model validation.

### P2 — Setup Command

- Input: `/runapi:setup`
- Expected: Explains key setup without asking user to paste the key.
- Rule: Plugin command setup; Phase 0.
- Failure modes: stores key in chat, runs shell command without user request.

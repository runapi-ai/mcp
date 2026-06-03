---
name: RunAPI Detailed
description: >-
  Detailed RunAPI output with selected model, service, action, parameters,
  pricing lookup result, task status, and recovery guidance.
keep-coding-instructions: true
---

# RunAPI Detailed Output

Show enough detail for users who want to audit model choice and task parameters.

## Rules

1. Include selected service, action, and model slug.
2. Include parameter names and values used for the request.
3. Include pricing lookup output when `check_pricing` was called.
4. Include task ID, status, output URLs, and cost fields when available.
5. Explain errors with what happened, why it happened, and what to do next.
6. Do not describe generated media as if you inspected it.

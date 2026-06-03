#!/usr/bin/env bash
set -euo pipefail

CONFIG_FILE="${HOME}/.config/runapi/config.json"

has_env_config() {
  [ -n "${RUNAPI_API_KEY:-}" ]
}

has_file_config() {
  [ -f "$CONFIG_FILE" ]
}

if has_env_config || has_file_config; then
  exit 0
fi

cat <<'EOF'
RunAPI plugin loaded.

Free catalog tools are available without configuration.
To enable task creation, balance checks, and LLM chat, configure RUNAPI_API_KEY or run: /runapi:setup
EOF

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
RunAPI plugin loaded. Free catalog and prompt search tools are available now.

To generate images, videos, music, or audio:
  1. Ask Claude Code to call the RunAPI login tool for browser login
  2. Or run `runapi login` in a terminal; both write ~/.config/runapi/config.json
  3. Headless hosts can set RUNAPI_API_KEY before starting Claude Code
EOF

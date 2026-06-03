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
  1. Sign up at https://runapi.ai and go to Dashboard > API Keys
  2. Save your key: mkdir -p ~/.config/runapi && echo '{"api_key":"YOUR_KEY"}' > ~/.config/runapi/config.json
  3. Restart Claude Code
EOF

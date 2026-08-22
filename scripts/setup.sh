#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 22+ is required." >&2
  exit 1
fi
major="$(node -p 'process.versions.node.split(`.`)[0]')"
if [ "$major" -lt 22 ]; then
  echo "Node.js 22+ is required; found $(node -v)." >&2
  exit 1
fi

for target in apps/web/.env.local apps/mcp-server/.env.local; do
  if [ ! -f "$target" ]; then
    cp .env.example "$target"
    echo "Created $target from .env.example"
  fi
done

npm install
npm run test
printf '\nRightPrice dependencies are installed. Configure apps/web/.env.local (and apps/mcp-server/.env.local for MCP), then run: npm run dev\n'

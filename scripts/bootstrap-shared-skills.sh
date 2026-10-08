#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="${RIGHTPRICE_SKILLS_DIR:-$ROOT/.runtime-skills/coden607}"
REPO="${RIGHTPRICE_SKILLS_REPO:-https://github.com/coden607/skills.git}"

log(){ printf '[skills] %s\n' "$*"; }
cleanup(){ :; }
trap cleanup EXIT INT TERM

mkdir -p "$(dirname "$DEST")"

if [ -d "$DEST/.git" ]; then
  log "syncing $REPO"
  git -C "$DEST" remote set-url origin "$REPO"
  git -C "$DEST" fetch --quiet --prune origin
  git -C "$DEST" checkout --quiet main
  git -C "$DEST" reset --hard --quiet origin/main
else
  if [ -e "$DEST" ]; then
    log "refusing to overwrite non-git path: $DEST" >&2
    exit 1
  fi
  log "cloning complete skills catalog"
  git clone --quiet --depth=1 "$REPO" "$DEST"
fi

count="$(find "$DEST" -name SKILL.md -type f | wc -l | tr -d ' ')"
log "ready: $count skills at $DEST"
printf '%s\n' "$DEST"

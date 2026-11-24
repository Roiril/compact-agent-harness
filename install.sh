#!/usr/bin/env bash
# 使い方: bash install.sh <対象フォルダ>   既存ファイルは上書きしない。~/.claude には触らない。
set -eu
src="$(cd "$(dirname "$0")" && pwd)"; dst="${1:?対象フォルダを指定してください}"
put() { if [ -e "$2" ]; then echo "skip $2"; else mkdir -p "$(dirname "$2")"; cp "$1" "$2"; echo "add  $2"; fi; }
put "$src/AGENTS.md" "$dst/AGENTS.md"
if [ -e "$dst/CLAUDE.md" ]; then
  grep -qxF '@AGENTS.md' "$dst/CLAUDE.md" || { printf '\n@AGENTS.md\n' >> "$dst/CLAUDE.md"; echo "link $dst/CLAUDE.md"; }
else put "$src/CLAUDE.md" "$dst/CLAUDE.md"; fi
for d in "$src"/skills/*/; do n="$(basename "$d")"
  put "$d/SKILL.md" "$dst/.claude/skills/$n/SKILL.md"; put "$d/SKILL.md" "$dst/.agents/skills/$n/SKILL.md"; done
put "$src/agents/code-auditor.md" "$dst/.claude/agents/code-auditor.md"

#!/usr/bin/env bash
# 使い方: bash install.sh <対象フォルダ>   既存ファイルは上書きしない。~/.claude には触らない。
set -eu
src="$(cd "$(dirname "$0")" && pwd)"; dst="${1:?対象フォルダを指定してください}"
put() { if [ -e "$2" ]; then echo "skip $2"; else mkdir -p "$(dirname "$2")"; cp "$1" "$2"; echo "add  $2"; fi; }
put "$src/AGENTS.md" "$dst/AGENTS.md"
if [ -e "$dst/CLAUDE.md" ]; then
  grep -qxF '@AGENTS.md' "$dst/CLAUDE.md" || { printf '\n@AGENTS.md\n' >> "$dst/CLAUDE.md"; echo "link $dst/CLAUDE.md"; }
else put "$src/CLAUDE.md" "$dst/CLAUDE.md"; fi
for d in "$src"/skills/*/; do
  n="$(basename "$d")"
  for f in "$d"SKILL.md "$d"references/*; do
    [ -f "$f" ] || continue
    r="${f#"$d"}"
    put "$f" "$dst/.claude/skills/$n/$r"; put "$f" "$dst/.agents/skills/$n/$r"
  done
done
put "$src/agents/code-auditor.md" "$dst/.claude/agents/code-auditor.md"
for t in contract-check check-kit; do put "$src/tools/$t.mjs" "$dst/tests/$t.mjs"; done
put "$src/templates/settings.json" "$dst/.claude/settings.json"

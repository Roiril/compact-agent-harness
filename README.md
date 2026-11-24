# compact-agent-harness

Claude Code と Codex で使う、短いコーディング用ハーネス。特定の課題の答えは含まない。

| 方法 | 入るもの |
|---|---|
| `bash install.sh <対象フォルダ>` | 規約、スキル、監査役。Claude Code と Codex の両方 |
| `claude plugin marketplace add Roiril/compact-agent-harness` のあと `claude plugin install compact-harness@compact-agent-harness` | スキル、監査役、安全 hook。Claude Code のみ。規約は入らない |

試験や業務で使う場合は、持ち込みが許可されているかを先に確認する。

スキル: `contract-first` `plan` `verify-api` `self-review` `finish`。検査は `node tests/guard.test.js`。

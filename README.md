# compact-agent-harness

Claude Code と Codex で使う、短いコーディング用ハーネス。特定の課題の答えは含まない。

| 方法 | 入るもの |
|---|---|
| `bash install.sh <対象フォルダ>` | 規約、スキル、監査役、契約の検査。Claude Code と Codex の両方 |
| `claude plugin marketplace add Roiril/compact-agent-harness` のあと `claude plugin install compact-harness@compact-agent-harness` | スキル、監査役、契約の検査、安全 hook。Claude Code のみ。規約は入らない |

試験や業務で使う場合は、持ち込みが許可されているかを先に確認する。

## 考え方

小さなモデルの弱点を、長い指示ではなく次の 3 つで補う。

- **機械検査**: `contract-check.mjs` が、契約の ID と検査の対応漏れを見つける
- **観点表**: `pitfalls` が、必要な分だけ読まれる
- **役割の分離**: 契約、検査、実装、レビューを分け、検査の期待値を実装から作らせない

## 順番

`contract-first` → `decide` → `plan` → `acceptance` → 実装 → `verify-api` → `self-review` → `finish`。詰まったら `debug`。

検査は `node tests/guard.test.js` と `node tests/contract-check.test.js`。

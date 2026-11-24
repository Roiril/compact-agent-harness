# compact-agent-harness

Claude Code と Codex で使う、短いコーディング用ハーネスです。特定の課題の答えは含みません。

| 導入方法 | 使えるもの |
|---|---|
| `bash install.sh <対象フォルダ>` | 規約、スキル、監査役、検査の道具、日本語の設定。Claude Code、Codex、Copilot Chat で使う |
| `claude plugin marketplace add Roiril/compact-agent-harness` の後に `claude plugin install compact-harness@compact-agent-harness` | スキル、監査役、検査の道具、安全 hook。Claude Code だけで使う。規約は入らない |

試験や業務で使う場合は、持ち込みが許可されているかを先に確認してください。

## 考え方

小さなモデルの弱点を、長い指示の代わりに次の 4 つで補います。

- 機械検査：`contract-check.mjs` が、仕様に対応する検査の漏れと、原文に無い根拠で「確定」にした行を見つける
- 検査の部品：`check-kit.mjs` が、起動、待機、停止、判定を受け持つ。`--fake` は、何も確かめていない検査を見つける
- 観点表：AI が `pitfalls` から必要な資料だけを読む
- 役割の分離：仕様の整理、検査、実装、レビューを分け、検査の期待値を実装から作らせない

## 使う順番

`contract-first` → `decide` → `plan` → `acceptance` → 実装 → `verify-api` → `self-review` → `finish` の順に使います。行き詰まったら `debug` を使います。

ハーネス自体のテストは次の 3 つのコマンドで実行します。

- `node tests/guard.test.js`
- `node tests/contract-check.test.js`
- `node tests/check-kit.test.js`

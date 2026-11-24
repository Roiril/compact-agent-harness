---
name: acceptance
description: 実装の前に、仕様の表から受け入れ検査を書く。仕様が固まった直後に使う。
---
1. 実装は読まない。根拠は `docs/contract.md` だけとする。確定の行を検査にし、未確定の行の検査は書かない。仮定の行の検査は名前に「仮定」と付ける。
2. `tests/check-kit.mjs` を必ず使う。プラグインで導入した場合は、先に `${CLAUDE_PLUGIN_ROOT}/tools/` から `tests/` へコピーする。起動、待機、停止、比較の処理を自分で書かず、`check-kit.mjs` の中身も読まない。使えないときは、自作せずに理由を報告して止まる。使い方は次の形だけとする。

```js
// tests/acceptance.check.mjs   実行: node tests/acceptance.check.mjs
import { suite } from './check-kit.mjs';
// start を書くと検査ごとに起動し直すので、データは毎回空から始まる。Compose などで先に起動しておく場合は書かない
const t = await suite({ base: 'http://localhost:8080', start: 'node server.js' });
t.check('C-03 負数は拒否', async () => {
  const r = await t.req('POST', '/items', { count: -1 });
  t.eq(r.status, 400);
});
await t.done();
```

3. 1 つのファイルを 1 回の Write で書き、修正もまとめて行う。検査名の文字列に仕様の ID を入れる。期待値は具体的な値で書く。計算で求める場合は、実装と同じ式を使わない。状態コードと本文の両方を確認する。
4. 各検査で必要なデータを作り、検査の順番に頼らない。start を書かない場合は、毎回新しい名前や ID を使う。再起動後にデータが残るかは、`await t.restart()` の前後で確認する。例のほかに、どの入力でも成り立つ条件を、仕様から言えるものだけ足す。乱数のシードは固定する。
5. `node tests/acceptance.check.mjs --fake` を実行し、「通ってしまった 0」になるまで検査を直す。「弱い検査」と出たら、状態コードか本文の期待値を足す。ここでは実装を作らない。
6. `node tests/contract-check.mjs` を実行し、漏れた ID を足す。

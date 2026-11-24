---
name: acceptance
description: 実装の前に、契約表から受け入れ検査を書く。契約が固まった直後に使う。
---
1. 実装は読まない。根拠は `docs/contract.md` だけ。確定の行を検査にし、未確定は書かない。仮定は名前に「仮定」と付ける。
2. `tests/check-kit.mjs` を必ず使う（プラグインで入れた場合は `${CLAUDE_PLUGIN_ROOT}/tools/` から `tests/` へコピーする）。起動、待機、停止、比較を自分で書かない。中身も読まない。使えないときは、自作せずに理由を報告して止まる。使い方は次だけ。

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

3. 1 ファイルを 1 回の Write で書き、直しもまとめて行う。検査名の文字列に契約 ID を入れる。期待値は具体値。計算で作るなら実装と同じ式を使わない。状態コードと本文の両方を見る。
4. 各検査は自分で必要なデータを作る。順番に頼らない。start を書かない場合は、毎回新しい名前や ID を使う。再起動後に残るかは `await t.restart()` の前後で見る。例のほかに不変条件を、契約から言えるものだけ足す。乱数は種を固定する。
5. `node tests/acceptance.check.mjs --fake` を実行する。「通ってしまった 0」になるまで検査を直す（「弱い検査」は、状態コードか本文の期待値を足す）。ここでは実装を作らない。
6. `node tests/contract-check.mjs` を実行し、漏れた ID を足す。

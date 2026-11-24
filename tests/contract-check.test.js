const { spawnSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const tool = path.join(__dirname, '../tools/contract-check.mjs');
const run = (rows, test, source, name = 'a.mjs') => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-'));
  fs.mkdirSync(d + '/docs'); fs.mkdirSync(d + '/tests');
  fs.writeFileSync(d + '/docs/contract.md', rows.map(r => `| ${r} |`).join('\n'));
  fs.writeFileSync(d + '/tests/' + name, test);
  if (source) fs.writeFileSync(d + '/docs/source.md', source);
  const r = spawnSync('node', [tool, d]).status;
  fs.rmSync(d, { recursive: true });
  return r;
};
const rows = ['C-01 | 正常 | a | 確定 | 課題文「件数を返す」', 'C-02 | 異常 | b | 確定 | tests/a.mjs', 'C-03 | 境界 | c | 未確定 | x'];
const good = "check('C-01 a');\ncheck('C-02 b');";
const cases = [
  ['揃う', 0, rows, good],
  ['漏れ', 1, rows, "check('C-01 a')"],
  ['コメントだけ', 1, rows, "check('C-01 a');\n// 'C-02'"],
  ['境界なし', 1, rows.slice(0, 2), good],
  ['重複', 1, [...rows, rows[0]], good],
  ['契約に無い', 1, rows, good + "\ncheck('C-09')"],
  ['引用が原文にある', 0, rows, good, '一覧は 件数を\n返す。'],
  ['引用が原文に無い', 1, rows, good, '合計を返す。'],
  ['通常の実装は根拠にならない', 1, [rows[0], 'C-02 | 異常 | b | 確定 | 通常の実装', rows[2]], good],
  ['無いファイルは根拠にならない', 1, [rows[0], 'C-02 | 異常 | b | 確定 | src/none.js', rows[2]], good],
  ['部品を使う', 0, [rows[0], rows[1].replace('tests/a.mjs', '課題文「拒否する」'), rows[2]], "import { suite } from './check-kit.mjs';\n" + good, undefined, 'acceptance.check.mjs'],
  ['部品を使わない', 1, [rows[0], rows[1].replace('tests/a.mjs', '課題文「拒否する」'), rows[2]], good, undefined, 'acceptance.check.mjs'],
  ['状態なし', 1, [...rows, 'C-04 | 正常 | d | OK | x'], good],
];
const bad = cases.filter(([, rc, r, t, s, f]) => run(r, t, s, f) !== rc).map(c => c[0]);
console.log(bad.length ? 'NG ' + bad : 'OK ' + cases.length);
process.exit(bad.length ? 1 : 0);

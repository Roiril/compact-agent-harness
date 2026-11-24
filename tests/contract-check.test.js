const { spawnSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const tool = path.join(__dirname, '../tools/contract-check.mjs');
const run = (rows, test) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-'));
  fs.mkdirSync(d + '/docs'); fs.mkdirSync(d + '/tests');
  fs.writeFileSync(d + '/docs/contract.md', rows.map(r => `| ${r} |`).join('\n'));
  fs.writeFileSync(d + '/tests/a.mjs', test);
  const r = spawnSync('node', [tool, d]).status;
  fs.rmSync(d, { recursive: true });
  return r;
};
const rows = ['C-01 | 正常 | a | 確定 | x', 'C-02 | 異常 | b | 確定 | x', 'C-03 | 境界 | c | 未確定 | x'];
const good = "check('C-01 a');\ncheck('C-02 b');";
const cases = [
  ['揃う', 0, rows, good],
  ['漏れ', 1, rows, "check('C-01 a')"],
  ['コメントだけ', 1, rows, "check('C-01 a');\n// 'C-02'"],
  ['境界なし', 1, rows.slice(0, 2), good],
  ['重複', 1, [...rows, rows[0]], good],
  ['契約に無い', 1, rows, good + "\ncheck('C-09')"],
  ['状態なし', 1, [...rows, 'C-04 | 正常 | d | OK | x'], good],
];
const bad = cases.filter(([, rc, r, t]) => run(r, t) !== rc).map(c => c[0]);
console.log(bad.length ? 'NG ' + bad : 'OK ' + cases.length);
process.exit(bad.length ? 1 : 0);

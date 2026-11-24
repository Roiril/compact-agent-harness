// 契約表の「確定」行が、検査名の文字列に出てくるかを調べる。使い方: node contract-check.mjs [プロジェクト]
// 中身の正しさは保証しない。漏れを見つけるための道具。
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] || '.';
const file = join(root, 'docs/contract.md');
if (!existsSync(file)) { console.log('NG docs/contract.md がありません'); process.exit(1); }

const rows = readFileSync(file, 'utf8').split(/\r?\n/).map(l => l.split('|').map(s => s.trim()))
  .filter(c => /^C-\d+$/.test(c[1] || ''))
  .map(c => ({ id: c[1], kind: c[2], state: c.slice(3).find(x => /^(確定|未確定|仮定)$/.test(x)) }));

const skip = new Set(['node_modules', '.git', '.claude', '.agents', 'docs', 'dist', 'build', 'vendor', '.venv']);
const tests = [];
(function walk(dir, inTest) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(e.name)) continue;
    const p = join(dir, e.name), t = inTest || /test|spec|check/i.test(e.name);
    if (e.isDirectory()) walk(p, t);
    else if (t && /\.(m?[jt]sx?|cjs|py|go|rb|java|kt|rs|php|sh|cs)$/.test(e.name)) tests.push(readFileSync(p, 'utf8'));
  }
})(root, false);

const found = new Set();
for (const t of tests) for (const line of t.split('\n')) {
  if (/^\s*(\/\/|#|\*)/.test(line)) continue;
  for (const m of line.matchAll(/(["'`]).*?\1/g)) for (const id of m[0].match(/C-\d+/g) || []) found.add(id);
}

const ids = rows.map(r => r.id), ng = [];
const report = (label, list) => { if (list.length) ng.push(`${label}: ${[...new Set(list)].join(' ')}`); };
if (!rows.length) ng.push('契約の行が 0 件');
report('ID の重複', ids.filter((x, i) => ids.indexOf(x) !== i));
report('状態の書き方が違う', rows.filter(r => !r.state).map(r => r.id));
report('検査が無い', rows.filter(r => r.state === '確定' && !found.has(r.id)).map(r => r.id));
report('契約に無い ID', [...found].filter(x => !ids.includes(x)));
for (const k of ['異常', '境界']) if (!rows.some(r => r.kind === k)) ng.push(`${k}の行が 0 件`);

const n = s => rows.filter(r => r.state === s).length;
console.log(`確定 ${n('確定')} / 仮定 ${n('仮定')} / 未確定 ${n('未確定')} / 検査あり ${ids.filter(x => found.has(x)).length}`);
console.log(ng.length ? ng.map(x => 'NG ' + x).join('\n') : 'OK');
process.exit(ng.length ? 1 : 0);

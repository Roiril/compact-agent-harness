const { mkdtempSync, writeFileSync, copyFileSync, rmSync } = require('fs');
const { spawnSync } = require('child_process');
const { join } = require('path');
const net = require('net');

const dir = mkdtempSync(join(require('os').tmpdir(), 'kit-'));
copyFileSync(join(__dirname, '..', 'tools', 'check-kit.mjs'), join(dir, 'check-kit.mjs'));
const port = 18000 + Math.floor(Math.random() * 2000);
writeFileSync(join(dir, 'server.js'), `let c=0;require('http').createServer((q,s)=>{if(q.url==='/count')return s.end(String(++c));s.setHeader('content-type','application/json');s.end(JSON.stringify({n:3}))}).listen(${port})`);

const run = (body, { start = 'node server.js', args = [], waitSec = 10, opt = '' } = {}) => {
  writeFileSync(join(dir, 'x.mjs'), `import { suite } from './check-kit.mjs';
const t = await suite({ base: 'http://localhost:${port}', start: ${JSON.stringify(start)}, waitSec: ${waitSec}${opt} });
${body}
await t.done();`);
  const r = spawnSync(process.execPath, ['x.mjs', ...args], { cwd: dir, encoding: 'utf8' });
  return { rc: r.status, out: r.stdout + r.stderr };
};
const good = `t.check('A', async () => { const r = await t.req('GET', '/'); t.eq(r.status, 200); t.eq(r.body, { n: 3 }); });`;
let bad = 0;
const is = (name, r, rc, text) => {
  const ok = r.rc === rc && (!text || r.out.includes(text));
  if (!ok) { bad++; console.log('NG', name, r); } else console.log('OK', name);
};

(async () => {
  is('正しい実装は 0', run(good), 0, '合格 1 / 1');
  const free = await new Promise(r => { const s = net.connect(port, '127.0.0.1'); s.on('connect', () => { s.destroy(); r(false); }); s.on('error', () => r(true)); });
  is('終わったら止まる', { rc: free ? 0 : 1, out: '' }, 0);
  is('期待違いは 1', run(good.replace('n: 3', 'n: 4')), 1, '期待 { n: 4 } / 実測 { n: 3 }');
  is('起動失敗は 2', run(good, { start: 'node nothing.js' }), 2, '起動の問題');
  is('応答なしは 2', run(good, { start: 'node -e "setTimeout(()=>{},20000)"', waitSec: 2 }), 2, '接続できない');
  is('検査の誤りを分ける', run(`t.check('B', async () => { undefinedName(); });`), 1, '検査の誤りの疑い');
  is('失敗時に要求と応答を出す', run(good.replace('n: 3', 'n: 4')), 1, 'GET /  → 200 { n: 3 }');
  is('検査ごとに状態が戻る', run(`for (const x of ['A', 'B']) t.check(x, async () => { const r = await t.req('GET', '/count'); t.eq(r.body, 1); });`), 0, '合格 2 / 2');
  is('fresh: false なら状態が残る', run(`for (const x of ['A', 'B']) t.check(x, async () => { const r = await t.req('GET', '/count'); t.eq(r.body, 1); });`, { opt: ', fresh: false' }), 1, '合格 1 / 2');
  is('--only で 1 件', run(good + `t.check('Z', async () => {});`, { args: ['--only', 'Z'] }), 0, '合格 1 / 1');
  is('0 件は 2', run(''), 2, '検査が 0 件');
  is('偽サーバーで全部落ちるなら 0', run(good, { args: ['--fake'] }), 0, '通ってしまった 0');
  is('何も見ない検査は偽サーバーで 1', run(good + `t.check('W', async () => { await t.req('GET', '/'); });`, { args: ['--fake'] }), 1, '弱い検査 W');
  is('件数が多くても偽サーバーが正常に終わる', run(Array.from({ length: 15 }, (_, i) => good.replace("'A'", `'A${i}'`)).join('\n') + `t.check('W', async () => { await t.req('GET', '/'); });`, { args: ['--fake'] }), 1, '落ちた 15 / 通ってしまった 1');
  is('壊れた検査は偽サーバーで 1', run(`t.check('B', async () => { undefinedName(); });`, { args: ['--fake'] }), 1, '検査の誤り 1');
  rmSync(dir, { recursive: true, force: true });
  process.exit(bad ? 1 : 0);
})();

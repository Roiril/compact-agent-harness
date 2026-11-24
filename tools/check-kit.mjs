// 受け入れ検査の部品。起動、待機、後始末、判定を受け持つ。依存なし（Node 18 以上）。
// 終了コード: 0 全部合格 / 1 期待と違う・検査の誤り / 2 起動や接続の問題（検査の中身は未確認）
// --only C-03 でその検査だけを実行する。--fake では、どの要求にも 418 を返す偽サーバーに対して実行する。合格した検査は「何も確かめていない」。
// start を書くと、検査ごとにサーバーを起動し直す（前の検査のデータが残らない）。遅いなら fresh: false にする。
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { isDeepStrictEqual, inspect } from 'node:util';

const show = v => inspect(v, { depth: 6, breakLength: Infinity }).slice(0, 300);
const sleep = ms => new Promise(r => setTimeout(r, ms));
// 接続が閉じ終わる前に process.exit すると Windows で異常終了するため、少し待つ
const quit = async rc => { console.log(`終了コード ${rc}`); process.exitCode = rc; await sleep(300); process.exit(rc); };
class Mismatch extends Error {}

export async function suite({ base = 'http://localhost:8080', start, waitSec = 60, fresh = true } = {}) {
  const fake = process.argv.includes('--fake');
  const at = process.argv.indexOf('--only'), only = at > 0 ? process.argv[at + 1] : '';
  let url = process.env.BASE_URL || base, child, server, log = '', trace = [];
  const cases = [];

  const alive = async () => {
    try { await fetch(url, { signal: AbortSignal.timeout(2000) }); return true; } catch { return false; }
  };
  const stop = async () => {
    server?.close(); server?.closeAllConnections?.();
    if (!child) return;
    const c = child, gone = c.exitCode !== null || c.signalCode ? null : new Promise(r => c.once('exit', r));
    child = undefined;
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(c.pid), '/T', '/F']);
    else try { process.kill(-c.pid, 'SIGKILL'); } catch {}
    if (gone) await Promise.race([gone, sleep(3000)]);
    for (let i = 0; i < 20 && await alive(); i++) await sleep(100);
  };
  const giveUp = async msg => {
    console.log(`起動の問題: ${msg}`);
    if (log.trim()) console.log(log.trim().split('\n').slice(-20).join('\n'));
    await stop(); await quit(2);
  };
  const boot = async () => {
    if (start) {
      if (await alive()) await giveUp(`${url} で別のものが既に動いている。止めてから実行する`);
      log = '';
      child = spawn(start, { shell: true, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
      for (const s of [child.stdout, child.stderr]) s.on('data', d => { log = (log + d).slice(-8000); });
    }
    const until = Date.now() + waitSec * 1000;
    while (!(await alive())) {
      if (child && child.exitCode !== null) await giveUp(`「${start}」が終了コード ${child.exitCode} で止まった`);
      if (Date.now() > until) await giveUp(`${waitSec} 秒待っても ${url} に接続できない`);
      await sleep(100);
    }
  };

  const t = {
    check(name, fn) { if (!only || name.includes(only)) cases.push([name, fn]); },
    eq(actual, expected, label = '') {
      if (!isDeepStrictEqual(actual, expected)) throw new Mismatch(`${label} 期待 ${show(expected)} / 実測 ${show(actual)}`.trim());
    },
    ok(cond, label) { if (!cond) throw new Mismatch(label || '条件を満たさない'); },
    async restart() { if (!fake && start) { await stop(); await boot(); } },
    async req(method, path, body, headers = {}) {
      const r = await fetch(url + path, {
        method, signal: AbortSignal.timeout(10000),
        headers: body === undefined ? headers : { 'content-type': 'application/json', ...headers },
        body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
      });
      const text = await r.text();
      let json = text;
      try { json = JSON.parse(text); } catch {}
      trace.push(`${method} ${path} ${body === undefined ? '' : show(body)} → ${r.status} ${show(json)}`);
      return { status: r.status, body: json, headers: r.headers };
    },
    async done() {
      if (!cases.length) await giveUp('検査が 0 件');
      if (fake) {
        server = createServer((q, s) => { q.resume(); s.writeHead(418, { connection: 'close' }); s.end('fake'); });
        await new Promise(r => server.listen(0, '127.0.0.1', r));
        url = `http://127.0.0.1:${server.address().port}`;
      }
      let pass = 0, broken = 0; const weak = [];
      for (const [i, [name, fn]] of cases.entries()) {
        if (!fake && (i === 0 || (start && fresh))) { await stop(); await boot(); }
        trace = [];
        try { await fn(); pass++; weak.push(name); if (!fake) console.log(`OK ${name}`); }
        catch (e) {
          const bug = e instanceof ReferenceError || e instanceof SyntaxError || (!fake && e instanceof TypeError && e.message !== 'fetch failed');
          if (bug) broken++;
          if (bug || !fake) console.log(`${bug ? '検査の誤りの疑い' : 'NG'} ${name}: ${e.message}`);
          if (!fake) {
            for (const l of trace.slice(-5)) console.log(`   ${l}`);
            if (e.message === 'fetch failed') console.log(`   応答が切れた。サーバーの出力: ${log.trim().split('\n').slice(-5).join(' / ')}`);
          }
        }
      }
      await stop();
      if (fake) {
        for (const n of weak) console.log(`弱い検査 ${n}`);
        console.log(`偽サーバー: ${cases.length} 件中、落ちた ${cases.length - pass} / 通ってしまった ${pass} / 検査の誤り ${broken}`);
        await quit(pass || broken ? 1 : 0);
      }
      console.log(`合格 ${pass} / ${cases.length}`);
      await quit(pass === cases.length ? 0 : 1);
    },
  };
  return t;
}

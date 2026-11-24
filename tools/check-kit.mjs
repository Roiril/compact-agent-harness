// 受け入れ検査の部品。起動、待機、後始末、判定を受け持つ。依存なし（Node 18 以上）。
// 終了コード: 0 全部合格 / 1 期待と違う・検査の誤り / 2 起動や接続の問題（検査の中身は未確認）
// --fake を付けると、何を聞いても 418 を返す偽サーバーに当てる。合格した検査は「何も確かめていない」。
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { isDeepStrictEqual, inspect } from 'node:util';

const show = v => inspect(v, { depth: 6, breakLength: Infinity }).slice(0, 400);
const sleep = ms => new Promise(r => setTimeout(r, ms));
class Mismatch extends Error {}

export async function suite({ base = 'http://localhost:8080', start, waitSec = 60 } = {}) {
  const fake = process.argv.includes('--fake');
  let url = process.env.BASE_URL || base, child, server, log = '';
  const cases = [];

  const alive = async () => {
    try { await fetch(url, { signal: AbortSignal.timeout(2000) }); return true; } catch { return false; }
  };
  const stop = () => {
    server?.close(); server?.closeAllConnections?.();
    if (!child || child.exitCode !== null) return;
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F']);
    else try { process.kill(-child.pid, 'SIGKILL'); } catch {}
  };
  const giveUp = msg => {
    console.log(`起動の問題: ${msg}`);
    if (log.trim()) console.log(log.trim().split('\n').slice(-20).join('\n'));
    stop(); process.exit(2);
  };

  const t = {
    check(name, fn) { cases.push([name, fn]); },
    eq(actual, expected, label = '') {
      if (!isDeepStrictEqual(actual, expected)) throw new Mismatch(`${label} 期待 ${show(expected)} / 実測 ${show(actual)}`.trim());
    },
    ok(cond, label) { if (!cond) throw new Mismatch(label || '条件を満たさない'); },
    async req(method, path, body, headers = {}) {
      const r = await fetch(url + path, {
        method, signal: AbortSignal.timeout(10000),
        headers: body === undefined ? headers : { 'content-type': 'application/json', ...headers },
        body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
      });
      const text = await r.text();
      let json = text;
      try { json = JSON.parse(text); } catch {}
      return { status: r.status, body: json, headers: r.headers };
    },
    async done() {
      if (!cases.length) giveUp('検査が 0 件');
      if (fake) {
        server = createServer((q, s) => { q.resume(); s.writeHead(418); s.end('fake'); });
        await new Promise(r => server.listen(0, '127.0.0.1', r));
        url = `http://127.0.0.1:${server.address().port}`;
      } else if (start) {
        if (await alive()) giveUp(`${url} で別のものが既に動いている。止めてから実行する`);
        child = spawn(start, { shell: true, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
        for (const s of [child.stdout, child.stderr]) s.on('data', d => { log = (log + d).slice(-8000); });
      }
      if (!fake) {
        const until = Date.now() + waitSec * 1000;
        while (!(await alive())) {
          if (child && child.exitCode !== null) giveUp(`「${start}」が終了コード ${child.exitCode} で止まった`);
          if (Date.now() > until) giveUp(`${waitSec} 秒待っても ${url} に接続できない`);
          await sleep(300);
        }
      }
      let pass = 0, broken = 0; const weak = [];
      for (const [name, fn] of cases) {
        try { await fn(); pass++; weak.push(name); if (!fake) console.log(`OK ${name}`); }
        catch (e) {
          const bug = e instanceof ReferenceError || e instanceof SyntaxError || (!fake && e instanceof TypeError && e.message !== 'fetch failed');
          if (bug) broken++;
          if (bug || !fake) console.log(`${bug ? '検査の誤りの疑い' : 'NG'} ${name}: ${e.message}`);
        }
      }
      stop();
      if (fake) {
        for (const n of weak) console.log(`弱い検査 ${n}`);
        console.log(`偽サーバー: ${cases.length} 件中、落ちた ${cases.length - pass} / 通ってしまった ${pass} / 検査の誤り ${broken}`);
        process.exit(pass || broken ? 1 : 0);
      }
      console.log(`合格 ${pass} / ${cases.length}`);
      process.exit(pass === cases.length ? 0 : 1);
    },
  };
  return t;
}

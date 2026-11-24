const { spawnSync } = require('child_process');
const path = require('path');
const run = c => spawnSync('node', [path.join(__dirname, '../hooks/guard.js')], { input: JSON.stringify({ tool_input: { command: c } }), encoding: 'utf8' }).stdout;
const deny = ['git add -A', 'git add . && git commit', 'git reset --hard HEAD', 'git push --force', 'env', 'ls; printenv', 'echo $API_KEY'];
const allow = ['git add src/a.js', 'git add .gitignore', 'git push', 'env FOO=1 node a.js', 'echo hi', 'docker compose up -d'];
const bad = [...deny.filter(c => !run(c).includes('deny')), ...allow.filter(c => run(c) !== '')];
console.log(bad.length ? 'NG ' + bad.join(' / ') : `OK ${deny.length + allow.length}`);
process.exit(bad.length ? 1 : 0);

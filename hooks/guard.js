// PreToolUse(Bash): 戻しにくい操作と秘密値の表示を止める。解析できない入力は通す。
let s = '';
process.stdin.on('data', d => (s += d)).on('end', () => {
  let c = '';
  try { c = String(JSON.parse(s).tool_input.command || ''); } catch { return; }
  const rules = [
    [/\bgit\s+add\s+(-A|--all|\.)(?=\s|$|[;&|])/, 'パスを指定して git add してください'],
    [/\bgit\s+reset\s+--hard\b/, 'git reset --hard は止めています'],
    [/\bgit\s+push\b[^;&|]*\s(--force|-f)(?=\s|$)/, 'force push は止めています'],
    [/(^|[;&|]\s*)(printenv|env)\s*($|[;&|])/, '環境変数の一覧は秘密値を含むため止めています'],
    [/\becho\b[^;&|]*\$\{?\w*(KEY|TOKEN|SECRET|PASSWORD)\b/, '秘密値の表示は止めています'],
  ];
  const hit = rules.find(([r]) => r.test(c));
  if (hit) console.log(JSON.stringify({ hookSpecificOutput: {
    hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: hit[1] } }));
});

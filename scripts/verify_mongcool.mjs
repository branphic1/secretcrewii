import fs from 'node:fs';

const html = fs.readFileSync('public/mongcool/index.html', 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

let failed = 0;
const ok = (msg) => console.log('✅ ' + msg);
const bad = (msg) => { console.log('❌ ' + msg); failed++; };

// 1) Syntax
console.log('\n=== 1) JS syntax ===');
try { new Function(script); ok('parses cleanly'); }
catch (e) { bad('parse error: ' + e.message); }

// 2) state.db.* keys all present in freshDB
console.log('\n=== 2) state.db keys vs freshDB ===');
const usedKeys = [...new Set([...script.matchAll(/state\.db\.([a-zA-Z]+)/g)].map(m => m[1]))];
const freshDBBlock = script.match(/function freshDB\(\) \{[\s\S]*?\n\}/)[0];
const freshKeys = [...freshDBBlock.matchAll(/^\s+([a-zA-Z]+):\s*/gm)].map(m => m[1]);
const allowedTop = new Set([...freshKeys, 'version', 'lastUpdated', 'filters']);
const orphan = usedKeys.filter(k => !allowedTop.has(k));
if (orphan.length === 0) ok(`all ${usedKeys.length} keys present in freshDB`);
else bad('orphan keys: ' + orphan.join(', '));

// 3) onclick handlers all defined
console.log('\n=== 3) onclick handlers ===');
const onclicks = [...new Set([...html.matchAll(/onclick="([a-zA-Z_$][\w$]*)\(/g)].map(m => m[1]))];
const definedFns = new Set();
// function decls
for (const m of script.matchAll(/^\s*function\s+([a-zA-Z_$][\w$]*)/gm)) definedFns.add(m[1]);
// window.X = / window['X'] =
for (const m of script.matchAll(/window\.([a-zA-Z_$][\w$]*)\s*=/g)) definedFns.add(m[1]);
// Object.assign(window, { ... }) — extract names from braces
const assignBlocks = [...script.matchAll(/Object\.assign\(window,\s*\{([\s\S]*?)\}\)/g)];
for (const blk of assignBlocks) {
  for (const m of blk[1].matchAll(/(?:^|,\s*|\n\s*)([a-zA-Z_$][\w$]*)(?=\s*[,}])/g)) definedFns.add(m[1]);
}
const missing = onclicks.filter(fn => !definedFns.has(fn));
if (missing.length === 0) ok(`all ${onclicks.length} handlers defined`);
else bad('missing: ' + missing.join(', '));

// 4) Inline onclick paren balance — only check static onclicks (no ${...} interpolation)
console.log('\n=== 4) inline onclick syntax (static only) ===');
let badOnclicks = 0;
let staticChecked = 0;
for (const m of html.matchAll(/onclick="([^"]+)"/g)) {
  const code = m[1];
  // Skip template-literal interpolations — those have runtime-substituted parens
  if (code.includes('${')) continue;
  staticChecked++;
  let p = 0;
  for (const ch of code) { if (ch === '(') p++; else if (ch === ')') p--; if (p < 0) break; }
  if (p !== 0) { badOnclicks++; if (badOnclicks <= 3) console.log('  unbalanced:', code.slice(0, 80)); }
}
if (badOnclicks === 0) ok(`${staticChecked} static onclick handlers all balanced`);
else bad(`${badOnclicks} unbalanced onclick handlers`);

// 5) Sample data shape compatibility (existing v1.1 → v1.2)
console.log('\n=== 5) loadDB v1.1 → v1.2 forward-compat ===');
const hasForwardCompat = /for \(const k of Object\.keys\(fresh\)\) if \(!\(k in db\)\) db\[k\] = fresh\[k\]/.test(script);
if (hasForwardCompat) ok('forward-compat present (missing collections auto-filled)');
else bad('forward-compat missing — existing users may break');

// 6) DB version bump
console.log('\n=== 6) DB version ===');
const ver = script.match(/const DB_VERSION = '([^']+)'/);
if (ver && ver[1] === '1.2') ok('DB_VERSION = 1.2');
else bad('DB_VERSION not 1.2: ' + (ver?.[1] || 'not found'));

// 7) New tabs route case all present
console.log('\n=== 7) router cases ===');
const switchBlock = script.match(/function render\(\)[\s\S]*?case 'settings'[\s\S]*?break;/)[0];
let missingTabs = 0;
for (const tab of ['schedule', 'orders', 'invoices', 'samples', 'defects', 'products', 'gallery', 'companies', 'parties', 'settings']) {
  if (!switchBlock.includes(`case '${tab}':`)) { bad('missing case: ' + tab); missingTabs++; }
}
if (missingTabs === 0) ok('all 10 tab cases present');

// 8) Render functions for new tabs exist
console.log('\n=== 8) renderXxx functions for new tabs ===');
for (const fn of ['renderSchedule', 'renderDefects', 'renderGallery', 'openProductDetail', 'openDefectModal', 'openDesignAssetModal', 'openEventModal']) {
  if (definedFns.has(fn)) ok(fn);
  else bad('missing: ' + fn);
}

// 9) Search bug fix: render functions should NOT call themselves on input
console.log('\n=== 9) search bug fix verification ===');
const searchPatterns = [
  ['renderSamples', /renderSamples/g],
  ['renderProducts', /renderProducts/g],
  ['renderOrders', /renderOrders/g],
  ['renderCompanies', /renderCompanies/g],
];
for (const [name, _re] of searchPatterns) {
  const fnBody = script.match(new RegExp(`function ${name}\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n\\}`));
  if (!fnBody) { bad(`${name} not found`); continue; }
  // Check that input.oninput does NOT trigger renderXxx() (full re-render = focus loss)
  const reRecursive = new RegExp(`oninput[\\s\\S]{0,100}${name}\\(`);
  if (reRecursive.test(fnBody[0])) bad(`${name}: oninput still triggers full re-render`);
  else ok(`${name}: oninput uses partial render (no focus loss)`);
}

console.log('\n=== SUMMARY ===');
if (failed === 0) console.log('🎉 All checks passed.');
else { console.log(`💥 ${failed} check(s) failed.`); process.exit(1); }

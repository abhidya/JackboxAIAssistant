const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');

function assertIncludes(content, needle, label) {
  if (!content.includes(needle)) throw new Error(`${label} missing ${needle}`);
}

for (const file of ['index.html', 'app.js', 'styles.css', 'jackbox-ai-connector.user.js']) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) throw new Error(`Missing ${file}`);
}

const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
new vm.Script(app, { filename: 'app.js' });
const userscriptFull = fs.readFileSync(path.join(root, 'jackbox-ai-connector.user.js'), 'utf8');
const userscript = userscriptFull.replace(/^\/\/ ==UserScript==[\s\S]*?^\/\/ ==\/UserScript==/m, '');
new vm.Script(userscript, { filename: 'jackbox-ai-connector.user.js' });

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
for (const needle of ['app.js', 'styles.css', 'jackbox-ai-connector.user.js', 'Install connector']) {
  assertIncludes(html, needle, 'index.html');
}

for (const needle of [
  '@match        https://jackbox.tv/*',
  '@match        https://abhidya.github.io/JackboxAIAssistant',
  '@match        https://abhidya.github.io/JackboxAIAssistant/',
  '@match        https://abhidya.github.io/JackboxAIAssistant/*',
  '@grant        GM_getValue',
  '@grant        GM_setValue',
  '@grant        GM_addValueChangeListener',
  'TO_DASHBOARD_KEY',
  'TO_JACKBOX_KEY',
  'HEARTBEAT_KEY',
  'JBA_BRIDGE_READY',
  'reconnect|connect',
  'startDashboardBridge()',
  'startJackboxAutomation()'
]) {
  assertIncludes(userscriptFull, needle, 'jackbox-ai-connector.user.js');
}

for (const needle of [
  'window.postMessage(message, "*")',
  'handleConnectorMessage',
  'bridgeReady',
  'JBA_BRIDGE_READY',
  'JBA_DASHBOARD_PING',
  'generateWebLLMAnswer',
  'engine.chat.completions.create',
  'JBA_PROMPT',
  'JBA_ANSWER'
]) {
  assertIncludes(app, needle, 'app.js');
}

for (const forbidden of [
  'function heuristicAnswer',
  'Built-in static generator',
  'Falling back to built-in generator'
]) {
  if (app.includes(forbidden) || html.includes(forbidden)) {
    throw new Error(`Dashboard static generator path still present: ${forbidden}`);
  }
}

for (const needle of [
  'Keep this dashboard open',
  'Jackbox tab is still required'
]) {
  assertIncludes(html, needle, 'index.html');
}

for (const needle of [
  'userscript storage events',
  'npm run check',
  'bridge contract',
  'WebLLM for dashboard generation'
]) {
  assertIncludes(readme, needle, 'README.md');
}

console.log('Static syntax and wiring checks passed.');

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');

for (const file of ['index.html', 'app.js', 'styles.css', 'jackbox-ai-connector.user.js']) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) throw new Error(`Missing ${file}`);
}

new vm.Script(fs.readFileSync(path.join(root, 'app.js'), 'utf8'), { filename: 'app.js' });
const userscript = fs.readFileSync(path.join(root, 'jackbox-ai-connector.user.js'), 'utf8')
  .replace(/^\/\/ ==UserScript==[\s\S]*?^\/\/ ==\/UserScript==/m, '');
new vm.Script(userscript, { filename: 'jackbox-ai-connector.user.js' });

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const needle of ['app.js', 'styles.css', 'jackbox-ai-connector.user.js', 'Install connector']) {
  if (!html.includes(needle)) throw new Error(`index.html missing ${needle}`);
}
console.log('Static syntax and wiring checks passed.');

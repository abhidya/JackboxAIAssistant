const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const file of ['index.html', 'app.js', 'styles.css', 'jackbox-ai-connector.user.js', 'README.md']) {
  fs.copyFileSync(path.join(root, file), path.join(dist, file));
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const sourcePath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(sourcePath, destPath);
    else fs.copyFileSync(sourcePath, destPath);
  }
}

copyDir(path.join(root, 'Assets'), path.join(dist, 'Assets'));
console.log(`Static GitHub Pages bundle written to ${path.relative(root, dist)}/`);

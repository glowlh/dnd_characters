const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');

const root = __dirname;
const files = [
  'index.html', 'party.html', 'character-generator.html', 'manifest.webmanifest', 'pwa.js',
  'assets/favicon.ico', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/D12.svg',
  'assets/fonts/CormorantSC-SemiBold.ttf',
  'character-sheets/styles.css', 'character-sheets/sheet-engine.js',
  'character-sheets/sheet-ui.js', 'character-sheets/theme.js',
];

for (const folder of fs.readdirSync(path.join(root, 'character-sheets'), {withFileTypes: true})) {
  if (!folder.isDirectory()) continue;
  for (const name of ['index.html', 'level-2.html']) {
    const file = 'character-sheets/' + folder.name + '/' + name;
    if (fs.existsSync(path.join(root, file))) files.push(file);
  }
}

const workerPath = path.join(root, 'sw.js');
const worker = fs.readFileSync(workerPath, 'utf8');
const releaseLine = /^const RELEASE = .*;$/m;
if (!releaseLine.test(worker)) throw new Error('Не найдена строка RELEASE в sw.js.');

const hash = createHash('sha256');
hash.update(worker.replace(releaseLine, 'const RELEASE = null;').replace(/\r\n/g, '\n'));
for (const file of files.sort()) {
  hash.update(file + '\0');
  const bytes = fs.readFileSync(path.join(root, file));
  hash.update(/\.(?:html|css|js|webmanifest)$/.test(file)
    ? bytes.toString('utf8').replace(/\r\n/g, '\n')
    : bytes);
  hash.update('\0');
}
const release = {version: hash.digest('hex').slice(0, 16), files};
const generated = worker.replace(releaseLine, () => 'const RELEASE = ' + JSON.stringify(release) + ';');
if (worker !== generated) fs.writeFileSync(workerPath, generated);
console.log('PWA ' + release.version + ' · ' + files.length + ' файлов');

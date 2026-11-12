const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');

const root = __dirname;
const files = [
  'index.html', 'party.html', 'character-generator.html', 'class-quiz.html', 'manifest.webmanifest', 'pwa.js',
  'assets/favicon.ico', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/D12.svg',
  'assets/party-icon.svg', 'assets/quiz-icon.svg',
  'assets/fonts/CormorantSC-SemiBold.ttf',
  'assets/aelt-profile.png', 'assets/naestriel-profile.png', 'assets/nettlin-profile.png', 'assets/vega-profile.png',
  'character-sheets/styles.css', 'character-sheets/sheet-engine.js',
  'character-sheets/sheet-ui.js', 'character-sheets/theme.js',
];

for (const folder of fs.readdirSync(path.join(root, 'character-sheets'), {withFileTypes: true})) {
  if (!folder.isDirectory()) continue;
  for (const name of ['index.html', 'level-2.html', 'character.json']) {
    const file = 'character-sheets/' + folder.name + '/' + name;
    if (fs.existsSync(path.join(root, file))) files.push(file);
  }
}

// Keep the party data available when party.html is opened directly or offline.
const party = files.filter(file => file.startsWith('character-sheets/') && file.endsWith('/character.json')).map(file => {
  const {main} = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  const blocks = main.flatMap(page => page.columns.flat());
  const combat = new Map(blocks.find(block => block.title === 'Боевые показатели').rows);
  const magic = blocks.find(block => block.title === 'Использование заклинаний');
  return {
    name: main[0].title,
    href: file.replace(/character\.json$/, 'index.html'),
    abilities: main[0].scores,
    perception: Number(combat.get('Пассивное Восприятие')),
    hp: Number(combat.get('Максимум хитов')),
    armorClass: Number(combat.get('Класс доспеха')),
    spellDc: Number(magic?.paragraphs[0].match(/Сл (\d+)/)?.[1]) || null,
  };
});
const partyPath = path.join(root, 'party.html');
const partyHtml = fs.readFileSync(partyPath, 'utf8');
const partyData = /(<script type="application\/json" id="party-data">)[\s\S]*?(<\/script>)/;
if (!partyData.test(partyHtml)) throw new Error('Не найден блок party-data в party.html.');
const updatedParty = partyHtml.replace(partyData, (_, start, end) =>
  start + '\n' + JSON.stringify(party, null, 2).replace(/</g, '\\u003c') + '\n  ' + end
);
if (partyHtml !== updatedParty) fs.writeFileSync(partyPath, updatedParty);

const workerPath = path.join(root, 'sw.js');
const worker = fs.readFileSync(workerPath, 'utf8');
const releaseLine = /^const RELEASE = .*;$/m;
if (!releaseLine.test(worker)) throw new Error('Не найдена строка RELEASE в sw.js.');

const hash = createHash('sha256');
hash.update(worker.replace(releaseLine, 'const RELEASE = null;').replace(/\r\n/g, '\n'));
for (const file of files.sort()) {
  hash.update(file + '\0');
  const bytes = fs.readFileSync(path.join(root, file));
  hash.update(/\.(?:html|css|js|json|webmanifest)$/.test(file)
    ? bytes.toString('utf8').replace(/\r\n/g, '\n')
    : bytes);
  hash.update('\0');
}
const release = {version: hash.digest('hex').slice(0, 16), files};
const generated = worker.replace(releaseLine, () => 'const RELEASE = ' + JSON.stringify(release) + ';');
if (worker !== generated) fs.writeFileSync(workerPath, generated);
console.log('PWA ' + release.version + ' · ' + files.length + ' файлов');

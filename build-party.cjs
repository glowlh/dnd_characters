const fs = require('node:fs');
const path = require('node:path');

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

function renderParty(projectDir) {
  const sheets = path.join(projectDir, 'character-sheets');
  const engine = require(path.join(sheets, 'sheet-engine.js'));
  const characters = [];

  for (const folder of fs.readdirSync(sheets, {withFileTypes: true})) {
    if (!folder.isDirectory()) continue;
    const file = path.join(sheets, folder.name, 'index.html');
    if (!fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, 'utf8');
    const read = id => {
      const match = html.match(new RegExp('<script\\b[^>]*\\bid="' + id + '"[^>]*>([\\s\\S]*?)</script>'));
      if (!match) throw new Error('Не найдены данные ' + id + ' в ' + file);
      return JSON.parse(match[1]);
    };
    const source = engine.parse(read('character-json'));
    const base = engine.context(source, read('rules-config'), 1, read('spell-catalog'));
    characters.push({folder: folder.name, base});
  }

  if (!characters.length) throw new Error('Листы персонажей не найдены.');
  characters.sort((a, b) => a.base.identity.name.localeCompare(b.base.identity.name, 'ru'));
  const abilities = Object.entries(engine.ABILITIES);
  const headers = ['Персонаж', ...abilities.map(([, name]) => name), 'Пассивное Восприятие', 'Макс. хитов', 'КД', 'Сл заклинаний', 'Модификатор Телосложения'];
  const rows = characters.map(({folder, base}) => {
    const href = 'character-sheets/' + encodeURIComponent(folder) + '/index.html';
    const values = abilities.map(([key]) => {
      const {score, signed} = base.abilities[key];
      return score + ' (' + signed + ')';
    });
    values.push(base.combat.passivePerception, base.vitality.hpMax, base.combat.ac);
    values.push(base.spellcasting.dc, base.abilities.con.signed);
    return '          <tr><th scope="row"><a href="' + href + '">' +
      escapeHtml(base.identity.name) + '</a></th>' +
      values.map(value => '<td>' + escapeHtml(value) + '</td>').join('') + '</tr>';
  });

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Сводка группы · D&amp;D</title>
  <script src="character-sheets/theme.js"></script>
  <link rel="stylesheet" href="character-sheets/styles.css">
</head>
<body>
  <main class="sheets">
    <article class="sheet party-sheet">
      <div class="masthead"><span>Dungeons &amp; Dragons</span><span>5e</span></div>
      <header>
        <a href="index.html">Все листы персонажей</a>
        <h1>Сводка группы</h1>
        <p>Первый уровень</p>
      </header>
      <div class="party-table-wrap" tabindex="0" role="region" aria-label="Характеристики группы">
        <table class="data-table party-table" aria-label="Характеристики группы на первом уровне">
          <thead>
            <tr>${headers.map(title => '<th scope="col">' + title + '</th>').join('')}</tr>
          </thead>
          <tbody>
${rows.join('\n')}
          </tbody>
        </table>
      </div>
    </article>
  </main>
</body>
</html>
`;
}

if (require.main === module) {
  const html = renderParty(__dirname);
  fs.writeFileSync(path.join(__dirname, 'party.html'), html);
}
module.exports = {renderParty};


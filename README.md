# D&D Character Sheets

Open [`index.html`](index.html) in your browser to browse the finished character sheets.

The `dnd-character-sheets` skill turns a JSON export from mycharacterbuilder.com (Long Story Short) into a ready-to-use `character.json` and two HTML files formatted for A4 printing. Both pages read the same JSON over HTTP(S). The `main` section holds the level 1 sheet, and `appendix` holds the level 2 supplement. Opening an HTML file directly uses the snapshot embedded when it was generated.

## Generate Sheets in Codex

Open the project in Codex. Codex automatically discovers the skill in [`.agents/skills/dnd-character-sheets/`](.agents/skills/dnd-character-sheets/SKILL.md).

Include the path to the character's JSON file in your prompt. For example:

> Use $dnd-character-sheets to generate character sheets for `heroes/Дима - Аэльт.json`.

## Rebuild Sheets from the Terminal

If the character already has a `rules.json` file, run the following command from the project root. It requires Node.js.

```powershell
node .agents/skills/dnd-character-sheets/scripts/render-sheets.cjs --input 'heroes/Дима - Аэльт.json' --config character-sheets/aelt/rules.json --output character-sheets/aelt
```

Open the HTML files in `character-sheets/aelt/` in your browser. To print, press `Ctrl+P`, select A4 paper and portrait orientation, set the scale to 100%, and turn off headers and footers.

## PWA on GitHub Pages

Open the published site over HTTPS and install it from your browser's menu. On your first online visit, the app caches the home page, party overview, and character sheets for offline use. To test locally, serve the project over HTTP on `localhost`.

After editing a finished `character.json` or the party overview, run this command to update the offline cache version. Rebuilding a character from the original export regenerates its JSON and both HTML snapshots.

```powershell
node build-pwa.cjs
```

Publish the updated `sw.js` with the rest of the files. If a new version downloads while the app is open, an update button labeled **Обновить** appears. Click it to activate the new version and reload the page. If the update is already ready, it may also apply automatically the next time you open the app.

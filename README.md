# Листы персонажей D&D

Откройте [`index.html`](index.html) в браузере, чтобы перейти к готовым листам персонажей.

Скилл `dnd-character-sheets` создаёт из JSON-экспорта mycharacterbuilder.com / Long Story Short два HTML-файла для печати на A4. `index.html` — лист 1-го уровня с характеристиками, способностями и заклинаниями. `level-2.html` — дополнение с изменениями на 2-м уровне.

## Запуск в Codex

Откройте проект в Codex. Скилл находится в [`.agents/skills/dnd-character-sheets/`](.agents/skills/dnd-character-sheets/SKILL.md) и подключается автоматически.

Укажите в запросе путь к JSON персонажа, например:

> Используй $dnd-character-sheets и создай листы для `heroes/Дима - Аэльт.json`.

## Пересборка из терминала

Если для персонажа уже есть `rules.json`, запустите из корня проекта команду ниже. Для неё нужен Node.js.

```powershell
node .agents/skills/dnd-character-sheets/scripts/render-sheets.cjs --input 'heroes/Дима - Аэльт.json' --config character-sheets/aelt/rules.json --output character-sheets/aelt
```

Откройте HTML-файлы из папки `character-sheets/aelt/` в браузере. Для печати выберите `Ctrl+P`, формат A4, книжную ориентацию и масштаб 100%, затем отключите колонтитулы.

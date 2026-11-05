// Repackage the source JSON using the common skill templates; no page data here.
const path=require('node:path');
const {packageSheets}=require('../../.agents/skills/dnd-character-sheets/scripts/render-sheets.cjs');
const input=process.argv[2]||path.resolve(__dirname,'../../heroes/Дима - Аэльт.json');
const {views,...result}=packageSheets(input,path.join(__dirname,'rules.json'),__dirname);
console.log(JSON.stringify(result,null,2));

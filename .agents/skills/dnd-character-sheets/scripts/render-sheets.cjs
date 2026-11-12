// Calculate character data once and package it with the shared browser template.
const fs=require('node:fs'),path=require('node:path');
const {args,load}=require('./lib.cjs');
const assetDir=path.resolve(__dirname,'../assets');
const engine=require('../assets/sheet-engine.js');
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const inline=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function validateBindings(views){
 for(const page of [...views.main,...views.appendix]){
  if(page.badge===undefined)throw Error('Страница без badge (шаблон шапки): '+page.title);
  for(const col of page.columns)for(const block of col)for(const template of block.paragraphs||[])
   for(const [,key]of template.matchAll(/{{\s*([a-zA-Z0-9_.]+)\s*}}/g))if(engine.get(page.ctx,key)===undefined)throw Error('Missing template variable '+key);
 }
}
function packageSheets(input,configFile,output){
 const source=load(input),config=configFile?readJson(configFile):{};
 if(config.main||config.appendix||config.meta)throw Error('Static sheet models are no longer accepted. Supply rules/choices with --config, not prefilled pages.');
 const spells={...readJson(path.join(assetDir,'spells.json')),...config.spells};
 const rules={...config,itemRules:{...readJson(path.join(assetDir,'items.json')),...config.itemRules}};
 const views=engine.build(source.root,rules,spells);validateBindings(views);
 const preparePages=pages=>pages.map(({ctx,columns,...page})=>({
  ...page,
  columns:columns.map(column=>column.map(block=>block.paragraphs?{
   ...block,
   paragraphs:block.paragraphs.map(text=>text.replace(/{{\s*([a-zA-Z0-9_.]+)\s*}}/g,(_,key)=>escape(engine.get(ctx,key))))
  }:block))
 }));
 const data={main:preparePages(views.main),appendix:preparePages(views.appendix)};
 const template=fs.readFileSync(path.join(assetDir,'page-template.html'),'utf8');
 const snapshot=inline(data);
 const render=mode=>template.replaceAll('@@MODE@@',()=>mode)
  .replace('@@LEVEL_LINK@@',mode==='base'
   ?'  <a class="sheet-level-link" href="level-2.html">2-й уровень</a>'
   :'  <a class="sheet-level-link" href="index.html">1-й уровень</a>')
  .replaceAll('@@CHARACTER_JSON@@',()=>snapshot);
 const out=path.resolve(output);
  const sharedDirectory=path.dirname(out),sharedStyles=path.join(sharedDirectory,'styles.css');
  if(path.basename(sharedDirectory)!=='character-sheets')throw Error('Output must be character-sheets/<character-folder>; shared scripts and styles live in character-sheets/.');
  if([input,configFile].filter(Boolean).some(file=>path.resolve(file)===sharedStyles))throw Error('Shared stylesheet would overwrite an input');
  for(const file of ['index.html','level-2.html','character.json'])if(path.resolve(input)===path.join(out,file)||configFile&&path.resolve(configFile)===path.join(out,file))throw Error('Output would overwrite an input');
  for(const file of ['styles.css','sheet-engine.js','sheet-ui.js','theme.js',path.basename(out)+'.review.json'])if(path.resolve(input)===path.join(sharedDirectory,file)||configFile&&path.resolve(configFile)===path.join(sharedDirectory,file))throw Error('Shared file would overwrite an input');
  fs.mkdirSync(out,{recursive:true});
  const character=path.join(out,'character.json');
  fs.writeFileSync(character,JSON.stringify(data,null,2)+'\n');
  fs.writeFileSync(path.join(out,'index.html'),render('base'));
  fs.writeFileSync(path.join(out,'level-2.html'),render('advancement'));
  // Seed once: rebuilding a character must preserve edits to the shared stylesheet.
  if(!fs.existsSync(sharedStyles))fs.copyFileSync(path.join(assetDir,'styles.css'),sharedStyles);
  for(const file of ['sheet-engine.js','sheet-ui.js'])fs.copyFileSync(path.join(assetDir,file),path.join(sharedDirectory,file));
  const sharedTheme=path.join(sharedDirectory,'theme.js');
  if(!fs.existsSync(sharedTheme))fs.copyFileSync(path.join(assetDir,'theme.js'),sharedTheme);
  fs.writeFileSync(path.join(sharedDirectory,path.basename(out)+'.review.json'),JSON.stringify({sourceSha256:source.sha256,characterName:source.name,rulesEdition:source.root.edition||config.rulesEdition||'2024',sources:config.sources||[],notes:config.notes||[],pipeline:'source JSON -> calculated character.json -> HTML templates in browser'},null,2));
  return {character,main:path.join(out,'index.html'),appendix:path.join(out,'level-2.html'),styles:sharedStyles,review:path.join(sharedDirectory,path.basename(out)+'.review.json'),pages:{main:views.main.length,appendix:views.appendix.length},views};
}
function main(){const a=args(process.argv.slice(2));if(a.model)throw Error('--model is obsolete: use --config rules.json.');if(!a.input||!a.output)throw Error('Usage: node render-sheets.cjs --input character.json --config rules.json --output directory');const {views,...result}=packageSheets(a.input,a.config,a.output);console.log(JSON.stringify(result,null,2));}
if(require.main===module){try{main();}catch(e){console.error(e.stack||e.message);process.exitCode=1;}}
module.exports={packageSheets,validateBindings};

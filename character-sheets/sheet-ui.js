(function(){
 'use strict';
 const engine=globalThis.DndSheetEngine;
 function resolve(context,path){const value=engine.get(context,path);if(value===undefined)throw Error('Не задана переменная шаблона: '+path);return value;}
 const format=(text,ctx,escape=x=>x)=>String(text).replace(/{{\s*([a-zA-Z0-9_.]+)\s*}}/g,(_,path)=>escape(String(resolve(ctx,path))));
 const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function safeRich(html){return html.split(/(<\/?(?:p|b|strong|i|em)>|<br\s*\/?>)/gi).map(t=>/^<\/?(?:p|b|strong|i|em)>$|^<br\s*\/?>$/i.test(t)?t:escape(t).replace(/&amp;(amp|lt|gt|quot|apos|#39|#\d+|#x[0-9a-f]+);/gi,'&$1;')).join('');}
 function instantiate(id,ctx){
  const template=document.getElementById(id);if(!(template instanceof HTMLTemplateElement))throw Error('Нет HTML-шаблона '+id);
  const fragment=template.content.cloneNode(true),walker=document.createTreeWalker(fragment,NodeFilter.SHOW_TEXT);
  while(walker.nextNode())walker.currentNode.textContent=engine.normalize(format(walker.currentNode.textContent,ctx));
  return fragment;
 }
 function textParagraph(value){const p=document.createElement('p');p.textContent=engine.normalize(value);return p;}
 function tableView(block){
  const fragment=instantiate('table-template',{}),table=fragment.querySelector('table');
  if(block.header?.includes('Урон')&&block.header?.includes('Тип атаки'))table.classList.add('attacks-table');
  if(block.header?.length){const row=document.createElement('tr');for(const h of block.header){const th=document.createElement('th');th.textContent=engine.normalize(h);if(h==='Урон')th.className='damage-heading';row.append(th);}table.tHead.append(row);}else table.tHead.remove();
  const span=block.header?.length||Math.max(0,...block.rows.filter(Array.isArray).map(r=>r.length));
  for(const values of block.rows){
   const row=document.createElement('tr');
   if(values&&!Array.isArray(values)&&values.header){const td=document.createElement('td');td.colSpan=span;td.className='group-row';td.textContent=engine.normalize(values.header);row.append(td);table.tBodies[0].append(row);continue;}
   for(const value of values){const td=document.createElement('td');td.textContent=engine.normalize(value);row.append(td);}
   table.tBodies[0].append(row);
  }
  return fragment;
 }
 function blockView(block){
  const fragment=instantiate('section-template',{title:block.title}),view=fragment.querySelector('.panel'),body=fragment.querySelector('[data-slot="content"]');
  if(block.cost){const mark=document.createElement('span');mark.className='cost-mark';mark.textContent=engine.normalize(block.cost);view.append(mark);}
  if(block.summary)view.classList.add('summary');
  if(block.rows?.length)view.classList.add('with-table');
  for(const text of block.text||[])if(text)body.append(textParagraph(text));
  for(const paragraph of block.paragraphs||[]){const p=document.createElement('p');p.innerHTML=safeRich(engine.normalize(paragraph));body.append(p);}
  if(block.rows?.length)body.append(tableView(block));
  return fragment;
 }
 function pageView(page,index,count){
  const fragment=instantiate('page-template',{...page,number:index+1,count}),abilitySlot=fragment.querySelector('[data-slot="abilities"]');
  if(page.scores?.length)for(const ability of page.scores)abilitySlot.append(instantiate('ability-template',ability));else abilitySlot.remove();
  const columns=fragment.querySelector('[data-slot="columns"]');columns.classList.add('columns-'+page.columns.length);
  const wideBlocks=page.columns.flat().filter(block=>block.span===2);
  if(wideBlocks.length){
   columns.classList.add('has-wide-blocks');
   const wide=document.createElement('div');wide.className='wide-blocks';
   for(const block of wideBlocks)wide.append(blockView(block));
   columns.append(wide);
  }
  page.columns.forEach((blocks,i)=>{const column=document.createElement('div');column.className='sheet-column column-'+i;for(const block of blocks)if(block.span!==2)column.append(blockView(block));columns.append(column);});
  return fragment;
 }
 async function readCharacter(){
  if(location.protocol==='file:')return JSON.parse(document.getElementById('character-json').textContent);
  const response=await fetch('character.json',{cache:'no-store'});
  if(!response.ok)throw Error('Данные персонажа недоступны.');
  return response.json();
 }
 async function start(){
  const views=await readCharacter();
  const mode=document.documentElement.dataset.mode,pages=mode==='advancement'?views.appendix:views.main;
  document.title=views.main[0].title+' · '+(mode==='advancement'?'2-й':'1-й')+' уровень';
  const target=document.getElementById('sheets');target.replaceChildren(...pages.map((page,i)=>pageView(page,i,pages.length)));
  document.documentElement.dataset.ready='true';
  globalThis.dndSheet={views,render:()=>target.replaceChildren(...pages.map((page,i)=>pageView(page,i,pages.length)))};
 }
 start().catch(error=>{const target=document.getElementById('load-error');target.hidden=false;target.textContent='Лист не заполнен: '+error.message;document.documentElement.dataset.ready='error';});
})();

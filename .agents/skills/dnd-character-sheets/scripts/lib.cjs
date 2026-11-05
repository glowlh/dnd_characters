const fs=require('node:fs'),crypto=require('node:crypto');
const abilities=['str','dex','con','int','wis','cha'];
function args(argv){const out={};for(let i=0;i<argv.length;i+=2){if(!argv[i].startsWith('--')||!argv[i+1]||argv[i+1].startsWith('--'))throw Error('Expected --key value');if(out[argv[i].slice(2)])throw Error('Duplicate argument');out[argv[i].slice(2)]=argv[i+1];}return out;}
function load(input){
 const bytes=fs.readFileSync(input),root=JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''));
 const sheet=typeof root.data==='string'?JSON.parse(root.data):root.data||root;
 if(!sheet||typeof sheet!=='object'||!sheet.info||!sheet.stats)throw Error('Expected a character sheet with info and stats (possibly inside data)');
 for(const k of abilities)if(!Number.isFinite(sheet.stats[k]?.score))throw Error('Missing numeric ability: '+k);
 const name=sheet.name?.value||root.dndBratislavaBuilder?.fields?.characterName;
 if(!name||typeof name!=='string')throw Error('Missing character name');
 return {root,sheet,builder:root.dndBratislavaBuilder||{},name,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
}
const modifier=n=>Math.floor((n-10)/2);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function normalize(text){
 return text.replace(/[кК](?=\d)/g,'d')
 .replace(/(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)\s*(?:фут(?:ов|а)?|feet|foot)(?![а-яёa-z])/gi,(_,near,far)=>`${Number(near.replace(',','.'))/5}/${Number(far.replace(',','.'))/5} клет.`)
 .replace(/(\d+(?:[.,]\d+)?)\s*[-‑–]?\s*футов(ый|ого|ом|ым|ая|ой|ую|ое|ые|ых|ыми)(?![а-яё])/gi,(_,v,suffix)=>`${Number(v.replace(',','.'))/5}-клеточн${suffix}`)
 .replace(/(\d+(?:[.,]\d+)?)\s*(?:фут(?:ов|а)?|feet|foot)(?![а-яёa-z])/gi,(_,v)=>`${Number(v.replace(',','.'))/5} клет.`);
}
function mapText(value){return typeof value==='string'?normalize(value):Array.isArray(value)?value.map(mapText):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,mapText(v)])):value;}
function safeRich(html){
 // Only a small, attribute-free formatting vocabulary is executable markup.
 return html.split(/(<\/?(?:p|b|strong|i|em)>|<br\s*\/?>)/gi).map(t=>/^<\/?(?:p|b|strong|i|em)>$|^<br\s*\/?>$/i.test(t)?t.replace(/<br\s*\/?>/i,'<br>'):esc(t).replace(/&amp;(amp|lt|gt|quot|apos|#39|#\d+|#x[0-9a-f]+);/gi,'&$1;')).join('');
}
module.exports={args,load,abilities,modifier,esc,normalize,mapText,safeRich};

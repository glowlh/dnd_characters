const fs=require('node:fs'),path=require('node:path');
const {args,load,abilities,modifier}=require('./lib.cjs');
function main(){
 const a=args(process.argv.slice(2));if(!a.input)throw Error('Usage: node inspect-character.cjs --input character.json [--output facts.json]');
 const {root,sheet:s,builder:b,name,sha256}=load(a.input),f=b.fields||{},state=b.state||{},warnings=[];
 const level=Number(s.info.level?.value||f.level);
 for(const [field,actual] of [['characterName',name],['level',level],['className',s.info.charClass?.value],['background',s.info.background?.value],['race',s.info.race?.value]])if(f[field]!==undefined&&String(f[field])!==String(actual))warnings.push('Layer mismatch: '+field);
 for(const k of abilities)if(state.finalAbilities?.[k]!==undefined&&state.finalAbilities[k]!==s.stats[k].score)warnings.push('Layer mismatch: finalAbilities.'+k);
 const skills=Object.fromEntries(Object.entries(s.skills||{}).map(([k,v])=>[k,{ability:v.baseStat,proficiency:v.isProf||0,abilityModifier:modifier(s.stats[v.baseStat]?.score??10)}]));
 if(!Object.keys(skills).length)warnings.push('No structured skills; reconstruct from confirmed sources');
 const result={sourceSha256:sha256,identity:{name,className:s.info.charClass?.value,subclass:s.info.charSubclass?.value,level,background:s.info.background?.value,species:s.info.race?.value},edition:root.edition||root.sheetEdition||null,abilities:Object.fromEntries(abilities.map(k=>[k,{score:s.stats[k].score,modifier:modifier(s.stats[k].score)}])),skills,spells:{keys:state.spells||null,cardIds:root.spells||null,info:s.spellsInfo||null,slots:s.spells||null},warnings,builderFields:f,builderState:state,sheet:s};
 const output=JSON.stringify(result,null,2);
 if(a.output){const target=path.resolve(a.output);if(target===path.resolve(a.input))throw Error('Output must not replace input');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,output+'\n');console.log('Character facts written to '+target);}else console.log(output);
}
try{main();}catch(e){console.error(e.message);process.exitCode=1;}

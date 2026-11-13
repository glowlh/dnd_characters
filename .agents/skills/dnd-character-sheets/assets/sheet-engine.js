(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DndSheetEngine=api;})(globalThis,function(){
 'use strict';
 const ABILITIES={str:'Сила',dex:'Ловкость',con:'Телосложение',int:'Интеллект',wis:'Мудрость',cha:'Харизма'};
 const ABILITY_LABELS={str:'СИЛ',dex:'ЛОВ',con:'ТЕЛ',int:'ИНТ',wis:'МДР',cha:'ХАР'};
 const SKILLS={acrobatics:['Акробатика','dex'],investigation:['Анализ','int'],athletics:['Атлетика','str'],perception:['Восприятие','wis'],survival:['Выживание','wis'],performance:['Выступление','cha'],intimidation:['Запугивание','cha'],history:['История','int'],'sleight of hand':['Ловкость рук','dex'],arcana:['Магия','int'],medicine:['Медицина','wis'],deception:['Обман','cha'],nature:['Природа','int'],insight:['Проницательность','wis'],religion:['Религия','int'],stealth:['Скрытность','dex'],persuasion:['Убеждение','cha'],'animal handling':['Уход за животными','wis']};
 const CLASSES={
  'Бард':{kind:'bard',die:8,ability:'cha',prepared:[4,5],slots:[2,3],cantrips:2},
  'Изобретатель':{kind:'artificer',die:8,ability:'int',prepared:[2,3],slots:[2,2],cantrips:2},
  'Волшебник':{kind:'wizard',die:6,ability:'int',prepared:[4,5],slots:[2,3],cantrips:3},
  'Друид':{kind:'druid',die:8,ability:'wis',prepared:[4,5],slots:[2,3],cantrips:2}
 };
 const WEAPONS={dagger:{name:'Кинжал',hands:'одноручное',inventoryName:/кинжал(?:а|ы|ов)?|нож(?:а|и|ей)?/iu,dice:'1d4',ability:'finesse',proficient:true,range:'20/60 футов',type:'колющий'},musket:{name:'Мушкет',hands:'двуручное',dice:'1d12',ability:'dex',proficient:false,range:'40/120 футов',type:'колющий'},lightCrossbow:{name:'Лёгкий арбалет',hands:'двуручное',inventoryName:/л[её]гкий арбалет/iu,dice:'1d8',ability:'dex',proficient:true,range:'80/320 футов',type:'колющий'},quarterstaff:{name:'Боевой посох',hands:'универсальное, в одной или двух руках',inventoryName:/(?:боевой )?посох/iu,dice:'1d6',ability:'str',proficient:true,range:'—',type:'дробящий'},sickle:{name:'Серп',hands:'одноручное',dice:'1d4',ability:'str',proficient:true,range:'—',type:'рубящий'}};
 const mod=n=>Math.floor((n-10)/2),signed=n=>n>=0?'+'+n:String(n).replace('-','−');
 const value=x=>x?.value??'';
 const unique=a=>[...new Set(a.filter(Boolean))];
 const get=(o,path)=>path.split('.').reduce((v,k)=>v!=null&&Object.hasOwn(v,k)?v[k]:undefined,o);
 function normalize(s){return String(s).replace(/[кК](?=\d)/g,'d')
  .replace(/(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)\s*(?:фут(?:ов|а)?|feet|foot)(?![а-яёa-z])/gi,(_,a,b)=>`${Number(a.replace(',','.'))/5}/${Number(b.replace(',','.'))/5} клет.`)
  .replace(/(\d+(?:[.,]\d+)?)\s*[-‑–]?\s*футов(ый|ого|ом|ым|ая|ой|ую|ое|ые|ых|ыми)(?![а-яё])/gi,(_,n,end)=>`${Number(n.replace(',','.'))/5}-клеточн${end}`)
  .replace(/(\d+(?:[.,]\d+)?)\s*(?:фут(?:ов|а|ах)?|feet|foot)(?![а-яёa-z])/gi,(_,n)=>`${Number(n.replace(',','.'))/5} клет.`);}
 function plain(node){if(!node)return '';if(node.type==='resource')return '';if(node.type==='text')return node.text||'';const s=(node.content||[]).map(plain).join('');return node.type==='paragraph'?s+'\n':s;}
 function parse(raw){
  const root=typeof raw==='string'?JSON.parse(raw.replace(/^\uFEFF/,'')):raw;
  const sheet=typeof root.data==='string'?JSON.parse(root.data):root.data||root;
  if(!sheet?.info||!sheet.stats)throw Error('Во входных данных нет info/stats персонажа.');
  const builder=root.dndBratislavaBuilder||{},fields=builder.fields||{},state=builder.state||{};
  for(const code of Object.keys(ABILITIES))if(!Number.isFinite(sheet.stats[code]?.score))throw Error('Нет числовой характеристики '+code);
  const name=value(sheet.name)||fields.characterName;if(!name)throw Error('Во входных данных нет имени персонажа.');
  return {root,sheet,fields,state,name};
 }
 function jsonField(text,fallback){if(!text)return fallback;try{return JSON.parse(text);}catch{throw Error('Некорректные данные в выборе класса.');}}
 const block=(title,...paragraphs)=>({title,paragraphs});
 const textBlock=(title,...text)=>({title,text});
 const table=(title,rows,header=[])=>({title,rows,header});
 function selectedFields(fields,prefix){return Object.keys(fields).filter(k=>new RegExp('^'+prefix+'\\d+$').test(k)).sort((a,b)=>Number(a.match(/\d+$/)[0])-Number(b.match(/\d+$/)[0])).map(k=>fields[k]).filter(Boolean);}
 function inventory(source){
  const {sheet:s,fields:f}=source;
  let text=plain(s.text?.equipment?.value?.data)||f.customClassEquipment||f.extraEquipment||'';
  const lines=unique(text.split(/\n|\\n/).map(x=>x.replace(/^\s*[-–]\s*/,'').trim()));
  return lines.filter((line,i)=>!line.startsWith('Предыстория:')||!lines.some((x,j)=>j<i&&x===line));
 }
 function armor(source,stats,config){
  const text=inventory(source).join(' ').toLowerCase();
  const dex=stats.dex.mod;
  const rules=[[/прокл[её]панн.*кожан.*доспех/,12+dex],[/кожан.*доспех/,11+dex],[/кольчужная рубаха/,13+Math.min(2,dex)],[/чешуйчат|кираса/,14+Math.min(2,dex)],[/полулаты/,15+Math.min(2,dex)],[/кольчуга/,16],[/латы/,18]];
  const ac=rules.find(([re])=>re.test(text))?.[1]??10+dex;
  return ac+(value(source.sheet.vitality?.shield)?2:0)+(config.armorBonus||0);
 }
 function attacks(source,stats,pb,config,level,kind){
  const owned=inventory(source).join('\n');
  const rows=[];
  const owns = name => owned.toLowerCase().includes(name.toLowerCase());
  const bindings = (config.equipmentProfiles || []).filter(binding => owns(binding.match));
  const defaults = [
   ['sickle', /(?:^|[\s,;])серп(?=$|[\s,;.])/iu],
   ['quarterstaff', /(?:^|[\s,;])посох/iu],
   ['dagger', /кинжал|(?:^|[\s,;])нож(?:$|[\s,;.])/iu],
   ['lightCrossbow', /л[её]гкий арбалет/iu],
  ];
  for (const [rule, pattern] of defaults) {
   if (!pattern.test(owned)) continue;
   const match = owned.match(pattern)[0].trim();
   if (!bindings.some(binding => binding.match.toLowerCase() === match.toLowerCase() ||
      binding.match.toLowerCase() === WEAPONS[rule].name.toLowerCase())) {
    bindings.push({match: WEAPONS[rule].name, rule});
   }
  }
  for(const binding of bindings){
   const rule=WEAPONS[binding.rule];if(!rule)throw Error('Неизвестный профиль оружия: '+binding.rule);
   const ability=rule.ability==='finesse'?(stats.dex.mod>=stats.str.mod?'dex':'str'):rule.ability;
   const repeating=kind==='artificer'&&level>=2&&jsonField(source.fields.classDecision2,[]).includes('Оружие повторного выстрела')&&jsonField(source.fields.classDecision1,[]).some(x=>x.scheme==='Оружие повторного выстрела'&&x.detail===binding.match);
   const martial=Boolean(value(source.sheet.prof?.['weapon-martial']));
   const proficient=binding.rule==='musket'&&martial?true:binding.proficient??rule.proficient,magic=Math.max(binding.magicBonus||0,repeating?1:0),m=stats[ability].mod;
   const attackFormula=`d20 + ${ABILITY_LABELS[ability]} (${signed(m)}) + НАВ (${signed(proficient?pb:0)})${magic?' + МАГ ('+signed(magic)+')':''}`;
   const attackType=rule.range==='—'?'Ближняя':binding.rule==='dagger'?'Ближняя; метание '+normalize(rule.range):'Дальнобойная ('+normalize(rule.range)+')';
   rows.push({name:binding.match,rule:binding.rule,ability,proficient,attack:m+(proficient?pb:0)+magic,attackFormula,damage:rule.dice+(m+magic?signed(m+magic):''),type:rule.type,range:normalize(rule.range),attackType});
  }
  for(const w of source.sheet.weaponsList||[]){const name=value(w.name);if(!name||!owns(name)||rows.some(r=>r.name.toLowerCase()===name.toLowerCase())||/кинжал|л[её]гкий арбалет/i.test(name))continue;
   const binding=(config.equipmentProfiles||[]).find(x=>x.match===name);if(binding)continue;
   throw Error('Нужен профиль оружия для '+name+'; кэшированные mod/dmg не используются как расчёт.');
  }
  return rows;
 }
 function context(source,config,level,spells){
  const {sheet:s,fields:f,state}=source;
  const className=value(s.info.charClass)||f.className;
  const profile=CLASSES[className]||config.classProfiles?.[className];
  if(!profile||!profile.die||!profile.ability||!profile.prepared?.length)throw Error('Добавьте проверенный профиль класса '+className+' в правила, не готовые данные персонажа.');
  if(String(source.root.edition||config.rulesEdition||'2024')!=='2024')throw Error('Встроенные профили рассчитаны для 2024; нужен отдельный профиль редакции 2014.');
  if(level<1||level>2)throw Error('Сейчас поддерживаются уровни 1 и 2.');
  const stats=Object.fromEntries(Object.entries(ABILITIES).map(([code,name])=>[code,{code,name,score:s.stats[code].score,mod:mod(s.stats[code].score),signed:signed(mod(s.stats[code].score))}]));
  const pb=2+Math.floor((level-1)/4);
  const species=value(s.info.race)||f.race,rock=species==='Гном'&&/скальн/i.test(f.subrace||f.gnomeLineageUI||'');
  const featText=plain(s.text?.feats?.value?.data);
  const alert=(species==='Человек'&&f.humanOriginFeat==='Бдительный')||/^Бдительный\s*:/im.test(featText);
  const expertise=unique([...selectedFields(f,'expertise'),...Object.entries(s.skills||{}).filter(([,x])=>x.isProf===2).map(([key])=>SKILLS[key]?.[0])]);
  const scholar=profile.kind==='wizard'?(config.wizardScholar||null):null;
  const druid=profile.kind==='druid';
  const magician=druid&&f.classDecision0==='Ведун';
  const natureBonus=magician?Math.max(1,stats.wis.mod):0;
  const originMagic=druid?state.originMagic?.background:null;
  const originCantrips=unique((originMagic?.cantrips||[]).map(key=>config.cantripReplacements?.[key]??key));
  const skills=Object.fromEntries(Object.entries(SKILLS).map(([key,[name,defaultAbility]])=>{
   const skill=s.skills?.[key]||{},ability=skill.baseStat||defaultAbility;
   const prof=!!skill.isProf,expert=profile.kind==='bard'?level>=2&&expertise.includes(name):profile.kind==='wizard'?level>=2&&name===scholar:skill.isProf===2;
   const bonus=prof?(expert?pb*2:pb):profile.kind==='bard'&&level>=2?Math.floor(pb/2):0;
   const total=stats[ability].mod+bonus+(['arcana','nature'].includes(key)?natureBonus:0);
   return [key,{key,name,ability,proficient:prof,expert,total,signed:signed(total)}];
  }));
  if(profile.kind==='wizard'&&level>=2&&(!scholar||!Object.values(skills).find(x=>x.name===scholar)?.proficient))throw Error('Для 2-го уровня волшебника задайте wizardScholar — навык экспертизы «Учёного» из числа освоенных.');
  if(profile.kind==='bard'&&level>=2&&expertise.length!==2)throw Error('Для 2-го уровня барда выберите два навыка компетентности в JSON или настройках.');
  if(profile.kind==='bard'&&level>=2&&expertise.some(name=>!Object.values(skills).find(x=>x.name===name)?.proficient))throw Error('Компетентность требует владения выбранным навыком.');
  const spellState=state.spells;
  const keyForId=id=>Object.keys(spells).find(k=>spells[k].id===id);
  const cards=(source.root.spells?.prepared||[]).map(keyForId);
  if(!spellState&&cards.some(k=>!k))throw Error('Не удалось разрешить ID заклинаний в справочнике.');
  const inherent=unique([...(rock?['mending','prestidigitation']:[]),...(profile.kind==='artificer'?['mending']:[])]);
  const chosenCantrips=spellState?.cantrips||cards.filter(k=>spells[k]?.level===0&&!inherent.includes(k));
  const cantrips=unique([...chosenCantrips.map(k=>config.cantripReplacements?.[k]??k),...inherent]);
  const currentPrepared=unique(spellState?.prepared||cards.filter(k=>spells[k]?.level>0));
  const extra=config.level2Spell;
  if(currentPrepared.length>profile.prepared[0]&&(!extra||!currentPrepared.includes(extra)))throw Error('Укажите выбранное заклинание второго уровня в level2Spell.');
  const prepared=level===1?currentPrepared.filter(k=>k!==extra):unique([...currentPrepared,...(extra?[extra]:[])]);
  if(prepared.length!==profile.prepared[level-1])throw Error('Число подготовленных заклинаний не соответствует уровню '+level+'; проверьте выборы.');
  const spellbook=profile.kind==='wizard'?unique(spellState?.spellbook??(source.root.spells?.book||[]).map(id=>keyForId(id)??id)):[];
  for(const key of [...cantrips,...prepared,...spellbook,...originCantrips,...(originMagic?.spell?[originMagic.spell]:[]),...(druid?['speak-with-animals']:[])])if(!spells[key])throw Error('Нет полного описания '+key+' в справочнике.');
  if(druid&&cantrips.length!==profile.cantrips+Number(magician))throw Error('Проверьте число заговоров друида и выбранный первобытный орден.');
  const spellmod=stats[profile.ability].mod;
  const speed=Number(value(s.vitality?.speed)||30),equipment=inventory(source);
  const vitality={hpMax:profile.die+stats.con.mod+(level-1)*Math.max(1,Math.floor(profile.die/2)+1+stats.con.mod),hitDice:level+'d'+profile.die,hitDie:profile.die,temp:Number(value(s.vitality?.['hp-temp'])||0)};
   const weaponRows=attacks(source,stats,pb,config,level,profile.kind);
  const coinNames={cp:'мм',sp:'см',ep:'эм',gp:'зм',pp:'пм'};
  const weakness=f.characterWeakness||plain(s.text?.['notes-2']?.value?.data);
  const effectStart=config.weaknessEffectStart?weakness.indexOf(config.weaknessEffectStart):-1;
  const weaknessEffect=config.weaknessEffect??(effectStart>=0?weakness.slice(effectStart).trim():'');
  return {identity:{name:source.name,className,species,lineage:f.subrace||'',background:value(s.info.background)||f.background||'',playerName:value(s.info.playerName),size:value(s.info.size)==='small'?'Маленький':'Средний'},level,profile,abilities:stats,pb,skills,expertise,
   movement:{feet:speed,cells:speed/5,boostedCells:(speed+10)/5},combat:{ac:armor(source,stats,config),initiative:signed(stats.dex.mod+(alert?pb:0)),passivePerception:10+skills.perception.total,darkvisionCells:Number(value(s.vitality?.darkvision)||0)/5},vitality,
   spellcasting:{ability:ABILITIES[profile.ability],mod:spellmod,modSigned:signed(spellmod),dc:8+pb+spellmod,attack:pb+spellmod,attackSigned:signed(pb+spellmod),slots:profile.slots[level-1],cantrips,prepared,spellbook},
   resources:{inspiration:Math.max(1,stats.cha.mod),tinkering:Math.max(1,stats.int.mod),...(species==='Шифтер (Зверолюд)'?{shiftingTemp:2*pb}:{}),...(druid&&level===2?{wildShape:2}:{})},
   ...(druid?{druid:{magician,natureBonus,forms:state.wildShapeForms||[],originCantrips,originSpell:originMagic?.spell,originAbility:ABILITIES[originMagic?.ability],originMod:stats[originMagic?.ability]?.mod,originDc:8+pb+(stats[originMagic?.ability]?.mod??0),originAttackSigned:signed(pb+(stats[originMagic?.ability]?.mod??0))}}:{}),
   narrative:{hook:f.characterHook||plain(s.text?.['notes-1']?.value?.data),reason:f.characterReason||plain(s.text?.quests?.value?.data),past:f.characterPast||plain(s.text?.background?.value?.data),weakness:effectStart>=0?weakness.slice(0,effectStart).trim():weakness,weaknessEffect,appearance:f.appearance||plain(s.text?.appearance?.value?.data)},
   equipment,weaponRows,weaponProficiencies:[['Простое оружие',Boolean(value(s.prof?.['weapon-simple']))],['Воинское оружие',Boolean(value(s.prof?.['weapon-martial']))]],coins:Object.entries(coinNames).map(([key,label])=>[label,Number(config.startingCoins?.[key]??value(s.coins?.[key]))]),proficiencies:plain(s.text?.prof?.value?.data),
   materials:{identifyNote:equipment.some(x=>/жемчуж/i.test(x))?'Проверьте, что записанная жемчужина стоит не менее 100 зм.':'В записанном инвентаре нет жемчужины для этого заклинания.'},
   selections:{speciesSkills:selectedFields(f,'speciesSkill').join(', '),skilled:selectedFields(f,'originSkilled').map(x=>x.replace(/^skill:/,'')).join(', '),tools:selectedFields(f,'tool'),backgroundBonuses:Object.entries(state.backgroundBonuses||{}).filter(([,n])=>n).map(([k,n])=>ABILITIES[k]+' '+signed(n)).join(', '),plans:jsonField(f.classDecision1,[]),active:jsonField(f.classDecision2,[])},rock,
   feats:{skilled:/Одар[её]нный/i.test(featText),crafter:/Мастеровой/i.test(featText),alert},
   items:{repeating:{attack:signed(stats.dex.mod+(weaponRows.find(w=>w.rule==='musket')?.proficient?pb:0)+1),damage:'1d12'+signed(stats.dex.mod+1)}}};
 }
 function components(text){const names={В:'Вербальный',V:'Вербальный',С:'Соматический',S:'Соматический',М:'Материальный',M:'Материальный'};return String(text||'').replace(/(?<![a-zа-яё])([ВСМVSM])(?=\s*(?:,|\(|$))/gi,token=>names[token.toUpperCase()]||token);}
 function pluralTurns(n){const mod10=n%10,mod100=n%100;return mod10===1&&mod100!==11?'ход':mod10>=2&&mod10<=4&&(mod100<12||mod100>14)?'хода':'ходов';}
 function withTurns(text){
  // 1 ход = 6 секунд (PHB, раунды и ходы): 1 минута = 10 ходов, 1 час = 600 ходов. Свыше часа — только время.
  return String(text).replace(/(\d+(?:[.,]\d+)?)\s*(минут(?:а|ы|у)?|час(?:а|ов|е)?|раунд(?:а|ов|е)?)(?![а-яё])/g,(full,n,unit)=>{
   const value=Number(n.replace(',','.'));
   if(/час/.test(unit)&&value>1)return full;
   const turns=/минут/.test(unit)?value*10:/час/.test(unit)?value*600:value;
   return `${full} (${turns} ${pluralTurns(turns)})`;
  });
 }
 const turnAware=b=>({...b,paragraphs:(b.paragraphs||[]).map(withTurns),text:(b.text||[]).map(withTurns)});
 function actionLabel(sp){const t=String(sp.castingTime||'');if(t.startsWith('Действие'))return 'Основное действие';if(t.startsWith('Бонусное действие'))return 'Бонусное действие';if(t.startsWith('Реакция'))return 'Реакция';return 'Вне боя';}
 function isRitual(sp){return /ритуал/i.test(sp.castingTime)||/ритуал/i.test(sp.school);}
 function costLabel(sp){
  if(sp.level===0)return 'бесплатно';
  return 'ячейка '+sp.level+'-го уровня'+(isRitual(sp)?' или ритуал (без ячейки)':'');
 }
 function costMark(sp){
  if(sp.level===0)return 'бесплатно';
  return isRitual(sp)?'ячейка · ритуал':'ячейка';
 }
 function spellBlock(key,catalog,freeCasting=false){
  const sp=catalog[key],duration=String(sp.duration||''),concentrationTag=/^Концентрация(?:\s*[,;:]\s*|\s+|$)/i;
  return {title:sp.name,cost:freeCasting?'бесплатно':costMark(sp),paragraphs:[`<b>Концентрация:</b> ${concentrationTag.test(duration)?'да':'нет'}<br><b>${actionLabel(sp)} · ${freeCasting?'бесплатно':costLabel(sp)}.</b> ${sp.level===0?'Заговор':'Уровень '+sp.level} · ${sp.school}<br><b>Сотворение:</b> ${sp.castingTime} · <b>Дистанция:</b> ${sp.range}<br><b>Компоненты:</b> ${components(sp.components)}<br><b>Длительность:</b> ${withTurns(duration.replace(concentrationTag,''))}`,...sp.body.matchAll(/<p>(.*?)<\/p>/gs)].map(x=>Array.isArray(x)?x[1]:x)};
 }
 function summaryOf(sp,dc){
  if(sp.summary)return sp.summary.replaceAll('{{spellcasting.dc}}',String(dc));
  const text=String(sp.body||'').replaceAll('{{spellcasting.dc}}',String(dc)).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  return text.length>90?text.slice(0,90).replace(/\s\S*$/,'')+'…':text;
 }
 function equipmentParagraphs(c){
  const categories=[['Доспех и оружие',/доспех|щит|кинжал|нож|меч|топор|булава|посох|копь[её]|секир|лук|арбалет|дубинк|палиц/i],['Инструменты',/инструмент/i]];
  const groups={};
  for(const line of c.equipment){
   let item=line;
   let category=categories.find(([,pattern])=>pattern.test(line))?.[0]||'Походное снаряжение';
   for(const weapon of c.weaponRows){
    const {hands,inventoryName}=WEAPONS[weapon.rule];
    const alias=inventoryName&&line.match(inventoryName);
    const index=alias?.index??line.toLowerCase().indexOf(weapon.name.toLowerCase());
    if(index<0)continue;
    const end=index+(alias?.[0].length??weapon.name.length);
    item=line.slice(0,end)+' ('+hands+')'+line.slice(end);
    category='Доспех и оружие';
    break;
   }
   (groups[category]??=[]).push(item);
  }
  const money='Деньги на старте: '+(c.coins.filter(([,amount])=>amount!==0).map(([label,amount])=>amount+' '+label).join(', ')||'0 зм')+'.';
  return [...Object.entries(groups).map(([name,items])=>`<b>${name}:</b> ${items.join('; ')}.`),money];
 }
 function mainPages(ctx,source,config,catalog){
  const c=ctx,kind=c.profile.kind;
  const classFeature=kind==='druid'?block('Первобытный орден · '+(c.druid.magician?'Ведун':'Хранитель'),c.druid.magician?'<b>Пассивно · без затрат.</b> Один дополнительный заговор друида. К проверкам Интеллекта (Магия или Природа) добавляется модификатор Мудрости (минимум +1). Прибавка уже включена в таблицу навыков.':'<b>Пассивно · без затрат.</b> Владение воинским оружием и средними доспехами.'):turnAware({...((kind==='bard')?block('Бардовское вдохновение','<b>Бонусное действие · тратит 1 использование из {{resources.inspiration}} за долгий отдых.</b> Другое существо в пределах 60 футов, которое видит или слышит вас, получает кость d6 на 1 час. У существа одновременно может быть только одна такая кость.','В течение этого часа после провала проверки характеристики, броска атаки или спасброска существо может бросить d6 и прибавить результат к броску d20. Кость расходуется при броске.'):(kind==='wizard')?block('Знаток ритуалов','<b>Пассивно · без затрат.</b> Ритуальные заклинания можно сотворять ритуалом из книги заклинаний, даже если они не подготовлены; во время сотворения читайте их из книги.'):block('Магия вещей','<b>Основное действие (действие Магия) · тратит 1 использование из {{resources.tinkering}} за долгий отдых.</b> Инструменты ремонтника в руке. Создайте один разрешённый обычный предмет в свободном месте в пределах 5 футов. Он существует до вашего следующего долгого отдыха.','Блок и лебёдка, кувшин, свеча, бумага, лампа, сеть, ведро, леска, спальник, верёвка, ломик, бутылка, шипы, лопата, трутница, калтропы, масло, факел, кандалы, металлические шарики, флакон, колокольчик, мешок, фляга, корзина, одеяло, шест, кошель, капкан, крюк-кошка, пергамент.')),cost:kind==='wizard'?null:'использование'});
  const spellUsage={...block('Использование заклинаний','<b>{{spellcasting.ability}} (модификатор {{spellcasting.modSigned}}) · Сл {{spellcasting.dc}} · атака d20 {{spellcasting.attackSigned}}.</b> Ячейки восстанавливаются после долгого отдыха. Список подготовленных заклинаний после отдыха остаётся прежним. Заговоры ячеек не расходуют.','<b>Вне боя ритуал отыгрывается практически мгновенно.</b> За столом ожидание пропускается, а в игровом мире проходит указанное время сотворения.',kind==='bard'?'Музыкальный инструмент служит фокусировкой заклинаний барда. При повышении уровня можно заменить один подготовленный спелл и один заговор на допустимые.':kind==='wizard'?'Магическая фокусировка заменяет недорогие материальные компоненты; материалы с указанной стоимостью и расходуемые — нет.':kind==='druid'?'Друидическая фокусировка заменяет недорогие материальные компоненты. Подготовленное заклинание с пометкой «Ритуал» можно сотворить без ячейки, добавив 10 минут к обычному времени сотворения. При получении уровня друида можно заменить один заговор друида другим из его списка.':'Держите в руке воровские инструменты, инструменты ремонтника или освоенные ремесленные инструменты: это обязательная материальная фокусировка классовых заклинаний. Дорогие и расходуемые материалы всё равно нужны. После долгого отдыха можно заменить один классовый заговор.','<b>Компоненты:</b> Вербальный — произнесение магических слов; Соматический — жесты рукой; Материальный — указанный предмет или допустимая фокусировка. Нужны все перечисленные; материалы с указанной стоимостью и расходуемые фокусировкой не заменяются.'),summary:true};
  const species=c.identity.species==='Шифтер (Зверолюд)'&&c.identity.lineage==='Быстроноги'?shifterBlock():c.identity.species==='Человек'?block('Человек',
   '<b>Находчивый.</b> После долгого отдыха получаете Героическое вдохновение. Потратьте его сразу после броска любой кости, чтобы перебросить её и использовать новый результат. Если вдохновение уже есть, новое можно передать другому персонажу игрока, у которого его нет.',
   '<b>Умелый.</b> Одно дополнительное владение навыком.',
   '<b>Гибкий.</b> Дополнительная черта происхождения.'
  ):turnAware(c.rock?block('Скальный гном','<b>Тёмное зрение</b> (число — в боевых показателях): в тусклом свете видите как при ярком, в темноте — как при тусклом, оттенками серого.','<b>Гномья хитрость:</b> преимущество на все спасброски Интеллекта, Мудрости и Харизмы.','<b>Заводное устройство:</b> 10 минут сотворения Фокусов, Крошечное устройство с КД 5 и 1 хитом. Выберите один конкретный эффект Фокусов. Любое существо активирует его бонусным действием с касанием. Не более трёх устройств одновременно; каждое распадается через 8 часов либо при разборке касанием с действием Использование.'):c.identity.species==='Ченжлинг'?block('Ченжлинг','Тип — Фея. <b>Перевёртыш — действие.</b> Измените внешность и голос, включая окраску, пол, волосы, рост, вес и размер между Маленьким и Средним. Можно выглядеть представителем другого вида, но остальные игровые показатели не меняются. Нельзя копировать личность, которую вы никогда не видели. Расположение конечностей должно остаться примерно тем же; одежда и снаряжение не меняются.','Преимущество на проверки Харизмы в изменённом облике; облик сохраняется до возвращения в истинный действием. Использована версия из Eberron: Forge of the Artificer.'):c.identity.species==='Эльф'?block('Высший эльф','Тип — Фея. <b>Тёмное зрение</b> (число — в боевых показателях): в тусклом свете видите как при ярком, в темноте — как при тусклом, оттенками серого. <b>Наследие фей:</b> преимущество на спасброски, чтобы избежать состояния «Очарованный» или прекратить его действие.','<b>Транс:</b> обычный сон не требуется, магия не может усыпить. Долгий отдых можно завершить за 4 часа медитации, оставаясь в сознании.','<b>Врождённая магия высшего эльфа:</b> известен один заговор из списка волшебника (включён в книгу заклинаний); заклинательная характеристика — Интеллект.'):textBlock('Способности вида',plain(source.sheet.text?.allies?.value?.data)));
  const alertFeature=block('Бдительный',
   'При броске инициативы прибавьте бонус владения. Эта прибавка уже учтена в боевых показателях.',
   'Сразу после броска можно обменяться итогом инициативы с одним согласным союзником в том же бою, если оба дееспособны.'
  );
  const originText=plain(source.sheet.text?.feats?.value?.data).trim();
  const origin=c.feats.skilled?null:c.feats.crafter?block('Происхождение · Мастеровой',
   '<b>{{identity.background}}.</b> Скидка 20% на немагические покупки. После долгого отдыха можно изготовить один предмет, распадающийся после следующего отдыха; инструменты должны быть у вас и освоены.'
  ):originText?textBlock('Происхождение',c.identity.background,originText):null;
  const skillRows=[];
  for(const [code,name] of Object.entries(ABILITIES)){
   skillRows.push({header:`${name} ${c.abilities[code].signed}`});
   for(const x of Object.values(c.skills).filter(x=>x.ability===code).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,'ru')))skillRows.push([x.proficient?'●':'',x.name,x.signed]);
  }
  const skillsBlock={...table('Навыки · итоговые бонусы',skillRows),paragraphs:['● — владение. Навыки сгруппированы по характеристике, в заголовке группы — её модификатор. Проверка: <b>d20 + указанное значение</b>, всё уже учтено.'],summary:true};
  const combatRows=[['Класс доспеха',c.combat.ac],['Инициатива',c.combat.initiative],['Скорость',c.movement.cells+' клет.']];
  if(c.combat.darkvisionCells>0)combatRows.push(['Тёмное зрение',c.combat.darkvisionCells+' клет.']);
  combatRows.push(['Размер',c.identity.size],['Максимум хитов',c.vitality.hpMax],['Ячейки 1-го уровня',c.spellcasting.slots],['Пассивное Восприятие',c.combat.passivePerception]);
  const combatBlock={...table('Боевые показатели',combatRows),paragraphs:['Долгий отдых возвращает все хиты, ячейки заклинаний и использования способностей.'],summary:true};
  const attacksBlock={...table('Атаки',c.weaponRows.map(w=>[w.name,w.attackType,w.attackFormula,w.damage,w.type]),['Оружие','Тип атаки','Атака','Урон','Тип урона']),paragraphs:['ЛОВ — модификатор Ловкости; СИЛ — Силы; НАВ — бонус владения этим оружием (без владения 0); МАГ — магическая прибавка. Бросьте d20 и прибавьте каждое число из формулы один раз.',...(kind==='druid'&&c.weaponRows.some(w=>w.rule==='quarterstaff')?['Боевой посох в двух руках: 1d8'+(c.abilities.str.mod?signed(c.abilities.str.mod):'')+' дробящего урона. Со щитом посох держат одной рукой.']:[])]};
  const characterBlock=textBlock('Характер',c.narrative.hook,c.narrative.reason,c.narrative.past,c.narrative.weakness);
  if(c.narrative.weaknessEffect)characterBlock.paragraphs=['<i>{{narrative.weaknessEffect}}</i>'];
  const page={title:c.identity.name,subtitle:`${c.identity.species} · ${c.identity.className} ${c.level}-го уровня · ${c.identity.background}`,label:'Основной лист · '+c.level+'-й уровень',badge:'',ctx:c,scores:Object.values(c.abilities).map(x=>({name:x.name,score:x.score,mod:x.signed})),columns:[
   [combatBlock,skillsBlock],
   [attacksBlock,species,...(c.feats.alert?[alertFeature]:[]),...(origin?[origin]:[]),characterBlock]
  ]};
  const gear={title:c.identity.name+' · владения и снаряжение',subtitle:'',label:'Снаряжение · '+c.level+'-й уровень',badge:'',ctx:c,columns:[
   [{...block('Владения и языки',c.proficiencies,...(kind==='druid'?[c.druid.magician?'Доспехи: лёгкие доспехи и щиты.':'Доспехи: лёгкие и средние доспехи, щиты.']:[]),'Оружие: '+c.weaponProficiencies.map(([name,owned])=>name.toLowerCase()+' — '+(owned?'владение есть':'нет')).join('; ')+'. Владение конкретным оружием видно по НАВ в формуле атаки.'),summary:true},block('Снаряжение',...equipmentParagraphs(c))],
   [...(kind==='artificer'?[table('Быстрое изготовление · освоенные наборы',[['Плотника','Лестница, факел'],['Резчика','Дубинка, палица, посох'],['Каменщика','Блок и лебёдка'],['Кузнеца','Шарики, ведро, калтропы, крюк, котёл'],['Ремонтника','Колокольчик, лопата, трутница']].filter(([name])=>c.selections.tools.some(x=>x.toLowerCase().includes(name.toLowerCase()))||name==='Ремонтника'))]:[]),...(config.equipmentProfiles?.length?[block('Профили оружия',...config.equipmentProfiles.map(x=>`${x.match}: профиль ${WEAPONS[x.rule]?.name||x.rule}; владение — ${x.proficient?'да':'не подтверждено'}; магическая прибавка ${signed(x.magicBonus||0)}. Профиль — согласованное решение для предмета без характеристик в исходных данных.`))]:[])]
  ]};
  if(kind==='druid'){
   const speakWithAnimals={...spellBlock('speak-with-animals',catalog),cost:'бесплатно ритуалом'};
   gear.columns[1].push(block('Друидический язык',
    '<b>Пассивно · без затрат.</b> Можете оставлять скрытые сообщения на друидическом языке. Знающие язык замечают их автоматически. Остальным для обнаружения нужна проверка Интеллекта (Анализ) Сл 15. Без магии они не могут расшифровать сообщение.',
    '«Разговор с животными» всегда подготовлен и не занимает место в списке подготовленных заклинаний друида.'),speakWithAnimals);
  }
  if(c.spellcasting.spellbook.length){
   const bookRows=c.spellcasting.spellbook.map(key=>{
    const spell=catalog[key];
    return [spell.name+' · '+spell.level+'-й ур.',summaryOf(spell,c.spellcasting.dc),c.spellcasting.prepared.includes(key)?'Да':'Нет',isRitual(spell)?'Да':'Нет'];
   });
   gear.columns[1].push({...table('Книга заклинаний',bookRows,['Заклинание','Краткий эффект','Подгот.','Ритуал']),summary:true});
  }
  if(config.gearColumns===2&&gear.columns[1].length===0){
   gear.columns[1].push(gear.columns[0].pop());
  }
  gear.columns=gear.columns.filter(column=>column.length);
  const all=[...c.spellcasting.cantrips,...c.spellcasting.prepared].map(k=>spellBlock(k,catalog));
  const spellPage={title:'Способности и заклинания · '+c.identity.name,subtitle:`${c.identity.className} ${c.level}-го уровня · заговоров ${c.spellcasting.cantrips.length} · подготовлено ${c.spellcasting.prepared.length}`,label:'Способности и заклинания · '+c.level+'-й уровень',badge:'',ctx:c,columns:[[],[]]};
  spellPage.columns[0].push({...table('Заклинания · краткий список',[...c.spellcasting.cantrips,...c.spellcasting.prepared].map(k=>{const sp=catalog[k];return [sp.name+(sp.level===0?' · заговор':' · '+sp.level+'-й ур.'),summaryOf(sp,c.spellcasting.dc),String(sp.castingTime).split(';')[0]];}),['Заклинание','Суть','Время']),summary:true},spellUsage,classFeature);
  let weights=[JSON.stringify(spellPage.columns[0]).length,0];for(const sp of all){const col=weights[0]<=weights[1]?0:1;spellPage.columns[col].push(sp);weights[col]+=JSON.stringify(sp).length;}
  return [page,spellPage,...(c.druid?.originSpell?[druidOriginPage(c,catalog)]:[]),gear];
 }
 function shifterBlock(){
  return {...turnAware(block('Шифтер · Быстроноги',
   '<b>Тип:</b> Гуманоид. <b>Звериные инстинкты:</b> владение выбранным навыком ({{selections.speciesSkills}}). <b>Тёмное зрение:</b> в тусклом свете видите как при ярком, в темноте — как при тусклом, оттенками серого.',
   '<b>Переворот · бонусное действие · тратит 1 использование из {{pb}}.</b> Принимаете звероподобный облик на 1 минуту и получаете {{resources.shiftingTemp}} временных хита (удвоенный бонус владения). Можете вернуться в обычный облик бонусным действием. Все использования восстанавливаются после долгого отдыха.',
   '<b>Быстроноги:</b> пока действует Переворот, скорость увеличивается до {{movement.boostedCells}} клет. Когда существо заканчивает ход в 1 клет. от вас, можете реакцией переместиться на расстояние до 2 клет. Это перемещение не провоцирует атаки.')),cost:'использование'};
 }
 function druidOriginPage(c,catalog){
  const spellcasting={...c.spellcasting,ability:c.druid.originAbility,mod:c.druid.originMod,dc:c.druid.originDc,attackSigned:c.druid.originAttackSigned};
  const cantrips=c.druid.originCantrips.map(key=>spellBlock(key,catalog));
  const spell=spellBlock(c.druid.originSpell,catalog,true);
  const feature=block('Посвящённый в магию · Жрец',
   '<b>Послушник.</b> Два заговора жреца и одно всегда подготовленное заклинание 1-го уровня. Заклинательная характеристика — {{spellcasting.ability}}, Сл {{spellcasting.dc}}. Заговоры и заклинание черты учитываются отдельно от списка друида.',
   'Выбранное заклинание 1-го уровня можно сотворить один раз без ячейки с восстановлением после долгого отдыха. Его также можно сотворять имеющимися ячейками. Бесплатное сотворение всё равно требует указанных компонентов.');
  return {title:'Магия послушника · '+c.identity.name,subtitle:'',label:'Происхождение · 1-й уровень',badge:'',ctx:{...c,spellcasting},columns:[[feature,...cantrips],[spell]]};
 }
 function druidShapePage(c){
  const shape={...turnAware(block('Дикий облик',
   '<b>Бонусное действие · тратит 1 использование из {{resources.wildShape}}.</b> Превратитесь в известного зверя на 1 час и получите {{level}} временных хита. Все использования восстанавливаются после долгого отдыха. Облик заканчивается при повторном использовании, состоянии «Недееспособный», смерти или добровольном возвращении бонусным действием.',
   '<b>Известные облики:</b> '+c.druid.forms.join(', ')+'. Можно знать четыре облика зверей с опасностью до 1/4 без скорости полёта. После долгого отдыха можно заменить один облик другим подходящим.',
   'Используйте показатели зверя, сохраняя тип существа, хиты, Интеллект, Мудрость, Харизму, личность, память, речь, языки, классовые особенности, черты и свои владения навыками и спасбросками. Получаете также владения зверя. Если его бонус к навыку или спасброску выше вашего, используйте его.',
   'В облике нельзя сотворять заклинания, но можно поддерживать концентрацию. Обращение с предметами зависит от анатомии зверя. Снаряжение можно оставить на земле, слить с обликом или носить, если оно подходит. Слившееся с обликом снаряжение не действует.')),cost:'использование'};
  const companion={...block('Дикий спутник',
   '<b>Концентрация:</b> нет. <b>Основное действие (Магия) · ячейка или 1 использование Дикого облика.</b> Сотворите «Обретение фамильяра» без материальных компонентов. Фамильяр — Фея в зверином облике, исчезает после вашего долгого отдыха.',
   'Фамильяр появляется в свободном месте в пределах 2 клет. в облике зверя с опасностью 0. Он действует по собственной инициативе, выполняет ваши команды и не может атаковать. В пределах 20 клет. с ним можно общаться телепатически. Бонусным действием можно видеть и слышать его чувствами до начала вашего следующего хода. Он может реакцией передать заклинание с дистанцией «Касание», если находится в пределах 20 клет. от вас.',
   'При 0 хитов фамильяр исчезает. Действием Магия его можно отпустить или временно убрать в карманное измерение и таким же действием вернуть в свободное место в пределах 6 клет. При исчезновении он оставляет снаряжение. У вас может быть только один фамильяр. Повторное сотворение позволяет сменить его облик.'),cost:'ячейка · использование'};
  return {title:c.identity.name+' · Дикий облик и спутник',subtitle:'Классовые способности друида',label:'Повышение уровня · 2-й уровень',badge:' · 2-й уровень',ctx:c,columns:[[shape],[companion]]};
 }
 function advancement(base,next,source,config,catalog){
  const changed=Object.keys(SKILLS).filter(k=>base.skills[k].total!==next.skills[k].total);
  const fresh=next.spellcasting.prepared.filter(k=>!base.spellcasting.prepared.includes(k));
  const gain=next.vitality.hpMax-base.vitality.hpMax;next.vitality.gain=gain;
  const left=[{...table('Что изменяется',[['Максимум хитов',base.vitality.hpMax+' → '+next.vitality.hpMax+' (прирост '+gain+')'],['Ячейки 1-го уровня',base.spellcasting.slots+' → '+next.spellcasting.slots],['Подготовленные заклинания',base.spellcasting.prepared.length+' → '+next.spellcasting.prepared.length]]),paragraphs:['Прирост фиксированный; при броске вместо него — кость класса и модификатор Телосложения.'],summary:true}];
  if(next.profile.kind==='bard')left.push(block('Компетентность','Выбранные навыки: <b>{{expertiseNames}}</b>. Бонус владения при проверках с ними удваивается. Итоговые бонусы уже включают модификаторы характеристик.'),block('Мастер на все руки','При проверке с навыком без владения, если PB ещё не прибавлен, добавьте половину PB с округлением вниз. Сейчас это <b>{{halfProficiency}}</b>. Это не владение; инициатива и спасброски не получают эту прибавку.'));
  if(next.profile.kind==='wizard')left.push(block('Учёный','Экспертность в навыке <b>{{scholarName}}</b>: бонус владения при его проверках удваивается. Итоговые бонусы уже пересчитаны в таблице ниже.'));
  if(changed.length)left.push({...table('Итоговые бонусы навыков',changed.map(k=>[base.skills[k].name,base.skills[k].signed,next.skills[k].signed]),['Навык','Ур. 1','Ур. 2']),summary:true});
  if(next.profile.kind==='artificer')left.push(block('Реплики магических предметов','Известно <b>{{plansCount}}</b> схем; одновременно поддерживаются до двух реплик. По окончании долгого отдыха с инструментами ремонтника создайте до двух разных предметов по известным схемам. При необходимости настройка возможна сразу при создании. При превышении лимита исчезает старейший предмет.','Известные схемы: {{planNames}}. Сейчас созданы: <b>{{activeNames}}</b>. Известная схема не означает, что её реплика уже создана.'));
  next.expertiseNames=next.expertise.join(', ');next.halfProficiency=Math.floor(next.pb/2);next.scholarName=config.wizardScholar||'';next.plansCount=next.selections.plans.length;next.planNames=next.selections.plans.map(x=>x.scheme+(x.detail?': '+x.detail:'')).join('; ');next.activeNames=next.selections.active.join('; ')||'не записаны';
  const right=[...fresh.map(k=>spellBlock(k,catalog)),{...block('Без изменений','КД, инициатива, скорость, тёмное зрение, Сл и атака магии, характеристики и число заговоров при этом переходе не меняются — смотрите основной лист.'),summary:true}];
  const pages=[{title:next.identity.name+' · 2-й уровень',subtitle:'Изменения к основному листу 1-го уровня',label:'Повышение уровня · 1 → 2',badge:' · 2-й уровень',ctx:next,columns:[left,right]}];
  if(next.profile.kind==='druid')pages.push(druidShapePage(next));
  if(next.profile.kind==='artificer'){
   const itemBlocks=next.selections.plans.map(plan=>{
    const rule=config.itemRules?.[plan.scheme];
    const current=next.selections.active.includes(plan.scheme)?'создан':'только схема';
    if(!rule)throw Error('Дополните справочник правил для схемы '+plan.scheme);
    return {...turnAware(rule),title:plan.scheme+' · '+current};
   });
   pages.push({title:next.identity.name+' · схемы и предметы',subtitle:'Возможности второго уровня',label:'Справочник реплик · 2-й уровень',badge:' · 2-й уровень',ctx:next,columns:[itemBlocks.filter((_,i)=>i%2===0),itemBlocks.filter((_,i)=>i%2!==0)]});
  }
  return pages;
 }
 function build(raw,config={},catalog={}){
  const source=parse(raw),base=context(source,config,1,catalog),next=context(source,config,2,catalog);
  return {source,base,next,main:mainPages(base,source,config,catalog),appendix:advancement(base,next,source,config,catalog)};
 }
 return {build,parse,context,normalize,components,withTurns,get,signed,modifier:mod,ABILITIES,SKILLS};
});

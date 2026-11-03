import catalog from './data/classes-2024.json' with { type: 'json' }
import legacyCatalog from './data/classes-2014.json' with { type: 'json' }
import { d20Distribution, damageTypes } from './engine.js'

export { catalog, legacyCatalog }
export const getCatalog = rules => rules === '5e' ? legacyCatalog : catalog
export const clamp = (v, low, high, fallback = low) => Number.isFinite(Number(v)) && v !== '' && v !== null ? Math.max(low, Math.min(high, Math.trunc(Number(v)))) : fallback
export const modifier = score => Math.floor((clamp(score, 1, 30, 16) - 10) / 2)
export const proficiency = level => 2 + Math.floor((level - 1) / 4)
export const initialBuild = () => ({ rules:'5r', classId:'fighter', subclassId:'fighter-XPHB-勇士', level:1, primary:16, secondary:14, weaponId:'长剑', offhandId:'匕首', enchantment:0, style:'none', twoHanded:false, proficient:true, ability:'auto', bonusAction:'none', setup:false, options:{}, attackAdjust:0, damageAdjust:0, custom:[], form:{name:'自定义形态 / 伙伴',attacks:1,hit:5,count:1,die:8,flat:3,type:'slashing'}, reaction:false })
export const initialTarget = () => ({ ac:15, roll:'normal', injured:false, firstRound:false, beforeTarget:false, surprised:false, resistance:Object.fromEntries(damageTypes.map(t=>[t.value,1])) })
export function cleanBuild(raw = {}) {
  const base = initialBuild(), data=getCatalog(raw.rules), c = data.classes.find(c=>c.id===raw?.classId) || data.classes[1]
  const b = {...base, ...raw, rules:raw.rules==='5e'?'5e':'5r',classId:c.id, level:clamp(raw.level,1,10,1), primary:clamp(raw.primary,1,30,16), secondary:clamp(raw.secondary,1,30,14), enchantment:clamp(raw.enchantment,0,3), attackAdjust:clamp(raw.attackAdjust,-20,20,0),damageAdjust:clamp(raw.damageAdjust,-20,30,0)}
  b.subclassId = c.subclasses.some(s=>s.id===raw.subclassId) ? raw.subclassId : c.subclasses[0].id
  b.weaponId = data.weapons.some(w=>w.id===raw.weaponId) || ['unarmed','psychic','thunder','lightning','force'].includes(raw.weaponId) ? raw.weaponId : base.weaponId
  b.offhandId = data.weapons.some(w=>w.id===raw.offhandId) ? raw.offhandId : base.offhandId
  b.style = ['none','archery','dueling','gwf','twf'].includes(raw.style) ? raw.style : 'none'
  b.ability = ['auto','primary','secondary'].includes(raw.ability) ? raw.ability : 'auto'
  b.bonusAction = ['none','light','dual','pole','unarmed','flurry','psychic','warpriest','companion','form'].includes(raw.bonusAction) ? raw.bonusAction : 'none'
  b.options = Object.fromEntries(Object.entries(raw.options && typeof raw.options==='object' ? raw.options : {}).filter(([,v])=>v===true))
  b.custom = (Array.isArray(raw.custom)?raw.custom:[]).filter(x=>x&&typeof x==='object').slice(0,8).map(x=>({name:String(x.name||'附伤').slice(0,40),count:clamp(x.count,0,20,1),die:[4,6,8,10,12].includes(x.die)?x.die:6,flat:clamp(x.flat,-20,30,0),type:damageTypes.some(t=>t.value===x.type)?x.type:'force',frequency:['hit','once','automatic'].includes(x.frequency)?x.frequency:'once',critical:x.critical!==false}))
  const f=raw.form||{};b.form={name:String(f.name||base.form.name).slice(0,40),attacks:clamp(f.attacks,1,6,1),hit:clamp(f.hit,-10,30,5),count:clamp(f.count,0,10,1),die:[4,6,8,10,12].includes(f.die)?f.die:8,flat:clamp(f.flat,-10,30,3),type:damageTypes.some(t=>t.value===f.type)?f.type:'slashing'}
  for(const k of ['setup','twoHanded','proficient','reaction']) b[k]=raw[k]===true || (k==='proficient' && raw[k]===undefined)
  b.smiteLevel=clamp(raw.smiteLevel,1,3,1)
  b.attackStat=['auto','str','dex','int','wis','cha'].includes(raw.attackStat)?raw.attackStat:'auto'
  b.formMode=raw.formMode===true
  return b
}
export function identity(value) {
  const b=cleanBuild(value),data=getCatalog(b.rules),c=data.classes.find(c=>c.id===b.classId), s=c.subclasses.find(s=>s.id===b.subclassId)
  return {b,c,s,data,legacy:b.rules==='5e',level:b.level,pb:proficiency(b.level),sub:b.level>=(s.unlock||3)?s.shortName:''}
}
export function availableOptions(value) {
  const {b,c,sub,level,legacy}=identity(value), options=[]
  const add=(id,name,description,min=1)=>{if(level>=min)options.push({id,name,description,level:min})}
  if(c.id==='barbarian') {
    add('rage','狂暴已激活','力量近战 / 徒手命中加狂暴伤害；默认视为前一轮已启动。')
    add('reckless','鲁莽攻击','力量攻击获得优势。',2)
    if(!legacy)add('brutal','残暴打击','放弃本轮第一次力量攻击的优势；若命中，加 1d10 同类伤害，其他攻击仍可鲁莽。',9)
    if(sub==='狂战士')add('frenzy','狂怒',legacy?'狂暴期间、启动后的回合，使用附赠动作进行一次近战武器攻击；需自行考虑力竭。':'狂暴且鲁莽时，本回合首次力量命中附加狂暴加值数量的 d6。',3)
    if(sub==='狂热者')add('divineFury','神性之怒','狂暴期间首次命中附加 1d6 + 半个职业等级光耀伤害。',3)
    if(legacy&&sub==='巨人')add('cleaver','元素战刃（火焰示例）','狂暴期间每次武器命中 +1d6 火焰；其他元素类型请用自定义附伤。',6)
  }
  if(c.id==='fighter') {
    add('surge','动作如潮','本轮额外执行一次攻击动作；不增加附赠动作。',2)
    if(sub==='战斗大师')add('maneuver','伤害型战技','本轮首次命中消耗一枚卓越骰；10 级变为 d10。不代表所有战技效果。',3)
    if(sub==='灵能武士')add('psi','灵能打击','本轮首次武器命中附加灵能骰 + 智力调整值（使用副属性）。',3)
    if(legacy&&sub==='武士')add('spirit','战斗精神','本轮武器攻击具有优势，占用附赠动作。',3)
    if(legacy&&sub==='符文骑士')add('giantMight','巨人之力已激活','本轮首次武器命中 +1d6 同类伤害。',3)
    if(legacy&&sub==='回音骑士')add('echo','释放化身','每个攻击动作增加一次从回音位置发动的近战攻击；每次消耗使用次数。',3)
    if(sub==='奥法骑士')add('cantrip',legacy?'战争魔法：武器戏法 + 附赠攻击':'战争魔法：替换一次攻击',legacy?'用攻击动作改为轰雷剑类武器戏法，并在附赠动作可用时增加一次武器攻击。':'按轰雷剑类武器命中戏法替换一次攻击，不加入移动追伤。',7)
  }
  if(c.id==='monk') {
    if(sub==='命流')add('mercy','夺命之手','首次徒手命中附加武艺骰 + 感知调整值（副属性），消耗功力。',3)
    if(sub==='幽影')add('shadow','暗影步后的首次攻击','6 级起只让本回合第一次攻击具有优势。',6)
  }
  if(c.id==='paladin') {
    add('smite',legacy?'至圣斩（每次近战武器命中）':'至圣斩（本轮一次）',legacy?'每次命中均消耗法术位，不占用附赠动作；请确认资源充足。':'消耗附赠动作；环阶在下方选择。',2)
    if(sub==='奉献')add('sacred','神圣武器已激活','命中加魅力调整值，至少 +1；副属性代表魅力。',3)
    if(sub==='复仇')add('vow','仇敌誓言','对当前誓言目标具有优势。',3)
  }
  if(c.id==='ranger') {
    add('mark','猎人印记已激活',legacy?'每次武器命中附加 1d6 同武器伤害；需要专注。':'每次武器命中附加 1d6 力场；需要专注。',legacy?2:1)
    if(sub==='妖精漫游者')add('fey','哀惧灵袭','当前单一目标每回合首次武器命中 +1d4 心灵。',3)
    if(sub==='幽域追踪者')add('dread',legacy?'恐惧伏击：首轮额外攻击':'恐惧打击',legacy?'首轮攻击动作多一次武器攻击，该次命中额外 1d8 同类伤害。':'本回合首次武器命中 +2d6 心灵；消耗使用次数。',3)
    if(sub==='猎人') {add('colossus','巨像屠夫','目标生命值不满时首次武器命中 +1d8。',3);add('horde','灭族者：另一目标','增加一次独立的第二目标攻击；与巨像屠夫互斥。',3)}
    if(legacy&&sub==='蜂群守卫')add('swarm','蜂群集击：伤害选项','本轮首次武器命中 +1d6 穿刺。',3)
    if(legacy&&sub==='怪物杀手')add('slayer','杀手猎物已标记','本轮首次武器命中 +1d6 同类伤害。',3)
  }
  if(c.id==='rogue') {
    add('sneak','满足偷袭条件','需要灵巧 / 远程武器且无劣势；每回合首次命中加入偷袭。')
    add('steady','稳定瞄准','消耗附赠动作，只令下次攻击具有优势；假定未移动。',3)
    if(!legacy)add('cunning','诡诈打击：放弃 1d6 偷袭','只处理伤害骰成本；毒素 / 倒地等后续条件请手动设置。',5)
    if(sub==='刺客')add('assassinate',legacy?'暗杀：先手与受惊':'暗杀：惊扰突袭',legacy?'首轮目标未行动时具有优势；仅对环境中勾选“受惊”的目标，命中自动重击。':'仅在首轮且目标尚未行动时给予优势，并在偷袭命中时加职业等级。',3)
  }
  if(c.id==='warlock') {
    add('pact','刃之魔契',legacy?'获得契约武器与熟练；自身不提供魅力攻击。':'使用魅力（主属性）进行契约武器攻击。',legacy?3:1)
    add('thirst','饥渴魔刃','已选择刃之魔契时，攻击动作可攻击两次。',5)
    add('eldritchSmite','魔能斩','本回合首次契约武器命中附加 (契约位环阶+1)d8 力场。',5)
    if(!legacy)add('lifedrinker','饮命者','本回合首次契约武器命中 +1d6 暗蚀。',9)
    if(legacy&&sub==='咒剑')add('hexCurse','咒剑诅咒已激活','每击伤害加熟练值，对诅咒目标 19—20 重击。')
    if(legacy&&sub==='亡灵')add('grave','坟冢之触：转暗蚀','假定战栗形态激活，武器转为暗蚀且本轮首次命中多一枚武器骰。',6)
    add('hex','脆弱诅咒已激活','每次攻击命中 +1d6 暗蚀；需要专注。')
    if(sub==='旧日支配者')add('clairvoyant','锐眼斗士：目标已豁免失败','仅在目标已失败且连结有效时启用优势。',6)
  }
  if(c.id==='bard' && sub==='勇气'&&!legacy)add('cantrip','额外攻击：替换一次为戏法','按轰雷剑类武器命中附伤估算。',6)
  if(legacy&&c.id==='bard'&&sub==='剑舞')add('flourish','剑舞：伤害型挥舞','本轮首次武器命中额外造成一枚诗人激励骰伤害。',3)
  if(legacy&&c.id==='bard'&&sub==='低语')add('psychicBlades','心灵之刃','本轮首次武器命中 +2d6 心灵；5 级起为 3d6，消耗激励。',3)
  if(c.id==='wizard') {add('bladesong','剑歌已激活',legacy?'剑歌提供防御增益，不额外加入智力伤害。':'使用智力（主属性）进行武器攻击。',legacy?2:3);add('cantrip','额外攻击：替换一次为戏法','按 TCE / 新版剑咏者的武器命中型戏法估算。',6)}
  if(c.id==='cleric') {add('divineStrike',legacy?'受祝击（TCE 可选规则）':'受祝击：神圣打击','本回合首次武器命中 +1d8 光耀；假定选择此分支。',legacy?8:7)}
  if(c.id==='druid'&&!legacy)add('primalStrike','元素之怒：原初打击','本回合首次武器 / 野兽形态命中 +1d8 雷鸣；假定选择此分支。',7)
  if(c.id==='artificer' && sub==='战地匠师')add('jolt','奥能震荡','本回合首次魔法武器命中 +2d6 力场；伙伴触发请配置独立附伤。',9)
  if(c.id==='artificer' && sub==='制图师')add('cartography','精准引导：妖火目标','本回合首次命中加入智力调整值；目标须受你的妖火影响。',5)
  if(!legacy)add('mastery','使用武器精通','仅计算擦掠 / 侵扰 / 迅击的直接作用。失衡等效果须由玩家在环境中设置。')
  add('gwm',legacy?'巨武器大师：强力攻击 -5/+10':'巨武器大师：重武器掌握',legacy?'重型近战武器攻击检定 -5，命中伤害 +10；不自动计算击杀 / 重击附赠攻击。':'攻击动作中的重型武器命中加熟练值。',legacy?1:4)
  if(legacy)add('sharpshooter','神射手：强力射击 -5/+10','远程武器命中 -5，伤害 +10。')
  add('polearm','已选择长柄武器大师','解锁长柄附赠攻击；属性加点请自行填写。',legacy?1:4)
  add('dualWielder','已选择双持客',legacy?'允许两把非轻型单手近战武器参与双持，仍使用一次附赠动作。':'解锁独立的附赠攻击，可和迅击的轻型额外攻击同时使用。',legacy?1:4)
  add('bless','祝福术（来自盟友）','逐枚枚举 1d4 命中；不会占用你的专注。')
  return options
}

const dice=(count,die,type,flat=0,extra={})=>({count,die,type,flat,critical:true,...extra})
export function buildPlan(value, rawTarget=initialTarget()) {
  const {b,c,s,sub,level,pb,legacy,data}=identity(value), target={...initialTarget(),...rawTarget}, allowed=new Set(availableOptions(b).map(x=>x.id))
  const on=id=>allowed.has(id)&&b.options[id]===true, main=modifier(b.primary), secondary=modifier(b.secondary), warnings=[], notes=[], once=[], groups=[]
  for(const [key,min,max] of [['primary',1,30],['secondary',1,30],['level',1,10],['attackAdjust',-20,20],['damageAdjust',-20,30]])if(value[key]!==undefined&&(value[key]===''||!Number.isFinite(Number(value[key]))||Number(value[key])<min||Number(value[key])>max))warnings.push('存在空白或超出范围的输入，当前使用默认值或边界；请检查属性与调整值。')
  if(target.ac===''||!Number.isFinite(Number(target.ac))||target.ac<1||target.ac>60)warnings.push('目标 AC 应为 1—60；当前使用默认值或边界。')
  const is=(cls)=>c.id===cls, monkDie=legacy?(level>=5?6:4):(level>=5?8:6)
  let weapon={...data.weapons.find(w=>w.id===b.weaponId)}
  if(b.weaponId==='unarmed')weapon={name:'徒手打击',count:is('monk')?1:0,die:monkDie,flat:is('monk')?0:1,damageType:'bludgeoning',properties:[],mastery:'',unarmed:true}
  if(b.weaponId==='psychic')weapon={name:'心灵之刃',count:1,die:6,flat:0,damageType:'psychic',properties:['F'],mastery:'侵扰'}
  if(b.weaponId==='thunder')weapon={name:'雷霆护手',count:1,die:8,flat:0,damageType:'thunder',properties:[],mastery:''}
  if(b.weaponId==='lightning')weapon={name:'闪电发射器',count:1,die:6,flat:0,damageType:'lightning',properties:[],mastery:'',ranged:true}
  if(b.weaponId==='force')weapon={name:'力场战戟',count:1,die:10,flat:0,damageType:'force',properties:['H','R','2H'],mastery:''}
  if(on('grave'))weapon.damageType='necrotic'
  const props=weapon.properties||[], unarmed=!!weapon.unarmed
  if(is('monk') && !unarmed && (!weapon.ranged && (weapon.category==='simple'||props.includes('L'))))weapon.die=Math.max(weapon.die,monkDie)
  if(b.twoHanded && weapon.versatile)weapon.die=weapon.versatile
  const heavy=props.includes('H'), twoHands=props.includes('2H')||b.twoHanded
  const pact=on('pact')&&!weapon.ranged&&!unarmed
  const casterAbility=(!legacy&&(pact||on('bladesong')&&!twoHands))||(legacy&&is('warlock')&&sub==='咒剑')||is('artificer')&&(sub==='装甲师'||sub==='战地匠师'&&b.enchantment>0)
  let ability=b.ability==='secondary'?secondary:main
  if(b.ability==='auto'&&casterAbility)notes.push('武器攻击使用施法属性；主属性框填写该属性值。')
  const stat=b.attackStat==='auto'?(casterAbility?'int':is('monk')||weapon.ranged||props.includes('F')?'dex':'str'):b.attackStat
  const strength=stat==='str'
  const rage=on('rage')&&strength&&(!legacy||!weapon.ranged), rageBonus=level>=9?3:2
  let roll=target.roll, firstAdv=false
  if(on('reckless')&&strength&&(!legacy||!weapon.ranged)||on('vow')||on('clairvoyant')||on('spirit'))roll=roll==='disadvantage'?'normal':'advantage'
  if(on('assassinate')&&target.firstRound&&target.beforeTarget)roll=roll==='disadvantage'?'normal':'advantage'
  if(on('steady')||on('shadow'))firstAdv=true
  let attacks=['barbarian','fighter','monk','paladin','ranger'].includes(c.id)&&level>=5?2:1
  if(is('bard')&&['勇气','剑舞'].includes(sub)&&level>=6||is('wizard')&&level>=6||pact&&on('thirst')||is('artificer')&&['装甲师','战地匠师'].includes(sub)&&level>=5)attacks=2
  const oldWarMagic=legacy&&is('fighter')&&sub==='奥法骑士'&&on('cantrip')
  if(oldWarMagic)attacks=1
  const loading=props.includes('LD')
  if(loading&&attacks>1){attacks=1;warnings.push('装填武器：每个攻击动作仅一次攻击；暂不应用忽略装填专长。')}
  const power=legacy&&(on('gwm')&&heavy&&!weapon.ranged||on('sharpshooter')&&weapon.ranged)
  const bonus=ability+(b.proficient||pact?pb:0)+b.enchantment+b.attackAdjust+(b.style==='archery'&&weapon.ranged?2:0)+(on('sacred')?Math.max(1,secondary):0)-(power?5:0)
  const otherWeaponPlanned=['light','dual'].includes(b.bonusAction)||(on('mastery')&&props.includes('L')&&data.weapons.find(w=>w.id===b.offhandId)?.mastery==='迅击')
  if(b.style==='dueling'&&otherWeaponPlanned)warnings.push('已选择双武器攻击，对决的单武器伤害加值未计入。')
  const baseFlat=ability+b.enchantment+b.damageAdjust+(rage?rageBonus:0)+(b.style==='dueling'&&!otherWeaponPlanned&&!twoHands&&!weapon.ranged&&!unarmed?2:0)+(power?10:0)+(on('hexCurse')?pb:0)
  const source=dice(weapon.count,weapon.die,weapon.damageType,baseFlat+(weapon.flat||0),{gwf:b.style==='gwf'&&twoHands&&!weapon.ranged?(legacy?'reroll':true):false})
  const shared=[]
  // Weapon-only and all-attack riders are attached separately below.
  if(on('hex'))shared.push(dice(1,6,'necrotic',0,{targetOnly:true}))
  const weaponRiders=on('mark')?[dice(1,6,legacy?weapon.damageType:'force',0,{targetOnly:true})]:[]
  if(on('cleaver')&&rage)weaponRiders.push(dice(1,6,'fire'))
  for(const x of b.custom.filter(x=>x.frequency==='hit'))shared.push({...x})
  const addOnce=(id,name,src,eligible='weapon')=>once.push({id,name,...src,eligible})
  const sneakWeapon=props.includes('F')||weapon.ranged
  if(on('sneak')&&sneakWeapon)addOnce('sneak','偷袭',dice(Math.max(0,Math.ceil(level/2)-(on('cunning')?1:0)),6,weapon.damageType,!legacy&&on('assassinate')&&target.firstRound&&target.beforeTarget?level:0))
  if(on('sneak')&&!sneakWeapon)warnings.push('当前武器不具有灵巧，也不是远程武器，未计入偷袭。')
  if(!legacy&&on('frenzy')&&rage&&on('reckless'))addOnce('frenzy','狂怒',dice(rageBonus,6,weapon.damageType),'own')
  if(on('divineFury')&&rage)addOnce('divineFury','神性之怒',dice(1,6,'radiant',Math.floor(level/2)),'own')
  if(on('maneuver'))addOnce('maneuver','伤害型战技',dice(1,level>=10?10:8,weapon.damageType))
  if(on('psi'))addOnce('psi','灵能打击',dice(1,level>=5?8:6,'force',secondary))
  if(on('giantMight'))addOnce('giantMight','巨人之力',dice(1,6,weapon.damageType))
  if(on('flourish'))addOnce('flourish','伤害型挥舞',dice(1,level>=10?10:level>=5?8:6,weapon.damageType))
  if(on('psychicBlades'))addOnce('psychicBlades','心灵之刃',dice(level>=5?3:2,6,'psychic'))
  if(on('swarm'))addOnce('swarm','蜂群集击',dice(1,6,'piercing'))
  if(on('slayer'))addOnce('slayer','杀手猎物',dice(1,6,weapon.damageType))
  if(on('mercy'))addOnce('mercy','夺命之手',dice(1,monkDie,'necrotic',secondary),'unarmed')
  if(on('fey'))addOnce('fey','哀惧灵袭',dice(1,4,'psychic'))
  if(on('dread')&&!legacy)addOnce('dread','恐惧打击',dice(2,6,'psychic'))
  if(on('colossus')&&!on('horde')&&target.injured)addOnce('colossus','巨像屠夫',dice(1,8,weapon.damageType))
  if(on('colossus')&&!target.injured)warnings.push('目标未设为受伤，巨像屠夫不生效。')
  if(on('horde')&&on('colossus'))warnings.push('猎杀技艺互斥：本轮采用灭族者，未计算巨像屠夫。')
  const smiteLevel=clamp(value.smiteLevel,1,3,1), maxSlot=is('paladin')?(level>=9?3:level>=5?2:1):Math.min(5,Math.ceil(level/2))
  if(on('smite')&&!weapon.ranged){if(legacy&&!unarmed)weaponRiders.push(dice(Math.min(smiteLevel,maxSlot)+1,8,'radiant'));else if(!legacy&&!b.setup&&!on('steady'))addOnce('smite','至圣斩',dice(Math.min(smiteLevel,maxSlot)+1,8,'radiant'),'melee')}
  if(on('smite')&&weapon.ranged)warnings.push('至圣斩要求近战命中，当前远程武器未计入。')
  if(!legacy&&on('smite')&&b.setup)warnings.push('本轮附赠动作用于准备，至圣斩未计入。')
  if(on('eldritchSmite')&&pact)addOnce('eldritchSmite','魔能斩',dice(maxSlot+1,8,'force'))
  if(on('lifedrinker')&&pact)addOnce('lifedrinker','饮命者',dice(1,6,'necrotic'))
  if(on('grave'))addOnce('grave','坟冢之触',dice(1,weapon.die,'necrotic'))
  if(on('divineStrike'))addOnce('divineStrike','神圣打击',dice(1,8,'radiant'))
  if(on('primalStrike'))addOnce('primalStrike','原初打击',dice(1,8,'thunder'),'own')
  if(on('jolt')&&b.enchantment>0)addOnce('jolt','奥能震荡',dice(2,6,'force'))
  if(on('cartography'))addOnce('cartography','精准引导',dice(0,6,weapon.damageType,main))
  if(b.weaponId==='lightning'&&is('artificer')&&sub==='装甲师')addOnce('launcher','闪电发射器附伤',dice(1,6,'lightning'))
  for(const [i,x] of b.custom.filter(x=>x.frequency==='once').entries())addOnce('custom'+i,x.name,{...x},'own')
  if(on('cantrip'))notes.push('戏法替换按本轮第一次武器攻击的轰雷剑类命中附伤估算；其他戏法请用自定义配置，不把后续移动伤害默认算入。')
  const mastery=on('mastery')?weapon.mastery:''
  const make=(name,count,src=source,extra={})=>({name,count,hit:bonus,roll,cancelled:target.roll==='disadvantage'&&roll==='normal',crit:is('fighter')&&sub==='勇士'||on('hexCurse')?19:20,sources:[src,...shared,...(!unarmed?weaponRiders:[])],weapon:!unarmed,unarmed,melee:!weapon.ranged,mastery,bless:on('bless'),ability,own:true,action:true,...extra})
  groups.push(make('攻击动作 · '+weapon.name,attacks))
  if(on('surge'))groups.push(make('动作如潮 · '+weapon.name,oldWarMagic?2:attacks))
  if(on('echo')&&!weapon.ranged){groups.push(make('释放化身',1));if(on('surge'))groups.push(make('动作如潮 · 释放化身',1))}
  if(legacy&&on('dread')&&target.firstRound){groups.push(make('恐惧伏击额外攻击',1,source,{sources:[source,...shared,...weaponRiders,dice(1,8,weapon.damageType)]}));if(on('surge'))groups.push(make('动作如潮 · 恐惧伏击',1,source,{sources:[source,...shared,...weaponRiders,dice(1,8,weapon.damageType)]}))}
  let bonusUsed=b.setup||!legacy&&on('smite')||on('steady')||on('spirit'), lightUsed=false
  if(legacy&&on('frenzy')&&rage&&!bonusUsed){groups.push(make('狂怒附赠攻击',1,source,{action:false}));bonusUsed=true}
  if(oldWarMagic&&!bonusUsed){groups.push(make('战争魔法附赠攻击',1,source,{action:false}));bonusUsed=true}
  const off=data.weapons.find(w=>w.id===b.offhandId)
  const offSource=dice(off.count,off.die,off.damageType,(b.style==='twf'?ability:Math.min(0,ability))+b.enchantment+b.damageAdjust+(rage?rageBonus:0))
  const lightEligible=(props.includes('L')&&off.properties.includes('L')||legacy&&on('dualWielder')&&!twoHands&&!weapon.ranged&&!off.ranged&&!off.properties.includes('2H'))&&off.id!==weapon.id
  const nick=on('mastery')&&off.mastery==='迅击'&&lightEligible
  if(nick){groups.push(make('迅击 · '+off.name,1,offSource,{mastery:off.mastery,action:true}));lightUsed=true}
  const ba=b.bonusAction
  if(bonusUsed&&ba!=='none')warnings.push('附赠动作已被本轮准备 / 至圣斩 / 稳定瞄准占用，未加入额外附赠攻击。')
  if(!bonusUsed) {
    if(ba==='light'&&!lightUsed&&lightEligible){groups.push(make('轻型额外攻击 · '+off.name,1,offSource,{mastery:off.mastery,action:false}));bonusUsed=true}
    else if(ba==='dual'&&on('dualWielder')&&(legacy?lightEligible:props.includes('L'))&&!off.properties.includes('2H')&&off.id!==weapon.id){groups.push(make('双持客附赠攻击 · '+off.name,1,offSource,{mastery:off.mastery,action:false}));bonusUsed=true}
    else if(ba==='pole'&&on('polearm')&&(['长棍','矛'].includes(weapon.id)||heavy&&props.includes('R'))){groups.push(make('长柄打击',1,dice(1,4,'bludgeoning',baseFlat),{action:false}));bonusUsed=true}
    else if(['unarmed','flurry'].includes(ba)&&is('monk')&&(ba!=='flurry'||level>=2)) {const count=ba==='flurry'?(!legacy&&level>=10?3:2):1;groups.push(make(ba==='flurry'?'疾风连击':'武艺附赠打击',count,dice(1,monkDie,'bludgeoning',ability+b.damageAdjust),{hit:ability+pb+b.attackAdjust,unarmed:true,weapon:false,mastery:'',action:false,sources:[dice(1,monkDie,'bludgeoning',ability+b.damageAdjust),...shared]}));bonusUsed=true}
    else if(ba==='psychic'&&is('rogue')&&sub==='魂刃'&&b.weaponId==='psychic'){groups.push(make('第二把心灵之刃',1,dice(1,4,'psychic',baseFlat),{action:false}));bonusUsed=true}
    else if(ba==='warpriest'&&is('cleric')&&sub==='战争'){groups.push(make('战争祭司',1,source,{action:false}));bonusUsed=true}
    else if(['companion','form'].includes(ba)){const f=b.form;groups.push({name:f.name,count:f.attacks,hit:f.hit,roll:target.roll,crit:20,sources:[dice(f.count,f.die,f.type,f.flat)],weapon:false,unarmed:false,own:ba==='form',action:false,mastery:'',bless:false});bonusUsed=true;notes.push('伙伴 / 形态攻击使用下方手填数据卡，不自动继承角色命中、印记或武器专长。')}
    else if(ba!=='none')warnings.push('所选附赠攻击未满足等级、子职、专长或武器条件，未计入。')
  }
  if(b.formMode){const f=b.form;groups.splice(0,groups.length,{name:f.name,count:f.attacks,hit:f.hit,roll:target.roll,crit:20,sources:[dice(f.count,f.die,f.type,f.flat)],weapon:false,unarmed:false,own:true,action:true,mastery:'',bless:on('bless')});notes.push('手动形态已替换全部武器与附赠攻击；形态卡的多重攻击不自动叠加职业额外攻击。')}
  if(on('horde')&&!b.formMode)groups.push(make('灭族者 · 第二目标',1,source,{target:'secondary'}))
  if(b.reaction)groups.push(make('回合外反应攻击（已确认触发）',1,source,{own:false,action:false,mastery:'',roll:target.roll}))
  if(b.weaponId==='psychic'&&!(is('rogue')&&sub==='魂刃'))warnings.push('心灵之刃需要魂刃 3 级；当前仅作为手动武器数据计算。')
  if(['thunder','lightning','force'].includes(b.weaponId)&&!(is('artificer')&&sub==='装甲师'))warnings.push('所选装甲武器需要装甲师；当前作为手动数据计算。')
  if(is('monk')&&b.weaponId!=='unarmed'&&weapon.ranged)warnings.push('当前远程武器不应用武艺骰替换。')
  if(on('mastery')&&!['barbarian','fighter','paladin','ranger','rogue'].includes(c.id))warnings.push('此职业不自动获得武器精通；请确认已通过专长或其他来源获得。')
  if(['失衡','横扫','削弱','缓速','推离'].includes(mastery))notes.push('当前精通的条件性效果未自动改变主目标伤害；失衡成功率、第二目标横扫等请用环境与自定义配置。')
  if(heavy&&((weapon.ranged?b.primary:b.primary)<13))warnings.push('重型武器所需属性可能不足：请确认近战力量 / 远程敏捷至少 13；必要时手动设置劣势。')
  if(on('cantrip')&&on('surge'))notes.push('当前只替换本回合第一次命中型戏法，不自动在动作如潮中再替换。')
  notes.push('只计算玩家勾选的本轮条件，不推断敌人行动、专注存续或剩余资源。')
  return {b,c,s,legacy,level,pb,weapon,groups,once,warnings,notes,firstAdv,assassinSurprised:legacy&&on('assassinate')&&target.surprised,cantrip:on('cantrip'),brutalCritical:legacy&&is('barbarian')&&level>=9,brutal:on('brutal')&&on('reckless')&&strength&&!b.formMode,gwm:!legacy&&on('gwm')&&heavy,firstRound:target.firstRound,bless:on('bless'),automatic:b.custom.filter(x=>x.frequency==='automatic'),target,options:availableOptions(b)}
}

function average(src,critical=false) {
  const mean=(src.die+1)/2+(src.gwf==='reroll'?(src.die-2)/src.die:src.gwf?3/src.die:0)
  return Math.max(0,src.count*mean*(critical&&src.critical!==false?2:1)+Number(src.flat||0))
}
function resisted(src,target,crit=false){return average(src,crit)*([0,.5,1,2].includes(target.resistance?.[src.type])?target.resistance[src.type]:1)}
export function attackOutcomes(group,adv=false) {
  const state=resolvedRoll(group,adv)
  let hit=0,crit=0
  for(const [r,p] of d20Distribution(state)) {
    if(r>=group.crit){crit+=p;continue}
    if(r===1)continue
    for(const d of group.bless?[1,2,3,4]:[0])if(r+group.hit+d>=group.ac)hit+=p/(group.bless?4:1)
  }
  return {hit,crit,miss:Math.max(0,1-hit-crit)}
}
function resolvedRoll(group,adv){return adv?(group.cancelled||group.roll==='disadvantage'?'normal':'advantage'):group.roll}
export function calculateBuild(value,targetValue=initialTarget()) {
  const plan=buildPlan(value,targetValue), target=plan.target, ac=clamp(target.ac,1,60,15), rows=[], pool=plan.once
  let states=new Map([['0:0',{mask:0,vex:false,p:1}]]), total=0, first=true
  for(const g of plan.groups) {
    let groupDamage=0,groupHits=0,groupCrits=0
    if(!g.own) {
      // Only Sneak Attack can trigger again on another creature's turn.
      const mask=pool.reduce((m,x,i)=>x.id==='sneak'?m:m|(1<<i),0)
      states=new Map([[`${mask}:0`,{mask,vex:false,p:1}]])
    }
    for(let attack=0;attack<g.count;attack++){
      const next=new Map()
      const push=(mask,vex,p)=>{const key=mask+':'+Number(vex),old=next.get(key);if(old)old.p+=p;else next.set(key,{mask,vex,p})}
      for(const state of states.values()) {
        const isBrutal=first&&plan.brutal
        const attackGroup={...g,ac,...(isBrutal?{roll:target.roll==='disadvantage'?'disadvantage':'normal',cancelled:false}:{})}, advantage=!isBrutal&&((first&&plan.firstAdv)||(state.vex&&!g.target))
        const o=attackOutcomes(attackGroup,advantage)
        if(plan.assassinSurprised&&g.own){o.crit+=o.hit;o.hit=0}
        for(const [kind,prob] of Object.entries(o)) {
          const p=state.p*prob;if(!p)continue
          let damage=0,mask=state.mask
          if(kind!=='miss') {
            const critical=kind==='crit';damage=g.sources.filter(s=>!g.target||!s.targetOnly).reduce((sum,s)=>sum+resisted(s,target,critical),0)
            if(isBrutal)damage+=resisted(dice(1,10,plan.weapon.damageType),target,critical)
            if(first&&plan.cantrip&&g.weapon)damage+=resisted(dice(plan.level>=5?1:0,8,'thunder'),target,critical)
            if(critical&&plan.brutalCritical&&g.weapon&&g.melee)damage+=resisted(dice(1,g.sources[0].die,g.sources[0].type,0,{gwf:g.sources[0].gwf}),target,false)
            if(plan.gwm&&g.action&&g.weapon&&g.own)damage+=plan.pb*(target.resistance?.[plan.weapon.damageType]??1)
            if(!g.target)pool.forEach((src,i)=>{
              const eligible=g.own&&(src.eligible==='own'||src.eligible==='weapon'&&g.weapon||src.eligible==='unarmed'&&g.unarmed||src.eligible==='melee'&&g.melee)||!g.own&&src.id==='sneak'&&g.weapon
              if(!(mask&(1<<i))&&eligible&&!(src.id==='sneak'&&resolvedRoll(attackGroup,advantage)==='disadvantage')){damage+=resisted(src,target,critical);mask|=1<<i}
            })
            groupHits+=p;if(critical)groupCrits+=p
          } else if(g.mastery==='擦掠')damage=Math.max(0,g.ability)*(target.resistance?.[plan.weapon.damageType]??1)
          groupDamage+=p*damage
          push(mask,g.mastery==='侵扰'&&kind!=='miss'&&!g.target,p)
        }
      }
      states=next;first=false
    }
    rows.push({name:g.name,attacks:g.count,damage:groupDamage,hitRate:groupHits/g.count,critRate:groupCrits/g.count,secondary:!!g.target});total+=groupDamage
  }
  const automatic=plan.automatic.reduce((sum,s)=>sum+resisted(s,target),0)
  if(automatic){rows.push({name:'手动确认的直接伤害',attacks:0,damage:automatic,hitRate:null,critRate:null});total+=automatic}
  return {total,primary:rows.filter(r=>!r.secondary).reduce((n,r)=>n+r.damage,0),secondary:rows.filter(r=>r.secondary).reduce((n,r)=>n+r.damage,0),rows,plan}
}

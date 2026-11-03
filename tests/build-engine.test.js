import test from 'node:test'
import assert from 'node:assert/strict'
import { catalog, legacyCatalog, initialBuild, initialTarget, cleanBuild, availableOptions, buildPlan, calculateBuild, attackOutcomes } from '../src/build-engine.js'
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`)
const build=(classId='fighter',level=5,sub='勇士',extra={})=>({...initialBuild(),classId,level,subclassId:catalog.classes.find(c=>c.id===classId).subclasses.find(s=>s.shortName===sub).id,...extra})
test('all 24 core martial subclasses exist and all 620 level profiles calculate',()=>{
  assert.equal(catalog.classes.filter(c=>c.group==='martial').flatMap(c=>c.subclasses.filter(s=>s.source==='XPHB')).length,24)
  let count=0
  for(const c of catalog.classes)for(const s of c.subclasses)for(let level=1;level<=10;level++){
    const b=build(c.id,level,s.shortName), r=calculateBuild(b)
    assert.ok(Number.isFinite(r.total)&&r.total>=0);assert.equal(r.plan.pb,level<5?2:level<9?3:4);count++
  }
  assert.equal(count,620)
})
test('subclass crit does not activate at level 1; extra attacks unlock at level 5',()=>{
  assert.equal(buildPlan(build('fighter',1)).groups[0].crit,20)
  assert.equal(buildPlan(build('fighter',3)).groups[0].crit,19)
  assert.equal(buildPlan(build('fighter',4)).groups[0].count,1)
  assert.equal(buildPlan(build('fighter',5)).groups[0].count,2)
})
test('action surge adds one attack action and does not duplicate once-per-turn riders',()=>{
  const b=build('fighter',5,'战斗大师',{options:{surge:true,maneuver:true}}),r=calculateBuild(b),without=calculateBuild({...b,options:{surge:true}})
  assert.equal(r.plan.groups.reduce((n,g)=>n+g.count,0),4)
  const o=attackOutcomes({...r.plan.groups[0],ac:15}), hit=o.hit+o.crit
  near(r.total-without.total,(1-(1-hit)**4)*(o.hit*4.5+o.crit*9)/hit)
})
test('monk die and flurry attack counts at 1, 2, 5 and 10',()=>{
  for(const [level,count,die] of [[1,2,6],[2,3,6],[5,4,8],[10,5,8]]){
    const p=buildPlan(build('monk',level,'散打',{weaponId:'unarmed',bonusAction:level===1?'unarmed':'flurry'}))
    assert.equal(p.groups.reduce((n,g)=>n+g.count,0),count);assert.equal(p.groups[0].sources[0].die,die)
  }
})
test('subclass and level gating ignores stale checkbox values',()=>{
  const p=buildPlan(build('fighter',1,'勇士',{options:{surge:true,divineFury:true,maneuver:true,gwm:true}}))
  assert.equal(p.groups.length,1);assert.equal(p.once.length,0);assert.equal(p.gwm,false)
})
test('blade pact and thirst are required for warlock extra attack',()=>{
  assert.equal(buildPlan(build('warlock',5,'邪魔',{options:{thirst:true}})).groups[0].count,1)
  assert.equal(buildPlan(build('warlock',5,'邪魔',{options:{pact:true,thirst:true}})).groups[0].count,2)
  assert.equal(buildPlan(build('warlock',4,'邪魔',{options:{pact:true,thirst:true}})).groups[0].count,1)
})
test('valor and bladesinger extra attack starts at 6, not 5',()=>{
  for(const [c,s] of [['bard','勇气'],['wizard','剑咏者']]){
    assert.equal(buildPlan(build(c,5,s)).groups[0].count,1)
    assert.equal(buildPlan(build(c,6,s)).groups[0].count,2)
  }
})
test('nick and dual wielder produce 4 attacks; light bonus does not duplicate nick',()=>{
  const b=build('fighter',5,'勇士',{weaponId:'短剑',offhandId:'弯刀',options:{mastery:true,dualWielder:true},bonusAction:'dual'})
  assert.equal(buildPlan(b).groups.reduce((n,g)=>n+g.count,0),4)
  assert.equal(buildPlan({...b,bonusAction:'light'}).groups.reduce((n,g)=>n+g.count,0),3)
  assert.equal(buildPlan({...b,setup:true}).groups.reduce((n,g)=>n+g.count,0),3)
})
test('GWM adds proficiency only to attack-action hits, never -5/+10',()=>{
  const b=build('fighter',5,'勇士',{weaponId:'巨剑',options:{gwm:true,polearm:true},bonusAction:'pole'})
  const p=buildPlan(b);assert.equal(p.groups[0].hit,6)
  const base=calculateBuild({...b,options:{}}),r=calculateBuild(b)
  near(r.total-base.total,2*.6*3)
})
test('smite is once and reserves bonus action; setup prevents smite',()=>{
  const b=build('paladin',5,'奉献',{options:{smite:true,polearm:true},bonusAction:'pole',weaponId:'长柄刀'})
  const p=buildPlan(b);assert.equal(p.groups.length,1);assert.equal(p.once.filter(x=>x.id==='smite').length,1)
  assert.equal(buildPlan({...b,setup:true}).once.some(x=>x.id==='smite'),false)
})
test('sneak attack is once for multiple attacks and may trigger again outside turn',()=>{
  const b=build('rogue',5,'盗贼',{weaponId:'短剑',options:{sneak:true},bonusAction:'light'}),r=calculateBuild(b),base=calculateBuild({...b,options:{}})
  const o=attackOutcomes({...r.plan.groups[0],ac:15}),h=o.hit+o.crit
  near(r.total-base.total,(1-(1-h)**2)*(o.hit*10.5+o.crit*21)/h)
  const reaction=calculateBuild({...b,reaction:true}),reactionBase=calculateBuild({...b,reaction:true,options:{}})
  near(reaction.total-reactionBase.total,(r.total-base.total)+(o.hit*10.5+o.crit*21))
})
test('steady aim cancels disadvantage for first hit and permits sneak; disadvantage alone does not',()=>{
  const b=build('rogue',5,'盗贼',{weaponId:'短剑',options:{sneak:true}}),t={...initialTarget(),roll:'disadvantage'}
  near(calculateBuild(b,t).total,calculateBuild({...b,options:{}},t).total)
  assert.ok(calculateBuild({...b,options:{sneak:true,steady:true}},t).total>calculateBuild({...b,options:{steady:true}},t).total)
})
test('berserker rage and frenzy require strength, rage and reckless',()=>{
  const b=build('barbarian',5,'狂战士',{weaponId:'巨剑',options:{rage:true,reckless:true,frenzy:true}})
  assert.ok(buildPlan(b).once.some(x=>x.id==='frenzy'))
  assert.equal(buildPlan({...b,attackStat:'dex'}).once.some(x=>x.id==='frenzy'),false)
  assert.equal(buildPlan({...b,options:{frenzy:true,rage:true}}).once.some(x=>x.id==='frenzy'),false)
})
test('brutal strike drops first advantage and adds a single d10 on that attack',()=>{
  const b=build('barbarian',9,'兽心',{weaponId:'巨剑',options:{reckless:true,brutal:true}}),r=calculateBuild(b)
  const p=buildPlan(b),g=p.groups[0],normal=attackOutcomes({...g,roll:'normal',ac:15}),adv=attackOutcomes({...g,ac:15})
  near(r.total,(normal.hit+adv.hit)*10+(normal.crit+adv.crit)*17+normal.hit*5.5+normal.crit*11)
})
test('graze damages misses but never activates once-on-hit riders',()=>{
  const b=build('fighter',5,'战斗大师',{weaponId:'巨剑',options:{mastery:true,maneuver:true}}),t={...initialTarget(),ac:60},r=calculateBuild(b,t),base=calculateBuild({...b,options:{mastery:true}},t)
  near(r.total-base.total,(1-.95**2)*9)
  assert.ok(base.total>0)
})
test('vex uses conditional advantage on subsequent attack only',()=>{
  const b=build('fighter',5,'勇士',{weaponId:'刺剑',options:{mastery:true}}),r=calculateBuild(b),g=r.plan.groups[0]
  const n=attackOutcomes({...g,ac:15}),a=attackOutcomes({...g,roll:'advantage',ac:15})
  near(r.rows[0].hitRate,((n.hit+n.crit)+(n.hit+n.crit)*(a.hit+a.crit)+(n.miss)*(n.hit+n.crit))/2)
})
test('companions use their own hit and damage; form replaces all weapon groups',()=>{
  const b=build('ranger',5,'驯兽师',{bonusAction:'companion',options:{mark:true},form:{name:'伴侣',attacks:1,hit:0,count:1,die:4,flat:0,type:'slashing'}}),p=buildPlan(b)
  assert.equal(p.groups.at(-1).hit,0);assert.equal(p.groups.at(-1).sources.length,1)
  const form=buildPlan({...b,formMode:true});assert.equal(form.groups.length,1);assert.equal(form.groups[0].count,1)
})
test('secondary target does not inherit hunters mark or once-per-turn riders',()=>{
  const b=build('ranger',5,'猎人',{options:{horde:true,mark:true}}),r=calculateBuild(b),base=calculateBuild({...b,options:{horde:true}})
  near(r.secondary,base.secondary)
})
test('all damage immunity produces zero; malformed saved builds recover',()=>{
  const b=build('rogue',10,'魂刃',{weaponId:'psychic',options:{sneak:true},bonusAction:'psychic'})
  const t={...initialTarget(),resistance:Object.fromEntries(Object.keys(initialTarget().resistance).map(k=>[k,0]))}
  near(calculateBuild(b,t).total,0)
  const clean=cleanBuild({classId:'wrong',level:999,primary:'',custom:[null,{}],options:null,form:null});assert.equal(clean.level,10);assert.ok(Number.isFinite(calculateBuild(clean).total))
})
test('all allowed checkboxes at all profiles produce finite nonnegative results',()=>{
  for(const c of catalog.classes)for(const s of c.subclasses)for(const level of [1,3,5,6,9,10]){
    const b=build(c.id,level,s.shortName);b.options=Object.fromEntries(availableOptions(b).map(o=>[o.id,true]));const r=calculateBuild(b);assert.ok(Number.isFinite(r.total)&&r.total>=0)
  }
})
const old=(c,level,sub,extra={})=>({...initialBuild(),rules:'5e',classId:c,level,subclassId:legacyCatalog.classes.find(x=>x.id===c).subclasses.find(x=>x.shortName===sub).id,...extra})
test('all 980 legacy level profiles calculate with edition-specific subclasses',()=>{
  let n=0
  for(const c of legacyCatalog.classes)for(const s of c.subclasses)for(let level=1;level<=10;level++){
    const b=old(c.id,level,s.shortName);assert.ok(Number.isFinite(calculateBuild(b).total));n++
    if([3,6,10].includes(level)){b.options=Object.fromEntries(availableOptions(b).map(o=>[o.id,true]));assert.ok(Number.isFinite(calculateBuild(b).total))}
  }assert.equal(n,980)
})
test('2014 and 2024 martial arts and level-10 flurry remain distinct',()=>{
  const oldPlan=buildPlan(old('monk',10,'散打',{weaponId:'unarmed',bonusAction:'flurry'})),newPlan=buildPlan(build('monk',10,'散打',{weaponId:'unarmed',bonusAction:'flurry'}))
  assert.equal(oldPlan.groups[0].sources[0].die,6);assert.equal(newPlan.groups[0].sources[0].die,8)
  assert.equal(oldPlan.groups.reduce((n,g)=>n+g.count,0),4);assert.equal(newPlan.groups.reduce((n,g)=>n+g.count,0),5)
})
test('2014 frenzy is a bonus weapon attack, 2024 frenzy is once damage',()=>{
  const p=buildPlan(old('barbarian',5,'狂战士',{options:{rage:true,frenzy:true}}))
  assert.equal(p.groups.reduce((n,g)=>n+g.count,0),3);assert.ok(!p.once.some(x=>x.id==='frenzy'))
  const p2=buildPlan(old('barbarian',5,'狂战士',{options:{rage:true,frenzy:true},setup:true}));assert.equal(p2.groups.reduce((n,g)=>n+g.count,0),2)
})
test('2014 GWM and sharpshooter apply -5/+10; mastery unavailable',()=>{
  const b=old('fighter',5,'勇士',{weaponId:'巨剑',options:{gwm:true,mastery:true}}),p=buildPlan(b)
  assert.equal(p.groups[0].hit,1);assert.equal(p.groups[0].sources[0].flat,13);assert.equal(p.groups[0].mastery,'');assert.equal(p.gwm,false)
  assert.ok(!availableOptions(b).some(o=>o.id==='mastery'))
  assert.equal(buildPlan(old('ranger',5,'猎人',{weaponId:'长弓',options:{sharpshooter:true}})).groups[0].hit,1)
})
test('2014 smite applies on each hit without spending bonus action',()=>{
  const b=old('paladin',5,'奉献',{weaponId:'长柄刀',options:{smite:true,polearm:true},bonusAction:'pole'}),p=buildPlan(b)
  assert.equal(p.groups.length,2);assert.equal(p.once.some(x=>x.id==='smite'),false)
  assert.ok(p.groups.every(g=>g.sources.some(s=>s.type==='radiant')))
})
test('2014 GWF rerolls low weapon dice; 2024 treats them as 3',()=>{
  const b=old('fighter',5,'勇士',{weaponId:'巨剑',style:'gwf'}),r=calculateBuild(b)
  const g=r.plan.groups[0],o=attackOutcomes({...g,ac:15})
  near(r.total,2*(o.hit*(2*(3.5+4/6)+3)+o.crit*(4*(3.5+4/6)+3)))
  assert.notEqual(r.total,calculateBuild({...b,rules:'5r',subclassId:'fighter-XPHB-勇士'}).total)
})
test('2014 subclass unlocks: cleric/warlock at 1, druid at 2; 2024 at 3',()=>{
  assert.equal(buildPlan(old('cleric',1,'战争')).s.unlock,1)
  assert.equal(buildPlan(old('warlock',1,'咒剑')).groups[0].crit,20)
  assert.equal(buildPlan(old('warlock',1,'咒剑',{options:{hexCurse:true}})).groups[0].crit,19)
  assert.equal(buildPlan(old('druid',2,'月亮')).s.unlock,2)
})
test('2014 dread ambusher adds first-round attack; 2024 adds once psychic damage',()=>{
  const b=old('ranger',5,'幽域追踪者',{options:{dread:true}})
  assert.equal(buildPlan(b,initialTarget()).groups.reduce((n,g)=>n+g.count,0),2)
  assert.equal(buildPlan(b,{...initialTarget(),firstRound:true}).groups.reduce((n,g)=>n+g.count,0),3)
  const p=buildPlan(build('ranger',5,'幽域追踪者',{options:{dread:true}}));assert.ok(p.once.some(x=>x.id==='dread'));assert.equal(p.groups[0].count,2)
})
test('2014 assassin auto-crits only a surprised target; no 2024 level damage',()=>{
  const b=old('rogue',5,'刺客',{weaponId:'短剑',options:{sneak:true,assassinate:true}}),normal=calculateBuild(b),surprised=calculateBuild(b,{...initialTarget(),surprised:true})
  near(surprised.rows[0].hitRate,surprised.rows[0].critRate);assert.ok(surprised.total>normal.total);assert.equal(surprised.plan.once.find(x=>x.id==='sneak').flat,0)
})
test('2014 eldritch knight uses one cantrip weapon attack plus bonus weapon attack',()=>{
  const p=buildPlan(old('fighter',7,'奥法骑士',{options:{cantrip:true}}));assert.equal(p.groups.length,2);assert.equal(p.groups[0].count,1);assert.equal(p.groups[1].count,1)
  const normal=buildPlan(build('fighter',7,'奥法骑士',{options:{cantrip:true}}));assert.equal(normal.groups.length,1);assert.equal(normal.groups[0].count,2)
})

import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultConfig,defaultSaveConfig,normalizeConfig,calculateAttack,calculateSave,d20Distribution,diceAverage} from '../src/engine.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10, `${a} != ${b}`);
const attack=()=>structuredClone(defaultConfig);
const save=()=>structuredClone(defaultSaveConfig);
test('default attack includes critical hits in hit rate',()=>{const r=calculateAttack(attack());near(r.hitRate,.55);near(r.critRate,.05);near(r.roundTotalDPR,11.7)});
test('d20 probability masses agree with exhaustive enumeration',()=>{
 for(const state of ['normal','advantage','disadvantage']) for(const elven of [false,true]) {
  const n=state==='normal'?1:state==='advantage'&&elven?3:2, counts=Array(21).fill(0);
  function walk(a){if(a.length===n){counts[state==='disadvantage'?Math.min(...a):Math.max(...a)]++;return}for(let r=1;r<=20;r++)walk([...a,r])}walk([]);
  for(const [r,p] of d20Distribution(state,elven))near(p,counts[r]/20**n);
 }
});
test('bless enumerates each d4 outcome rather than using its average',()=>{const c=attack();c.targetAC=30;c.buffs.bless=true;c.baseAttackBonus=7;near(calculateAttack(c).hitRate,.0625)});
test('bless and inspiration agree with independent exhaustive attack rolls',()=>{
 for(const state of ['normal','advantage','disadvantage']){
 const c=attack();c.buffs.bless=true;c.bardicInsp={active:true,size:6,type:'attack'};c.rollState=state;
 let hits=0,total=0;for(let a=1;a<=20;a++)for(let b=1;b<=20;b++)for(let bless=1;bless<=4;bless++)for(let insp=1;insp<=6;insp++){
 const r=state==='normal'?a:state==='advantage'?Math.max(a,b):Math.min(a,b);total++;if(r===20||(r!==1&&r+5+bless+insp>=15))hits++;
 }near(calculateAttack(c).hitRate,hits/total);
 }
});
test('natural 1 misses, critical range hits even extreme AC',()=>{const c=attack();c.baseAttackBonus=100;c.targetAC=1;near(calculateAttack(c).hitRate,.95);c.targetAC=100;c.baseAttackBonus=-100;c.critThreshold=18;near(calculateAttack(c).hitRate,.15)});
test('Brutal Critical adds one die for a 2d6 weapon',()=>{const c=attack();c.brutalCritical.active=true;near(calculateAttack(c).avgPerHitCrit,20.5)});
test('GWF treats 1 and 2 as 3',()=>{near(diceAverage(6,true),4);near(diceAverage(12,true),6.75)});
test('once-per-turn damage triggers on first hit only',()=>{const c=attack();c.sneakAttack.active=true;const r=calculateAttack(c);near(r.roundTotalDPR-11.7,(1-.45**2)*(.5*3.5+.05*7)/.55)});
test('immunity applies to both normal and critical damage',()=>{const c=attack();c.targetResistances.slashing=0;near(calculateAttack(c).roundTotalDPR,0)});
test('normal save does not auto succeed or fail on 1 / 20',()=>{const c=save();c.spellDC=1;c.targetSaveMod=20;near(calculateSave(c).successRate,1);c.spellDC=40;c.targetSaveMod=-20;near(calculateSave(c).successRate,0)});
test('save advantage, disadvantage and success effects',()=>{const c=save();near(calculateSave(c).expectedDpr,22.4);c.rollState='advantage';near(calculateSave(c).successRate,.64);c.rollState='disadvantage';near(calculateSave(c).successRate,.16);c.successEffect='zero';near(calculateSave(c).expectedDpr,23.52)});
test('malformed persisted data, missing nested fields and excessive counts recover safely',()=>{const c=normalizeConfig({buffs:null,attacksPerRound:1e20,diceCount:'oops',targetResistances:{fire:88},customDice:[null,{},...Array(50).fill({count:10000})]});assert.equal(c.attacksPerRound,20);assert.equal(c.diceCount,2);assert.equal(c.targetResistances.fire,1);assert.ok(c.customDice.length<=30);assert.ok(Number.isFinite(calculateAttack(c).roundTotalDPR));assert.deepEqual(normalizeConfig(null),defaultConfig)});
test('temporary blank, negative dice and nonfinite values cannot poison results',()=>{for(const bad of ['',null,NaN,Infinity,-100]){const c=attack();c.diceCount=bad;c.attacksPerRound=bad;assert.ok(calculateAttack(c).roundTotalDPR>=0)}const c=save();c.flatMod=-100;near(calculateSave(c).expectedDpr,0)});

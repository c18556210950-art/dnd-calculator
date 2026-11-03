export const damageTypes =[
  { value: 'slashing', label: '挥砍 (Slashing)' }, { value: 'piercing', label: '穿刺 (Piercing)' },
  { value: 'bludgeoning', label: '钝击 (Bludgeoning)' }, { value: 'radiant', label: '光耀 (Radiant)' },
  { value: 'necrotic', label: '暗蚀 (Necrotic)' }, { value: 'cold', label: '冷冻 (Cold)' },
  { value: 'fire', label: '火焰 (Fire)' }, { value: 'force', label: '力场 (Force)' },
  { value: 'lightning', label: '闪电 (Lightning)' }, { value: 'poison', label: '毒素 (Poison)' }, { value: 'psychic', label: '心灵 (Psychic)' },
  { value: 'thunder', label: '雷鸣 (Thunder)' }, { value: 'acid', label: '强酸 (Acid)' }
]

export const dtDict = Object.fromEntries(damageTypes.map(t =>[t.value, t.label.split(' ')[0]]))

// === 配置 1：攻击期望 ===
export const defaultConfig = {
  attacksPerRound: 2, pb: 2,
  baseAttackBonus: 5, customAttackMod: 0, customDamageMod: 0,
  diceCount: 2, diceType: 6, baseDamageMod: 3, baseDamageType: 'slashing',
  critThreshold: 20, rollState: 'normal', elvenAccuracy: false, targetAC: 15,
  fightingStyle: 'none',
  rage: { active: false, bonus: 2 },
  sneakAttack: { active: false, dice: 1 },
  brutalCritical: { active: false, dice: 1 },
  bardicInsp: { active: false, size: 6, type: 'attack' },
  buffs: {
    hexbladesCurse: false, gwm: false, bless: false, huntersMark: false, hex: false, divineFavor: false,
    magicWeapon: false, holyWeapon: false, crusadersMantle: false, flameArrows: false,
    smite: false, spiritShroud: false, elementalWeapon: false, cme: false
  },
  smiteLevel: 1, smiteUndead: false,
  spiritShroudLevel: 3, spiritShroudType: 'radiant',
  cmeLevel: 4, cmeType: 'fire',
  onceBuffs: { zephyrStrike: false, boomingBlade: { active: false, tier: 0 }, greenFlameBlade: { active: false, tier: 0 } },
  customDice:[],
  targetResistances: damageTypes.reduce((acc, dt) => ({ ...acc,[dt.value]: 1 }), {})
}

// === 配置 2：法术豁免 ===
export const defaultSaveConfig = {
  spellDC: 15, targetSaveMod: 2, rollState: 'normal',
  diceCount: 8, diceType: 6, flatMod: 0, damageType: 'fire', successEffect: 'half',
  targetResistances: damageTypes.reduce((acc, dt) => ({ ...acc, [dt.value]: 1 }), {})
}


// Schema-based loading rejects malformed/obsolete nested values and bounds work.
export function normalizeConfig(value, defaults = defaultConfig) {
  function merge(v, d, key = '') {
    if (Array.isArray(d)) return Array.isArray(v) ? v.slice(0, 30).filter(x => x && typeof x === 'object').map(x => ({
      count: number(x.count, 1, 0, 100), type: [4,6,8,10,12].includes(x.type) ? x.type : 6,
      dmgType: damageTypes.some(t => t.value === x.dmgType) ? x.dmgType : 'force', frequency: x.frequency === 'once' ? 'once' : 'perHit'
    })) : [];
    if (d && typeof d === 'object') return Object.fromEntries(Object.entries(d).map(([k, def]) => [k, merge(v?.[k], def, k)]));
    if (typeof d === 'number') {
      const limits = {attacksPerRound:[1,20], pb:[0,10], diceCount:[0,100], dice:[0,100], critThreshold:[18,20], targetAC:[1,100], spellDC:[1,100], smiteLevel:[1,5], spiritShroudLevel:[3,9], cmeLevel:[4,9], tier:[0,3]};
      if (key === 'diceType' || key === 'type' || key === 'size') return [4,6,8,10,12].includes(v) ? v : d;
      if (damageTypes.some(t => t.value === key)) return [0,0.5,1,2].includes(v) ? v : d;
      return number(v, d, ...(limits[key] || [-100,100]));
    }
    if (typeof d === 'boolean') return typeof v === 'boolean' ? v : d;
    const options = {rollState:['normal','advantage','disadvantage'], fightingStyle:['none','archery','dueling','gwf'], type:['attack','damage'], successEffect:['half','zero']};
    if (options[key]) return options[key].includes(v) ? v : d;
    if (key.toLowerCase().includes('type')) return damageTypes.some(t => t.value === v) ? v : d;
    return typeof v === 'string' ? v : d;
  }
  return merge(value, defaults);
}
function number(v, fallback, min, max) {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.trunc(v))) : fallback;
}
export function buildDamageSources(value) {
  const config = normalizeConfig(value);
  const perHit =[], once =[], activeTypes = new Set()

  let baseFlat = config.baseDamageMod + config.customDamageMod
  if (config.fightingStyle === 'dueling') baseFlat += 2
  if (config.rage.active) baseFlat += config.rage.bonus
  if (config.buffs.gwm) baseFlat += 10
  if (config.buffs.magicWeapon) baseFlat += 1
  if (config.buffs.hexbladesCurse) baseFlat += config.pb // 咒剑诅咒：伤害掷骰加 PB

  perHit.push({ count: config.diceCount, type: config.diceType, flat: baseFlat, dmgType: config.baseDamageType, isBase: true })
  
  if (config.buffs.huntersMark) perHit.push({ count: 1, type: 6, flat: 0, dmgType: 'force' })
  if (config.buffs.hex) perHit.push({ count: 1, type: 6, flat: 0, dmgType: 'necrotic' })
  if (config.buffs.divineFavor) perHit.push({ count: 1, type: 4, flat: 0, dmgType: 'radiant' })
  if (config.buffs.holyWeapon) perHit.push({ count: 2, type: 8, flat: 0, dmgType: 'radiant' })
  if (config.buffs.crusadersMantle) perHit.push({ count: 1, type: 4, flat: 0, dmgType: 'radiant' })
  if (config.buffs.flameArrows) perHit.push({ count: 1, type: 6, flat: 0, dmgType: 'fire' })
  if (config.buffs.smite) perHit.push({ count: Math.min(config.smiteLevel + 1, 5) + (config.smiteUndead ? 1 : 0), type: 8, flat: 0, dmgType: 'radiant' })
  if (config.buffs.spiritShroud) perHit.push({ count: 1 + Math.floor((config.spiritShroudLevel - 3) / 2), type: 8, flat: 0, dmgType: config.spiritShroudType })
  if (config.buffs.cme) perHit.push({ count: config.cmeLevel - 2, type: 8, flat: 0, dmgType: config.cmeType })

  if (config.sneakAttack.active) once.push({ count: config.sneakAttack.dice, type: 6, flat: 0, dmgType: config.baseDamageType })
  if (config.onceBuffs.zephyrStrike) once.push({ count: 1, type: 8, flat: 0, dmgType: 'force' })
  if (config.onceBuffs.boomingBlade.active && config.onceBuffs.boomingBlade.tier>0) once.push({ count: config.onceBuffs.boomingBlade.tier, type: 8, flat: 0, dmgType: 'thunder' })
  if (config.onceBuffs.greenFlameBlade.active && config.onceBuffs.greenFlameBlade.tier>0) once.push({ count: config.onceBuffs.greenFlameBlade.tier, type: 8, flat: 0, dmgType: 'fire' })
  if (config.bardicInsp.active && config.bardicInsp.type === 'damage') once.push({ count: 1, type: config.bardicInsp.size, flat: 0, dmgType: config.baseDamageType })

  config.customDice.forEach(d => {
    const src = { count: d.count, type: d.type, flat: 0, dmgType: d.dmgType }
    if (d.frequency === 'perHit') perHit.push(src); else once.push(src);
  })

  perHit.forEach(d => { if(d.count>0 || d.flat!==0) activeTypes.add(d.dmgType) })
  once.forEach(d => { if(d.count>0) activeTypes.add(d.dmgType) })

  return { perHit, once, activeTypes: Array.from(activeTypes) }

}
export function attackBonus(value, includeDice = true) {
  const c = normalizeConfig(value);
  return c.baseAttackBonus + c.customAttackMod + (c.fightingStyle === 'archery' ? 2 : 0) - (c.buffs.gwm ? 5 : 0) + (c.buffs.magicWeapon ? 1 : 0)
    + (includeDice && c.buffs.bless ? 2.5 : 0) + (includeDice && c.bardicInsp.active && c.bardicInsp.type === 'attack' ? (c.bardicInsp.size + 1) / 2 : 0);
}
// Probability mass of selected d20: at most 20 faces, even for Elven Accuracy.
export function d20Distribution(state, elven = false) {
  const n = state === 'normal' ? 1 : state === 'advantage' && elven ? 3 : 2;
  return Array.from({length:20}, (_, i) => {
    const r = i + 1;
    return [r, state === 'disadvantage' ? ((21-r)/20)**n - ((20-r)/20)**n : (r/20)**n - ((r-1)/20)**n];
  });
}
export const diceAverage = (type, gwf = false) => (type + 1) / 2 + (gwf ? 3 / type : 0);
export function calculateAttack(value, targetAC) {
  const c = normalizeConfig(value), ac = targetAC ?? c.targetAC;
  const crit = Math.min(c.critThreshold, c.buffs.hexbladesCurse ? 19 : 20);
  const bonus = attackBonus(c, false);
  const bless = c.buffs.bless ? [1,2,3,4] : [0];
  const inspiration = c.bardicInsp.active && c.bardicInsp.type === 'attack' ? Array.from({length:c.bardicInsp.size}, (_,i)=>i+1) : [0];
  let normalHitRate = 0, critRate = 0;
  for (const [r, p] of d20Distribution(c.rollState, c.elvenAccuracy)) {
    if (r >= crit) {critRate += p; continue;}
    if (r === 1) continue;
    for (const b of bless) for (const i of inspiration) if (r + bonus + b + i >= ac) normalHitRate += p / bless.length / inspiration.length;
  }
  const sources = buildDamageSources(c);
  const damage = (list, critical) => list.reduce((total, s) => {
    const avg = diceAverage(s.type, s.isBase && c.fightingStyle === 'gwf');
    // Brutal Critical adds individual weapon dice, not entire weapon dice pools.
    const count = s.count * (critical ? 2 : 1) + (critical && s.isBase && c.brutalCritical.active ? c.brutalCritical.dice : 0);
    return total + Math.max(0, count * avg + s.flat) * (c.targetResistances[s.dmgType] ?? 1);
  },0);
  const avgPerHitNorm = damage(sources.perHit,false), avgPerHitCrit = damage(sources.perHit,true);
  const avgOnceNorm = damage(sources.once,false), avgOnceCrit = damage(sources.once,true);
  const hitRate = Math.min(1, normalHitRate + critRate), missRate = Math.max(0, 1-hitRate);
  const once = hitRate > 0 ? (1-missRate**c.attacksPerRound) * (normalHitRate*avgOnceNorm + critRate*avgOnceCrit)/hitRate : 0;
  return {normalHitRate,critRate,hitRate,avgPerHitNorm,avgPerHitCrit,avgOnceNorm,avgOnceCrit,roundTotalDPR:c.attacksPerRound*(normalHitRate*avgPerHitNorm+critRate*avgPerHitCrit)+once};
}
export function calculateSave(value, mod) {
  const c = normalizeConfig(value, defaultSaveConfig);
  const successRate = d20Distribution(c.rollState).reduce((p,[r,weight])=>p + (r + (mod ?? c.targetSaveMod) >= c.spellDC ? weight : 0),0);
  const rawDamage = Math.max(0,c.diceCount*diceAverage(c.diceType)+c.flatMod);
  const multiplier = c.targetResistances[c.damageType] ?? 1;
  return {successRate,failRate:1-successRate,rawDamage,expectedDpr:rawDamage*multiplier*((1-successRate)+(c.successEffect==='half'?successRate/2:0))};
}

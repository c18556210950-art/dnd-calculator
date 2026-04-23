<template>
  <div class="calculator-container">
    <header class="header">
      <h1>D&D 5E 终极伤害构建器 (Builder) 🐉</h1>
      <p>支持多段攻击与概率折算 | 骰子公式实时演算</p>
      <button @click="resetConfig" class="reset-btn">🔄 重置默认</button>
    </header>

    <main class="main-content">
      <!-- ================= 左侧：配置区 ================= -->
      <section class="left-panel">
        
        <!-- 1. 基础面板 -->
        <div class="card">
          <div class="card-title">⚔️ 基础攻击面板</div>
          <div class="grid-2">
            <div class="input-group">
              <label>每轮攻击次数 (N打)</label>
              <input type="number" v-model.number="config.attacksPerRound" min="1" max="10" />
            </div>
            <div class="input-group">
              <label>重击范围 (Crit)</label>
              <select v-model.number="config.critThreshold">
                <option :value="20">20</option>
                <option :value="19">19 - 20</option>
                <option :value="18">18 - 20</option>
              </select>
            </div>
          </div>
          <div class="input-row mt-2">
            <div class="input-group"><label>武器骰数</label><input type="number" v-model.number="config.diceCount"/></div>
            <span class="cross">d</span>
            <div class="input-group">
              <label>面数</label>
              <select v-model.number="config.diceType">
                <option :value="4">4</option><option :value="6">6</option><option :value="8">8</option>
                <option :value="10">10</option><option :value="12">12</option>
              </select>
            </div>
            <span class="cross">+</span>
            <div class="input-group"><label>属性加值(Hit)</label><input type="number" v-model.number="config.baseAttackBonus"/></div>
            <span class="cross">+</span>
            <div class="input-group"><label>属性加值(Dmg)</label><input type="number" v-model.number="config.baseDamageMod"/></div>
          </div>
          <div class="grid-2 mt-2">
            <div class="input-group">
              <label>基础伤害类型</label>
              <select v-model="config.baseDamageType">
                <option v-for="t in damageTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
            </div>
            <div class="input-group">
              <label>自选调整 (如 +1 附魔武器)</label>
              <div style="display:flex; gap:5px;">
                <input type="number" placeholder="Hit+" v-model.number="config.customAttackMod" title="自定义命中加成" />
                <input type="number" placeholder="Dmg+" v-model.number="config.customDamageMod" title="自定义伤害加成" />
              </div>
            </div>
          </div>
        </div>

        <!-- 2. 状态与战斗流派 -->
        <div class="card">
          <div class="card-title">🛡️ 战斗流派与状态</div>
          <div class="toggle-group mb-2">
            <div class="radio-buttons">
              <label><input type="radio" v-model="config.rollState" value="normal"> 正常</label>
              <label><input type="radio" v-model="config.rollState" value="advantage"> 优势</label>
              <label><input type="radio" v-model="config.rollState" value="disadvantage"> 劣势</label>
            </div>
            <label class="elven-text ml-3" v-if="config.rollState === 'advantage'">
              <input type="checkbox" v-model="config.elvenAccuracy"> 精灵之准
            </label>
          </div>

          <div class="switch-grid">
            <label><input type="checkbox" v-model="config.buffs.gwm"> 巨武大师/神射手 (-5/+10)</label>
            <label><input type="checkbox" v-model="config.buffs.bless"> 祝福术 (+1d4 命中)</label>
            <label><input type="radio" v-model="config.fightingStyle" value="none"> 无流派</label>
            <label><input type="radio" v-model="config.fightingStyle" value="archery"> 箭术 (+2 命中)</label>
            <label><input type="radio" v-model="config.fightingStyle" value="dueling"> 对决 (+2 伤害)</label>
            <label><input type="radio" v-model="config.fightingStyle" value="gwf"> 巨武战斗 (1/2视作3)</label>
          </div>
        </div>

        <!-- 3. 职业特性 -->
        <div class="card">
          <div class="card-title">✨ 核心职业特性</div>
          
          <div class="feature-row">
            <label><input type="checkbox" v-model="config.rage.active"> 狂暴 (Rage)</label>
            <select v-if="config.rage.active" v-model.number="config.rage.bonus">
              <option :value="2">+2 伤害</option><option :value="3">+3 伤害</option><option :value="4">+4 伤害</option>
            </select>
          </div>

          <div class="feature-row">
            <label><input type="checkbox" v-model="config.sneakAttack.active"> 偷袭 (Sneak Attack)</label>
            <span v-if="config.sneakAttack.active">
              <input type="number" v-model.number="config.sneakAttack.dice" min="1" max="10" style="width:40px"> d6
            </span>
          </div>

          <div class="feature-row">
            <label><input type="checkbox" v-model="config.brutalCritical.active"> 凶蛮重击</label>
            <select v-if="config.brutalCritical.active" v-model.number="config.brutalCritical.dice">
              <option :value="1">1 枚骰子</option><option :value="2">2 枚骰子</option><option :value="3">3 枚骰子</option>
            </select>
          </div>

          <div class="feature-row">
            <label><input type="checkbox" v-model="config.bardicInsp.active"> 诗人激励</label>
            <div v-if="config.bardicInsp.active" style="display:flex; gap:5px;">
              <select v-model.number="config.bardicInsp.size">
                <option :value="6">d6</option><option :value="8">d8</option>
                <option :value="10">d10</option><option :value="12">d12</option>
              </select>
              <select v-model="config.bardicInsp.type">
                <option value="attack">加至 命中</option>
                <option value="damage">加至 伤害 (一次)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 4. 法术大全 -->
        <div class="card">
          <div class="card-title">🔥 法术增益 (Spells)</div>
          
          <!-- 常驻/每次命中法术 -->
          <div class="spell-section">
            <div class="sec-title">每次命中附带 (Per Hit)</div>
            <div class="switch-grid">
              <label><input type="checkbox" v-model="config.buffs.huntersMark"> 猎人印记 (1d6 力场)</label>
              <label><input type="checkbox" v-model="config.buffs.hex"> 脆弱诅咒 (1d6 暗蚀)</label>
              <label><input type="checkbox" v-model="config.buffs.divineFavor"> 神恩 (1d4 光耀)</label>
              <label><input type="checkbox" v-model="config.buffs.magicWeapon"> 魔化武器 (+1 攻/伤)</label>
              <label><input type="checkbox" v-model="config.buffs.holyWeapon"> 神圣武器 (2d8 光耀)</label>
              <label><input type="checkbox" v-model="config.buffs.crusadersMantle"> 十字军披风 (1d4 光耀)</label>
              <label><input type="checkbox" v-model="config.buffs.flameArrows"> 烈焰箭矢 (1d6 火焰)</label>
            </div>

            <!-- 可调等级法术 -->
            <div class="dynamic-spell mt-2">
              <label><input type="checkbox" v-model="config.buffs.smite"> 至圣斩</label>
              <div v-if="config.buffs.smite" class="ds-opts">
                <select v-model.number="config.smiteLevel"><option v-for="i in 5" :key="i" :value="i">{{i}}环</option></select>
                <label><input type="checkbox" v-model="config.smiteUndead"> 不死/邪魔</label>
              </div>
            </div>

            <div class="dynamic-spell">
              <label><input type="checkbox" v-model="config.buffs.spiritShroud"> 魂灵环绕</label>
              <div v-if="config.buffs.spiritShroud" class="ds-opts">
                <select v-model.number="config.spiritShroudLevel">
                  <option :value="3">3-4环</option><option :value="5">5-6环</option>
                  <option :value="7">7-8环</option><option :value="9">9环</option>
                </select>
                <select v-model="config.spiritShroudType"><option value="radiant">光</option><option value="necrotic">暗</option><option value="cold">冷</option></select>
              </div>
            </div>

            <div class="dynamic-spell">
              <label><input type="checkbox" v-model="config.buffs.elementalWeapon"> 元素武器</label>
              <div v-if="config.buffs.elementalWeapon" class="ds-opts">
                <select v-model.number="config.elementalWeaponLevel">
                  <option :value="3">3-4环(+1/1d4)</option><option :value="5">5-6环(+2/2d4)</option><option :value="7">7+环(+3/3d4)</option>
                </select>
                <select v-model="config.elementalWeaponType">
                  <option value="fire">火</option><option value="cold">冷</option><option value="acid">酸</option>
                </select>
              </div>
            </div>

            <div class="dynamic-spell">
              <label><input type="checkbox" v-model="config.buffs.cme"> 咒唤微元素群</label>
              <div v-if="config.buffs.cme" class="ds-opts">
                <select v-model.number="config.cmeLevel"><option v-for="i in 6" :key="i" :value="i+3">{{i+3}}环</option></select>
                <select v-model="config.cmeType">
                  <option value="fire">火</option><option value="cold">冷</option><option value="acid">酸</option>
                </select>
              </div>
            </div>
          </div>

          <hr class="divider" />

          <!-- 回合生效法术/动作 -->
          <div class="spell-section">
            <div class="sec-title">每回合仅限一次 (Once per Turn)</div>
            <div class="dynamic-spell">
              <label><input type="checkbox" v-model="config.onceBuffs.zephyrStrike"> 西风打击 (1d8 力场)</label>
            </div>
            <div class="dynamic-spell">
              <label><input type="checkbox" v-model="config.onceBuffs.boomingBlade.active"> 轰雷剑 (主目标)</label>
              <select v-if="config.onceBuffs.boomingBlade.active" v-model.number="config.onceBuffs.boomingBlade.tier">
                <option :value="0">1-4级 (+0d8)</option><option :value="1">5-10级 (+1d8)</option>
                <option :value="2">11-16级 (+2d8)</option><option :value="3">17+级 (+3d8)</option>
              </select>
            </div>
            <div class="dynamic-spell">
              <label><input type="checkbox" v-model="config.onceBuffs.greenFlameBlade.active"> 翠炎剑 (主目标)</label>
              <select v-if="config.onceBuffs.greenFlameBlade.active" v-model.number="config.onceBuffs.greenFlameBlade.tier">
                <option :value="0">1-4级 (+0d8)</option><option :value="1">5-10级 (+1d8)</option>
                <option :value="2">11-16级 (+2d8)</option><option :value="3">17+级 (+3d8)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 5. 自定义伤害骰组 -->
        <div class="card">
          <div class="card-title flex-between">
            <span>🎲 自定义附加骰</span>
            <button class="add-btn" @click="addCustomDice">➕ 添加</button>
          </div>
          <div v-for="(dice, idx) in config.customDice" :key="idx" class="custom-dice-row">
            <input type="number" v-model.number="dice.count" style="width:35px"> d
            <select v-model.number="dice.type" style="width:45px">
              <option :value="4">4</option><option :value="6">6</option><option :value="8">8</option>
              <option :value="10">10</option><option :value="12">12</option>
            </select>
            <select v-model="dice.dmgType" style="width:65px">
              <option v-for="t in damageTypes" :key="t.value" :value="t.value">{{ t.label.split(' ')[0] }}</option>
            </select>
            <select v-model="dice.frequency" style="width:75px">
              <option value="perHit">每击</option><option value="once">限1次</option>
            </select>
            <button class="del-btn" @click="removeCustomDice(idx)">✖</button>
          </div>
          <div v-if="config.customDice.length===0" class="empty-hint">暂无自定义骰，点击右上角添加。</div>
        </div>

      </section>

      <!-- ================= 右侧：结算区 ================= -->
      <section class="right-panel">
        
        <!-- 目标抗性区 -->
        <div class="card target-card">
          <h2>🛡️ 怪物护甲与抗性</h2>
          <div class="input-group" style="align-items: center; flex-direction: row; gap:15px;">
            <label style="font-size:16px;">目标当前 AC:</label>
            <input type="number" v-model.number="config.targetAC" min="1" max="40" style="width: 100px; font-size: 20px; font-weight:bold; text-align:center;" />
          </div>
          <div class="res-grid mt-2">
            <div class="res-item" v-for="type in activeDamageTypes" :key="type.value">
              <span class="type-badge" :class="type.value">{{ type.label }}</span>
              <select v-model="config.targetResistances[type.value]">
                <option :value="1">正常 (x1)</option><option :value="0.5">抗性 (x0.5)</option>
                <option :value="0">免疫 (x0)</option><option :value="2">易伤 (x2)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 结算核心看板 -->
        <div class="card result-card">
          <h2>📊 战斗结算看板</h2>
          
          <div class="stats-grid mt-2">
            <div class="stat-box">
              <div class="stat-label">综合命中加值</div>
              <div class="stat-value">+{{ effectiveAttackBonus.toFixed(1) }}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">实际命中率</div>
              <div class="stat-value">{{ (currentDPR.normalHitRate * 100).toFixed(1) }}%</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">暴击率</div>
              <div class="stat-value crit-text">{{ (currentDPR.critRate * 100).toFixed(1) }}%</div>
            </div>
          </div>

          <!-- 公式实时演算区 -->
          <div class="formula-box mt-3">
            <div class="label">每次命中 (Per Hit) 公式：</div>
            <div class="formula-str">{{ perHitFormula }}</div>
            <div class="formula-val mt-1">期望：{{ currentDPR.avgPerHitNorm.toFixed(2) }} <span class="crit-text">/ 暴击 {{ currentDPR.avgPerHitCrit.toFixed(2) }}</span></div>
            
            <hr class="divider-sm" />
            
            <div class="label">单回合附加 (Once per Turn) 公式：</div>
            <div class="formula-str">{{ onceFormula }}</div>
            <div class="formula-val mt-1">期望：{{ currentDPR.avgOnceNorm.toFixed(2) }} <span class="crit-text">/ 暴击 {{ currentDPR.avgOnceCrit.toFixed(2) }}</span></div>
          </div>

          <div class="final-dpr">
            <div class="dpr-label">整轮总伤害期望 (Total Round DPR) <span>[{{ config.attacksPerRound }}打]</span></div>
            <div class="dpr-value">{{ currentDPR.roundTotalDPR.toFixed(2) }}</div>
          </div>
        </div>

        <!-- 曲线图/表格 -->
        <div class="card table-card">
          <h2>📈 目标AC 10~25 期望一览表 (整轮总伤)</h2>
          <div class="ac-table-container">
            <table class="ac-table">
              <thead><tr><th v-for="ac in acTableRange" :key="ac">AC {{ ac }}</th></tr></thead>
              <tbody>
                <tr>
                  <td v-for="ac in acTableRange" :key="ac" :class="{ 'highlight-ac': ac === config.targetAC }">
                    {{ calculateDPRForAC(ac).roundTotalDPR.toFixed(1) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </section>
    </main>
  </div>
</template>

<script setup>
import { reactive, computed, watch, onMounted } from 'vue'

const damageTypes =[
  { value: 'slashing', label: '挥砍 (Slashing)' }, { value: 'piercing', label: '穿刺 (Piercing)' },
  { value: 'bludgeoning', label: '钝击 (Bludgeoning)' }, { value: 'radiant', label: '光耀 (Radiant)' },
  { value: 'necrotic', label: '暗蚀 (Necrotic)' }, { value: 'cold', label: '冷冻 (Cold)' },
  { value: 'fire', label: '火焰 (Fire)' }, { value: 'force', label: '力场 (Force)' },
  { value: 'thunder', label: '雷鸣 (Thunder)' }, { value: 'acid', label: '强酸 (Acid)' }
]

// 提取伤害类型的简写字典 (例如 "挥砍 (Slashing)" -> "挥砍")
const dtDict = Object.fromEntries(damageTypes.map(t =>[t.value, t.label.split(' ')[0]]))

const defaultConfig = {
  attacksPerRound: 2,
  baseAttackBonus: 5, customAttackMod: 0, customDamageMod: 0,
  diceCount: 2, diceType: 6, baseDamageMod: 3, baseDamageType: 'slashing',
  critThreshold: 20, rollState: 'normal', elvenAccuracy: false, targetAC: 15,
  
  fightingStyle: 'none', // none, archery, dueling, gwf
  rage: { active: false, bonus: 2 },
  sneakAttack: { active: false, dice: 1 },
  brutalCritical: { active: false, dice: 1 },
  bardicInsp: { active: false, size: 6, type: 'attack' },
  
  buffs: {
    gwm: false, bless: false, huntersMark: false, hex: false, divineFavor: false,
    magicWeapon: false, holyWeapon: false, crusadersMantle: false, flameArrows: false,
    smite: false, spiritShroud: false, elementalWeapon: false, cme: false
  },
  smiteLevel: 1, smiteUndead: false,
  spiritShroudLevel: 3, spiritShroudType: 'radiant',
  elementalWeaponLevel: 3, elementalWeaponType: 'fire',
  cmeLevel: 4, cmeType: 'fire',
  
  onceBuffs: {
    zephyrStrike: false,
    boomingBlade: { active: false, tier: 0 },
    greenFlameBlade: { active: false, tier: 0 }
  },
  customDice:[],
  targetResistances: damageTypes.reduce((acc, dt) => ({ ...acc, [dt.value]: 1 }), {})
}

const config = reactive(JSON.parse(JSON.stringify(defaultConfig)))

onMounted(() => {
  const saved = localStorage.getItem('dnd-calc-pro')
  if (saved) {
    try { Object.assign(config, JSON.parse(saved)) } catch (e) {}
  }
})
watch(config, (newVal) => localStorage.setItem('dnd-calc-pro', JSON.stringify(newVal)), { deep: true })
const resetConfig = () => Object.assign(config, JSON.parse(JSON.stringify(defaultConfig)))

const addCustomDice = () => config.customDice.push({ count: 1, type: 6, dmgType: 'force', frequency: 'perHit' })
const removeCustomDice = (idx) => config.customDice.splice(idx, 1)

// === 核心数据提取：分离每次命中与单次法术 ===
const splitDamageSources = computed(() => {
  const perHit =[]
  const once =[]
  const activeTypes = new Set()

  // --- 1. Per Hit (每次命中) ---
  let baseFlat = config.baseDamageMod + config.customDamageMod
  if (config.fightingStyle === 'dueling') baseFlat += 2
  if (config.rage.active) baseFlat += config.rage.bonus
  if (config.buffs.gwm) baseFlat += 10
  if (config.buffs.magicWeapon) baseFlat += 1
  if (config.buffs.elementalWeapon) baseFlat += (config.elementalWeaponLevel >= 7 ? 3 : (config.elementalWeaponLevel >= 5 ? 2 : 1))

  // 记录基础武器 (供凶蛮重击判断使用)
  perHit.push({ count: config.diceCount, type: config.diceType, flat: baseFlat, dmgType: config.baseDamageType, isBase: true })
  
  if (config.buffs.huntersMark) perHit.push({ count: 1, type: 6, flat: 0, dmgType: 'force' })
  if (config.buffs.hex) perHit.push({ count: 1, type: 6, flat: 0, dmgType: 'necrotic' })
  if (config.buffs.divineFavor) perHit.push({ count: 1, type: 4, flat: 0, dmgType: 'radiant' })
  if (config.buffs.holyWeapon) perHit.push({ count: 2, type: 8, flat: 0, dmgType: 'radiant' })
  if (config.buffs.crusadersMantle) perHit.push({ count: 1, type: 4, flat: 0, dmgType: 'radiant' })
  if (config.buffs.flameArrows) perHit.push({ count: 1, type: 6, flat: 0, dmgType: 'fire' })
  
  if (config.buffs.elementalWeapon) {
    let ewDice = config.elementalWeaponLevel >= 7 ? 3 : (config.elementalWeaponLevel >= 5 ? 2 : 1)
    perHit.push({ count: ewDice, type: 4, flat: 0, dmgType: config.elementalWeaponType })
  }
  if (config.buffs.smite) {
    let sDice = Math.min(config.smiteLevel + 1, 5) + (config.smiteUndead ? 1 : 0)
    perHit.push({ count: sDice, type: 8, flat: 0, dmgType: 'radiant' })
  }
  if (config.buffs.spiritShroud) {
    let ssDice = 1 + Math.floor((config.spiritShroudLevel - 3) / 2)
    perHit.push({ count: ssDice, type: 8, flat: 0, dmgType: config.spiritShroudType })
  }
  if (config.buffs.cme) {
    perHit.push({ count: config.cmeLevel - 2, type: 8, flat: 0, dmgType: config.cmeType })
  }

  // --- 2. Once per Turn (每回合一次) ---
  if (config.sneakAttack.active) once.push({ count: config.sneakAttack.dice, type: 6, flat: 0, dmgType: config.baseDamageType })
  if (config.onceBuffs.zephyrStrike) once.push({ count: 1, type: 8, flat: 0, dmgType: 'force' })
  if (config.onceBuffs.boomingBlade.active && config.onceBuffs.boomingBlade.tier > 0) {
    once.push({ count: config.onceBuffs.boomingBlade.tier, type: 8, flat: 0, dmgType: 'thunder' })
  }
  if (config.onceBuffs.greenFlameBlade.active && config.onceBuffs.greenFlameBlade.tier > 0) {
    once.push({ count: config.onceBuffs.greenFlameBlade.tier, type: 8, flat: 0, dmgType: 'fire' })
  }
  if (config.bardicInsp.active && config.bardicInsp.type === 'damage') {
    once.push({ count: 1, type: config.bardicInsp.size, flat: 0, dmgType: config.baseDamageType })
  }

  // --- 3. 自定义骰子分发 ---
  config.customDice.forEach(d => {
    const src = { count: d.count, type: d.type, flat: 0, dmgType: d.dmgType }
    if (d.frequency === 'perHit') perHit.push(src); else once.push(src);
  })

  // 收集需要的抗性词条
  perHit.forEach(d => { if(d.count>0 || d.flat!==0) activeTypes.add(d.dmgType) })
  once.forEach(d => { if(d.count>0) activeTypes.add(d.dmgType) })

  return { perHit, once, activeTypes: Array.from(activeTypes) }
})

const activeDamageTypes = computed(() => damageTypes.filter(dt => splitDamageSources.value.activeTypes.includes(dt.value)))

// === 公式生成器 (实时演算) ===
const perHitFormula = computed(() => {
  const parts =[]
  let totalFlat = 0
  splitDamageSources.value.perHit.forEach(src => {
    if (src.count > 0) parts.push(`${src.count}d${src.type}[${dtDict[src.dmgType]}]`)
    totalFlat += src.flat
  })
  let res = parts.join(' + ')
  if (totalFlat !== 0) res += totalFlat > 0 ? ` + ${totalFlat}` : ` - ${Math.abs(totalFlat)}`
  return res || '0'
})

const onceFormula = computed(() => {
  const parts =[]
  let totalFlat = 0
  splitDamageSources.value.once.forEach(src => {
    if (src.count > 0) parts.push(`${src.count}d${src.type}[${dtDict[src.dmgType]}]`)
    totalFlat += src.flat
  })
  let res = parts.join(' + ')
  if (totalFlat !== 0) res += totalFlat > 0 ? ` + ${totalFlat}` : ` - ${Math.abs(totalFlat)}`
  return res || '0'
})


// 综合命中加值
const effectiveAttackBonus = computed(() => {
  let atk = config.baseAttackBonus + config.customAttackMod
  if (config.fightingStyle === 'archery') atk += 2
  if (config.buffs.gwm) atk -= 5
  if (config.buffs.bless) atk += 2.5
  if (config.buffs.magicWeapon) atk += 1
  if (config.buffs.elementalWeapon) atk += (config.elementalWeaponLevel >= 7 ? 3 : (config.elementalWeaponLevel >= 5 ? 2 : 1))
  if (config.bardicInsp.active && config.bardicInsp.type === 'attack') atk += (config.bardicInsp.size + 1) / 2
  return atk
})

// === 核心：GWF 骰子期望计算引擎 ===
const getDiceAvg = (type, applyGWF) => {
  if (applyGWF && config.fightingStyle === 'gwf') {
    // 巨武战斗：将1和2视作3计算期望
    if (type === 4) return 3.25; if (type === 6) return 4.0;
    if (type === 8) return 4.875; if (type === 10) return 5.8; if (type === 12) return 6.75;
  }
  return (type + 1) / 2
}

// === 超级概率与期望核算机 ===
const calculateDPRForAC = (targetAC) => {
  let hits = 0, crits = 0, rolls = 0
  
  const evalRoll = (r) => {
    if (r >= config.critThreshold) crits++;
    else if (r > 1 && r + effectiveAttackBonus.value >= targetAC) hits++;
  }

  if (config.rollState === 'normal') {
    rolls = 20; for(let i=1;i<=20;i++) evalRoll(i);
  } else if (config.rollState === 'advantage') {
    if (config.elvenAccuracy) {
      rolls = 8000; for(let i=1;i<=20;i++) for(let j=1;j<=20;j++) for(let k=1;k<=20;k++) evalRoll(Math.max(i,j,k))
    } else {
      rolls = 400; for(let i=1;i<=20;i++) for(let j=1;j<=20;j++) evalRoll(Math.max(i,j))
    }
  } else {
    rolls = 400; for(let i=1;i<=20;i++) for(let j=1;j<=20;j++) evalRoll(Math.min(i,j))
  }

  const normalHitRate = hits / rolls
  const critRate = crits / rolls
  const totalHitRate = normalHitRate + critRate
  const missRate = 1 - totalHitRate

  // 计算 Per Hit 期望
  let avgPerHitNorm = 0, avgPerHitCrit = 0
  splitDamageSources.value.perHit.forEach(src => {
    const res = config.targetResistances[src.dmgType] ?? 1
    const avgD = src.count * getDiceAvg(src.type, src.isBase)
    
    avgPerHitNorm += (avgD + src.flat) * res
    
    // 暴击骰翻倍，若是基础武器叠加凶蛮重击
    let critDiceMult = 2
    if (src.isBase && config.brutalCritical.active) critDiceMult += config.brutalCritical.dice
    
    avgPerHitCrit += (avgD * critDiceMult + src.flat) * res
  })

  // 计算 Once Per Turn 期望
  let avgOnceNorm = 0, avgOnceCrit = 0
  splitDamageSources.value.once.forEach(src => {
    const res = config.targetResistances[src.dmgType] ?? 1
    const avgD = src.count * getDiceAvg(src.type, false)
    avgOnceNorm += avgD * res
    avgOnceCrit += avgD * 2 * res
  })

  // === DND 独占的多打概率折算：保证偷袭等单次Buff准确性 ===
  // 命中至少一次的概率
  const pAtLeastOneHit = 1 - Math.pow(missRate, config.attacksPerRound)
  let expectedOnceDPR = 0
  if (totalHitRate > 0) {
    // 假设第一发命中的攻击触发单次特效。基于正常命中和暴击的权重分配期望。
    const wNorm = normalHitRate / totalHitRate
    const wCrit = critRate / totalHitRate
    expectedOnceDPR = pAtLeastOneHit * (wNorm * avgOnceNorm + wCrit * avgOnceCrit)
  }

  // 基础回合武器总伤
  const roundPerHitDPR = config.attacksPerRound * (normalHitRate * avgPerHitNorm + critRate * avgPerHitCrit)
  const roundTotalDPR = roundPerHitDPR + expectedOnceDPR

  return {
    normalHitRate, critRate, 
    avgPerHitNorm, avgPerHitCrit, avgOnceNorm, avgOnceCrit,
    roundTotalDPR
  }
}

const currentDPR = computed(() => calculateDPRForAC(config.targetAC))
const acTableRange = Array.from({length: 16}, (_, i) => i + 10)
</script>

<style scoped>
/* 终极原魔系/黑客帝国暗黑极简 UI */
.calculator-container {
  max-width: 1300px; margin: 0 auto;
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: #e2e8f0; background-color: #0b1120;
  padding: 20px; border-radius: 12px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.8);
}
.header { text-align: center; margin-bottom: 20px; position: relative; }
.header h1 { margin: 0; color: #fbbf24; font-size: 26px; }
.header p { color: #94a3b8; font-size: 13px; margin-top: 5px; }
.reset-btn { position: absolute; right: 0; top: 5px; background: #1e293b; color: white; border: 1px solid #475569; padding: 6px 12px; border-radius: 6px; cursor: pointer; }
.reset-btn:hover { background: #ef4444; border-color: #f87171; }

.main-content { display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap; }
.left-panel { flex: 1.2; min-width: 400px; display: flex; flex-direction: column; gap: 15px; }
.right-panel { flex: 1; min-width: 380px; display: flex; flex-direction: column; gap: 15px; position: sticky; top: 20px; }

.card { background: #1e293b; padding: 15px 20px; border-radius: 8px; border: 1px solid #334155; }
.card-title { font-size: 16px; color: #38bdf8; font-weight: bold; border-bottom: 1px solid #334155; padding-bottom: 8px; margin-bottom: 12px; }
.sec-title { font-size: 13px; color: #a7f3d0; margin-bottom: 8px; background: #064e3b; padding: 4px 8px; border-radius: 4px; display: inline-block; }

.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.input-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.input-group { display: flex; flex-direction: column; flex: 1; }
.input-group label { font-size: 12px; color: #94a3b8; margin-bottom: 4px; }
.input-group input, .input-group select { background: #0f172a; border: 1px solid #475569; color: white; padding: 6px; border-radius: 4px; font-size: 13px; outline: none; }
.input-group input:focus, .input-group select:focus { border-color: #38bdf8; }
.cross { margin-top: 20px; color: #64748b; }
.mt-2 { margin-top: 10px; }
.mt-3 { margin-top: 15px; }

.toggle-group { display: flex; align-items: center; flex-wrap: wrap; }
.radio-buttons { display: flex; gap: 10px; font-size: 13px; }
.elven-text { color: #34d399; font-weight: bold; font-size: 13px; }
.ml-3 { margin-left: 15px; }

.switch-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 8px; font-size: 13px; }
.switch-grid label { display: flex; align-items: center; gap: 6px; }

.feature-row { display: flex; align-items: center; gap: 15px; margin-bottom: 10px; font-size: 13px; }
.feature-row select, .feature-row input { background: #0f172a; border: 1px solid #475569; color: white; padding: 2px 5px; border-radius: 4px; }

.dynamic-spell { display: flex; flex-direction: column; margin-bottom: 8px; font-size: 13px; }
.ds-opts { display: flex; gap: 10px; margin-top: 5px; padding-left: 20px; align-items: center; }
.ds-opts select { background: #0f172a; color: white; border: 1px solid #475569; padding: 2px 5px; border-radius: 4px; }

.flex-between { display: flex; justify-content: space-between; align-items: center; }
.add-btn { background: #0ea5e9; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 12px; cursor: pointer; }
.add-btn:hover { background: #0284c7; }
.custom-dice-row { display: flex; gap: 8px; align-items: center; background: #0f172a; padding: 6px; border-radius: 6px; margin-bottom: 6px; font-size: 13px; }
.custom-dice-row input, .custom-dice-row select { background: #1e293b; border: 1px solid #475569; color: white; padding: 3px; border-radius: 4px; }
.del-btn { background: #ef4444; border: none; color: white; border-radius: 4px; cursor: pointer; padding: 3px 6px; }
.empty-hint { font-size: 12px; color: #64748b; text-align: center; padding: 10px; }

/* 结算区 UI */
.target-card { border-color: #f43f5e; }
.res-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.res-item { display: flex; justify-content: space-between; align-items: center; background: #0f172a; padding: 6px; border-radius: 4px; }
.type-badge { font-size: 11px; font-weight: bold; padding: 2px 4px; border-radius: 4px; }
.type-badge.radiant { background: #fef08a; color: #854d0e; }
.type-badge.necrotic { background: #d8b4fe; color: #4c1d95; }
.type-badge.cold { background: #bae6fd; color: #075985; }
.type-badge.fire { background: #fca5a5; color: #991b1b; }
.type-badge.force { background: #e9d5ff; color: #6b21a8; }
.type-badge.thunder { background: #fde047; color: #ca8a04; }
.type-badge.acid { background: #bbf7d0; color: #166534; }
.type-badge.slashing, .type-badge.piercing, .type-badge.bludgeoning { background: #cbd5e1; color: #334155; }

.result-card { background: linear-gradient(135deg, #1e293b, #0f172a); border-color: #10b981; }
.stats-grid { display: flex; gap: 10px; text-align: center; }
.stat-box { flex: 1; background: #0f172a; padding: 10px 5px; border-radius: 6px; }
.stat-label { font-size: 12px; color: #94a3b8; }
.stat-value { font-size: 18px; font-weight: bold; margin-top: 4px; }
.crit-text { color: #f43f5e; }

/* 动态公式演算区 */
.formula-box { background: rgba(0,0,0,0.4); padding: 12px; border-radius: 6px; border-left: 3px solid #38bdf8; }
.formula-box .label { font-size: 12px; color: #94a3b8; margin-bottom: 4px; }
.formula-box .formula-str { font-size: 15px; font-family: 'Courier New', Courier, monospace; color: #facc15; font-weight: bold; word-break: break-all; }
.formula-box .formula-val { font-size: 13px; color: #e2e8f0; font-weight: 500; }
.divider-sm { border: none; border-top: 1px dashed #475569; margin: 10px 0; }

.final-dpr { margin-top: 15px; background: #064e3b; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #10b981; }
.dpr-label { font-size: 13px; color: #a7f3d0; }
.dpr-value { font-size: 36px; font-weight: 900; color: #10b981; text-shadow: 0 0 15px rgba(16, 185, 129, 0.4); }

.table-card { padding: 15px; overflow-x: auto; }
.ac-table { width: 100%; border-collapse: collapse; text-align: center; font-size: 12px; }
.ac-table th, .ac-table td { border: 1px solid #334155; padding: 6px 3px; }
.ac-table th { background: #0f172a; color: #94a3b8; }
.highlight-ac { background: #047857; font-weight: bold; color: white; border: 2px solid #10b981; }
</style>
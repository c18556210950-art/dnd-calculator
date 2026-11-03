<template>
  <div class="calculator-container">
    <header class="header">
      <a class="home-link" href="/">← Wilder 主页</a><h1>D&D 5E 伤害计算器</h1><p>配置攻击与法术，实时比较伤害期望</p>
      
      <!-- 标签页切换 --> 
      <div class="tabs">
        <button :class="{ active: activeTab === 'attack' }" @click="activeTab = 'attack'">
          ⚔️ 武器攻击期望
        </button>
        <button :class="{ active: activeTab === 'save' }" @click="activeTab = 'save'">
          🔥 法术豁免期望
        </button>
      </div>

      <button @click="resetConfig" class="reset-btn">🔄 重置默认</button>
    </header>

    <p v-if="storageNotice || inputNotice" class="notice" role="status">{{ storageNotice || inputNotice }}</p>
    <details class="rules-note"><summary>计算口径与规则说明</summary>
      <p>命中率包含重击。普通豁免仅比较总值与 DC，天然 1 / 20 不自动失败或成功。命中加值已包含熟练，请勿重复相加；PB 输入仅用于咒剑诅咒。</p>
      <p>此工具保留可组合的跨版本特性：-5/+10 与凶蛮重击按旧版；巨武战斗按界面所示将武器骰的 1、2 视为 3；猎人印记按力场伤害。按桌规自行选择，不自动检查动作、专注或资源冲突。</p>
      <p>每回合一次的附伤在首次命中使用，不等待重击。至圣斩按每次命中消耗资源估算；诗人命中激励按每次攻击可用估算。伤害使用均值与抗性倍率，不逐次向下取整，不模拟传奇抗性、闪避或死亡豁免。</p>
      <a href="https://www.dndbeyond.com/sources/dnd/br-2024/playing-the-game" target="_blank" rel="noopener noreferrer">查阅 D&D 基础规则 ↗</a>
    </details>
    <!-- ================= 标签页 1：攻击期望 ================= -->
    <main class="main-content" v-if="activeTab === 'attack'">
      <!-- 左侧：配置区 -->
      <section class="left-panel">
        
        <div class="card">
          <div class="card-title">⚔️ 基础攻击面板</div>
          <div class="grid-3">
            <div class="input-group">
              <label for="field-1">每轮攻击次数</label>
              <input id="field-1" type="number" v-model.number="config.attacksPerRound" min="1" max="10" />
            </div>
            <div class="input-group">
              <label for="field-2">熟练加值 (PB)</label>
              <input id="field-2" type="number" v-model.number="config.pb" min="2" max="6" />
            </div>
            <div class="input-group">
              <label for="field-3">重击范围 (Crit)</label>
              <select id="field-3" v-model.number="config.critThreshold">
                <option :value="20">20</option>
                <option :value="19">19 - 20</option>
                <option :value="18">18 - 20</option>
              </select>
            </div>
          </div>
          <div class="input-row mt-2">
            <div class="input-group"><label for="field-4">武器骰数</label><input id="field-4" type="number" v-model.number="config.diceCount"/></div>
            <span class="cross">d</span>
            <div class="input-group">
              <label for="field-5">面数</label>
              <select id="field-5" v-model.number="config.diceType">
                <option :value="4">4</option><option :value="6">6</option><option :value="8">8</option>
                <option :value="10">10</option><option :value="12">12</option>
              </select>
            </div>
            <span class="cross">+</span>
            <div class="input-group"><label for="field-6">总命中加值（含熟练）</label><input id="field-6" type="number" v-model.number="config.baseAttackBonus"/></div>
            <span class="cross">+</span>
            <div class="input-group"><label for="field-7">伤害属性加值</label><input id="field-7" type="number" v-model.number="config.baseDamageMod"/></div>
          </div>
          <div class="grid-2 mt-2">
            <div class="input-group">
              <label for="field-8">基础伤害类型</label>
              <select id="field-8" v-model="config.baseDamageType">
                <option v-for="t in damageTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
            </div>
            <div class="input-group">
              <label>自选调整 (如 +1 附魔武器)</label>
              <div style="display:flex; gap:5px;">
                <input aria-label="自选命中调整" type="number" placeholder="Hit+" v-model.number="config.customAttackMod" title="自定义命中加成" />
                <input aria-label="自选伤害调整" type="number" placeholder="Dmg+" v-model.number="config.customDamageMod" title="自定义伤害加成" />
              </div>
            </div>
          </div>
        </div>

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
            <label><input type="checkbox" v-model="config.buffs.hexbladesCurse"> 咒剑诅咒 (+PB伤, 19爆)</label>
            <label><input type="checkbox" v-model="config.buffs.gwm"> 巨武大师/神射手 (-5/+10)</label>
            <label><input type="checkbox" v-model="config.buffs.bless"> 祝福术 (+1d4 命中)</label>
            <label><input type="radio" v-model="config.fightingStyle" value="none"> 无流派</label>
            <label><input type="radio" v-model="config.fightingStyle" value="archery"> 箭术 (+2 命中)</label>
            <label><input type="radio" v-model="config.fightingStyle" value="dueling"> 对决 (+2 伤害)</label>
            <label><input type="radio" v-model="config.fightingStyle" value="gwf"> 巨武战斗 (1/2作3)</label>
          </div>
        </div>

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
              <option :value="1">1 枚</option><option :value="2">2 枚</option><option :value="3">3 枚</option>
            </select>
          </div>
          <div class="feature-row">
            <label><input type="checkbox" v-model="config.bardicInsp.active"> 诗人激励</label>
            <div v-if="config.bardicInsp.active" style="display:flex; gap:5px;">
              <select v-model.number="config.bardicInsp.size">
                <option :value="6">d6</option><option :value="8">d8</option><option :value="10">d10</option><option :value="12">d12</option>
              </select>
              <select v-model="config.bardicInsp.type">
                <option value="attack">命中</option><option value="damage">伤害(1次)</option>
              </select>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">🔥 法术增益 (Spells)</div>
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
                  <option :value="3">3-4环</option><option :value="5">5-6环</option><option :value="7">7-8环</option><option :value="9">9环</option>
                </select>
                <select v-model="config.spiritShroudType"><option value="radiant">光</option><option value="necrotic">暗</option><option value="cold">冷</option></select>
              </div>
            </div>
            <div class="dynamic-spell">
              <label><input type="checkbox" v-model="config.buffs.cme"> 咒唤微元素</label>
              <div v-if="config.buffs.cme" class="ds-opts">
                <select v-model.number="config.cmeLevel"><option v-for="i in 6" :key="i" :value="i+3">{{i+3}}环</option></select>
                <select v-model="config.cmeType"><option value="fire">火</option><option value="cold">冷</option><option value="acid">酸</option></select>
              </div>
            </div>
          </div>
          <hr class="divider" />
          <div class="spell-section">
            <div class="sec-title">每回合仅限一次 (Once per Turn)</div>
            <div class="dynamic-spell">
              <label><input type="checkbox" v-model="config.onceBuffs.zephyrStrike"> 西风打击 (1d8 力场)</label>
            </div>
            <div class="dynamic-spell">
              <label><input type="checkbox" v-model="config.onceBuffs.boomingBlade.active"> 轰雷剑 (主目标)</label>
              <select v-if="config.onceBuffs.boomingBlade.active" v-model.number="config.onceBuffs.boomingBlade.tier">
                <option :value="0">1-4级 (0d8)</option><option :value="1">5-10级 (+1d8)</option>
                <option :value="2">11-16级 (+2d8)</option><option :value="3">17+级 (+3d8)</option>
              </select>
            </div>
            <div class="dynamic-spell">
              <label><input type="checkbox" v-model="config.onceBuffs.greenFlameBlade.active"> 翠炎剑 (主目标)</label>
              <select v-if="config.onceBuffs.greenFlameBlade.active" v-model.number="config.onceBuffs.greenFlameBlade.tier">
                <option :value="0">1-4级 (0d8)</option><option :value="1">5-10级 (+1d8)</option>
                <option :value="2">11-16级 (+2d8)</option><option :value="3">17+级 (+3d8)</option>
              </select>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-title flex-between">
            <span>🎲 自定义附加骰</span>
            <button :disabled="config.customDice.length >= 30" class="add-btn" @click="addCustomDice">➕ 添加</button>
          </div>
          <div v-for="(dice, idx) in config.customDice" :key="idx" class="custom-dice-row">
            <input type="number" aria-label="附加骰数量" v-model.number="dice.count" style="width:35px"> d
            <select aria-label="附加骰面数" v-model.number="dice.type" style="width:45px">
              <option :value="4">4</option><option :value="6">6</option><option :value="8">8</option>
              <option :value="10">10</option><option :value="12">12</option>
            </select>
            <select aria-label="附加骰伤害类型" v-model="dice.dmgType" style="width:65px">
              <option v-for="t in damageTypes" :key="t.value" :value="t.value">{{ t.label.split(' ')[0] }}</option>
            </select>
            <select aria-label="附加骰触发频率" v-model="dice.frequency" style="width:75px">
              <option value="perHit">每击</option><option value="once">限1次</option>
            </select>
            <button class="del-btn" @click="removeCustomDice(idx)" :aria-label="`删除第 ${idx+1} 组附加骰`">✖</button>
          </div>
        </div>
      </section>

      <!-- 右侧：结算区 -->
      <section class="right-panel">
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
                <option :value="1">正常</option><option :value="0.5">抗性</option>
                <option :value="0">免疫</option><option :value="2">易伤</option>
              </select>
            </div>
          </div>
        </div>

        <div class="card result-card">
          <h2>📊 攻击结算看板</h2>
          <div class="stats-grid mt-2">
            <div class="stat-box"><div class="stat-label">命中加值（含骰均值）</div><div class="stat-value">+{{ effectiveAttackBonus.toFixed(1) }}</div></div>
            <div class="stat-box"><div class="stat-label">实际命中率</div><div class="stat-value">{{ (currentDPR.hitRate * 100).toFixed(1) }}%</div></div>
            <div class="stat-box"><div class="stat-label">暴击率</div><div class="stat-value crit-text">{{ (currentDPR.critRate * 100).toFixed(1) }}%</div></div>
          </div>
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

        <div class="card table-card">
          <h2>📈 AC 10~25 期望一览表</h2>
          <div class="ac-table-container">
            <table class="ac-table">
              <thead><tr><th v-for="ac in acTableRange" :key="ac">AC {{ ac }}</th></tr></thead>
              <tbody><tr><td v-for="ac in acTableRange" :key="ac" :class="{ 'highlight-ac': ac === config.targetAC }">{{ calculateDPRForAC(ac).roundTotalDPR.toFixed(1) }}</td></tr></tbody>
            </table>
          </div>
        </div>
      </section>
    </main>

    <!-- ================= 标签页 2：法术豁免期望 ================= -->
    <main class="main-content" v-if="activeTab === 'save'">
      
      <section class="left-panel">
        <div class="card">
          <div class="card-title">☄️ 法术豁免面板</div>
          <div class="grid-2">
            <div class="input-group">
              <label for="field-9">你的法术豁免 DC</label>
              <input id="field-9" type="number" v-model.number="saveConfig.spellDC" min="1" max="40" />
            </div>
            <div class="input-group">
              <label for="field-10">目标豁免加值 (Save Mod)</label>
              <input id="field-10" type="number" v-model.number="saveConfig.targetSaveMod" />
            </div>
          </div>

          <div class="toggle-group mt-3 mb-2">
            <label>目标投掷状态</label>
            <div class="radio-buttons ml-3">
              <label><input type="radio" v-model="saveConfig.rollState" value="normal"> 正常</label>
              <label><input type="radio" v-model="saveConfig.rollState" value="advantage"> 优势 (易成功)</label>
              <label><input type="radio" v-model="saveConfig.rollState" value="disadvantage"> 劣势 (易失败)</label>
            </div>
          </div>

          <div class="input-row mt-3">
            <div class="input-group"><label for="field-11">伤害骰数量</label><input id="field-11" type="number" v-model.number="saveConfig.diceCount"/></div>
            <span class="cross">d</span>
            <div class="input-group">
              <label for="field-12">面数</label>
              <select id="field-12" v-model.number="saveConfig.diceType">
                <option :value="4">4</option><option :value="6">6</option><option :value="8">8</option>
                <option :value="10">10</option><option :value="12">12</option>
              </select>
            </div>
            <span class="cross">+</span>
            <div class="input-group"><label for="field-13">固定加值</label><input id="field-13" type="number" v-model.number="saveConfig.flatMod"/></div>
          </div>

          <div class="grid-2 mt-3">
            <div class="input-group">
              <label for="field-14">伤害类型</label>
              <select id="field-14" v-model="saveConfig.damageType">
                <option v-for="t in damageTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
            </div>
            <div class="input-group">
              <label for="field-15">豁免成功效果</label>
              <select id="field-15" v-model="saveConfig.successEffect">
                <option value="half">受到一半伤害 (如火球术)</option>
                <option value="zero">不受任何伤害 (如圣火术)</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <section class="right-panel">
        <div class="card target-card">
          <h2>🛡️ 怪物抗性 (仅该法术)</h2>
          <div class="res-grid mt-2">
            <div class="res-item">
              <span class="type-badge" :class="saveConfig.damageType">{{ dtDict[saveConfig.damageType] }}</span>
              <select v-model="saveConfig.targetResistances[saveConfig.damageType]">
                <option :value="1">正常 (x1)</option><option :value="0.5">抗性 (x0.5)</option>
                <option :value="0">免疫 (x0)</option><option :value="2">易伤 (x2)</option>
              </select>
            </div>
          </div>
        </div>

        <div class="card result-card">
          <h2>📊 豁免结算看板</h2>
          <div class="stats-grid mt-2">
            <div class="stat-box"><div class="stat-label">目标失败率 (吃满伤)</div><div class="stat-value crit-text">{{ (currentSaveDPR.failRate * 100).toFixed(1) }}%</div></div>
            <div class="stat-box"><div class="stat-label">目标成功率</div><div class="stat-value">{{ (currentSaveDPR.successRate * 100).toFixed(1) }}%</div></div>
          </div>
          
          <div class="formula-box mt-3">
            <div class="label">法术基础伤害公式：</div>
            <div class="formula-str">{{ saveConfig.diceCount }}d{{ saveConfig.diceType }} + {{ saveConfig.flatMod }}</div>
            <div class="formula-val mt-1">基础期望：{{ currentSaveDPR.rawDamage.toFixed(2) }}</div>
          </div>

          <div class="final-dpr">
            <div class="dpr-label">单次法术最终期望伤害</div>
            <div class="dpr-value">{{ currentSaveDPR.expectedDpr.toFixed(2) }}</div>
          </div>
        </div>

        <div class="card table-card">
          <h2>📈 目标豁免加值 -1 ~ 14 期望一览表</h2>
          <div class="ac-table-container">
            <table class="ac-table">
              <thead><tr><th v-for="mod in saveTableRange" :key="mod">{{ mod > 0 ? '+'+mod : mod }}</th></tr></thead>
              <tbody><tr><td v-for="mod in saveTableRange" :key="mod" :class="{ 'highlight-ac': mod === saveConfig.targetSaveMod }">{{ calculateSaveDPRForMod(mod).expectedDpr.toFixed(1) }}</td></tr></tbody>
            </table>
          </div>
        </div>
      </section>

    </main>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { damageTypes, dtDict, defaultConfig, defaultSaveConfig, normalizeConfig, buildDamageSources, attackBonus, calculateAttack, calculateSave } from './engine.js'
const activeTab = ref('attack')
const storageNotice = ref('')
function restore(key, defaults) {
  try { return normalizeConfig(JSON.parse(localStorage.getItem(key)), defaults) }
  catch { storageNotice.value = '浏览器无法读取配置，已使用默认值。'; return structuredClone(defaults) }
}
const config = reactive(restore('dnd-calc-atk', defaultConfig))
const saveConfig = reactive(restore('dnd-calc-save', defaultSaveConfig))
function persist(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) }
  catch { storageNotice.value = '浏览器未允许保存配置，本次计算仍可使用。' }
}
watch(config, value => persist('dnd-calc-atk', value), {deep:true})
watch(saveConfig, value => persist('dnd-calc-save', value), {deep:true})
const resetConfig = () => Object.assign(activeTab.value === 'attack' ? config : saveConfig, structuredClone(activeTab.value === 'attack' ? defaultConfig : defaultSaveConfig))
const addCustomDice = () => { if(config.customDice.length < 30) config.customDice.push({count:1,type:6,dmgType:'force',frequency:'perHit'}) }
const removeCustomDice = idx => config.customDice.splice(idx,1)
const splitDamageSources = computed(() => buildDamageSources(config))
const activeDamageTypes = computed(() => damageTypes.filter(t=>splitDamageSources.value.activeTypes.includes(t.value)))
function buildFormula(list) {
  return list.map(s => `${s.count ? `${s.count}d${s.type}` : '0'}${s.flat ? ` ${s.flat>0?'+':'−'} ${Math.abs(s.flat)}` : ''}[${dtDict[s.dmgType]}]`).join(' + ') || '0'
}
const perHitFormula = computed(() => buildFormula(splitDamageSources.value.perHit))
const onceFormula = computed(() => buildFormula(splitDamageSources.value.once))
const effectiveAttackBonus = computed(() => attackBonus(config))
const calculateDPRForAC = ac => calculateAttack(config, ac)
const currentDPR = computed(() => calculateAttack(config))
const acTableRange = Array.from({length:16}, (_,i)=>i+10)
const calculateSaveDPRForMod = mod => calculateSave(saveConfig,mod)
const currentSaveDPR = computed(() => calculateSave(saveConfig))
const saveTableRange = Array.from({length:16}, (_,i)=>i-1)
const inputNotice = computed(() => {
  const value = activeTab.value === 'attack' ? config : saveConfig;
  const safe = normalizeConfig(value, activeTab.value === 'attack' ? defaultConfig : defaultSaveConfig);
  return JSON.stringify(value) !== JSON.stringify(safe) ? '部分输入为空或超出范围，当前结果使用默认值或范围边界；请检查输入。' : '';
})
</script>

<style scoped>
.calculator-container { max-width: 1300px; margin: 0 auto; font-family: 'Segoe UI', system-ui, sans-serif; color: #e2e8f0; background-color: #0b1120; padding: 20px; border-radius: 12px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.8); }
.header { text-align: center; margin-bottom: 20px; position: relative; }
.header h1 { margin: 0; color: #fbbf24; font-size: 26px; }
.header p { color: #94a3b8; font-size: 13px; margin-top: 5px; }

/* 标签页样式 */
.tabs { display: flex; justify-content: center; gap: 15px; margin-top: 15px; }
.tabs button { background: #1e293b; color: #94a3b8; border: 2px solid transparent; padding: 10px 20px; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; transition: 0.3s; }
.tabs button:hover { background: #334155; }
.tabs button.active { background: #0f172a; color: #38bdf8; border-color: #38bdf8; box-shadow: 0 4px 15px rgba(56, 189, 248, 0.2); }

.reset-btn { position: absolute; right: 0; top: 5px; background: #1e293b; color: white; border: 1px solid #475569; padding: 6px 12px; border-radius: 6px; cursor: pointer; }
.reset-btn:hover { background: #ef4444; border-color: #f87171; }

.main-content { display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap; margin-top: 15px; animation: fadeIn 0.3s; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

.left-panel { flex: 1.2; min-width: 400px; display: flex; flex-direction: column; gap: 15px; }
.right-panel { flex: 1; min-width: 380px; display: flex; flex-direction: column; gap: 15px; position: sticky; top: 20px; }

.card { background: #1e293b; padding: 15px 20px; border-radius: 8px; border: 1px solid #334155; }
.card-title { font-size: 16px; color: #38bdf8; font-weight: bold; border-bottom: 1px solid #334155; padding-bottom: 8px; margin-bottom: 12px; }
.sec-title { font-size: 13px; color: #a7f3d0; margin-bottom: 8px; background: #064e3b; padding: 4px 8px; border-radius: 4px; display: inline-block; }

.grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.input-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.input-group { display: flex; flex-direction: column; flex: 1; }
.input-group label { font-size: 12px; color: #94a3b8; margin-bottom: 4px; }
.input-group input, .input-group select { background: #0f172a; border: 1px solid #475569; color: white; padding: 6px; border-radius: 4px; font-size: 13px; outline: none; }
.input-group input:focus, .input-group select:focus { border-color: #38bdf8; }
.cross { margin-top: 20px; color: #64748b; }
.mt-2 { margin-top: 10px; }
.mt-3 { margin-top: 15px; }
.mb-2 { margin-bottom: 10px; }

.toggle-group { display: flex; align-items: center; flex-wrap: wrap; font-size: 13px; }
.radio-buttons { display: flex; gap: 10px; }
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
.custom-dice-row { display: flex; gap: 8px; align-items: center; background: #0f172a; padding: 6px; border-radius: 6px; margin-bottom: 6px; font-size: 13px; }
.custom-dice-row input, .custom-dice-row select { background: #1e293b; border: 1px solid #475569; color: white; padding: 3px; border-radius: 4px; }
.del-btn { background: #ef4444; border: none; color: white; border-radius: 4px; cursor: pointer; padding: 3px 6px; }

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

.home-link { display:block; text-align:left; color:#94a3b8; font-size:13px; margin-bottom:18px; text-decoration:none; }
.rules-note { color:#94a3b8; border:1px solid #334155; border-radius:8px; padding:12px 16px; font-size:13px; line-height:1.7; }
.rules-note summary { cursor:pointer; color:#cbd5e1; }
.rules-note p { margin:10px 0; }
.rules-note a { color:#38bdf8; }
.notice { padding:12px; color:#fde68a; background:#422006; border-radius:8px; }
.ac-table-container { overflow-x:auto; }
.ac-table { min-width:620px; }
.input-group { min-width:0; }
input, select { max-width:100%; min-width:0; }
button:disabled { opacity:.5; cursor:not-allowed; }
@media (max-width:850px) {
  .calculator-container { padding:16px; border-radius:0; }
  .main-content { flex-direction:column; }
  .left-panel, .right-panel { min-width:0; width:100%; flex:auto; }
  .right-panel { position:static; }
  .reset-btn { position:static; margin-top:16px; }
  .card { padding:16px; }
  .header h1 { font-size:24px; }
}
@media (max-width:480px) {
  .calculator-container { padding:12px; }
  .tabs { gap:8px; }
  .tabs button { padding:12px 10px; font-size:14px; flex:1; }
  .grid-3 { gap:8px; }
  .grid-2, .res-grid { gap:8px; }
  .switch-grid { grid-template-columns:1fr; }
  .input-row { gap:6px; }
  .input-row .input-group { flex:1 1 36%; }
  .cross { display:none; }
  .custom-dice-row { flex-wrap:wrap; gap:6px; }
  .stat-value { font-size:16px; }
  .stat-label { font-size:11px; }
  .radio-buttons { flex-wrap:wrap; }
  input[type="number"], select { font-size:16px !important; min-height:36px; }
}
@media (prefers-reduced-motion:reduce) { .main-content { animation:none; } * { transition:none !important; } }
</style>
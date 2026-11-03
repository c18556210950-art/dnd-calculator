<script setup>
import { reactive, ref, computed, watch, nextTick } from 'vue'
import { catalog, getCatalog, initialBuild, initialTarget, cleanBuild, identity, availableOptions, buildPlan, calculateBuild, modifier } from './build-engine.js'
import { damageTypes } from './engine.js'
const storageMessage=ref('')
function load(){try{return JSON.parse(localStorage.getItem('dnd5r-workbench-v1')||'null')}catch{storageMessage.value='无法读取本地配置，已使用默认配置。';return null}}
const saved=load(), build=reactive(cleanBuild(saved?.build||initialBuild())), target=reactive({...initialTarget(),...saved?.target,resistance:{...initialTarget().resistance,...saved?.target?.resistance}})
const comparisons=ref(Array.isArray(saved?.comparisons)?saved.comparisons.slice(0,4).filter(x=>x&&x.build).map(x=>({name:String(x.name).slice(0,60),build:cleanBuild(x.build)})):[])
const stage=ref('character'), result=ref(null), resultStamp=ref(''), name=ref(''), expansion=ref(saved?.expansion===true), resultPanel=ref(null)
const current=computed(()=>identity(build)), options=computed(()=>availableOptions(build)), plan=computed(()=>buildPlan(build,target))
const data=computed(()=>getCatalog(build.rules)), classes=computed(()=>data.value.classes), subclassCount=computed(()=>classes.value.reduce((n,c)=>n+c.subclasses.length,0))
const subclasses=computed(()=>current.value.c.subclasses.filter(s=>expansion.value||s.source===(current.value.legacy?'PHB':'XPHB')||current.value.c.id==='wizard'||s.source===(current.value.legacy?'TCE':'EFA')&&current.value.c.id==='artificer'))
if(!subclasses.value.some(s=>s.id===build.subclassId))expansion.value=true
const stamp=computed(()=>JSON.stringify({build,target})), dirty=computed(()=>result.value&&resultStamp.value!==stamp.value)
const shownFeatures=computed(()=>[...current.value.c.features,...(current.value.sub?current.value.s.features:[])].filter(f=>f.level<=build.level).sort((a,b)=>a.level-b.level))
const attacks=computed(()=>plan.value.groups.reduce((n,g)=>n+g.count,0))
const formOpen=computed(()=>build.formMode||['companion','form'].includes(build.bonusAction))
const compared=computed(()=>comparisons.value.map(x=>({...x,result:calculateBuild(x.build,result.value?.plan.target||target)})))
const modifierLabel=score=>(modifier(score)>=0?'+':'')+modifier(score)
function switchClass(){const c=classes.value.find(c=>c.id===build.classId);build.subclassId=c.subclasses.find(s=>expansion.value||s.source===(build.rules==='5e'?'PHB':'XPHB')||c.id==='wizard'||c.id==='artificer'&&s.source===(build.rules==='5e'?'TCE':'EFA'))?.id||c.subclasses[0].id;build.options={};build.bonusAction='none';build.formMode=false;build.weaponId=c.id==='monk'?'unarmed':c.id==='rogue'?'短剑':c.id==='ranger'?'长弓':c.id==='wizard'?'刺剑':'长剑'}
function switchRules(){const short=build.subclassId.split('-').at(-1),c=classes.value.find(c=>c.id===build.classId);build.subclassId=c.subclasses.find(s=>s.shortName===short)?.id||c.subclasses[0].id;build.options={};build.bonusAction='none';build.formMode=false;build.reaction=false;if(!data.value.weapons.some(w=>w.id===build.weaponId))build.weaponId='长剑';if(!subclasses.value.some(s=>s.id===build.subclassId))expansion.value=true;result.value=null}
async function calculate(){result.value=calculateBuild(JSON.parse(JSON.stringify(build)),JSON.parse(JSON.stringify(target)));resultStamp.value=stamp.value;await nextTick();if(window.matchMedia('(max-width:800px)').matches)resultPanel.value?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'})}
function saveComparison(){if(comparisons.value.length>=4)return;comparisons.value.push({name:name.value.trim()||`${build.rules==='5e'?'5e':'5R'} · ${current.value.c.name} · ${current.value.s.shortName} Lv.${build.level}`,build:cleanBuild(JSON.parse(JSON.stringify(build)))});name.value=''}
function restoreComparison(item){Object.assign(build,cleanBuild(item.build));if(!subclasses.value.some(s=>s.id===build.subclassId))expansion.value=true;result.value=null;stage.value='character'}
function clearBuild(){const rules=build.rules;Object.assign(build,cleanBuild({...initialBuild(),rules,subclassId:`fighter-${rules==='5e'?'PHB':'XPHB'}-勇士`}));result.value=null;stage.value='character'}
watch(expansion,v=>{if(!v&&!subclasses.value.some(s=>s.id===build.subclassId))build.subclassId=subclasses.value[0]?.id||current.value.c.subclasses[0].id})
watch([build,target,comparisons,expansion],()=>{try{localStorage.setItem('dnd5r-workbench-v1',JSON.stringify({build,target,comparisons:comparisons.value,expansion:expansion.value}))}catch{storageMessage.value='浏览器未允许保存；本次配置和计算仍可使用。'}},{deep:true})
</script>

<template>
  <div class="workbench">
    <header class="workbench-hero">
      <div><div class="eyebrow">WILDER / D&D</div><h1>武斗构筑工坊<span>1—10 级</span></h1><p>从职业开始，把你的战斗方式配出来。</p></div>
      <div class="hero-meta"><strong>{{ classes.length }} 职业 · {{ subclassCount }} 子职</strong><a :href="catalog.source" target="_blank" rel="noopener noreferrer">职业资料来源：Kiwee 5etools ↗</a><small>{{ current.legacy?'2014 规则与旧版扩展':'2024 规则与新版扩展' }}；数据按版本分开</small></div>
    </header>
    <p v-if="storageMessage" class="wb-notice" role="status">{{ storageMessage }}</p>
    <div class="rules-switch"><span>选择规则版本</span><label><input type="radio" v-model="build.rules" value="5e" @change="switchRules">5e · 2014</label><label><input type="radio" v-model="build.rules" value="5r" @change="switchRules">5R · 2024</label><small>切换将清理本角色的特性勾选；已保存方案保留原版本。</small></div>
    <div class="workbench-layout">
      <div class="workbench-editor">
        <nav class="stage-tabs" aria-label="构筑配置步骤">
          <button v-for="(label,key) in {character:'01 角色',equipment:'02 装备',features:'03 特性',target:'04 战斗环境'}" :key="key" :class="{selected:stage===key}" @click="stage=key">{{ label }}</button>
        </nav>
        <section v-if="stage==='character'" class="wb-card">
          <div class="section-top"><div><h2>选择你的角色</h2><p>等级决定可用能力，属性与专长由你决定。</p></div><button class="subtle" @click="clearBuild">重置角色</button></div>
          <div class="class-picker"><button v-for="c in classes" :key="c.id" :class="{selected:build.classId===c.id}" @click="build.classId=c.id;switchClass()"><span>{{ c.name }}</span><small>{{ c.group==='martial'?'武斗职业':'武器流 / 形态' }}</small></button></div>
          <div class="wb-grid three">
            <label>职业等级<select v-model.number="build.level"><option v-for="i in 10" :key="i" :value="i">{{ i }} 级</option></select></label>
            <label class="span-two">子职<select v-model="build.subclassId" @change="build.options={};result=null"><option v-for="s in subclasses" :key="s.id" :value="s.id">{{ s.name }} · {{ s.source }}</option></select></label>
          </div>
          <p v-if="!current.sub" class="wb-notice">子职暂作规划选择，{{ current.s.unlock||3 }} 级前不会应用任何子职能力。</p>
          <label class="check-line"><input type="checkbox" v-model="expansion">显示当前版本的扩展子职（每项保留独立来源标记）</label>
          <div class="wb-grid two">
            <label>主攻击属性值 <em>{{ modifierLabel(build.primary) }}</em><input type="number" v-model.number="build.primary" min="1" max="30"></label>
            <label>副属性值 <em>{{ modifierLabel(build.secondary) }}</em><input type="number" v-model.number="build.secondary" min="1" max="30"></label>
          </div>
          <p class="field-help">主属性填写实际用于武器攻击的力量 / 敏捷 / 施法属性。副属性用于灵能武士的智力、武僧的感知、奉献圣武士的魅力。属性不会随等级自动加点，请计入你选择的属性提升与半专长。</p>
          <div class="wb-grid two"><label>攻击属性类型<select v-model="build.attackStat"><option value="auto">按武器 / 职业推定</option><option value="str">力量</option><option value="dex">敏捷</option><option value="int">智力</option><option value="wis">感知</option><option value="cha">魅力</option></select></label><label>采用哪个属性数值<select v-model="build.ability"><option value="auto">主属性（含刃契 / 剑歌）</option><option value="primary">主属性</option><option value="secondary">副属性</option></select></label></div>
          <div class="derived-strip"><span>熟练加值 <b>+{{ current.pb }}</b></span><span>子职来源 <b>{{ current.s.source }}</b></span><span>当前等级 <b>{{ build.level }}</b></span></div>
          <button class="primary next" @click="stage='equipment'">下一步：配置装备 →</button>
        </section>
        <section v-if="stage==='equipment'" class="wb-card">
          <h2>武器与攻击方式</h2><p class="field-help">普通武器数据取自资料站对应版本武器表；特殊武器会提示职业条件。</p>
          <div class="wb-grid two">
            <label>主手武器<select v-model="build.weaponId"><option v-for="w in data.weapons" :key="w.id" :value="w.id">{{ w.name }} · {{ w.count?w.count+'d'+w.die:w.flat }} · {{ w.mastery }}</option><option value="unarmed">徒手打击 / 武艺</option><option value="psychic">魂刃：心灵之刃</option><option value="thunder">装甲师：雷霆护手</option><option value="lightning">装甲师：闪电发射器</option><option value="force">装甲师：力场战戟</option></select></label>
            <label>魔法武器加值<select v-model.number="build.enchantment"><option v-for="i in 4" :value="i-1" :key="i">+{{ i-1 }}</option></select></label>
            <label>战斗风格<select v-model="build.style"><option value="none">无增伤风格</option><option value="archery">箭术：远程命中 +2</option><option value="dueling">对决：单手伤害 +2</option><option value="gwf">{{ current.legacy?'巨武器战斗：武器骰 1/2 重投一次':'巨武器战斗：武器骰 1/2 当 3' }}</option><option value="twf">双武器战斗：副手加入属性</option></select></label>
            <label>附赠动作的用途<select v-model="build.bonusAction"><option value="none">不使用附赠攻击</option><option value="light">轻型武器额外攻击</option><option value="dual">双持客附赠攻击</option><option value="pole">长柄武器大师：长柄打击</option><option value="unarmed">武艺：一次徒手打击</option><option value="flurry">疾风连击</option><option value="psychic">魂刃：第二把心灵之刃</option><option value="warpriest">战争祭司：附赠武器攻击</option><option value="companion">命令伙伴：使用独立数据卡</option></select></label>
            <label>另一把武器（轻型 / 双持）<select v-model="build.offhandId"><option v-for="w in data.weapons.filter(w=>!w.properties.includes('2H'))" :key="w.id" :value="w.id">{{ w.name }}</option></select></label>
            <label>额外命中调整<input type="number" v-model.number="build.attackAdjust" min="-20" max="20"></label>
            <label>额外每击伤害调整<input type="number" v-model.number="build.damageAdjust" min="-20" max="30"></label>
          </div>
          <div class="checks"><label><input type="checkbox" v-model="build.proficient">拥有武器熟练</label><label><input type="checkbox" v-model="build.twoHanded">多用武器以双手持握</label><label><input type="checkbox" v-model="build.setup">本轮附赠动作用于启动 / 转移增益</label><label><input type="checkbox" v-model="build.reaction">确认发生一次回合外反应攻击</label><label><input type="checkbox" v-model="build.formMode">使用野兽 / 自定义形态替换武器攻击</label></div>
          <p class="field-help">战斗风格需自行确认已从职业或专长获得。迅击若满足双轻型武器条件，会把轻型额外攻击放入攻击动作；不会再重复消耗附赠动作。</p>
          <div v-if="formOpen" class="nested-card"><h3>伙伴 / 形态数据卡</h3><p class="field-help">请按资料站生物卡填写；不会把角色的武器属性强加给伙伴。形态模式替换本轮全部武器攻击，伙伴模式占用附赠动作。</p><div class="wb-grid three"><label>名称<input v-model="build.form.name" maxlength="40"></label><label>攻击次数<input type="number" v-model.number="build.form.attacks" min="1" max="6"></label><label>总命中加值<input type="number" v-model.number="build.form.hit" min="-10" max="30"></label><label>伤害骰数<input type="number" v-model.number="build.form.count" min="0" max="10"></label><label>伤害骰面<select v-model.number="build.form.die"><option v-for="d in [4,6,8,10,12]" :key="d">{{ d }}</option></select></label><label>固定伤害<input type="number" v-model.number="build.form.flat" min="-10" max="30"></label><label>伤害类型<select v-model="build.form.type"><option v-for="t in damageTypes" :key="t.value" :value="t.value">{{ t.label }}</option></select></label></div></div>
          <button class="primary next" @click="stage='features'">下一步：勾选特性 →</button>
        </section>
        <section v-if="stage==='features'" class="wb-card">
          <h2>本轮启用哪些能力？</h2><p class="field-help">仅展示当前等级可用的选项。消耗型能力默认关闭；已激活的增益默认视为提前准备，若本轮才启动，请勾选“本轮附赠动作用于启动”。</p>
          <div class="feature-options"><label v-for="o in options" :key="o.id" :class="{checked:build.options[o.id]}"><input type="checkbox" v-model="build.options[o.id]"><span><strong>{{ o.name }} <small>Lv.{{ o.level }}</small></strong><small>{{ o.description }}</small></span></label></div>
          <label v-if="build.options.smite" class="slot-input">本轮至圣斩环阶<select v-model.number="build.smiteLevel"><option v-for="n in (build.level>=9?3:build.level>=5?2:1)" :key="n" :value="n">{{ n }} 环</option></select></label>
          <div class="section-top custom-title"><div><h3>自定义附伤与条件伤害</h3><p>毒素、魔法装备、桌规或未自动实现的特性，在这里补充。</p></div><button :disabled="build.custom.length>=8" @click="build.custom.push({name:'自定义附伤',count:1,die:6,flat:0,type:'force',frequency:'once',critical:true})">＋ 添加</button></div>
          <div v-for="(x,i) in build.custom" :key="i" class="nested-card custom-row"><div class="wb-grid three"><label>名称<input v-model="x.name" maxlength="40"></label><label>骰数<input type="number" v-model.number="x.count" min="0" max="20"></label><label>骰面<select v-model.number="x.die"><option v-for="d in [4,6,8,10,12]" :key="d" :value="d">d{{ d }}</option></select></label><label>固定值<input type="number" v-model.number="x.flat" min="-20" max="30"></label><label>伤害类型<select v-model="x.type"><option v-for="t in damageTypes" :value="t.value" :key="t.value">{{ t.label }}</option></select></label><label>触发方式<select v-model="x.frequency"><option value="once">本回合首次命中一次</option><option value="hit">每次本人攻击命中</option><option value="automatic">确认造成的直接伤害</option></select></label></div><div class="section-top"><label class="check-line"><input type="checkbox" v-model="x.critical">此附伤骰在重击时翻倍</label><button class="danger subtle" @click="build.custom.splice(i,1)">删除附伤 {{ i+1 }}</button></div></div>
          <details class="source-features"><summary>查看 {{ build.level }} 级已解锁规则条目与自动化范围</summary><p>以下是资料站列出的能力索引。只有上方选项及攻击次数、武艺骰、勇士重击范围等基础成长自动进入计算。防御、治疗、施法、条件控制、命中后再加骰、非武器型戏法和其他复杂效果不会因出现在此列表就自动增伤；请按条件配置或补充自定义附伤。</p><ul><li v-for="(f,i) in shownFeatures" :key="i"><span>Lv.{{ f.level }}</span> {{ f.name }} <small>{{ f.source }}</small></li></ul><a :href="`https://5e.kiwee.top/data/class/class-${build.classId}.json`" target="_blank" rel="noopener noreferrer">查看该职业原始数据 ↗</a></details>
          <button class="primary next" @click="stage='target'">下一步：设置战斗环境 →</button>
        </section>
        <section v-if="stage==='target'" class="wb-card"><h2>这轮面对怎样的敌人？</h2><p class="field-help">所有对比方案共享这组环境。额外目标单独列出，不混入主目标轮伤。</p><div class="wb-grid two"><label>目标 AC<input type="number" v-model.number="target.ac" min="1" max="60"></label><label>外部攻击状态<select v-model="target.roll"><option value="normal">正常</option><option value="advantage">优势</option><option value="disadvantage">劣势</option></select></label></div><div class="checks"><label><input type="checkbox" v-model="target.injured">目标生命值不满</label><label><input type="checkbox" v-model="target.firstRound">战斗第一轮</label><label><input type="checkbox" v-model="target.beforeTarget">当前目标尚未经历首个回合</label><label v-if="current.legacy"><input type="checkbox" v-model="target.surprised">目标受惊（2014 暗杀自动重击条件）</label></div><div class="resistance-grid"><label v-for="t in damageTypes" :key="t.value">{{ t.label.split(' ')[0] }}<select v-model.number="target.resistance[t.value]"><option :value="1">正常</option><option :value="0.5">抗性</option><option :value="0">免疫</option><option :value="2">易伤</option></select></label></div><button class="primary next" @click="calculate">计算本轮 →</button></section>
        <section class="wb-card compare-section"><div class="section-top"><div><h2>构筑方案对比</h2><p>保存最多 4 套，使用同一个目标环境比较。</p></div><small>{{ comparisons.length }}/4</small></div><div class="save-build"><label>方案名称<input v-model="name" maxlength="60" placeholder="例如：5级勇士 · 巨剑"></label><button :disabled="comparisons.length>=4" @click="saveComparison">保存当前方案</button></div><p v-if="!comparisons.length" class="empty-hint">还没有保存方案。先配置一个角色，再加入对比。</p><div v-else class="comparison-cards"><article v-for="(x,i) in compared" :key="i"><strong>{{ x.name }} <small>{{ x.build.rules==='5e'?'5e 2014':'5R 2024' }}</small></strong><span>{{ result ? x.result.primary.toFixed(2) : '—' }} <small>主目标 DPR</small></span><p>{{ x.result.plan.c.name }} / {{ x.result.plan.s.name }} / Lv.{{ x.result.plan.level }}</p><button class="subtle" @click="restoreComparison(x)">载入配置</button><button class="subtle danger" @click="comparisons.splice(i,1)">移除</button></article></div><p v-if="comparisons.length&&!result" class="field-help">点击“计算本轮”后显示对比数值。</p></section>
      </div>
      <aside class="workbench-summary"><section class="wb-card summary-card"><div class="eyebrow">YOUR BUILD</div><h2>{{ current.c.name }} <span>Lv.{{ build.level }}</span></h2><p>{{ current.sub?current.s.name:`子职将在 ${current.s.unlock||3} 级生效` }}</p><div class="summary-list"><span>武器 <b>{{ plan.weapon.name }}</b></span><span>熟练加值 <b>+{{ current.pb }}</b></span><span>计划攻击次数 <b>{{ attacks }}</b></span><span>目标护甲等级 <b>AC {{ target.ac }}</b></span></div><div class="selected-options"><span v-for="o in options.filter(o=>build.options[o.id])" :key="o.id">{{ o.name }}</span><small v-if="!options.some(o=>build.options[o.id])">尚未勾选额外增益</small></div><button class="primary calculate-button" @click="calculate">{{ result?'重新计算本轮':'计算本轮' }}</button><p class="field-help">数值是所选条件下的期望，不代表资源足以每轮持续使用。</p></section>
        <section v-if="plan.warnings.length" class="wb-card validation"><h3>配置提示</h3><ul><li v-for="w in plan.warnings" :key="w">{{ w }}</li></ul></section>
        <section ref="resultPanel" class="wb-card result-panel" aria-live="polite"><template v-if="result"><p v-if="dirty" class="wb-notice">配置已更改，下方是上次结果；请重新计算。</p><div class="eyebrow">ROUND EXPECTATION</div><h3>主目标每轮伤害期望</h3><div class="result-number">{{ result.primary.toFixed(2) }}</div><p v-if="result.secondary">其他目标：{{ result.secondary.toFixed(2) }}（独立列示）</p><div class="breakdown" v-for="(r,i) in result.rows" :key="i"><div><strong>{{ r.name }}</strong><small v-if="r.attacks">{{ r.attacks }} 次 · 命中 {{ (r.hitRate*100).toFixed(1) }}% · 重击 {{ (r.critRate*100).toFixed(1) }}%</small></div><b>{{ r.damage.toFixed(2) }}</b></div></template><template v-else><div class="empty-dice">◇</div><h3>先配置，再比较</h3><p>选择职业与等级，勾选本轮能力后，点击“计算本轮”。</p></template></section>
        <details class="wb-card methodology"><summary>计算口径</summary><p>当前规则：{{ current.legacy?'5e（2014）':'5R（2024）' }}。单职业 1—10 级；不处理兼职。每回合一次的能力在首次符合条件的命中使用，不等待重击。不同目标轮伤分开列示。反应攻击需玩家确认触发，只有偷袭可在回合外再次结算。</p><p>伤害为骰均值乘命中概率，应用抗性 / 免疫 / 易伤，不逐次向下取整。优势与劣势抵消；擦掠不触发命中附伤。侵扰只在当前攻击序列内影响下一击，不假设跨轮已有优势。</p><p>未模拟的失衡豁免、横扫额外目标、资源恢复、装备熟练限制、专注中断、敌方行动和复杂施法组合，请自行设置条件或自定义附伤。神圣打击等按主动选择的分支生效。</p><p>伙伴与形态卡为手动配置。没有自动实现的子职规则会保留在条目索引中，不默认为已计算。</p><a :href="catalog.source" target="_blank" rel="noopener noreferrer">核对规则来源 ↗</a></details>
      </aside>
    </div>
    <footer class="workbench-footer">规则索引更新：{{ catalog.retrieved }} · {{ data.sources[current.s.source] }} · 配置仅保存在当前浏览器</footer>
  </div>
</template>

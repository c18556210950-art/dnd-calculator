<script setup>
import { ref, defineAsyncComponent } from 'vue'
import BuildWorkbench from './BuildWorkbench.vue'
import './workbench.css'
const LegacyCalculator=defineAsyncComponent(()=>import('./App.vue'))
const mode=ref('build')
</script>
<template><div class="app-bar"><a href="/">← Wilder</a><nav aria-label="计算模式"><button :class="{active:mode==='build'}" @click="mode='build'">D&D 职业构筑</button><button :class="{active:mode==='manual'}" @click="mode='manual'">自由计算 / 法术豁免</button></nav><span>5E / 5R</span></div><BuildWorkbench v-show="mode==='build'"/><LegacyCalculator v-if="mode==='manual'"/></template>
<style scoped>.app-bar{min-height:58px;display:flex;align-items:center;justify-content:space-between;gap:18px;border-bottom:1px solid #243246;background:#0b1422;padding:0 32px;font-size:12px}.app-bar a{color:#a2b1c5;text-decoration:none}.app-bar nav{display:flex;gap:5px;align-self:stretch}.app-bar button{background:transparent;border:0;border-bottom:2px solid transparent;padding:12px 16px;color:#879bb5;cursor:pointer;font-size:12px}.app-bar button.active{color:#89e4d5;border-bottom-color:#62d6c2}.app-bar>span{font-size:10px;letter-spacing:1px;color:#5d738e}@media(max-width:520px){.app-bar{padding:0 12px;gap:6px}.app-bar button{padding:12px 8px;font-size:11px}.app-bar>span{display:none}.app-bar a{font-size:11px}}</style>

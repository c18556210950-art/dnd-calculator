# D&D 5E 伤害计算器

Vue 3 + Vite 静态应用，支持武器攻击、法术豁免、优势/劣势/精灵之准、重击、抗性/免疫/易伤及自定义附伤。

线上地址：https://wilder.asia/dnd-calculator/

## 本地运行

使用 Node.js 22.12+（或满足 Vite 8 要求的更新版本）。

```sh
npm ci
npm run dev
npm test
npm run build
```

构建结果在 `dist/`，默认资源路径为 `/dnd-calculator/`。仅发布 dist 内容，不发布源码、Git 元数据或配置凭据。

## 计算口径

- 总命中加值已经包含熟练；PB 输入仅用于咒剑诅咒伤害。
- 显示命中率包含重击，祝福和诗人命中激励逐一枚举各骰结果；优势使用 d20 概率分布，避免反复枚举 8000 个骰组。
- 凶蛮重击增加指定数量的单枚武器骰，不乘以原武器骰数量。
- 普通豁免没有天然 1 自动失败、天然 20 自动成功的规则。
- 一回合一次附伤在首次命中时使用；不等待重击。至圣斩按每次命中可用，命中激励按每次攻击可用估算。
- 沿用可手动组合的跨版本特性：旧版 -5/+10、凶蛮重击；巨武战斗将基础武器骰的 1/2 当作 3；猎人印记为力场伤害。不会自动检查专注、动作或资源合法性。
- 伤害按均值与倍率估算，不模拟逐次向下取整、传奇抗性、闪避、伤害触发阈值或死亡豁免。
- 配置保存在当前浏览器；旧版缺失字段会补齐，存储不可用时仍可计算。异常数值使用默认值或边界，并显示提示。

规则依据：[2024 基础规则](https://www.dndbeyond.com/sources/dnd/br-2024/playing-the-game)、[Sage Advice](https://www.dndbeyond.com/sources/dnd/sae/sage-advice-compendium)。具体特性以玩家采用的版本和 DM 裁定为准。

## 部署

使用已有 Nginx 与 HTTPS，无 Node 常驻进程。构建文件上传到 `/var/www/dnd-calculator/releases/<版本>/`，`current` 为当前版本链接。站点独立 location 配置为 `/etc/nginx/dnd-calculator.locations`，由主站 HTTPS server 引入。

更新时先运行测试与构建，再上传完整新版本，原子切换 current。先 `nginx -t` 再 reload。回滚时把 current 切回保留的旧版本；不要覆盖整个主站配置，以免影响后续路由修改。

13 项引擎回归测试覆盖默认结果、骰组概率穷举对照、祝福/激励、重击、免疫、每回合一次附伤、豁免边界和异常输入。

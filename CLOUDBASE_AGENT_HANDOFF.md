# 交给 CloudBase Agent 的交接说明

> **用法（代码如何进入工作区）**：把下面「第一部分」整段复制粘贴到 CloudBase Agent 的对话输入框。项目代码通过以下两种方式之一进入工作区：
> - **方式 A（传 Zip）**：在客户端上传 `life-guide-handoff.zip`（本仓库根目录已包含此文件，约 11MB，含完整代码 + 知识库上传包），让 Agent 解压到工作区。解压后会得到 `life-guide/` 子目录，**项目根就是它**（内含 `app/`、`data/`、`tencent-hy3-proxy/`、`cloudbase-kb/` 等）；请让 Agent 以该 `life-guide/` 目录为项目根，不要把它和空白模板混为一谈。
> - **方式 B（关联 Git）**：在 CloudBase 面板「关联第三方 Git」→ 授权 GitHub 账号 `ko8geei-coder` → 绑定私有仓库 `gaoxingjiabi-life-guide`，仓库地址 `https://github.com/ko8geei-coder/gaoxingjiabi-life-guide.git`。Agent 拉取后项目位于克隆目录下（注意：Git 关联通常是克隆到一个子目录，而非直接铺在工作区根；请以实际克隆出的项目文件夹为准）。
>
> 第二部分是项目技术档案，供 Agent 和你自己参考。
>
> ⚠️ **空白模板共存提示**：若工作区当前已存在一个「空白云开发模板」（典型特征：`miniprogram/`、`cloudfunctions/getOpenId/`、`project.config.json` 占位），那是平台脚手架、**不是本项目**。本项目的小程序代码在 `app/` 目录（原生微信小程序，并非 `miniprogram/`）。请让 Agent 以 `app/` 为真实项目根，并在第一步**先删除空白模板的 `miniprogram/` 与 `cloudfunctions/getOpenId/`** 避免目录混淆；`project.config.json` 优先保留含真实 appid 的那份（若无真实 appid 则用 `app/project.config.json`，稍后补填）。

---

## 第一部分：直接粘给 CloudBase Agent 的话

我在开发一个微信小程序项目「高性价比人生指南」，代码已通过上述方式（上传的压缩包 / 已关联的 Git 仓库）进入你的工作区。请基于现有代码继续开发，不要从零重写。

⚠️ **重要前置（请先执行）**：你的工作区可能已存在一个「空白云开发模板」（`miniprogram/`、`cloudfunctions/getOpenId/`、`模板 project.config.json`）。那是平台脚手架，不是本项目——本项目的小程序代码在 `app/` 目录（原生微信小程序，非 `miniprogram/`）。请以 `app/` 为准，并**在第一步先删除那些空白模板文件**（`miniprogram/`、`cloudfunctions/getOpenId/`），只保留本项目的结构；`project.config.json` 若含真实 appid 则保留并让本项目 `app/` 复用它，若是 `touristappid` 占位则与我的 `app/project.config.json` 二选一、稍后补填真实 appid。完成后请明确告诉我你清理后的目录结构，我再确认。

项目概况：
- 数据来源：GitHub eternity4719/HowToLiveBetter《高性价比人生指南》，34 章 669 条基于证据的生活建议，已解析为结构化 JSON（data/guide.json 与 app/data/guide.json，字段：num/title/tags/cost/plain/benefit/level/source/note）。
- 小程序在 app/：原生微信小程序（无第三方 UI 库），页面 index/chapter/detail/mine/fav/search，tabBar 3 个（指南/收藏/我的），含性价比指数引擎 app/utils/score.js、场景/主题/清单导航 app/data/nav.js。
- AI 问答：搜索页「问 AI」模式 = 端侧检索 top5 + 流式回答。后端可切换：app/utils/ai-config.js 的 proxyUrl 指向自建代理（tencent-hy3-proxy/server.js，转发 CloudBase AI 网关 hy3，密钥只在服务端环境变量），留空则走 WorkBuddy 免密钥 LLM。
- 网页预览 preview.html（由 preview-template.html + build-preview.js 生成），含同样的搜索/问 AI/收藏/阅读进度。
- 数据管道：download.js 拉上游 → parse.js 解析 → data/guide.json → 同步 app/data/guide.json；node build-preview.js 重新生成预览；node verify-preview.js 校验渲染。

继续开发的目标（按优先级）：
1. 把 AI 问答改走云函数：新建云函数（如 aiChat），在云函数内调用 CloudBase AI 网关（模型 hy3，OpenAI 兼容，端点形如 …/v1/ai/cloudbase/chat/completions，支持 stream:true 的 SSE），鉴权用云开发环境自身能力，替代外部自建代理；小程序端相应改成 wx.callFunction（或云函数提供的流式接口）。
2. 保持现有 UI 与功能不回退，遵循现有代码风格。
3. 硬约束：小程序主包 <2MB（当前 1.97MB 已接近上限，新增页面/资源请用分包）；API 密钥绝不写进前端代码；data 下文件保持 UTF-8 无乱码。

请先不要改动任何文件：先通读项目结构（含上面"先执行"的清理），输出一份你理解的架构说明 + AI 改造方案（含云函数设计），我确认后再动手。

---

## 第二部分：项目技术档案

### 目录结构
```
life-guide/
├── app/                    # 微信小程序（原生）
│   ├── pages/              # index/chapter/detail/mine/fav/search
│   ├── utils/              # score.js(性价比指数) ai-config.js(AI后端开关)
│   │                       # cloud.js+cloud-config.js(WorkBuddy免密钥LLM)
│   ├── data/guide.json     # 669 条结构化数据（小程序用副本）
│   ├── images/tabbar/      # 描边风格 tabBar 图标
│   └── app.json            # 3 Tab + lazyCodeLoading
├── data/
│   ├── guide.json          # 解析后的全量数据（源）
│   └── raw/                # 上游 34 章原始 markdown（干净、无乱码）
├── cloudbase-kb/           # CloudBase 知识库上传包（全量md + 分章 + 说明）
├── tencent-hy3-proxy/      # 自建 HY3 代理（Node，密钥走 env，含重试+CORS）
├── preview-template.html   # 网页预览模板（含 __DATA__/__SCORE__/__NAV__ 占位）
├── preview.html            # 构建产物（手机壳 UI，含搜索/问AI/收藏/进度）
├── build-preview.js        # 模板 + 数据 → preview.html
├── verify-preview.js       # 预览渲染断言（Node DOM 桩）
├── download.js / parse.js  # 上游拉取 / 解析
└── README.md
```

### 已完成功能
- 首页：眉题+试试搜+接上次读+今日一条+按需查找/章节阅读双模式+6主题彩色卡+性价比Top5
- 查找建议页：关键词+栏目+证据等级(A/B/C)+成本筛选（不花钱/少花时间/不需毅力）+分页
- 章节页：目录抽屉（全屏扁平化）+章内搜索；详情页：分层阅读（结论/成本/原文/详细解读/注意/来源）+分数环+阅读进度
- 收藏页：收藏/最近阅读分段+进度条+空状态；我的页：三段统计+随机一条
- AI 问答：搜索/问AI双模式，端侧 top5 检索，流式回答，参考条目可点，停止/重新生成，错误兜底
- 原创设计（非复刻原版）：墨绿+琥珀配色、性价比指数引擎（回报÷成本 × 证据加权）

### 数据与校验
- 数据经三方校准（上游 master + 官方 PDF 书），669 条无乱码、标题 100% 命中
- 校验习惯：改数据后 grep U+FFFD 查乱码；改预览后必跑 build-preview.js + verify-preview.js

### 在 CloudBase 继续开发的建议架构
```
小程序 ──wx.callFunction──► 云函数 aiChat ──► CloudBase AI 网关（hy3）
                                （密钥/鉴权在云开发环境内，前端永不接触）
```
相比现有「外部代理」方案：少一个服务、密钥天然在环境内、可结合知识库/工作流做 RAG。

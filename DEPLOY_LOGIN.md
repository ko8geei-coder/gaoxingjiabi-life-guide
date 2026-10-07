# 「用户登录 / 使用记录」功能部署手册

> 目标：小程序每次被打开时，后台自动记录**是谁**（openid）、**什么时候**、**打开过几次**；
> 用户在「我的」页自愿填写昵称头像后，后台可直接按昵称认出TA。
> **全程无需用户输账号密码，不会打断阅读体验。**

---

## 0. 先搞清楚：您能在后台看到什么、看不到什么

| 想知道 | 能看到吗 | 说明 |
|---|---|---|
| 这个人是谁（一唯一标识） | ✅ | `openid`，微信给每个用户在该小程序下的唯一编号 |
| 昵称 | ⚠️ 需用户主动填 | 「我的」页点一下完善资料才有，否则后台只有一串 openid |
| 微信头像 | ⚠️ 需用户主动选 | 同上 |
| 打开次数 / 最后活跃时间 | ✅ 自动记录 | 无需任何授权 |
| 微信号 / 手机号 / 真实姓名 | ❌ **拿不到** | 微信平台规则明令禁止小程序收集，openid 也不允许反查回微信账号 |
| TA 看了哪些内容 | ❌ 不记录 | 当前版本只记「使用行为」，不记阅读内容，保护隐私 |

**结论**：后台看到的是「一串 openid + 使用时间线」；想让某位用户变得可辨认，请他/她在「我的」页点一下「完善资料」。这是微信规则下能做到的上限。

---

## 1. 前置条件（一次性，约 5 分钟）

登录 [云开发控制台](https://tcb.cloud.tencent.com/dev) 或从**微信公众平台后台 → 开发管理 → 开发设置 → 云开发**点「开通」。

✅ **已完成（2026-10-07）**：环境已开通，环境 ID = `jianfei-app-d9g4k50k22d30d637`（环境名 `howtoliveetter`，地域上海，套餐**免费体验版**）。

### ⚠️⚠️ 免费环境的到期规则（最重要，务必看完）

腾讯云官方规则（[价格文档](https://cloud.tencent.com/document/product/647/127357)）：

> **免费体验版环境在小程序发布后，环境的到期时间变更为上线后的第 15 天。**
> 到期后环境进入**停服隔离期**，隔离期未转付费将**销毁环境**。

配套事实：
- 免费环境**单次支持续费 6 个月**，到期前 1 个月内可续（0 元，需发内容参与活动）
- 免费环境**暂不支持加购资源包、不支持按量付费** —— 意味着**不会自动扣费**，只会到期停服
- 单账号**限 1 个**免费环境
- 官方续期入口：控制台「套餐用量」→「立即续费」
- 升级个人版：¥19.9/月（40000 点），**首购特惠 ¥4.9**；⚠️ 升级后**不支持降回**体验版

**因此建议：**
1. 小程序**提交审核前**就去控制台升级个人版（¥4.9 首购），避免发布 15 天后数据全丢
2. 3000 点/月对这个项目**远远够用**（669 条内容 + 用户记录，主要消耗是 `userTrack` 的数据库读写，200 点/万次；即使 1000 人每天各开 10 次也才约 6 万次/月 = 1200 点）
3. 万一忘了升级导致环境停服：云函数和数据会进隔离期，**及时处理还能找回**；真销毁了就只能重建环境（openid 会变，历史数据丢失），但**不影响已发布的小程序本身**（阅读功能全在本机，不依赖云开发）

---

## 1b. 确认环境已授权给本小程序

如果环境是**从腾讯云控制台**开通的（而非微信公众平台），还需要把小程序 AppID 授权进来，否则 `wx.cloud.init({env})` 会失败。

检查方法：控制台 → 你的环境 → **设置 / 环境设置** → 看「环境授权」或「关联应用」里有没有 `wx2437ad53057b8e1f`。

如果没有：新增授权 → 选择「微信小程序」→ 填入 `wx2437ad53057b8e1f`。

> 若环境本来就是从**微信公众平台**开通的（自动绑定），这步跳过。

---

## 2. 部署云函数（两个）

云函数源码在 `cloudfunctions/` 下，共 2 个：

| 云函数 | 作用 | 谁能调用 |
|---|---|---|
| `userTrack` | 记录用户 openid / 活跃 / 昵称头像 | 任何打开小程序的人（静默） |
| `adminUserList` | 查用户名单 + 统计 | **仅您**（需 adminKey） |

### 方式 A：控制台网页部署（最简单，推荐）

1. 云开发控制台 → 左侧 **云函数** → **新建**（或「上传并部署：云端安装依赖」）
2. 函数名填 `userTrack`，**运行时选 `Node.js 18.15` 或更高**
3. 创建后进入该函数 → **代码** / **函数代码** 页签 → 选择「本地上传」
4. 把 `cloudfunctions/userTrack` 整个文件夹**压缩成 zip** 后上传
   （Windows 上右键文件夹 → 发送到 → 压缩(zip) 即可；确保 zip 打开后第一层就是 `index.js` / `package.json` / `config.json`，不是多套一层文件夹）
5. 保存后点**部署**，等状态变成「部署成功」
6. **重复 1-5**，再部署 `adminUserList`

### 方式 B：命令行部署

```bash
npm i -g @cloudbase/cli
tcb login
cd cloudfunctions
tcb fn deploy userTrack
tcb fn deploy adminUserList
```

### 关键实现说明（为什么不需要 AppSecret）

`cloudfunctions/userTrack/index.js` 里用的是：

```js
const { OPENID } = cloud.getWXContext()
```

微信云函数运行时会自动注入调用者身份，**所以**：
- 不需要 `wx.login` + `code2Session`
- 不需要小程序 AppSecret（也就没有密钥泄露风险）
- 前端**无法伪造**别人的 openid 上传数据

### 给 `adminUserList` 设置 adminKey（重要，别跳过）

`adminUserList` 是给您自己看的，**必须**设一个只有您知道的密钥，否则任何人都能调它列出全部用户。

云开发控制台 → 云函数 → `adminUserList` → **配置 / 环境变量** → 添加：

| 变量名 | 值 |
|---|---|
| `ADMIN_KEY` | 自己编一串长随机，例如 `kg-8f3a91c2e7b64d05`（**不要**用示例值） |

> 不设也能跑（会回落到代码里的 `CHANGE_ME_...` 占位值），但那等于没设密码，务必改。

---

## 3. 创建数据库集合 `users`

1. 云开发控制台 → **数据库** → **集合** → **新建集合**，集合名必须**严格**为 `users`
2. 集合建好后点**权限设置**，选 **「仅创建者可读写」**（推荐）
   - 这样前端小程序即使被恶意调用 `wx.cloud.database()`，也读不到、也改不了别人的数据
   - 云函数走服务端 SDK，**不受**该权限限制，能正常读写
3. **不要**手动添加索引即可（数据量小时无需索引；上千条后再加 `lastActive` 索引）

### 数据长什么样

每条记录以 `openid` 作为 `_id`（天然去重，一个人一条）：

| 字段 | 含义 |
|---|---|
| `_id` / `openid` | 用户唯一标识 |
| `firstSeen` | 首次打开小程序的时间戳（毫秒） |
| `lastActive` | 最近一次活跃时间戳 |
| `openCount` | 累计打开次数 |
| `lastAction` | 最近一次行为：`launch` / `profile` |
| `nickname` | 昵称（用户主动填写后才有） |
| `avatarUrl` | 头像云存储 fileID（同上） |

---

## 4. 把环境 ID 填进小程序

打开 `app/utils/wxcloud-config.js`，把 `envId` 填上：

```js
module.exports = {
  envId: 'jianfei-app-d9g4k50k22d30d637',   // ← 已填好
  fnName: 'userTrack'
}
```

> `envId` 留空时，登录功能**自动跳过**（返回空 Promise），小程序其余功能（阅读 / 搜索 / 收藏 / AI）完全不受影响。所以这一步没填也不会白屏，只是没有用户记录。

---

## 5. 重新上传小程序

改完 `envId` 后需要重新上传代码（云函数改动也需重新部署）：

```bash
cd C:/Users/Admin/WorkBuddy/2026-10-07-10-27-17
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy ALL_PROXY
C:/Users/Admin/.workbuddy/binaries/node/versions/22.22.2-6/node.exe \
  --dns-result-order=ipv4first ci-upload.js
```

> ⚠️ 两个必要条件：① 上传机公网 **IPv4** 已在小程序后台「IP白名单」中；② 需 `unset` 代理环境变量并强制 IPv4，否则会报 `invalid ip`。
> 上传成功后回控制台「版本管理」→ 选 1.0.0 → **提交审核** → 通过后**发布**。

---

## 6. 验收清单

| 检查项 | 期望结果 |
|---|---|
| 打开小程序 → 云开发控制台 → 数据库 → `users` | 新增 1 条记录，`openCount=1`，`lastAction=launch` |
| 重复打开 3 次 | 仍是**同一条**记录，`openCount` 递增到 4 |
| 「我的」页 | 出现「我的资料」卡片（`cloudOn=true` 时才显示） |
| 点头像 → 选一个 → 填昵称 → 保存 | 提示「已保存」；`users` 里该条记录出现 `nickname` / `avatarUrl` |
| 换一台手机打开 | `users` 里是**另一条**新记录（不同 openid） |
| 底部「关于 → 存储方式」 | 显示「本机保存 + 云端匿名记录使用」 |

---

## 7. 出问题怎么排查

| 现象 | 原因 | 处理 |
|---|---|---|
| 「我的」页没有「我的资料」卡片 | `envId` 没填 | 填 `envId` 后**重新上传**小程序 |
| `users` 集合一直空 | 云函数没部署成功 / 环境 ID 不对 | 控制台点开 `userTrack` 看日志；确认环境属于本小程序 |
| 保存资料报「云端保存失败」 | 云函数报错 | 看云函数日志；确认 `users` 集合已建且权限不是「仅管理端可读写」以外的奇怪配置 |
| 头像选了保存后失效 | 云存储权限问题 | 云存储控制台把 `avatars/` 目录权限设为「所有用户可读、仅创建者可写」 |
| 开发者工具报 `wx.cloud is undefined` | 基础库版本过低 | 工具里把「调试基础库」调到 2.2.3 以上 |

---

## 8. 想看数据？两种方式

### 方式一：`adminUserList` 云函数（推荐，一键出名单+统计）

云开发控制台 → **云函数** → `adminUserList` → **云端测试** → 参数填：

```json
{ "adminKey": "你设置的ADMIN_KEY" }
```

点运行，返回 JSON，形如：

```json
{
  "ok": true,
  "stats": {
    "totalUsers": 12,
    "activeToday": 3,
    "active7d": 7,
    "withNickname": 4,
    "totalOpens": 41,
    "avgOpens": 3.4
  },
  "users": [
    {
      "nickname": "小明",
      "openidShort": "oXyZ12ab34cd…",
      "openCount": 9,
      "lastAction": "profile",
      "firstSeenText": "2026/10/7 09:12:33",
      "lastActiveText": "2026/10/7 21:40:08"
    }
  ]
}
```

`users` 已按「最近活跃」倒序，**第一个就是最新来的用户**。

### 方式二：数据库控制台手动查

云开发控制台 → **数据库** → `users` 集合，支持按字段筛选/排序，可直接导出 CSV（Excel）。常用视图：

- **今天有谁来过**：`lastActive` 按天筛选
- **打开最多的人**：`openCount` 降序排列
- **已填昵称的用户**：`nickname` 字段非空筛选

> 两种方式看到的都是同一份数据。`adminUserList` 帮您把统计和排序做好了，还把时间戳转成了可读时间。

---

## 附：涉及文件清单

| 文件 | 作用 |
|---|---|
| `cloudfunctions/userTrack/index.js` | 云函数：用 `getWXContext().OPENID` 识别用户并 upsert |
| `cloudfunctions/userTrack/package.json` | 依赖 `wx-server-sdk ~2.6.3` |
| `cloudfunctions/userTrack/config.json` | 云函数配置（无需额外 openapi 权限） |
| `cloudfunctions/adminUserList/index.js` | 云函数：管理员查名单+统计，**需 adminKey** |
| `cloudfunctions/adminUserList/package.json` | 同上依赖 |
| `cloudfunctions/adminUserList/config.json` | 同上配置 |
| `app/utils/wxcloud-config.js` | **需你填写** `envId` |
| `app/app.js` | `onLaunch` 静默埋点 + `trackUser()`（返回 Promise） |
| `app/pages/mine/mine.js` | 完善资料：选头像、填昵称、上传保存 |
| `app/pages/mine/mine.wxml` | 「我的资料」卡片 UI |
| `app/pages/mine/mine.wxss` | 卡片样式（沿用主绿 #0e7c5a） |

---

## 9. 隐私与合规（发布前必读）

微信审核对「收集用户信息」有明确要求，本方案已按合规方式实现：

- ✅ **静默记录属必要行为**：仅记录 openid 与使用时间戳，用于服务统计，属实现功能所必需
- ✅ **昵称头像为用户主动点击授权**（`chooseAvatar` + `type="nickname"`），非静默采集
- ✅ **未收集**微信号、手机号、真实姓名、地理位置等敏感信息
- ✅ 用户可在「我的」页查看自己填的资料，数据存放在**用户自己的云存储**路径下
- ⚠️ 审核前建议在小程序后台「用户隐私保护指引」中如实声明：使用 openid 做匿名统计、用户可自愿填写昵称头像

> 如需彻底不留痕，可把 `app/app.js` 里 `_initCloud()` 里的 `this.trackUser('launch')` 一行删掉，关闭静默记录，仅保留用户主动点「保存资料」时才上报。

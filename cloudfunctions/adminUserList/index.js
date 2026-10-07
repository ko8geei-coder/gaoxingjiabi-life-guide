// 云函数 adminUserList —— 【仅管理员】查看「谁在使用」小程序
//
// ⚠️ 安全设计（重要）：
// 1) 本函数不接受任何来自小程序的调用。adminKey 只存在于云函数里（环境变量或下方默认值），
//    小程序端拿不到，因此普通用户即使知道函数名也无法调用。
// 2) 请务必在云开发控制台给本函数配置环境变量 ADMIN_KEY，改成你自己的长随机串。
// 3) 使用方式：云开发控制台 → 云函数 → adminUserList → 「云端测试」→ 传入 {"adminKey":"你的KEY"}
//    返回值即为用户名单与统计。
//
// 依赖：wx-server-sdk ~2.6.3
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const USERS = 'users'
const CMD = db.command

// 优先读环境变量；没有则回落到默认值（部署后请立刻改成环境变量）
const DEFAULT_ADMIN_KEY = 'CHANGE_ME_please_set_env_ADMIN_KEY'
const ADMIN_KEY = process.env.ADMIN_KEY || DEFAULT_ADMIN_KEY

function fail(msg) {
  return { ok: false, msg }
}

exports.main = async (event) => {
  const key = (event && event.adminKey) || ''
  if (!key || key !== ADMIN_KEY) return fail('adminKey 不正确')

  const col = db.collection(USERS)
  const now = Date.now()
  const dayMs = 24 * 3600 * 1000

  try {
    const all = await col.limit(1000).get()
    const list = (all && all.data) || []

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayMs = todayStart.getTime()

    let activeToday = 0
    let active7d = 0
    let withNickname = 0
    let totalOpens = 0
    for (const u of list) {
      const la = u.lastActive || 0
      if (la >= todayMs) activeToday++
      if (la >= now - 7 * dayMs) active7d++
      if (u.nickname) withNickname++
      totalOpens += (u.openCount || 0)
    }

    // 按最近活跃倒序
    const users = list
      .sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0))
      .map((u) => ({
        nickname: u.nickname || '',
        openid: u.openid || u._id,
        openidShort: (u.openid || u._id || '').slice(0, 12) + '…',
        avatarUrl: u.avatarUrl || '',
        openCount: u.openCount || 0,
        lastAction: u.lastAction || '',
        firstSeen: u.firstSeen || 0,
        firstSeenText: u.firstSeen ? new Date(u.firstSeen).toLocaleString('zh-CN') : '',
        lastActive: u.lastActive || 0,
        lastActiveText: u.lastActive ? new Date(u.lastActive).toLocaleString('zh-CN') : ''
      }))

    return {
      ok: true,
      stats: {
        totalUsers: users.length,
        activeToday,
        active7d,
        withNickname,
        totalOpens,
        avgOpens: users.length ? Math.round((totalOpens / users.length) * 10) / 10 : 0
      },
      users
    }
  } catch (e) {
    return { ok: false, msg: (e && e.errMsg) || (e && e.message) || String(e) }
  }
}

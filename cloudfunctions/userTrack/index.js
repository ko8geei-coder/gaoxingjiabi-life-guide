// 云函数 userTrack —— 静默记录「谁在用」小程序
// 关键点：云函数用 cloud.getWXContext() 直接拿到调用者 openid，
// 不需要小程序传 code、不需要 code2Session、不需要 AppSecret，天然安全。
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const USERS = 'users'

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { ok: false, msg: 'no openid' }

  const col = db.collection(USERS)
  const now = Date.now()
  const nickname = (event && event.nickname) || ''
  const avatarUrl = (event && event.avatarUrl) || ''
  const action = (event && event.action) || 'launch'

  // 查是否已存在
  let existing = null
  try {
    const r = await col.doc(OPENID).get()
    existing = r && r.data ? r.data : null
  } catch (e) {
    existing = null // 首次没有记录
  }

  const patch = { lastActive: now, lastAction: action }
  if (nickname) patch.nickname = nickname
  if (avatarUrl) patch.avatarUrl = avatarUrl

  if (existing) {
    patch.openCount = (existing.openCount || 0) + 1
    await col.doc(OPENID).update({ data: patch })
    return { ok: true, isNew: false, openid: OPENID, hasProfile: !!(existing.nickname) }
  } else {
    await col.doc(OPENID).set({
      data: Object.assign({ _id: OPENID, openid: OPENID, firstSeen: now, openCount: 1 }, patch)
    })
    return { ok: true, isNew: true, openid: OPENID, hasProfile: !!nickname }
  }
}

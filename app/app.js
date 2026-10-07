// app.js
const guide = require('./data/guide.json')
const wxCloud = require('./utils/wxcloud-config.js')

App({
  globalData: {
    guide,                 // 全部章节与建议
    favorites: [],         // 收藏（本地存储 key: lifeguide_fav）
    history: [],           // 阅读记录（含已读百分比 progress）
    openid: '',            // 云开发识别到的用户 openid（未配置云开发时为空）
    hasProfile: false      // 用户是否已完善昵称头像
  },

  onLaunch() {
    this.globalData.favorites = wx.getStorageSync('lifeguide_fav') || []
    this.globalData.history = wx.getStorageSync('lifeguide_history') || []
    this._initCloud()
  },

  // 初始化微信云开发：静默记录「谁在用」（openid 由云函数识别，前端不传身份）
  _initCloud() {
    if (!wxCloud.envId || !wx.cloud) return // 未配置环境ID或基础库过低 → 自动跳过，不影响其它功能
    wx.cloud.init({ env: wxCloud.envId, traceUser: true })
    this.trackUser('launch')
  },

  // 上报一次用户行为；extra 可带 { nickname, avatarUrl } 完善资料
  // 返回 Promise，调用方可 await 到云端真实结果（未配置云开发时直接 resolve）
  trackUser(action, extra) {
    if (!wxCloud.envId || !wx.cloud) return Promise.resolve(null)
    return new Promise((resolve) => {
      wx.cloud.callFunction({
        name: wxCloud.fnName,
        data: Object.assign({ action: action || 'unknown' }, extra || {}),
        success: (res) => {
          const r = res && res.result
          if (r && r.ok) {
            this.globalData.openid = r.openid
            this.globalData.hasProfile = !!r.hasProfile
            resolve(r)
          } else {
            resolve(null)
          }
        },
        fail: () => resolve(null)
      })
    })
  },

  _persist() {
    wx.setStorageSync('lifeguide_fav', this.globalData.favorites)
    wx.setStorageSync('lifeguide_history', this.globalData.history)
  },

  // 收藏 / 取消收藏（按 chapterIdx + entryIdx 定位）
  toggleFavorite(chapterIdx, entryIdx) {
    const list = this.globalData.favorites
    const key = chapterIdx + '-' + entryIdx
    const idx = list.findIndex(i => i.key === key)
    if (idx >= 0) {
      list.splice(idx, 1)
    } else {
      const ch = this.globalData.guide.chapters[chapterIdx]
      const en = ch.entries[entryIdx]
      list.unshift({
        key, chapterIdx, entryIdx,
        chapterTitle: ch.title, title: en.title, plain: en.plain, level: en.level
      })
    }
    this._persist()
    return idx < 0
  },

  // 记录进入阅读（新增或置顶），progress 保留已读进度
  pushHistory(chapterIdx, entryIdx) {
    const key = chapterIdx + '-' + entryIdx
    const old = this.globalData.history.find(i => i.key === key)
    const list = this.globalData.history.filter(i => i.key !== key)
    const ch = this.globalData.guide.chapters[chapterIdx]
    const en = ch.entries[entryIdx]
    list.unshift({
      key, chapterIdx, entryIdx,
      chapterTitle: ch.title, title: en.title, plain: en.plain, level: en.level,
      progress: old ? old.progress : 0,
      ts: Date.now()
    })
    if (list.length > 50) list = list.slice(0, 50)
    this.globalData.history = list
    this._persist()
  },

  // 更新阅读进度（0-100）
  setProgress(chapterIdx, entryIdx, progress) {
    const key = chapterIdx + '-' + entryIdx
    const item = this.globalData.history.find(i => i.key === key)
    if (item) {
      item.progress = Math.max(item.progress || 0, Math.min(100, Math.round(progress)))
      this._persist()
    }
  },

  // 某条是否已读完
  isRead(chapterIdx, entryIdx) {
    const key = chapterIdx + '-' + entryIdx
    const item = this.globalData.history.find(i => i.key === key)
    return !!(item && item.progress >= 95)
  }
})

// pages/mine/mine.js
const app = getApp()
const { score, tier } = require('../../utils/score.js')
const wxCloud = require('../../utils/wxcloud-config.js')

Page({
  data: {
    favCount: 0, hisCount: 0, readCount: 0, chapterCount: 0, totalCount: 0,
    hisList: [],
    // 用户资料（云开发）
    cloudOn: false, hasProfile: false, avatarUrl: '', nicknameInput: '', saving: false
  },

  onShow() {
    const his = app.globalData.history
    const readCount = his.filter(i => (i.progress || 0) >= 95).length
    const g = app.globalData.guide
    const hisList = his.slice(0, 5).map(h => {
      let index = 0, tierKey = 'B'
      try {
        const s = score(g.chapters[h.chapterIdx].entries[h.entryIdx])
        index = s.index; tierKey = tier(s.index).key
      } catch (e) {}
      return { c: h.chapterIdx, e: h.entryIdx, title: h.title, ch: h.chapterTitle, level: h.level, index, tierKey, progress: h.progress || 0 }
    })

    // 读取云开发登录状态
    const cloudOn = !!(wxCloud.envId && wx.cloud)
    const my = wx.getStorageSync('lifeguide_profile') || {}
    this.setData({
      favCount: app.globalData.favorites.length,
      hisCount: his.length,
      readCount,
      chapterCount: g.chapters.length,
      totalCount: g.total,
      hisList,
      cloudOn,
      hasProfile: app.globalData.hasProfile || !!my.nickname,
      avatarUrl: my.avatarUrl || '',
      nicknameInput: my.nickname || ''
    })
  },

  // 选择头像（open-type="chooseAvatar" 会自动打开微信头像选择器）
  onChooseAvatar(e) {
    const tmp = e.detail && e.detail.avatarUrl
    if (tmp) {
      this._tmpAvatar = tmp
      this.setData({ avatarUrl: tmp }) // 先本地预览
    }
  },

  // 昵称输入（type="nickname" 调起微信昵称填写）
  onNicknameInput(e) {
    this.setData({ nicknameInput: e.detail.value })
  },

  // 保存资料：头像先传云存储拿到 fileID，再连同昵称上报云函数入库
  async saveProfile() {
    if (this.data.saving) return
    if (!wxCloud.envId || !wx.cloud) {
      wx.showToast({ title: '未配置云开发环境', icon: 'none' })
      return
    }
    const nickname = (this.data.nicknameInput || '').trim()
    if (!nickname && !this._tmpAvatar) {
      wx.showToast({ title: '请先选头像或填昵称', icon: 'none' })
      return
    }
    this.setData({ saving: true })
    wx.showLoading({ title: '保存中' })
    try {
      let avatarUrl = this.data.avatarUrl
      // 只有本地临时文件才需要上传；已是云 fileID 的直接沿用
      if (this._tmpAvatar) {
        const cloudPath = 'avatars/' + (app.globalData.openid || 'anon') + '/' + Date.now() + '.jpg'
        const up = await wx.cloud.uploadFile({ cloudPath, filePath: this._tmpAvatar })
        avatarUrl = up.fileID
        this._tmpAvatar = ''
      }
      // 真正等云端返回，失败能如实告知用户
      const r = await app.trackUser('profile', { nickname, avatarUrl })
      if (!r || !r.ok) {
        wx.hideLoading()
        wx.showToast({ title: '云端保存失败，请稍后再试', icon: 'none' })
        return
      }
      // 本地也存一份，便于下次进入直接展示
      wx.setStorageSync('lifeguide_profile', { nickname, avatarUrl })
      app.globalData.hasProfile = true
      this.setData({ avatarUrl, hasProfile: true, nicknameInput: nickname })
      wx.hideLoading()
      wx.showToast({ title: '已保存', icon: 'success' })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      this.setData({ saving: false })
    }
  },

  goDetail(e) {
    const ds = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/detail/detail?c=${ds.c}&e=${ds.e}` })
  },

  goFav() { wx.switchTab({ url: '/pages/fav/fav' }) },

  randomOne() {
    const g = app.globalData.guide
    const ci = Math.floor(Math.random() * g.chapters.length)
    const ch = g.chapters[ci]
    const ei = Math.floor(Math.random() * ch.entries.length)
    wx.navigateTo({ url: `/pages/detail/detail?c=${ci}&e=${ei}` })
  }
})

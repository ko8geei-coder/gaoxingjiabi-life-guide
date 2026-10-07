// pages/fav/fav.js
const app = getApp()
const { score, tier } = require('../../utils/score.js')

Page({
  data: {
    tab: 'fav',        // fav | recent
    favCount: 0, hisCount: 0,
    favList: [], hisList: []
  },

  onShow() {
    const g = app.globalData.guide
    const deco = f => {
      let index = 0, tierKey = 'B'
      try {
        const s = score(g.chapters[f.chapterIdx].entries[f.entryIdx])
        index = s.index; tierKey = tier(s.index).key
      } catch (e) {}
      return { c: f.chapterIdx, e: f.entryIdx, title: f.title, ch: f.chapterTitle, level: f.level, index, tierKey, progress: f.progress || 0 }
    }
    const fav = app.globalData.favorites.map(deco)
    const his = app.globalData.history.map(deco)
    this.setData({ favCount: fav.length, hisCount: his.length, favList: fav, hisList: his })
  },

  switchTab(e) { this.setData({ tab: e.currentTarget.dataset.tab }) },

  goDetail(e) {
    const ds = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/detail/detail?c=${ds.c}&e=${ds.e}` })
  },

  onUnfav(e) {
    const ds = e.currentTarget.dataset
    app.toggleFavorite(Number(ds.c), Number(ds.e))
    this.onShow()
    wx.showToast({ title: '已取消收藏', icon: 'none' })
  },

  goGuide() { wx.switchTab({ url: '/pages/index/index' }) }
})

// pages/mine/mine.js
const app = getApp()
const { score, tier } = require('../../utils/score.js')

Page({
  data: {
    favCount: 0, hisCount: 0, readCount: 0, chapterCount: 0, totalCount: 0,
    hisList: []
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
    this.setData({
      favCount: app.globalData.favorites.length,
      hisCount: his.length,
      readCount,
      chapterCount: g.chapters.length,
      totalCount: g.total,
      hisList
    })
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

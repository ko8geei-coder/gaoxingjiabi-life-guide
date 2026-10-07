// pages/index/index.js
const app = getApp()
const { score, tier } = require('../../utils/score.js')
const { CATEGORIES, SCENARIOS, CHECKLISTS } = require('../../data/nav.js')

Page({
  data: {
    mode: 'need',        // need(按需查找) | chapter(章节阅读)
    total: 0,
    cats: ['睡眠', '租房', '社保', '退租', '视力', '离职'],
    lastRead: null,      // 接上次读
    top: [],             // 性价比排行 top5
    today: null,
    categories: [],      // 6 大主题
    scenarios: [],       // 8 场景
    checklists: []       // 专题清单
  },

  onLoad() {
    const g = app.globalData.guide
    // 主题卡附带章节数与总条数
    const categories = CATEGORIES.map(c => {
      let n = 0
      c.chapters.forEach(ci => { n += g.chapters[ci].count })
      return { ...c, count: n }
    })
    const scenarios = SCENARIOS.map(s => {
      let n = 0
      s.chapters.forEach(ci => { n += g.chapters[ci].count })
      return { ...s, count: n }
    })
    this.setData({ total: g.total, categories, scenarios, checklists: CHECKLISTS })
    this.buildTop()
    this.pickToday()
    this.loadLastRead()
  },

  onShow() { this.loadLastRead() },

  buildTop() {
    const g = app.globalData.guide
    const arr = []
    g.chapters.forEach((ch, ci) => ch.entries.forEach((en, ei) => {
      const s = score(en)
      arr.push({ c: ci, e: ei, title: en.title, level: en.level, index: s.index, tierKey: tier(s.index).key, tierLabel: tier(s.index).label })
    }))
    arr.sort((a, b) => b.index - a.index)
    this.setData({ top: arr.slice(0, 5) })
  },

  pickToday() {
    const g = app.globalData.guide
    const ci = Math.floor(Math.random() * g.chapters.length)
    const ch = g.chapters[ci]
    const ei = Math.floor(Math.random() * ch.entries.length)
    const en = ch.entries[ei]
    const s = score(en)
    this.setData({
      today: {
        chapterIdx: ci, entryIdx: ei, chapterTitle: ch.title,
        title: en.title, plain: en.plain, level: en.level,
        index: s.index, tierKey: tier(s.index).key
      }
    })
  },

  // 接上次读：取浏览历史第一条
  loadLastRead() {
    const his = app.globalData.history
    if (his && his.length) {
      this.setData({ lastRead: { c: his[0].chapterIdx, e: his[0].entryIdx, title: his[0].title, ch: his[0].chapterTitle } })
    }
  },

  switchMode(e) { this.setData({ mode: e.currentTarget.dataset.mode }) },
  goSearch(e) {
    const q = e && e.currentTarget.dataset && e.currentTarget.dataset.q ? e.currentTarget.dataset.q : ''
    wx.navigateTo({ url: '/pages/search/search' + (q ? '?q=' + encodeURIComponent(q) : '') })
  },
  onSearchByWord(e) { this.goSearch(e) },
  goTopic(e) { wx.navigateTo({ url: `/pages/chapter/chapter?c=-1&tp=${e.currentTarget.dataset.id}` }) },
  goToday() { const t = this.data.today; if (t) wx.navigateTo({ url: `/pages/detail/detail?c=${t.chapterIdx}&e=${t.entryIdx}` }) },
  goTop(e) { const ds = e.currentTarget.dataset; wx.navigateTo({ url: `/pages/detail/detail?c=${ds.c}&e=${ds.e}` }) },
  goLast() { const l = this.data.lastRead; if (l) wx.navigateTo({ url: `/pages/detail/detail?c=${l.c}&e=${l.e}` }) },
  goChapter(e) { wx.navigateTo({ url: `/pages/chapter/chapter?c=${e.currentTarget.dataset.idx}` }) },
  goScenario(e) { wx.navigateTo({ url: `/pages/chapter/chapter?c=-1&sc=${e.currentTarget.dataset.id}` }) },
  goChecklist(e) { wx.navigateTo({ url: `/pages/chapter/chapter?c=-1&ck=${e.currentTarget.dataset.id}` }) }
})

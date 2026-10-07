// pages/detail/detail.js
const app = getApp()
const { score, tier } = require('../../utils/score.js')

Page({
  data: {
    c: -1, e: -1,
    chapterTitle: '',
    title: '',
    cost: '', benefit: '', plain: '', level: '', source: '', note: '',
    faved: false,
    sc: null,          // score 结果 { index, trust, cost, yld, level, costParts }
    tierKey: '', tierLabel: '',
    segs: []           // 成本构成可视化段 [{label, pct, color}]
  },

  onLoad(options) {
    const c = Number(options.c), e = Number(options.e)
    const g = app.globalData.guide
    const en = g.chapters[c].entries[e]
    const faved = app.globalData.favorites.some(i => i.key === c + '-' + e)

    const s = score(en)
    const t = tier(s.index)
    const segs = []
    if (s.money > 0) segs.push({ label: '钱', pct: s.money, color: '#e9a13b' })
    if (s.time > 0) segs.push({ label: '时间', pct: s.time, color: '#4a9d8f' })
    if (s.will > 0) segs.push({ label: '毅力', pct: s.will, color: '#a0715f' })
    const tot = s.money + s.time + s.will || 1
    segs.forEach(x => { x.percent = Math.round(x.pct / tot * 100) })

    // 详细解读分点
    const tags = en.tags || {}
    const interp = []
    let concl = '这条'
    if (tags['收益'] === '大') concl += '回报很大'
    else if (tags['收益'] === '中') concl += '回报中等'
    else concl += '回报有限'
    if (tags['钱'] === '0') concl += '，而且不花钱'
    else if (tags['钱'] === '少') concl += '，花钱很少'
    if (tags['毅力'] === '否') concl += '，不靠意志力'
    else if (tags['毅力'] === '少') concl += '，不太需要坚持'
    concl += '。'
    interp.push({ k: '结论', v: concl })
    if (en.cost) interp.push({ k: '你要付出的', v: en.cost.length > 60 ? en.cost.slice(0, 60) + '…' : en.cost })
    const lvMap = { A: '有多项高质量研究支持，结论比较可靠。', B: '有一些研究支持，方向可信但细节有不确定性。', C: '证据较弱或主要是个案统计，建议当作参考。', D: '证据很弱，谨慎采纳。' }
    if (lvMap[en.level]) interp.push({ k: '证据强度', v: lvMap[en.level] })
    if (en.benefit) {
      const first = en.benefit.split(/(?<=[。；;])/)[0] || ''
      const short = first.length > 90 ? first.slice(0, 90) + '…' : first
      if (short) interp.push({ k: '关键证据', v: short })
    }
    if (en.note) interp.push({ k: '注意', v: en.note.length > 70 ? en.note.slice(0, 70) + '…' : en.note })

    this.setData({
      c, e, chapterTitle: g.chapters[c].title, title: en.title,
      cost: en.cost, benefit: en.benefit, plain: en.plain,
      level: en.level, source: en.source, note: en.note,
      faved, sc: s, tierKey: t.key, tierLabel: t.label, segs, interp
    })
    app.pushHistory(c, e)
  },

  // 滚动记录阅读进度
  onPageScroll(e) {
    const h = this._contentHeight || 0
    if (!h) return
    const winH = wx.getSystemInfoSync().windowHeight
    const max = h - winH
    if (max <= 0) { app.setProgress(this.data.c, this.data.e, 100); return }
    const pct = (e.scrollTop / max) * 100
    app.setProgress(this.data.c, this.data.e, pct)
  },

  onReady() {
    // 测量正文高度用于进度计算
    setTimeout(() => {
      wx.createSelectorQuery().select('.page').boundingClientRect(r => {
        if (r && r.height) this._contentHeight = r.height
      }).exec()
    }, 120)
  },

  onFav() {
    const now = app.toggleFavorite(this.data.c, this.data.e)
    this.setData({ faved: now })
    wx.showToast({ title: now ? '已收藏' : '已取消', icon: 'none' })
  },

  onCopySource() {
    if (!this.data.source) return
    wx.setClipboardData({ data: this.data.source })
  }
})

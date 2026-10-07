// pages/chapter/chapter.js
const app = getApp()
const { score, tier } = require('../../utils/score.js')
const { CATEGORIES, SCENARIOS, CHECKLISTS } = require('../../data/nav.js')

const TIER_COLOR = { S: '#0e7c5a', A: '#2d9a6b', B: '#c08a2e', C: '#b0623c' }

Page({
  data: {
    title: '',
    sub: '',
    list: [],   // [{key,chapterIdx,entryIdx,title,plain,level,lvKey,index,color,faved}]
    groups: [], // 场景/主题模式下的章节分组 [{title, items:[...]}]
    isChapter: false, // 单章模式（显示章内搜索）
    curC: -1,
    chKw: '',
    showToc: false,
    toc: [],
    tocSub: ''
  },

  mk(en, ci, ei, favKeys) {
    const s = score(en)
    const t = tier(s.index)
    return {
      key: ci + '-' + ei, chapterIdx: ci, entryIdx: ei,
      title: en.title, plain: en.plain, level: en.level || '', lvKey: (en.level || '').charAt(0),
      index: s.index, color: TIER_COLOR[t.key] || '#b0623c',
      faved: favKeys.indexOf(ci + '-' + ei) >= 0
    }
  },

  onLoad(options) {
    const g = app.globalData.guide
    const favKeys = app.globalData.favorites.map(i => i.key)
    this.favKeys = favKeys

    // 单章（支持章内搜索 + 目录切换）
    if (options.c !== undefined && Number(options.c) >= 0) {
      this.curC = Number(options.c)
      this.renderChapter('')
      return
    }

    // 搜索（从查找页/外部带词进来）
    if (options.q !== undefined) {
      const q = decodeURIComponent(options.q)
      const hits = []
      g.chapters.forEach((ch, ci) => ch.entries.forEach((en, ei) => {
        if ((en.title + en.plain + en.cost + en.benefit + ch.title).indexOf(q) >= 0) hits.push(this.mk(en, ci, ei, favKeys))
      }))
      this.setData({ title: `“${q}”`, sub: `找到 ${hits.length} 条`, list: hits, groups: [], isChapter: false })
      return
    }

    // 场景 / 清单 / 主题：分组展示
    let node = null, kind = ''
    if (options.sc) { node = SCENARIOS.find(s => s.id === options.sc); kind = 'sc' }
    else if (options.ck) { node = CHECKLISTS.find(s => s.id === options.ck); kind = 'ck' }
    else if (options.tp) { node = CATEGORIES.find(s => s.id === options.tp); kind = 'tp' }

    if (!node) { this.setData({ title: '未找到', sub: '', list: [], groups: [] }); return }

    let total = 0
    const groups = node.chapters.map(ci => {
      const ch = g.chapters[ci]
      total += ch.count
      return { title: ch.title, items: ch.entries.map((en, ei) => this.mk(en, ci, ei, favKeys)) }
    })
    this.setData({ title: node.name, sub: kind === 'ck' ? node.desc : `共 ${total} 条 · ${node.chapters.length} 个章节`, list: [], groups })
  },

  renderChapter(kw) {
    const g = app.globalData.guide
    const ci = this.curC
    const ch = g.chapters[ci]
    const q = (kw || '').trim().toLowerCase()
    const items = ch.entries
      .map((en, ei) => this.mk(en, ci, ei, this.favKeys))
      .filter(it => {
        if (!q) return true
        const hay = (it.title + it.plain + (ch.title || '')).toLowerCase()
        return hay.indexOf(q) >= 0
      })
    this.setData({ title: ch.title, sub: (q ? `“${kw}” · ` : '') + ch.count + ' 条建议', list: items, groups: [], isChapter: true, curC: ci })
  },

  onChKw(e) { this.setData({ chKw: e.detail.value }); this.renderChapter(e.detail.value) },

  toggleToc() {
    if (!this.data.toc.length) {
      const g = app.globalData.guide
      const ACCENT = ['#0e7c5a', '#3b7dc4', '#d98324', '#d4568c', '#4a8fa6', '#7a6bc4']
      const toc = CATEGORIES.map((cat, gi) => ({
        name: cat.name,
        color: ACCENT[gi % ACCENT.length],
        chapters: cat.chapters.map(ci => ({
          idx: ci,
          title: (g.chapters[ci].title || '').replace(/^\d+[.、]\s*/, ''),
          count: g.chapters[ci].count
        }))
      }))
      this.setData({ toc, tocSub: g.chapters.length + ' 章 · ' + g.total + ' 条建议' })
    }
    this.setData({ showToc: !this.data.showToc })
  },

  goTocChapter(e) {
    const ci = Number(e.currentTarget.dataset.idx)
    this.setData({ showToc: false })
    wx.redirectTo({ url: '/pages/chapter/chapter?c=' + ci })
  },

  onToggleFav(e) {
    const ds = e.currentTarget.dataset
    const c = Number(ds.c), en = Number(ds.e)
    const now = app.toggleFavorite(c, en)
    const key = c + '-' + en
    const patch = i => i.key === key ? Object.assign({}, i, { faved: now }) : i
    this.setData({
      list: this.data.list.map(patch),
      groups: this.data.groups.map(g => Object.assign({}, g, { items: g.items.map(patch) }))
    })
  },

  goDetail(e) {
    const ds = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/detail/detail?c=${ds.c}&e=${ds.e}` })
  }
})

// pages/search/search.js —— 查找建议：搜索 + 栏目/证据/成本筛选 + AI 问答
const app = getApp()
const { score, tier } = require('../../utils/score.js')
const { CATEGORIES } = require('../../data/nav.js')
const aiConfig = require('../../utils/ai-config.js')

const TIER_COLOR = { S: '#0e7c5a', A: '#2d9a6b', B: '#c08a2e', C: '#b0623c' }

// AI 系统提示词：限定只依据提供的条目作答，并标注来源
const AI_SYSTEM = '你是「高性价比人生指南」的 AI 助手。下面会提供与用户问题最相关的若干条原文建议（整理自公开出版的《How To Live Better》中译整理版）。请只依据这些建议作答，用简洁、可操作的中文回答；如果提供的建议不足以回答，请如实说明并给出谨慎的常识性建议，不要编造具体数据、年份或出处。回答末尾用「参考条目：」列出你实际用到的条目（编号与标题）。'

let _cloud = null
function getCloud() {
  if (_cloud === null) {
    try { _cloud = require('../../utils/cloud.js').cloud } catch (e) { _cloud = false }
  }
  return _cloud || null
}

// 把用户问题切成匹配词：英文/数字词 + 中文二元组
function tokenize(q) {
  const tokens = []
  const words = (q || '').toLowerCase().match(/[a-z0-9]+/g) || []
  words.forEach(w => { if (w.length >= 2) tokens.push(w) })
  const cjk = (q || '').match(/[一-鿿]+/g) || []
  cjk.forEach(seg => {
    if (seg.length === 1) tokens.push(seg)
    else for (let i = 0; i < seg.length - 1; i++) tokens.push(seg.slice(i, i + 2))
  })
  return tokens
}

function decodeUtf8(buffer) {
  if (typeof buffer === 'string') return buffer
  const bytes = new Uint8Array(buffer)
  let out = '', i = 0
  const len = bytes.length
  while (i < len) {
    if (bytes[i] < 0x80) { out += String.fromCharCode(bytes[i]); i++ }
    else if (bytes[i] >= 0xC0 && bytes[i] < 0xE0) { out += String.fromCharCode(((bytes[i] & 0x1F) << 6) | (bytes[i + 1] & 0x3F)); i += 2 }
    else if (bytes[i] >= 0xE0) { out += String.fromCharCode(((bytes[i] & 0x0F) << 12) | ((bytes[i + 1] & 0x3F) << 6) | (bytes[i + 2] & 0x3F)); i += 3 }
    else { out += String.fromCharCode(bytes[i]); i++ }
  }
  return out
}

function buildMessages(q, hits) {
  const ctx = hits.map((it, i) => `${i + 1}. [第${it.chapterIdx + 1}章·${it.title}] ${(it.plain || '').slice(0, 220)}`).join('\n')
  return [
    { role: 'system', content: AI_SYSTEM },
    { role: 'user', content: `用户问题：${q}\n\n相关条目（来自《高性价比人生指南》）：\n${ctx || '（未找到直接相关条目）'}` }
  ]
}

function errText(e) {
  if (e && e.error && e.error.code) {
    const c = e.error.code
    if (c.startsWith('quota_')) return '调用额度或频率超限，请稍后再试'
    if (c.startsWith('auth_')) return '服务鉴权失败，请确认云服务已开通'
    if (c.startsWith('gateway_') || c.startsWith('model_')) return '模型服务暂时不可用，可点击「重新生成」再试'
    if (c.startsWith('request_')) return '请求参数有误，请稍后再试'
    if (c.startsWith('internal_')) return '服务异常（' + (e.requestId || '未知') + '），请稍后再试'
    return 'AI 调用出错：' + (e.error.message || c)
  }
  return 'AI 调用出错：' + (e && e.message ? e.message : '未知错误')
}

Page({
  data: {
    q: '',
    mode: 'search',
    cat: 'all',
    lv: '',
    costs: {},
    quick: ['睡眠', '租房', '社保', '退租', '视力', '离职', '看病', '新生儿'],
    cats: [],
    levels: [{ k: '', n: '全部' }, { k: 'A', n: 'A级' }, { k: 'B', n: 'B级' }, { k: 'C', n: 'C级' }],
    costChips: [{ k: 'money', n: '不额外花钱' }, { k: 'time', n: '少花时间' }, { k: 'will', n: '不需毅力' }],
    list: [],
    count: 0,
    limit: 80,
    // AI 问答
    aiAnswer: '',
    aiThinking: false,
    aiDone: false,
    aiCiting: [],
    aiError: '',
    aiQuestion: ''
  },

  onLoad(options) {
    const g = app.globalData.guide
    const favKeys = app.globalData.favorites.map(i => i.key)

    // 一次性构建全量条目（不 setData，避免大数据量）
    this.all = []
    g.chapters.forEach((ch, ci) => (ch.entries || []).forEach((en, ei) => {
      const s = score(en)
      this.all.push({
        key: ci + '-' + ei, chapterIdx: ci, entryIdx: ei,
        title: en.title, plain: en.plain, level: en.level || '',
        lvKey: (en.level || '').charAt(0),
        hay: ((en.title || '') + (en.plain || '') + (en.cost || '') + (en.benefit || '') + (ch.title || '')).toLowerCase(),
        money: s.money, time: s.time, will: s.will,
        index: s.index, tierKey: tier(s.index).key,
        color: TIER_COLOR[tier(s.index).key] || '#b0623c',
        faved: favKeys.indexOf(ci + '-' + ei) >= 0
      })
    }))

    const cats = [{ id: 'all', name: '全部栏目' }].concat(CATEGORIES.map(c => ({ id: c.id, name: c.name })))

    const patch = {}
    if (options.q !== undefined) patch.q = decodeURIComponent(options.q)
    this.setData(Object.assign({ cats }, patch))
    this.apply()
  },

  apply() {
    const d = this.data
    const q = (d.q || '').trim().toLowerCase()
    const catNode = CATEGORIES.find(c => c.id === d.cat)
    const costs = d.costs || {}
    const hits = this.all.filter(it => {
      if (catNode && catNode.chapters.indexOf(it.chapterIdx) < 0) return false
      if (d.lv && it.level.indexOf(d.lv) !== 0) return false
      if (costs.money && it.money !== 0) return false
      if (costs.time && it.time > 0.5) return false
      if (costs.will && it.will !== 0) return false
      if (q && it.hay.indexOf(q) < 0) return false
      return true
    })
    this.setData({ count: hits.length, list: hits.slice(0, d.limit) })
  },

  onInput(e) {
    const q = e.detail.value
    this.setData({ q })
    if (this.data.mode === 'search') this.apply()
  },
  onConfirm() {
    if (this.data.mode === 'ai') this.askAI()
    else this.apply()
  },
  onQuick(e) { this.setData({ q: e.currentTarget.dataset.w }); this.apply() },
  onCat(e) { this.setData({ cat: e.currentTarget.dataset.id }); this.apply() },
  onLv(e) { this.setData({ lv: e.currentTarget.dataset.k }); this.apply() },
  onCost(e) {
    const k = e.currentTarget.dataset.k
    const p = {}; p['costs.' + k] = !this.data.costs[k]
    this.setData(p); this.apply()
  },

  setMode(e) {
    const m = e.currentTarget.dataset.m
    if (m === this.data.mode) return
    this.setData({ mode: m, aiError: '' })
  },

  // 端侧检索：返回与问题最相关的若干条
  retrieve(q, n) {
    const toks = tokenize(q)
    if (!toks.length) return []
    const scored = this.all.map(it => {
      let s = 0
      toks.forEach(t => { if (it.hay.indexOf(t) >= 0) s++ })
      if (it.title && toks.some(t => it.title.indexOf(t) >= 0)) s += 3
      return { it, s }
    }).filter(x => x.s > 0)
    scored.sort((a, b) => b.s - a.s)
    return scored.slice(0, n).map(x => x.it)
  },

  async askAI() {
    const q = (this.data.q || '').trim()
    if (!q) { this.setData({ aiError: '请输入你的问题' }); return }
    if (this._aiRunning) return

    this._aiRunning = true
    this.setData({ aiThinking: true, aiAnswer: '', aiCiting: [], aiError: '', aiDone: false, aiQuestion: q })

    const hits = this.retrieve(q, 5)
    const messages = buildMessages(q, hits)
    const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null
    this._aiController = controller
    let answer = ''

    const finish = (errMsg) => {
      if (errMsg) this.setData({ aiError: errMsg })
      this.setData({
        aiDone: true,
        aiCiting: hits.map(it => ({
          key: it.chapterIdx + '-' + it.entryIdx,
          chapterIdx: it.chapterIdx, entryIdx: it.entryIdx,
          title: it.title, plain: (it.plain || '').slice(0, 60)
        }))
      })
      this._aiRunning = false
      this.setData({ aiThinking: false })
    }

    try {
      if (aiConfig.proxyUrl && aiConfig.proxyUrl.indexOf('http') === 0) {
        answer = await this.askViaProxy(messages, controller)
      } else {
        answer = await this.askViaCloud(messages, controller)
      }
      this.setData({ aiAnswer: answer })
      finish('')
    } catch (e) {
      if (controller && controller.signal && controller.signal.aborted) {
        this.setData({ aiAnswer: answer }); finish('')
      } else {
        finish(errText(e))
      }
    }
  },

  // 走 WorkBuddy 免密钥 LLM（默认）
  async askViaCloud(messages, controller) {
    const cloud = getCloud()
    if (!cloud) throw new Error('AI 模块未就绪：请在开发者工具中执行「构建 npm」后重试')
    let model = this._model
    if (!model) {
      const models = await cloud.llm.models.list()
      model = (models || []).find(m => m.disabled !== true) || null
      if (!model) throw new Error('AI 模型暂不可用，请稍后再试')
      this._model = model
    }
    let answer = ''
    for await (const chunk of cloud.llm.chat.completions.create({
      model: model.id,
      messages,
      stream: true,
      temperature: 0.6,
      signal: controller ? controller.signal : undefined
    })) {
      const delta = chunk.choices && chunk.choices[0] && chunk.choices[0].delta
      if (delta && delta.content) { answer += delta.content; this.setData({ aiAnswer: answer }) }
    }
    return answer
  },

  // 走你自己的腾讯云 HY3 代理（key 只在你服务端，前端不碰）
  askViaProxy(messages, controller) {
    return new Promise((resolve, reject) => {
      let answer = ''
      let buf = ''
      const task = wx.request({
        url: aiConfig.proxyUrl,
        method: 'POST',
        enableChunked: true,
        header: { 'content-type': 'application/json' },
        data: { messages, stream: true },
        success: () => resolve(answer),
        fail: (e) => {
          if (e && e.errMsg === 'request:fail abort') return resolve(answer)
          reject(new Error('AI 请求失败：' + ((e && e.errMsg) || '网络错误')))
        }
      })
      this._proxyTask = task
      if (controller && controller.signal) {
        controller.signal.addEventListener('abort', () => task.abort())
      }
      task.onChunkReceived((res) => {
        buf += decodeUtf8(res.data)
        let nl
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl); buf = buf.slice(nl + 1)
          const t = line.trim()
          if (!t || t.indexOf('data:') !== 0) continue
          const payload = t.slice(5).trim()
          if (payload === '[DONE]') { this.setData({ aiAnswer: answer }); continue }
          try {
            const j = JSON.parse(payload)
            const c = j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content
            if (c) { answer += c; this.setData({ aiAnswer: answer }) }
          } catch (_) { /* 忽略非 JSON 行 */ }
        }
      })
    })
  },

  stopAI() {
    if (this._aiController) this._aiController.abort()
    if (this._proxyTask) this._proxyTask.abort()
  },
  regenAI() { this.askAI() },

  goCite(e) {
    const ds = e.currentTarget.dataset
    wx.navigateTo({ url: '/pages/detail/detail?c=' + ds.c + '&e=' + ds.e })
  },

  onReachBottom() {
    if (this.data.mode !== 'search') return
    if (this.data.list.length < this.data.count) {
      this.setData({ limit: this.data.limit + 80 })
      this.apply()
    }
  },

  onToggleFav(e) {
    const ds = e.currentTarget.dataset
    const c = Number(ds.c), en = Number(ds.e)
    const now = app.toggleFavorite(c, en)
    const key = c + '-' + en
    this.setData({ list: this.data.list.map(i => i.key === key ? Object.assign({}, i, { faved: now }) : i) })
  },

  goDetail(e) {
    const ds = e.currentTarget.dataset
    wx.navigateTo({ url: '/pages/detail/detail?c=' + ds.c + '&e=' + ds.e })
  }
})

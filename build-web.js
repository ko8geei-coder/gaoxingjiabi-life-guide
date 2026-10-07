/**
 * build-web.js —— 把 1.9MB 的 guide.json 拆成「轻量索引 + 分章详情」
 *
 * 为什么要拆：
 *   手机上一次性加载 1.9MB JSON，首屏要等 3-5 秒以上（4G 尤其慢），
 *   而且 1.9MB 里的 cost/plain/benefit 全文只有点开某一条时才用得到。
 *
 * 产出（web/data/ 下）：
 *   index.json      ~60KB  首屏只拉这个：34章元数据 + 每条的 id/标题/tags/评分 + 6主题 8场景
 *   ch-01.json ...  34 个分章文件，点哪章才拉哪个（平均 55KB）
 *   nav.json        6 大主题 / 8 场景 / 3 专题清单的索引定义
 */
const fs = require('fs')
const path = require('path')

const ROOT = __dirname
const SRC = path.join(ROOT, 'app', 'data', 'guide.json')
const NAV = path.join(ROOT, 'app', 'data', 'nav.js')
const SCORE_JS = path.join(ROOT, 'app', 'utils', 'score.js')
const OUT = path.join(ROOT, 'web', 'data')

fs.mkdirSync(OUT, { recursive: true })

// 载入 CommonJS 模块的沙箱helper
function loadCjs(file) {
  const src = fs.readFileSync(file, 'utf8')
  const m = { exports: {} }
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', 'require', src)(m, m.exports, require)
  return m.exports
}

const { CATEGORIES, SCENARIOS, CHECKLISTS } = loadCjs(NAV)
const { score, tier } = loadCjs(SCORE_JS)

const guide = JSON.parse(fs.readFileSync(SRC, 'utf8'))

// ---------- 1. 轻量索引 ----------
// 直接复用小程序端 app/utils/score.js，保证 Web 与小程序评分完全一致
//
// 体积优化：index.json 只存「列表够用」的字段，且把 tags 对象压成数组 +
// 单独一张字典表。原因：669 条里每条的 tags key 几乎完全一样，
// 存成{"钱":"0","时间":"少",...} 会重复 669 遍，光 key 就占掉大半体积。
// 页面用 TAGS_KEYS[i] 还原成标签，tagStr 保留原始中文串用于展示。
const TAGS_KEYS = ['钱', '时间', '毅力', '收益', '口径']

function tagsToArr(t) {
  t = t || {}
  return TAGS_KEYS.map(k => t[k] || '')
}

const index = {
  generated: guide.generated,
  total: guide.total,
  chapterCount: guide.chapters.length,
  tagsKeys: TAGS_KEYS,
  chapters: guide.chapters.map((c, ci) => ({
    idx: ci,
    slug: 'ch-' + String(ci + 1).padStart(2, '0'),
    title: c.title,
    count: c.count,
    // 每条只保留列表字段：id/序号/标题/标签数组/评分/可信度/档位
    items: c.entries.map((e, ei) => {
      const s = score(e)
      const t = tier(s.index)
      return {
        id: 'c' + ci + 'e' + ei,
        ei: ei,
        num: e.num,
        title: e.title,
        tg: tagsToArr(e.tags),
        cost: s.cost,
        yld: s.yld,
        lv: e.level || '',
        sc: s.index,
        tr: s.trust,
        tk: t.key,
        tl: t.label
      }
    })
  })),
  categories: CATEGORIES,
  scenarios: SCENARIOS,
  checklists: CHECKLISTS
}

// ---------- 2. 分章详情（全文） ----------
// 这里要放 cost/plain/benefit/source/note 全文，是真正占体积的部分，
// 但只有点进某一章才会拉，所以可以接受。
let totalDetail = 0
guide.chapters.forEach((c, ci) => {
  const payload = {
    idx: ci,
    slug: 'ch-' + String(ci + 1).padStart(2, '0'),
    title: c.title,
    count: c.count,
    items: c.entries.map((e, ei) => {
      const s = score(e)
      return {
        id: 'c' + ci + 'e' + ei,
        ei: ei,
        num: e.num,
        title: e.title,
        cost: e.cost,
        plain: e.plain,
        benefit: e.benefit,
        level: e.level || '',
        source: e.source,
        note: e.note,
        tg: tagsToArr(e.tags),
        sc: s.index,
        tr: s.trust,
        cp: s.costParts
      }
    })
  }
  const s2 = JSON.stringify(payload)
  fs.writeFileSync(path.join(OUT, payload.slug + '.json'), s2, 'utf8')
  totalDetail += Buffer.byteLength(s2)
})

// ---------- 3. 写索引 ----------
const idxStr = JSON.stringify(index)
fs.writeFileSync(path.join(OUT, 'index.json'), idxStr, 'utf8')

// ---------- 4. 报告 ----------
const kb = (n) => (n / 1024).toFixed(1) + ' KB'
console.log('=== 数据拆分完成 ===')
console.log('源文件      :', (fs.statSync(SRC).size / 1048576).toFixed(2), 'MB')
console.log('index.json  :', kb(Buffer.byteLength(idxStr)), '← 首屏只拉这个')
console.log('分章 ×' + guide.chapters.length, ':', kb(totalDetail), '← 点哪章拉哪个')
console.log('最大单章    :', kb(Math.max(...fs.readdirSync(OUT)
  .filter(f => f.startsWith('ch-'))
  .map(f => fs.statSync(path.join(OUT, f)).size))))
console.log('总条数      :', index.total)
console.log('输出目录    :', OUT)

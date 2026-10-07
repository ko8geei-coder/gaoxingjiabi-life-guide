// verify-preview.js —— 在 Node 里模拟最小 DOM，实际执行 preview.html 的 script，确认动态内容能渲染
const fs = require('fs')
const path = require('path')

const html = fs.readFileSync(path.join(__dirname, 'preview.html'), 'utf8')

// 取出 <script> 内容
const m = html.match(/<script>([\s\S]*?)<\/script>/)
if (!m) { console.log('FAIL: no <script> found'); process.exit(1) }
let code = m[1]

// 最小 DOM 桩（元素与内容分开存，避免自引用覆盖）
const store = {}
const els = {}
const inner = {}
function mkEl(id) {
  return {
    id, textContent: '', style: {}, onclick: null, scrollTop: 0,
    set innerHTML(v) { inner[id] = v },
    get innerHTML() { return inner[id] || '' }
  }
}
global.document = {
  getElementById: id => els[id] || (els[id] = mkEl(id)),
  querySelectorAll: () => [],
  createElement: () => mkEl('tmp')
}
global.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = v }
}
global.navigator = { clipboard: { writeText: () => {} } }
global.__els = els

try {
  eval(code)
} catch (e) {
  console.log('RUNTIME ERROR:', e.message)
  console.log(e.stack.split('\n').slice(0, 4).join('\n'))
  process.exit(1)
}

// 检查关键容器是否渲染出内容
const checks = {
  'tryWords (试试搜)': 'tryWords',
  'needPane (场景+清单)': 'needPane',
  'chapPane (6主题+排行)': 'chapPane',
  'todayCard (今日一条)': 'todayCard'
}
let allOk = true
for (const [label, id] of Object.entries(checks)) {
  const v = inner[id] || ''
  const ok = v.length > 30
  console.log(`${ok ? 'OK ' : 'EMPTY'}  ${label}  len=${v.length}`)
  if (!ok) allOk = false
}

// 额外确认数值已填充
const total = String(els['totalN'] ? els['totalN'].textContent : '').trim()
const chN = String(els['chN'] ? els['chN'].textContent : '').trim()
console.log('totalN =', JSON.stringify(total), '| chN =', JSON.stringify(chN))
if (total !== '669') { console.log('WARN: totalN not filled'); allOk = false }

console.log(allOk ? '\nALL RENDER CHECKS PASSED' : '\nSOME CHECKS FAILED')
process.exit(allOk ? 0 : 1)

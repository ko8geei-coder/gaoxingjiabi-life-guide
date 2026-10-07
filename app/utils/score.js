// utils/score.js —— 性价比指数引擎
// 原书每条建议带有「成本标签」(钱/时间/毅力) 与「收益」及「证据等级」。
// 这里把它们量化成一个 0-100 的「性价比指数」，并给出可视化拆解，
// 让用户一眼看出「要付出多少、回报多少、可信度多高」。这是原 App 没做的部分。

// ---- 成本映射：数字越大 = 成本越高（单项 0~3） ----
const MONEY = { '0': 0, '免费': 0, '少': 1, '中': 2, '多': 3, '要交钱': 2, '要花钱': 2 }
const TIME  = { '零': 0, '不会': 0, '少': 0.5, '几分钟': 0.5, '中': 1.5, '多': 3, '每天': 2.5 }
const WILL  = { '否': 0, '少': 1, '中': 2, '要': 2.5, '是': 3, '强': 3 }

// ---- 收益映射：数字越大 = 回报越大（0~3） ----
const YIELD = { '大': 3, '高': 3, '中': 2, '小': 1, '低': 1 }

// ---- 证据系数：越硬的证据越可信 ----
const EVIDENCE = { 'A': 1.0, 'B': 0.88, 'C': 0.75, 'D': 0.62, '': 0.7 }

function pick(map, val, dflt) {
  if (val === undefined || val === null) return dflt
  const s = String(val).trim()
  if (map[s] !== undefined) return map[s]
  for (const k in map) { if (s.indexOf(k) >= 0) return map[k] }
  return dflt
}

function score(entry) {
  if (!entry) return { index: 50, trust: 40, cost: 1.5, yld: 2, money: 1.5, time: 1.5, will: 1.5, level: '', costParts: { money: .5, time: .5, will: .5 } }
  const t = entry.tags || {}
  const money = pick(MONEY, t['钱'], 1.5)
  const time  = pick(TIME,  t['时间'], 1.5)
  const will  = pick(WILL,  t['毅力'], 1.5)
  const yld   = pick(YIELD, t['收益'], 2)

  const cost = money + time + will            // 0 ~ 9
  const yldN = yld / 3                          // 回报归一 0~1
  const costF = 2.5 / (2.5 + cost)              // 成本衰减因子
  const ev = EVIDENCE[entry.level] !== undefined ? EVIDENCE[entry.level] : 0.7

  let index = Math.round(yldN * costF * 100)     // 纯性价比 0~100
  index = Math.max(5, Math.min(100, index))
  const trust = Math.round(index * ev)            // 证据加权可信分

  return {
    index,
    trust,
    cost: Math.round(cost * 10) / 10,
    yld,
    money, time, will,
    level: entry.level || '',
    costParts: { money: money / 3, time: time / 3, will: will / 3 }
  }
}

// 指数分档
function tier(index) {
  if (index >= 70) return { key: 'S', label: '非常划算', color: '#0E7C5A' }
  if (index >= 50) return { key: 'A', label: '划算', color: '#2D9A6B' }
  if (index >= 30) return { key: 'B', label: '还行', color: '#C08A2E' }
  return { key: 'C', label: '要权衡', color: '#B0623C' }
}

module.exports = { score, tier, MONEY, TIME, WILL, YIELD, EVIDENCE }

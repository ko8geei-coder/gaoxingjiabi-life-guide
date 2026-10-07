// build-preview.js —— 把数据 + 评分引擎注入模板，生成 preview.html
// 用法：node build-preview.js
const fs = require('fs')
const path = require('path')

const ROOT = __dirname
const tpl = fs.readFileSync(path.join(ROOT, 'preview-template.html'), 'utf8')
const data = fs.readFileSync(path.join(ROOT, 'data', 'guide.json'), 'utf8')
let scoreSrc = fs.readFileSync(path.join(ROOT, 'app', 'utils', 'score.js'), 'utf8')
const navSrc = fs.readFileSync(path.join(ROOT, 'app', 'data', 'nav.js'), 'utf8')

// 1) 去掉 CommonJS 导出
scoreSrc = scoreSrc.replace(/module\.exports\s*=\s*\{[^}]*\}/, '')
const navClean = navSrc.replace(/module\.exports\s*=\s*\{[^}]*\}/, '')

// 2) 正确包成 IIFE
const scoreIIFE = '(function(){\n' + scoreSrc + '\nreturn { score: score, tier: tier };\n})()'
const navIIFE = '(function(){\n' + navClean + '\nreturn { CATEGORIES, SCENARIOS, CHECKLISTS };\n})()'

// 3) 防注入
const esc = s => s.replace(/<\//g, '<\\/').replace(/<!--/g, '<\\!--')

let out = tpl.replace('__DATA__', esc(data))
out = out.replace('__SCORE__', esc(scoreIIFE))
out = out.replace('__NAV__', esc(navIIFE))

fs.writeFileSync(path.join(ROOT, 'preview.html'), out, 'utf8')

// 4) 自检
const left = out.includes('__DATA__') || out.includes('__SCORE__') || out.includes('__NAV__')
console.log('preview.html bytes:', fs.statSync(path.join(ROOT, 'preview.html')).size)
console.log('placeholder left?', left)
console.log('build ok:', !left)

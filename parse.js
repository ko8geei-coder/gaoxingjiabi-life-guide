const fs = require('fs');
const path = require('path');

const RAW = 'C:/Users/Admin/WorkBuddy/2026-10-07-10-27-17/life-guide/data/raw';
const OUT = 'C:/Users/Admin/WorkBuddy/2026-10-07-10-27-17/life-guide/data/guide.json';

const files = fs.readdirSync(RAW).filter(f => f.endsWith('.md')).sort();

function parseEntry(lines, i) {
  // lines[i] is the entry header "### N. 标题"
  const header = lines[i].replace(/^###\s*/, '').trim();
  const m = header.match(/^(\d+)\.?\s+(.*)$/);
  const num = m ? m[1] : '';
  const title = m ? m[2] : header;

  // collect until next ### or end
  const block = [];
  let j = i + 1;
  while (j < lines.length && !lines[j].startsWith('### ')) { block.push(lines[j]); j++; }
  const text = block.join('\n');

  // cost tags from HTML comment
  let tags = {};
  const tagMatch = text.match(/<!--\s*成本标签:\s*(.*?)\s*-->/);
  if (tagMatch) {
    tagMatch[1].split(/\s+/).forEach(p => {
      const kv = p.split('=');
      if (kv.length === 2) tags[kv[0].trim()] = kv[1].trim();
    });
  }
  const tagStr = tagMatch ? tagMatch[0] : '';

  // 显式标签列表，按行拆分字段（避开 \w 不匹配中文的问题）
  const LABELS = ['成本', '说人话', '收益', '证据等级', '来源', '备注'];
  const lineStarts = [];
  block.forEach((ln, idx) => {
    for (const lab of LABELS) {
      if (new RegExp('^-\\s*' + lab + '[:：]').test(ln)) {
        lineStarts.push({ lab, idx });
        break;
      }
    }
  });
  function field(label) {
    const hit = lineStarts.find(s => s.lab === label);
    if (!hit) return '';
    const start = hit.idx;
    let end = block.length;
    for (let k = lineStarts.indexOf(hit) + 1; k < lineStarts.length; k++) {
      if (lineStarts[k].idx > start) { end = lineStarts[k].idx; break; }
    }
    return block.slice(start, end).join('\n').replace(/^-\s*[^:：]*[:：]\s?/, '').trim();
  }

  const cost = field('成本');
  const plain = field('说人话');
  const benefit = field('收益');
  const level = field('证据等级');
  let source = field('来源');
  let note = field('备注');

  // 来源/备注可能跨多行，做简单裁剪
  source = source.replace(/\n+/g, ' ').trim();
  note = note.replace(/\n+/g, ' ').trim();

  return { num, title, tags, cost, plain, benefit, level, source, note, tagStr };
}

const chapters = [];
for (const f of files) {
  // 统一换行符：上游文件是 CRLF，\r 会让 ^...$ 正则匹配失败、并混进字段文本
  const full = fs.readFileSync(path.join(RAW, f), 'utf8').replace(/\r\n?/g, '\n');
  const lines = full.split('\n');
  // chapter title = first "# xxx"
  let chTitle = '';
  for (const l of lines) { const mm = l.match(/^#\s+(.+)$/); if (mm) { chTitle = mm[1].trim(); break; } }
  // entries start with "### N."
  const entries = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^###\s+\d+\.?\s+/.test(lines[i])) {
      entries.push(parseEntry(lines, i));
    }
  }
  chapters.push({ file: f, title: chTitle, count: entries.length, entries });
}

const total = chapters.reduce((s, c) => s + c.count, 0);
const out = { generated: new Date().toISOString(), chapters, total };
fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
console.log('chapters:', chapters.length, 'total entries:', total);
chapters.forEach(c => console.log(`  ${c.file}  ${c.title}  (${c.count})`));

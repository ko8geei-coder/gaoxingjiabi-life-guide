const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE = 'https://raw.githubusercontent.com/eternity4719/HowToLiveBetter/main/';

// 34 章文件名（与仓库一致）
const files = [
  '01-不要早死.md','02-不要慢慢死.md','03-不要浪费精力.md','04-不要浪费时间.md',
  '05-不要浪费钱.md','06-反面清单.md','07-没钱的时候怎么活.md','08-别把自己搭进去.md',
  '09-普通人容易踩的法律红线.md','10-恋爱和结婚划不划算.md','11-程序员和技术人容易踩的红线.md',
  '12-创业与做生意.md','13-紧急情况.md','14-账号与信息安全.md','15-租房与买房.md',
  '16-得了慢性病之后怎么活.md','17-家里有老人.md','18-养孩子划不划算.md','19-在职离职和工伤.md',
  '20-刚出生的孩子怎么带.md','21-出国旅行与境外安全.md','22-怎么放松.md','23-学什么技能划算.md',
  '24-看病.md','25-人走了以后要办什么.md','26-做一个网站或平台.md','27-怀孕和生产.md',
  '28-别为了外形把身体搞坏.md','29-遭遇重大打击之后.md','30-上学以后的孩子.md','31-十八岁之后有哪几条路.md',
  '32-出国留学.md','33-残疾之后怎么活.md','34-家里的常备药别吃出事.md'
];

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200) { reject(new Error(url + ' -> ' + res.statusCode)); return; }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

(async () => {
  const dir = 'C:/Users/Admin/WorkBuddy/2026-10-07-10-27-17/life-guide/data/raw';
  let ok = 0, fail = 0;
  for (const f of files) {
    const url = BASE + 'book/' + encodeURIComponent(f);
    try {
      const txt = await get(url);
      fs.writeFileSync(path.join(dir, f), txt, 'utf8');
      ok++;
      process.stdout.write(`OK  ${f} (${txt.length})\n`);
    } catch (e) {
      fail++;
      process.stdout.write(`FAIL ${f}: ${e.message}\n`);
    }
  }
  console.log(`\nDONE  ok=${ok} fail=${fail} total=${files.length}`);
})();

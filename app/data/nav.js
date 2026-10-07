// data/nav.js —— 导航聚合：把 34 章归成 6 大主题 + 8 个生活场景
// 借鉴原版「按需查找 / 章节阅读」双视角，但分组与场景为本站自建。

// 34 章的 0-based 索引速查
// 0不要早死 1不要慢慢死 2不要浪费精力 3不要浪费时间 4不要浪费钱 5反面清单
// 6没钱怎么活 7别把自己搭进去 8法律红线 9恋爱结婚 10程序员红线 11创业生意
// 12紧急情况 13账号信息安全 14租房买房 15慢性病 16家里有老人 17养孩子
// 18在职离职工伤 19新生儿 20出国旅行 21怎么放松 22学什么技能 23看病
// 24人走后 25做网站平台 26怀孕生产 27别为外形 28重大打击 29上学后孩子
// 30十八岁后 31出国留学 32残疾后 33常备药

const CATEGORIES = [
  { id: 'health',  name: '身体与健康', icon: '❤', color: '#e6f4ec', chapters: [0, 1, 15, 23, 27, 32, 33], desc: '照顾身体，也照顾长久的自己' },
  { id: 'growth',  name: '时间与成长', icon: '🌱', color: '#eaf2fb', chapters: [2, 3, 21, 22, 28, 30], desc: '把有限的精力用在在意的事上' },
  { id: 'money',   name: '金钱与工作', icon: '💼', color: '#fdf1e3', chapters: [4, 5, 6, 10, 11, 18, 25], desc: '挣得明白，花得有数' },
  { id: 'family',  name: '关系与家庭', icon: '👨‍👩‍👧', color: '#fdeef4', chapters: [9, 16, 17, 19, 24, 26, 29], desc: '一起生活，也学着彼此照顾' },
  { id: 'safety',  name: '安全与权益', icon: '🛡', color: '#e9f1f6', chapters: [7, 8, 12, 13, 31], desc: '给日常多留一份安心' },
  { id: 'daily',   name: '日常与出行', icon: '🏠', color: '#f0eef9', chapters: [14, 20], desc: '住得舒心，走得自在' }
]

// 场景：按「你当下遇到的事」聚合相关章节
const SCENARIOS = [
  { id: 'rent',    name: '租房搬家', icon: '🏠', chapters: [14, 8, 12],  desc: '从选房、签约到退租，先看容易漏掉的事' },
  { id: 'job',     name: '离职找工作', icon: '💼', chapters: [18, 6, 11],   desc: '留好记录、理清手续，再找下一份' },
  { id: 'medical', name: '看病与报销', icon: '❤', chapters: [23, 15, 33],  desc: '找就诊入口、整理资料，了解医保路径' },
  { id: 'baby',    name: '家有新生儿', icon: '👶', chapters: [19, 26, 17],  desc: '从出生办证到照护，把要看的放一起' },
  { id: 'sos',     name: '家庭应急', icon: '🛡', chapters: [12, 33, 16],  desc: '平时备好、临时好找；急救保持免费' },
  { id: 'scam',    name: '账号与防骗', icon: '🔐', chapters: [13, 7, 8],   desc: '先加固常用账号，再看丢手机和骗局' },
  { id: 'study',   name: '学习省力', icon: '🌱', chapters: [2, 3, 22],    desc: '先减少打断，再安排任务和复习' },
  { id: 'travel',  name: '出行准备', icon: '✈', chapters: [20, 31, 14],   desc: '出发前查提醒、留资料，备好求助方式' }
]

// 专题清单（聚合入口）
const CHECKLISTS = [
  { id: 'sosbag',  name: '家里备好一份应急包', icon: '🛡', chapters: [12, 33, 16], desc: '买什么、放哪里、多久检查一次' },
  { id: 'layoff',  name: '被裁之后，先办这几件事', icon: '💼', chapters: [18, 6, 11],  desc: '按顺序处理钱、手续和下一份工作' },
  { id: 'moveout', name: '退租时该争取什么', icon: '🏠', chapters: [14, 8],        desc: '押金、损耗、维修，一步步写清楚' }
]

module.exports = { CATEGORIES, SCENARIOS, CHECKLISTS }

// 微信云开发（CloudBase）配置 —— 用于「用户登录/使用记录」功能
// 【必填】把 envId 换成您的云开发环境 ID（CloudBase 控制台 → 环境设置，形如 xxx-1a2b3c4d）
// 留空则本功能自动跳过，小程序其它功能（阅读/搜索/收藏/AI）不受影响。
module.exports = {
  envId: '',            // 云开发环境 ID
  fnName: 'userTrack'   // 记录用户行为的云函数名（对应 cloudfunctions/userTrack）
}

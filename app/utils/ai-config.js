// AI 后端配置
// 默认走 WorkBuddy 免密钥 LLM（keyless）。填了 proxyUrl 就改走你自己的腾讯云 HY3 代理。
//
// 【安全铁律】CloudBase 给的 JWT 是长期管理员密钥，绝不写进这里、绝不进小程序前端、绝不进聊天框。
// 密钥只放在你服务端运行的代理进程的环境变量里（见 tencent-hy3-proxy/server.js）。
//
// 启用 HY3 的步骤：
//   1) 在你自己的服务端运行：HY3_API_KEY=你的JWT node tencent-hy3-proxy/server.js
//   2) 把下面 proxyUrl 改成那个代理的公网地址，例如 'https://你的域名:3000'
//   3) 微信公众平台 → 服务器域名 → request 合法域名 加上该域名
//   4) 小程序「构建 npm」后预览
// 未填 proxyUrl 时，AI 自动回退到 WorkBuddy 云端 LLM，不影响现有功能。
module.exports = {
  proxyUrl: '' // 例：'https://your-host:3000'（只填你代理的地址，不含密钥）
}

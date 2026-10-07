// 腾讯云 CloudBase AI 网关代理（持有密钥，跑在你自己的服务端；小程序只调这个代理，绝不碰密钥）
//
// 已验证：网关 OpenAI 兼容，聊天端点为 /v1/ai/cloudbase/chat/completions，
// 支持 stream:true（SSE，data: 行 + [DONE]），model 用 hy3。
// 上游并发超限(EXCEED_CONCURRENT_REQUEST_LIMIT，常表现为 429/5xx)会按 MAX_RETRY 退避重试。
//
// 运行（密钥只在环境变量，绝不写进代码 / 绝不进小程序前端）：
//   HY3_API_KEY=你的JWT node server.js
//
// 环境变量：
//   HY3_API_KEY   必填。CloudBase AI 网关 ApiKey（JWT）。这是长期管理员密钥——务必只在服务端，不要进前端。
//   HY3_API_URL   可选。默认已指向你这个环境的聊天端点。
//   HY3_MODEL     可选。默认 hy3。
//   PORT          可选。默认 3000。
//
// 小程序侧：把 ai-config.js 的 proxyUrl 填成这个代理的公网地址（例如 https://你的域名:3000）。
// 浏览器预览侧：把 preview 脚本顶部的 AI_PROXY_URL 填成同一地址即可（已开启 CORS）。

const http = require('http')
const https = require('https')
const { URL } = require('url')

const API_KEY = process.env.HY3_API_KEY
const API_URL = process.env.HY3_API_URL || 'https://jianfei-app-d9g4k50k22d30d637.api.tcloudbasegateway.com/v1/ai/cloudbase/chat/completions'
const MODEL = process.env.HY3_MODEL || 'hy3'
const PORT = process.env.PORT || 3000

// 允许浏览器预览页（含 file:// 的 null 源）跨域调用本代理
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type'
}

const target = new URL(API_URL)

// 自动重试：覆盖上游并发超限(EXCEED_CONCURRENT_REQUEST_LIMIT，常表现为 429/5xx)
// 与瞬时网络错误。达到 2xx 且开始转发后才算成功，否则退避后重试。
const MAX_RETRY = 3

function tryUpstream(payload, attempt, onHead, onChunk, onEnd, onFail) {
  const opts = {
    method: 'POST',
    hostname: target.hostname,
    port: target.port || undefined,
    path: target.pathname + target.search,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + API_KEY,
      'Content-Length': Buffer.byteLength(payload)
    }
  }
  const reqModule = target.protocol === 'http:' ? http : https
  const up = reqModule.request(opts, (upRes) => {
    const code = upRes.statusCode || 0
    if (code >= 200 && code < 300) {
      onHead(upRes)
      upRes.on('data', onChunk)
      upRes.on('end', onEnd)
      return
    }
    // 非 2xx：收集错误体，判断是否可重试
    let buf = ''
    upRes.on('data', (c) => { buf += c })
    upRes.on('end', () => {
      const retryable = code === 429 || code >= 500
      if (retryable && attempt < MAX_RETRY) {
        const wait = Math.min(800 * attempt, 4000)
        console.error('[proxy] upstream ' + code + '，' + wait + 'ms 后重试(' + (attempt + 1) + '/' + MAX_RETRY + ')')
        setTimeout(() => tryUpstream(payload, attempt + 1, onHead, onChunk, onEnd, onFail), wait)
      } else {
        onFail(new Error('upstream ' + code + ': ' + buf.slice(0, 300)))
      }
    })
  })
  up.on('error', (e) => {
    if (attempt < MAX_RETRY) {
      const wait = Math.min(800 * attempt, 4000)
      console.error('[proxy] upstream error ' + e.message + '，' + wait + 'ms 后重试(' + (attempt + 1) + '/' + MAX_RETRY + ')')
      setTimeout(() => tryUpstream(payload, attempt + 1, onHead, onChunk, onEnd, onFail), wait)
    } else {
      onFail(e)
    }
  })
  up.write(payload)
  up.end()
}

function forward(body, res) {
  const payload = JSON.stringify(Object.assign({ model: MODEL, stream: true }, body))
  tryUpstream(payload, 1,
    (upRes) => {
      res.writeHead(200, Object.assign({
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }, CORS))
    },
    (c) => res.write(c),
    () => res.end(),
    (e) => { res.writeHead(502, CORS); res.end('proxy error: ' + e.message) }
  )
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end() }
  if (req.method !== 'POST') { res.writeHead(405, CORS); return res.end('method not allowed') }
  if (!API_KEY) { res.writeHead(500, CORS); return res.end('missing HY3_API_KEY') }
  let data = ''
  req.on('data', (c) => { data += c })
  req.on('end', () => {
    let body
    try { body = JSON.parse(data || '{}') } catch (e) { res.writeHead(400, CORS); return res.end('bad json') }
    try { forward(body, res) } catch (e) { res.writeHead(500, CORS); res.end('error: ' + e.message) }
  })
})

server.listen(PORT, () => console.log('HY3 proxy listening on :' + PORT))

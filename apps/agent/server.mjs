import { createServer } from 'node:http'
import { draftGuest } from './lib/guest-agent.mjs'
import { compileGuest } from './lib/compiler.mjs'

const port = Number(process.env.PORT || 3001)
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:3000'

function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    Vary: 'Origin',
  })
  res.end(JSON.stringify(body))
}

async function readJson(req) {
  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (raw.length > 40_000) throw new Error('request body is too large')
  }
  return JSON.parse(raw || '{}')
}

createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {})
  if (req.method === 'GET' && req.url === '/health') {
    return send(res, 200, {
      status: 'ok',
      aiConfigured: Boolean(process.env.AI_BASE_URL && process.env.AI_API_KEY && process.env.AI_MODEL),
    })
  }
  if (req.method !== 'POST' || !['/generate-guest', '/compile-guest'].includes(req.url)) {
    return send(res, 404, { error: 'Route not found' })
  }

  try {
    const body = await readJson(req)
    const result = req.url === '/compile-guest'
      ? await compileGuest(body.guestSource)
      : await draftGuest(body)
    return send(res, 200, result)
  } catch (error) {
    const status = Number(error?.statusCode || 400)
    return send(res, status, { error: error instanceof Error ? error.message : 'Request failed' })
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Veil agent listening on http://127.0.0.1:${port}`)
})

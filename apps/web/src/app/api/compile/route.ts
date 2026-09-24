export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: Request) {
  const agentUrl = (process.env.AGENT_URL || 'http://127.0.0.1:3001').replace(/\/$/, '')
  if (Number(request.headers.get('content-length') || 0) > 40_000) {
    return Response.json({ error: 'Request body is too large.' }, { status: 413 })
  }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  try {
    const response = await fetch(`${agentUrl}/compile-guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(290_000),
    })
    const payload = await response.json()
    return Response.json(payload, { status: response.status })
  } catch {
    return Response.json(
      { error: 'The local compiler is offline. Start the Veil agent with npm run agent.' },
      { status: 503 },
    )
  }
}

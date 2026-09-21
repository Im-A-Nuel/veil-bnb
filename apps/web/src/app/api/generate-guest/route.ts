export const runtime = 'nodejs'
export const maxDuration = 100

export async function POST(request: Request) {
  const agentUrl = (process.env.AGENT_URL || 'http://127.0.0.1:3001').replace(/\/$/, '')
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  try {
    const response = await fetch(`${agentUrl}/generate-guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(95_000),
    })
    const payload = await response.json()
    return Response.json(payload, { status: response.status })
  } catch {
    return Response.json(
      { error: 'The Veil agent is offline. Start it with npm run agent and configure its AI provider.' },
      { status: 503 },
    )
  }
}

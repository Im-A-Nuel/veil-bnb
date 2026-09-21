const ADDRESS = /^0x[0-9a-fA-F]{40}$/

export function validateRequest(body) {
  if (!body || typeof body !== 'object') throw new Error('JSON body is required')
  const contractAddress = String(body.contractAddress || '').trim()
  const sourceOrDescription = String(body.sourceOrDescription || '').trim()
  if (!ADDRESS.test(contractAddress)) throw new Error('contractAddress must be a 20-byte EVM address')
  if (sourceOrDescription.length < 20) throw new Error('sourceOrDescription is too short to analyze')
  if (sourceOrDescription.length > 30_000) throw new Error('sourceOrDescription exceeds 30,000 characters')
  return { contractAddress, sourceOrDescription }
}

export function buildMessages({ contractAddress, sourceOrDescription }) {
  return [
    {
      role: 'system',
      content: `You are Veil's security rule author. Analyze an EVM contract or invariant and draft a RISC Zero guest for human review.
Return strict JSON with three keys: guestSource (Rust string), riskSummary (plain string), reviewChecklist (array of strings).
The guest must use risc0_zkvm::guest::env, read private witness values first, read public victim [u8;20] and bounty_id u64, assert one precise deterministic exploit condition, compute a salted SHA-256 reveal fingerprint, then commit exactly 96 journal bytes matching Solidity abi.encode(address,uint256,bytes32).
Never claim the draft is audited. Do not use network, time, randomness, filesystem, floating point, or unchecked arithmetic in the guest.`,
    },
    {
      role: 'user',
      content: `Victim contract: ${contractAddress}\n\nContract source or invariant:\n${sourceOrDescription}`,
    },
  ]
}

export function parseAgentResponse(content) {
  const cleaned = String(content || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  const parsed = JSON.parse(cleaned)
  if (typeof parsed.guestSource !== 'string' || !parsed.guestSource.includes('env::commit_slice')) {
    throw new Error('AI response did not contain a compatible RISC Zero guest')
  }
  if (typeof parsed.riskSummary !== 'string' || !Array.isArray(parsed.reviewChecklist)) {
    throw new Error('AI response is missing its review metadata')
  }
  return {
    guestSource: parsed.guestSource,
    riskSummary: parsed.riskSummary,
    reviewChecklist: parsed.reviewChecklist.map(String).slice(0, 8),
  }
}

export async function draftGuest(input, env = process.env) {
  const request = validateRequest(input)
  const baseUrl = String(env.AI_BASE_URL || '').replace(/\/$/, '')
  const apiKey = env.AI_API_KEY
  const model = env.AI_MODEL
  if (!baseUrl || !apiKey || !model) {
    const error = new Error('AI_BASE_URL, AI_API_KEY, and AI_MODEL must be configured')
    error.statusCode = 503
    throw error
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: buildMessages(request),
    }),
    signal: AbortSignal.timeout(90_000),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error?.message || `AI provider returned HTTP ${response.status}`)
  }
  return parseAgentResponse(payload?.choices?.[0]?.message?.content)
}

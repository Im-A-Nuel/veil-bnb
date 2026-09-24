import { isAddress, isHex } from 'viem'
import type { Groth16Proof } from './chain'
import type { AppState } from './data'

const MAX_PROOF_BYTES = 64 * 1024
const MAX_WINDOW_SECONDS = 365 * 24 * 60 * 60
const DECIMAL = /^\d+(\.\d{1,18})?$/
const UINT = /^\d+$/
const ZERO_BYTES32 = `0x${'0'.repeat(64)}`

const byteLength = (s: string) => new TextEncoder().encode(s).length

/** Returns a user-facing error for the create-bounty form, or null when it is valid. */
export function validateCreateForm(f: AppState['form']): string | null {
  const victim = f.addr.trim()
  if (!isAddress(victim)) return 'Victim contract must be a valid 0x address.'

  const title = f.title.trim()
  if (!title) return 'Title is required.'
  if (byteLength(title) > 96) return 'Title is too long (max 96 bytes).'
  if (!f.description.trim()) return 'Description is required.'
  if (byteLength(f.description.trim()) > 1024) return 'Description is too long (max 1024 bytes).'

  const vk = f.vkHash.trim()
  if (!isHex(vk, { strict: true }) || vk.length !== 66 || vk.toLowerCase() === ZERO_BYTES32) {
    return 'vkHash must be a non-zero 0x-prefixed 32-byte hex value.'
  }

  const reward = f.reward.trim()
  if (!DECIMAL.test(reward) || Number(reward) <= 0) return 'Reward must be a positive number.'

  const stake = (f.stake || '0').trim()
  if (!DECIMAL.test(stake)) return 'Hunter stake must be zero or a positive number.'

  if (Number(stake) > 0) {
    const reveal = f.revealWindow.trim()
    const escape = f.escapeWindow.trim()
    if (!UINT.test(reveal) || Number(reveal) <= 0 || Number(reveal) > MAX_WINDOW_SECONDS) {
      return 'Reveal deadline must be a whole number of seconds (1 to 1 year).'
    }
    if (!UINT.test(escape) || Number(escape) <= 0 || Number(escape) > Number(reveal)) {
      return 'Escape window must be a whole number of seconds, no longer than the reveal deadline.'
    }
  }

  if (!f.creatorPubkey) return 'Generate a reveal key first so hunters can send you the exploit.'
  return null
}

const numeric = (v: unknown): v is string => typeof v === 'string' && UINT.test(v)

/** Parses and structurally validates a snarkjs Groth16 proof.json. Throws a user-facing Error. */
export async function parseProofFile(file: File): Promise<Groth16Proof> {
  if (file.size > MAX_PROOF_BYTES) throw new Error('proof.json is too large. Upload the file produced by prove.mjs.')

  let j: Record<string, unknown>
  try {
    j = JSON.parse(await file.text())
  } catch {
    throw new Error('proof.json is not valid JSON.')
  }

  const a = j.pi_a as unknown[] | undefined
  const b = j.pi_b as unknown[][] | undefined
  const c = j.pi_c as unknown[] | undefined
  const s = j.publicSignals as unknown[] | undefined

  const ok =
    Array.isArray(a) && a.length >= 2 && numeric(a[0]) && numeric(a[1]) &&
    Array.isArray(b) && b.length >= 2 && [b[0], b[1]].every(r => Array.isArray(r) && r.length >= 2 && numeric(r[0]) && numeric(r[1])) &&
    Array.isArray(c) && c.length >= 2 && numeric(c[0]) && numeric(c[1]) &&
    Array.isArray(s) && s.length === 5 && s.every(numeric)

  if (!ok) throw new Error('proof.json is missing pi_a, pi_b, pi_c or 5 publicSignals.')

  return {
    pi_a: [a[0], a[1]] as [string, string],
    pi_b: [[b[0][0], b[0][1]], [b[1][0], b[1][1]]] as [[string, string], [string, string]],
    pi_c: [c[0], c[1]] as [string, string],
    publicSignals: s as [string, string, string, string, string],
  }
}

/** Checks the proof is bound to this bounty before spending gas. Returns an error or null. */
export function checkProofBinding(proof: Groth16Proof, bountyId: string, victimFull?: string): string | null {
  const [, , victimSignal, bountySignal] = proof.publicSignals
  if (UINT.test(bountyId) && BigInt(bountySignal) !== BigInt(bountyId)) {
    return `This proof was generated for bounty #${bountySignal}, not #${bountyId}.`
  }
  if (victimFull && isAddress(victimFull) && BigInt(victimSignal) !== BigInt(victimFull)) {
    return 'This proof is bound to a different victim contract.'
  }
  return null
}

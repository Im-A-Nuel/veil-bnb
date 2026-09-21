import test from 'node:test'
import assert from 'node:assert/strict'
import { buildMessages, parseAgentResponse, validateRequest } from '../lib/guest-agent.mjs'
import { toWslPath, validateGuestSource } from '../lib/compiler.mjs'

const address = '0x1111111111111111111111111111111111111111'

test('validates an EVM contract analysis request', () => {
  const request = validateRequest({
    contractAddress: address,
    sourceOrDescription: 'A vault that assumes target cannot have non-trivial factors.',
  })
  assert.equal(request.contractAddress, address)
})

test('rejects non-EVM addresses', () => {
  assert.throws(
    () => validateRequest({ contractAddress: 'CA4F', sourceOrDescription: 'Long enough description for test.' }),
    /20-byte EVM address/,
  )
})

test('prompt requires an ABI-compatible journal', () => {
  const [system] = buildMessages({ contractAddress: address, sourceOrDescription: 'x'.repeat(30) })
  assert.match(system.content, /96 journal bytes/)
  assert.match(system.content, /human review/i)
})

test('parses a compatible structured response', () => {
  const result = parseAgentResponse(JSON.stringify({
    guestSource: 'use risc0_zkvm::guest::env; fn main() { env::commit_slice(&[0u8; 96]); }',
    riskSummary: 'Checks a deterministic multiplication invariant.',
    reviewChecklist: ['Compare the assertion with the deployed bytecode.'],
  }))
  assert.equal(result.reviewChecklist.length, 1)
})

test('rejects drafts that do not commit the canonical journal', () => {
  assert.throws(
    () => parseAgentResponse(JSON.stringify({ guestSource: 'fn main() {}', riskSummary: 'x', reviewChecklist: [] })),
    /compatible RISC Zero guest/,
  )
})

test('validates compiler input and converts Windows paths for WSL', () => {
  const source = `use risc0_zkvm::guest::env;\nfn main() { let journal = [0u8; 96]; env::commit_slice(&journal); }`
  assert.equal(validateGuestSource(source), source)
  assert.equal(toWslPath('F:\\Hack\\bnb\\veil-bnb\\scripts\\compile-guest.sh'), '/mnt/f/Hack/bnb/veil-bnb/scripts/compile-guest.sh')
})

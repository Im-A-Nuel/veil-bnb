/**
 * prove.mjs — Veil ZK Prover Script
 *
 * Usage:
 *   node prove.mjs <a> <b> <victim-address-hex> <bounty-id> [salt-hex-64chars]
 *
 * Outputs:
 *   zk/proof.json   — snarkjs Groth16 proof + publicSignals (public, upload to UI)
 *   zk/reveal.json  — { a, b, salt } (private, do NOT publish until claiming)
 *
 * publicSignals order: [fingerprint_hi, fingerprint_lo, victim_as_uint, bountyId, target]
 */

import { writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import * as snarkjs from 'snarkjs'
import { createHash, randomBytes } from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ZK_DIR    = path.resolve(__dirname, '..')
const WASM_PATH = path.join(ZK_DIR, 'circuits', 'exploit_js', 'exploit.wasm')
const ZKEY_PATH = path.join(ZK_DIR, 'circuit_final.zkey')
const PROOF_OUT  = path.join(ZK_DIR, 'proof.json')
const REVEAL_OUT = path.join(ZK_DIR, 'reveal.json')

function usage() {
  console.error('usage: node prove.mjs <a> <b> <victim-address-hex> <bounty-id> [salt-hex-64chars]')
  process.exit(2)
}

function hexToUint(hex) {
  return BigInt(hex.startsWith('0x') ? hex : '0x' + hex)
}

/**
 * Convert a 32-byte hex salt to 256 bits (MSB first), as required by the
 * circom circuit's salt[256] input.
 */
function hexToBitsMSB(hex) {
  const bytes = Buffer.from(hex, 'hex')
  const bits = []
  for (const byte of bytes) {
    for (let i = 7; i >= 0; i--) {
      bits.push((byte >> i) & 1)
    }
  }
  return bits // 256 bits, MSB first
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length < 4) usage()

  const a       = BigInt(args[0])
  const b       = BigInt(args[1])
  const victimHex = args[2].startsWith('0x') ? args[2].slice(2) : args[2]
  const bountyId  = BigInt(args[3])
  const saltHex   = args[4]
    ? args[4].replace('0x', '').padStart(64, '0')
    : randomBytes(32).toString('hex')

  const target = 1_000_000n

  // Validate factorization constraints (mirrors circuit constraints)
  if (a * b !== target) {
    console.error(`Error: ${a} * ${b} = ${a * b}, expected ${target}`)
    process.exit(1)
  }
  if (a <= 1n || b <= 1n) {
    console.error('Error: a and b must be > 1')
    process.exit(1)
  }
  if (a >= target || b >= target) {
    console.error('Error: a and b must be < target')
    process.exit(1)
  }

  const victimUint = hexToUint(victimHex)

  // Build salt bits (MSB first) for circom salt[256] input
  const saltBits = hexToBitsMSB(saltHex)

  // Compute fingerprint off-circuit for reveal.json verification
  // Preimage layout: pad128(a)[32 bytes] ++ pad128(b)[32 bytes] ++ salt[32 bytes] = 96 bytes
  // pad128(x): 24 zero bytes, then x as big-endian uint64 in bytes 24..31
  const preimage = Buffer.alloc(96)

  // a: put a (64-bit) into bytes 24..31 of the 32-byte a-slot (preimage offset 0..31)
  const aBuf = Buffer.alloc(32)
  aBuf.writeBigUInt64BE(a, 24)
  aBuf.copy(preimage, 0)

  // b: put b (64-bit) into bytes 24..31 of the 32-byte b-slot (preimage offset 32..63)
  const bBuf = Buffer.alloc(32)
  bBuf.writeBigUInt64BE(b, 24)
  bBuf.copy(preimage, 32)

  // salt: bytes 64..95
  Buffer.from(saltHex, 'hex').copy(preimage, 64)

  const fingerprint = createHash('sha256').update(preimage).digest()
  const fpHex = '0x' + fingerprint.toString('hex')

  console.log(`\na           : ${a}`)
  console.log(`b           : ${b}`)
  console.log(`victim      : 0x${victimHex}`)
  console.log(`bountyId    : ${bountyId}`)
  console.log(`salt        : 0x${saltHex}`)
  console.log(`fingerprint : ${fpHex}`)
  console.log('\nGenerating witness and proof (Groth16)...')

  // Circuit input — must match template Exploit() signal names exactly
  const input = {
    a:             a.toString(),
    b:             b.toString(),
    salt:          saltBits,          // array of 256 ints (0 or 1), MSB first
    victim_as_uint: victimUint.toString(),
    bountyId:      bountyId.toString(),
    target:        target.toString(),
  }

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, WASM_PATH, ZKEY_PATH)

  // proof.json: snarkjs format { pi_a, pi_b, pi_c, publicSignals }
  writeFileSync(PROOF_OUT, JSON.stringify({ ...proof, publicSignals }, null, 2))
  // reveal.json: private preimage (do not publish until claiming bounty)
  writeFileSync(REVEAL_OUT, JSON.stringify({ a: a.toString(), b: b.toString(), salt: '0x' + saltHex }, null, 2))

  console.log('\n✓ Done.')
  console.log(`  proof.json  : ${PROOF_OUT}  (public — upload to UI)`)
  console.log(`  reveal.json : ${REVEAL_OUT}  (private — do not publish)`)
  console.log('\npublicSignals:')
  publicSignals.forEach((s, i) => console.log(`  [${i}] ${s}`))
}

main().catch(e => { console.error(e); process.exit(1) })

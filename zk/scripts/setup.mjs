/**
 * setup.mjs — Veil ZK Setup Script
 *
 * Steps:
 *   1. Download Powers of Tau (Hermez ceremony, 15)
 *   2. Compile exploit.circom → .r1cs + .wasm
 *   3. Generate circuit_0.zkey (phase 1)
 *   4. Contribute beacon entropy → circuit_final.zkey
 *   5. Export verification_key.json + Groth16Verifier.sol
 *
 * Usage:
 *   cd zk
 *   node scripts/setup.mjs
 *
 * Prerequisites:
 *   - circom binary in PATH (try `circom --version`)
 *   - Node.js >= 20
 *   - npm install  (snarkjs, circomlib etc.)
 */

import { execSync } from 'child_process'
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs'
import { createWriteStream } from 'fs'
import { get } from 'https'
import path from 'path'
import { fileURLToPath } from 'url'
import * as snarkjs from 'snarkjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ZK_DIR       = path.resolve(__dirname, '..')
const CIRCUITS_DIR = path.join(ZK_DIR, 'circuits')
const CONTRACTS_SRC = path.resolve(ZK_DIR, '..', 'contracts', 'src')

const PTAU_URL    = 'https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_15.ptau'
const PTAU_PATH   = path.join(ZK_DIR, 'powersOfTau28_hez_final_15.ptau')
const CIRCUIT_SRC = path.join(CIRCUITS_DIR, 'exploit.circom')
const R1CS_PATH   = path.join(CIRCUITS_DIR, 'exploit.r1cs')
const WASM_DIR    = path.join(CIRCUITS_DIR, 'exploit_js')
const ZKEY_0      = path.join(ZK_DIR, 'circuit_0.zkey')
const ZKEY_FINAL  = path.join(ZK_DIR, 'circuit_final.zkey')
const VK_PATH     = path.join(ZK_DIR, 'verification_key.json')
const VERIFIER_OUT = path.join(CONTRACTS_SRC, 'Groth16Verifier.sol')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Download a URL to dest, following HTTP 301/302 redirects. */
function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (existsSync(dest)) {
      console.log(`  already exists: ${dest}`)
      resolve()
      return
    }
    console.log(`  downloading ${url} ...`)
    const file = createWriteStream(dest)
    const req = get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close()
        // Remove the incomplete file before re-attempting
        try { unlinkSync(dest) } catch (_) {}
        download(res.headers.location, dest).then(resolve).catch(reject)
        return
      }
      if (res.statusCode !== 200) {
        file.close()
        reject(new Error(`HTTP ${res.statusCode} for ${url}`))
        return
      }
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
      file.on('error', err => { file.close(); reject(err) })
    })
    req.on('error', err => { file.close(); reject(err) })
  })
}

/**
 * Try to run the circom compiler.
 * On Windows the binary may be named "circom" or "circom.exe".
 */
function compileCircuit() {
  // Prefer plain `circom` (works if it's on PATH as circom or circom.exe).
  // Fall back to `circom.exe` explicit call.
  const circomCmds = ['circom', 'circom.exe']
  const outFlag = `-o "${CIRCUITS_DIR}"`
  const srcFlag = `"${CIRCUIT_SRC}"`

  for (const bin of circomCmds) {
    try {
      const cmd = `${bin} ${srcFlag} --r1cs --wasm --sym ${outFlag}`
      console.log(`  $ ${cmd}`)
      execSync(cmd, { stdio: 'inherit' })
      return // success
    } catch (err) {
      // If the binary wasn't found at all, try the next one.
      // If the circuit itself had errors, propagate immediately.
      const notFound =
        err.message.includes('ENOENT') ||
        err.message.includes('not found') ||
        err.message.includes('not recognized') ||
        err.message.includes('cannot find') ||
        (err.status === null && err.signal === null)
      if (!notFound) {
        throw err
      }
      console.log(`  (${bin} not found, trying next...)`)
    }
  }
  throw new Error(
    'circom binary not found. Install from https://github.com/iden3/circom/releases ' +
    'and ensure it is in your PATH.'
  )
}

/**
 * Fix the pragma solidity version in a Solidity file if snarkjs generated
 * an older version (< 0.8.20). Writes the corrected content back to disk.
 */
function fixSolidityPragma(filePath, code) {
  // Match e.g. pragma solidity ^0.6.11; or pragma solidity >=0.7.0 <0.8.0;
  const fixed = code.replace(
    /pragma solidity\s+[^;]+;/,
    'pragma solidity ^0.8.20;'
  )
  if (fixed !== code) {
    console.log('  (updated pragma solidity → ^0.8.20)')
  }
  writeFileSync(filePath, fixed, 'utf8')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('\n=== Veil ZK Setup ===\n')

  // Ensure output directories exist
  if (!existsSync(CIRCUITS_DIR)) mkdirSync(CIRCUITS_DIR, { recursive: true })
  if (!existsSync(CONTRACTS_SRC)) mkdirSync(CONTRACTS_SRC, { recursive: true })

  // ------------------------------------------------------------------
  // Step 1: Download Powers of Tau (Hermez ceremony, 2^15)
  // ------------------------------------------------------------------
  console.log('[1/5] Download Powers of Tau (Hermez ceremony, 2^15)...')
  await download(PTAU_URL, PTAU_PATH)
  console.log('  OK\n')

  // ------------------------------------------------------------------
  // Step 2: Compile circuit (produces .r1cs + exploit_js/exploit.wasm)
  // ------------------------------------------------------------------
  console.log('[2/5] Compile circuit...')
  compileCircuit()
  if (!existsSync(R1CS_PATH)) {
    throw new Error(`Expected R1CS not produced: ${R1CS_PATH}`)
  }
  if (!existsSync(path.join(WASM_DIR, 'exploit.wasm'))) {
    throw new Error(`Expected WASM not produced: ${path.join(WASM_DIR, 'exploit.wasm')}`)
  }
  console.log('  OK\n')

  // ------------------------------------------------------------------
  // Step 3: Generate zkey phase 1 (setup)
  // ------------------------------------------------------------------
  console.log('[3/5] Generate zkey (phase 1)...')
  await snarkjs.zKey.newZKey(R1CS_PATH, PTAU_PATH, ZKEY_0)
  console.log('  OK\n')

  // ------------------------------------------------------------------
  // Step 4: Contribute beacon entropy → final zkey
  // ------------------------------------------------------------------
  console.log('[4/5] Contribute beacon entropy...')
  await snarkjs.zKey.beacon(
    ZKEY_0,
    ZKEY_FINAL,
    'Veil BNB Hackathon 2026',
    '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20',
    10
  )
  console.log('  OK\n')

  // ------------------------------------------------------------------
  // Step 5: Export verification key + Solidity verifier
  // ------------------------------------------------------------------
  console.log('[5/5] Export verification key and Solidity verifier...')

  // 5a. Verification key JSON
  const vk = await snarkjs.zKey.exportVerificationKey(ZKEY_FINAL)
  writeFileSync(VK_PATH, JSON.stringify(vk, null, 2), 'utf8')
  console.log(`  verification_key.json written: ${VK_PATH}`)

  // 5b. Groth16 Solidity verifier
  //     snarkjs 0.7.x: exportSolidityVerifier(zkeyPath) → Promise<string>
  const verifierCode = await snarkjs.zKey.exportSolidityVerifier(ZKEY_FINAL)

  // Ensure contracts/src directory exists before writing
  if (!existsSync(CONTRACTS_SRC)) mkdirSync(CONTRACTS_SRC, { recursive: true })

  // Fix pragma version if needed (snarkjs may emit ^0.6.x)
  fixSolidityPragma(VERIFIER_OUT, verifierCode)
  console.log(`  Groth16Verifier.sol written:   ${VERIFIER_OUT}\n`)

  // ------------------------------------------------------------------
  // Done
  // ------------------------------------------------------------------
  console.log('✓ Setup complete.')
  console.log(`  zk/circuit_final.zkey       : ${ZKEY_FINAL}`)
  console.log(`  zk/verification_key.json    : ${VK_PATH}`)
  console.log(`  contracts/src/Groth16Verifier.sol : ${VERIFIER_OUT}`)
  console.log('\nNext: node scripts/prove.mjs 1000 1000 0x<victim> 0')
}

main().catch(e => {
  console.error('\n[ERROR]', e.message || e)
  process.exit(1)
})

# Circom + SnarkJS Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ganti RISC Zero zkVM dengan Circom + SnarkJS Groth16 sehingga verifier Solidity bisa di-deploy langsung ke BSC Testnet tanpa dependency eksternal.

**Architecture:** Circuit Circom menggantikan guest Rust — logic exploit (a×b=target, fingerprint sha256) di-encode sebagai constraints. SnarkJS Node.js menggantikan host Rust untuk generate proof. `Groth16Verifier.sol` di-generate otomatis dari circuit lalu di-deploy ke BSC. `VeilBountyRegistry` diupdate untuk memanggil interface verifier baru. Web app hanya berubah pada format `proof.json` yang di-parse.

**Tech Stack:** Circom 2.x (circuit compiler), snarkjs 0.7.x (prover + setup), circomlib (sha256 + comparators), Node.js 20+, Foundry (deploy), viem (web3 client)

**Spec:** `docs/superpowers/specs/2026-09-23-circom-migration-design.md`

## Global Constraints

- Node.js >= 20 (untuk snarkjs)
- circom binary >= 2.1.9 (Windows native, download dari GitHub releases)
- snarkjs >= 0.7.0
- Solidity ^0.8.20 (sama seperti contracts yang ada)
- Trusted setup: `powersOfTau28_hez_final_15.ptau` dari Hermez ceremony
- `publicSignals[5]` order: `[fingerprint_hi, fingerprint_lo, victim_as_uint, bountyId, target]`
- `vkHash = keccak256(abi.encode(bytes(verification_key_json)))` — menggantikan `imageId`
- File `*.ptau`, `*.zkey`, `zk/proof.json`, `zk/reveal.json` TIDAK di-commit
- Windows native — tidak butuh WSL
- Target bounty demo: reward `0.01 tBNB`, `target = 1_000_000`, witness `a=1000, b=1000`

---

## File Map

```
DIBUAT:
zk/
  circuits/
    exploit.circom          ← circuit utama
    sha256_3chunks.circom   ← helper sha256 untuk 3 input chunks
  scripts/
    setup.mjs               ← compile circuit + generate zkey + export verifier
    prove.mjs               ← CLI prover: generate proof.json + reveal.json
  package.json              ← snarkjs, circomlibjs dependencies

contracts/src/
  interfaces/
    IGroth16Verifier.sol    ← interface baru (ganti IRiscZeroVerifier)
  Groth16Verifier.sol       ← di-generate setup.mjs, copy manual
  mocks/
    MockGroth16Verifier.sol ← untuk local dev + Foundry tests

DIMODIFIKASI:
contracts/src/
  VeilBountyRegistry.sol    ← ganti verifier type + claim() signature
contracts/script/
  DeployTestnet.s.sol       ← ganti MockRiscZeroVerifier → MockGroth16Verifier
  DeployLocal.s.sol         ← ganti MockRiscZeroVerifier → MockGroth16Verifier
contracts/test/
  VeilBountyRegistry.t.sol  ← update test untuk interface baru
apps/web/src/lib/
  chain.ts                  ← update claim() + ABI untuk proof format baru
.gitignore                  ← tambah *.ptau, *.zkey entries

DIHAPUS:
zk/host/, zk/methods/       ← seluruh Rust code
contracts/src/interfaces/IRiscZeroVerifier.sol
contracts/src/mocks/MockRiscZeroVerifier.sol
```

---

## Task 1: Scaffold `zk/` baru — circuit skeleton + package.json

**Files:**
- Create: `zk/circuits/exploit.circom`
- Create: `zk/circuits/sha256_3chunks.circom`
- Create: `zk/package.json`
- Modify: `.gitignore`

**Interfaces:**
- Produces: circuit skeleton yang bisa di-compile circom (meski belum complete)

- [ ] **Step 1: Buat `zk/package.json`**

```json
{
  "name": "veil-zk",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "setup": "node scripts/setup.mjs",
    "prove": "node scripts/prove.mjs"
  },
  "dependencies": {
    "snarkjs": "^0.7.5",
    "circomlibjs": "^0.1.7"
  }
}
```

- [ ] **Step 2: Install dependencies**

```powershell
cd zk
npm install
```

Expected: `node_modules/snarkjs` dan `node_modules/circomlibjs` terinstall.

- [ ] **Step 3: Buat `zk/circuits/sha256_3chunks.circom`**

Circomlib hanya punya Sha256_2 (dua 256-bit chunks). Kita butuh sha256 dari tiga chunks: pad128(a) ++ pad128(b) ++ salt. Template ini meng-chain dua Sha256_2 secara internal:

```circom
pragma circom 2.1.9;

include "../node_modules/circomlib/circuits/sha256/sha256.circom";

// Compute sha256 of 768 bits = pad128(a)[256] ++ pad128(b)[256] ++ salt[256]
// where pad128(x) = 128 zero bits ++ x as 128-bit big-endian
template Sha256_3x256() {
    signal input a_bits[256];  // pad128(a): bits[0..127]=0, bits[128..255]=a
    signal input b_bits[256];  // pad128(b): bits[0..127]=0, bits[128..255]=b
    signal input salt[256];    // 256 random bits

    signal output out[256];    // sha256 digest bits

    component sha = Sha256(768);

    for (var i = 0; i < 256; i++) {
        sha.in[i]       <== a_bits[i];
        sha.in[256 + i] <== b_bits[i];
        sha.in[512 + i] <== salt[i];
    }

    for (var i = 0; i < 256; i++) {
        out[i] <== sha.out[i];
    }
}
```

- [ ] **Step 4: Buat `zk/circuits/exploit.circom`**

```circom
pragma circom 2.1.9;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/bitify.circom";
include "./sha256_3chunks.circom";

// Proves: a * b == target, a > 1, b > 1, a < target, b < target
// Commits fingerprint = sha256(pad128(a) ++ pad128(b) ++ salt) publicly
template Exploit() {
    // Private inputs
    signal input a;       // private: factor a (max 64-bit)
    signal input b;       // private: factor b (max 64-bit)
    signal input salt[256]; // private: 256 random bits

    // Public inputs
    signal input victim_as_uint; // address victim cast ke uint (160-bit)
    signal input bountyId;       // uint64
    signal input target;         // 1_000_000 — public agar circuit reusable

    // Public outputs (juga public inputs di snarkjs)
    signal output fingerprint_hi; // sha256 digest high 128 bits
    signal output fingerprint_lo; // sha256 digest low 128 bits

    // --- Constraint 1: a * b == target ---
    signal ab;
    ab <== a * b;
    ab === target;

    // --- Constraints 2-5: non-trivial factorization ---
    // a > 1: 1 < a  →  a - 1 > 0  →  use GreaterThan
    component gtA1 = GreaterThan(64);
    gtA1.in[0] <== a;
    gtA1.in[1] <== 1;
    gtA1.out === 1;

    component gtB1 = GreaterThan(64);
    gtB1.in[0] <== b;
    gtB1.in[1] <== 1;
    gtB1.out === 1;

    // a < target
    component ltA = LessThan(64);
    ltA.in[0] <== a;
    ltA.in[1] <== target;
    ltA.out === 1;

    // b < target
    component ltB = LessThan(64);
    ltB.in[0] <== b;
    ltB.in[1] <== target;
    ltB.out === 1;

    // --- Constraint 6: fingerprint = sha256(pad128(a) ++ pad128(b) ++ salt) ---
    // Convert a and b to bits (128-bit, big-endian, zero-padded to 256 bits)
    component aBits = Num2Bits(64);
    aBits.in <== a;
    component bBits = Num2Bits(64);
    bBits.in <== b;

    // pad128(a): 128 zero bits then 64-bit a reversed to big-endian in 128 bits
    // Num2Bits gives LSB first; sha256 expects MSB first
    // We place a in bits[192..255] of the 256-bit chunk (upper 128 bits, MSB first)
    signal a_bits[256];
    signal b_bits[256];
    for (var i = 0; i < 192; i++) {
        a_bits[i] <== 0;
        b_bits[i] <== 0;
    }
    // Num2Bits is LSB-first; reverse to MSB-first for the 64 significant bits
    for (var i = 0; i < 64; i++) {
        a_bits[192 + i] <== aBits.out[63 - i];
        b_bits[192 + i] <== bBits.out[63 - i];
    }

    component sha = Sha256_3x256();
    for (var i = 0; i < 256; i++) {
        sha.a_bits[i] <== a_bits[i];
        sha.b_bits[i] <== b_bits[i];
        sha.salt[i]   <== salt[i];
    }

    // Convert 256-bit digest to two 128-bit uints (hi/lo)
    component hiNum = Bits2Num(128);
    component loNum = Bits2Num(128);
    for (var i = 0; i < 128; i++) {
        hiNum.in[i] <== sha.out[127 - i];  // MSB first
        loNum.in[i] <== sha.out[255 - i];
    }

    fingerprint_hi <== hiNum.out;
    fingerprint_lo <== loNum.out;

    // Bind victim and bountyId (prevents proof replay to other bounties)
    // These are constrained by being public inputs — verifier checks them on-chain
    signal victim_check;
    victim_check <== victim_as_uint;
    signal bounty_check;
    bounty_check <== bountyId;
}

component main {public [victim_as_uint, bountyId, target]} = Exploit();
```

- [ ] **Step 5: Update `.gitignore` — tambah ZK artifacts**

Buka `.gitignore` di root repo, tambahkan di bawah baris `zk/reveal.json` yang sudah ada:

```
*.ptau
*.zkey
zk/circuits/*.r1cs
zk/circuits/*.sym
zk/circuits/*.wasm
zk/circuits/*_js/
zk/verification_key.json
```

> Catatan: `verification_key.json` opsional di-commit — dalam plan ini tidak di-commit karena di-generate ulang saat setup. Ubah jika ingin commit.

- [ ] **Step 6: Commit scaffold**

```powershell
git add zk/package.json zk/package-lock.json zk/circuits/exploit.circom zk/circuits/sha256_3chunks.circom .gitignore
git commit -m "feat(zk): add Circom circuit skeleton and snarkjs dependencies"
```

---

## Task 2: Script setup — compile circuit, generate zkey, export Groth16Verifier.sol

**Files:**
- Create: `zk/scripts/setup.mjs`

**Interfaces:**
- Consumes: `zk/circuits/exploit.circom`, `zk/node_modules/circomlib`
- Produces:
  - `zk/circuits/exploit.r1cs` (constraints)
  - `zk/circuits/exploit_js/exploit.wasm` (witness generator)
  - `zk/circuit_final.zkey` (proving key)
  - `zk/verification_key.json` (verification key)
  - `contracts/src/Groth16Verifier.sol` (Solidity verifier, di-copy otomatis)

- [ ] **Step 1: Download circom binary (Windows)**

Buka browser, download binary dari:
```
https://github.com/iden3/circom/releases/latest
```
Pilih `circom-windows-amd64.exe`. Rename jadi `circom.exe`, taruh di folder yang ada di `PATH` (misalnya `C:\Windows\System32\` atau buat folder `C:\tools\` dan tambahkan ke PATH).

Verifikasi:
```powershell
circom --version
```
Expected: `circom compiler 2.1.x`

- [ ] **Step 2: Buat `zk/scripts/setup.mjs`**

```javascript
import { execSync } from 'child_process'
import { existsSync, mkdirSync, copyFileSync, writeFileSync } from 'fs'
import { createWriteStream } from 'fs'
import { get } from 'https'
import path from 'path'
import { fileURLToPath } from 'url'
import snarkjs from 'snarkjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ZK_DIR = path.resolve(__dirname, '..')
const CIRCUITS_DIR = path.join(ZK_DIR, 'circuits')
const CONTRACTS_SRC = path.resolve(ZK_DIR, '..', 'contracts', 'src')

const PTAU_URL = 'https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_15.ptau'
const PTAU_PATH = path.join(ZK_DIR, 'powersOfTau28_hez_final_15.ptau')
const R1CS_PATH = path.join(CIRCUITS_DIR, 'exploit.r1cs')
const WASM_DIR  = path.join(CIRCUITS_DIR, 'exploit_js')
const ZKEY_0    = path.join(ZK_DIR, 'circuit_0.zkey')
const ZKEY_FINAL = path.join(ZK_DIR, 'circuit_final.zkey')
const VK_PATH   = path.join(ZK_DIR, 'verification_key.json')
const VERIFIER_OUT = path.join(CONTRACTS_SRC, 'Groth16Verifier.sol')

function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (existsSync(dest)) { console.log(`  already exists: ${dest}`); resolve(); return }
    console.log(`  downloading ${url} ...`)
    const file = createWriteStream(dest)
    get(url, res => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        file.close()
        download(res.headers.location, dest).then(resolve).catch(reject)
        return
      }
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
    }).on('error', err => { file.close(); reject(err) })
  })
}

async function main() {
  console.log('\n=== Veil ZK Setup ===\n')

  // 1. Download ptau
  console.log('[1/5] Download Powers of Tau (Hermez ceremony)...')
  await download(PTAU_URL, PTAU_PATH)

  // 2. Compile circuit
  console.log('[2/5] Compile circuit...')
  execSync(
    `circom ${path.join(CIRCUITS_DIR, 'exploit.circom')} --r1cs --wasm --sym -o ${CIRCUITS_DIR}`,
    { stdio: 'inherit' }
  )

  // 3. Generate zkey phase 1
  console.log('[3/5] Generate zkey (phase 1)...')
  await snarkjs.zKey.newZKey(R1CS_PATH, PTAU_PATH, ZKEY_0)

  // 4. Contribute randomness (beacon — deterministic for reproducibility in demo)
  console.log('[4/5] Contribute beacon entropy...')
  await snarkjs.zKey.beacon(
    ZKEY_0, ZKEY_FINAL,
    'Veil BNB Hackathon 2026',
    '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20',
    10
  )

  // 5. Export verification key + Solidity verifier
  console.log('[5/5] Export verification key and Solidity verifier...')
  const vk = await snarkjs.zKey.exportVerificationKey(ZKEY_FINAL)
  writeFileSync(VK_PATH, JSON.stringify(vk, null, 2))

  const verifierCode = await snarkjs.zKey.exportSolidityVerifier(ZKEY_FINAL)
  writeFileSync(VERIFIER_OUT, verifierCode)

  console.log('\n✓ Setup complete.')
  console.log(`  verification_key.json : ${VK_PATH}`)
  console.log(`  Groth16Verifier.sol   : ${VERIFIER_OUT}`)
  console.log(`\nNext: node scripts/prove.mjs 1000 1000 0x<victim> 0`)
}

main().catch(e => { console.error(e); process.exit(1) })
```

- [ ] **Step 3: Jalankan setup**

```powershell
cd zk
node scripts/setup.mjs
```

Expected output:
```
=== Veil ZK Setup ===
[1/5] Download Powers of Tau (Hermez ceremony)...
[2/5] Compile circuit...
[3/5] Generate zkey (phase 1)...
[4/5] Contribute beacon entropy...
[5/5] Export verification key and Solidity verifier...
✓ Setup complete.
```

Verifikasi file yang dihasilkan:
```powershell
ls zk/circuits/exploit_js/
# Expected: exploit.wasm, generate_witness.js, witness_calculator.js

ls contracts/src/Groth16Verifier.sol
# Expected: file ada, ukuran > 5KB
```

- [ ] **Step 4: Cek Solidity verifier yang di-generate**

```powershell
Select-String -Path contracts/src/Groth16Verifier.sol -Pattern "pragma solidity"
Select-String -Path contracts/src/Groth16Verifier.sol -Pattern "function verifyProof"
```

Expected: ada baris `pragma solidity` dan `function verifyProof(uint[2]`.

> snarkjs menggunakan nama parameter `a, b, c, input` untuk verifyProof. Ini normal — interface kita menyesuaikan.

- [ ] **Step 5: Commit**

```powershell
git add zk/scripts/setup.mjs contracts/src/Groth16Verifier.sol
git commit -m "feat(zk): add setup script and generated Groth16Verifier.sol"
```

---

## Task 3: Script prover — `zk/scripts/prove.mjs`

**Files:**
- Create: `zk/scripts/prove.mjs`

**Interfaces:**
- Consumes: `zk/circuits/exploit_js/exploit.wasm`, `zk/circuit_final.zkey`
- Produces:
  - `zk/proof.json` — `{ pi_a: string[], pi_b: string[][], pi_c: string[], publicSignals: string[] }`
  - `zk/reveal.json` — `{ a: string, b: string, salt: string }`

- [ ] **Step 1: Buat `zk/scripts/prove.mjs`**

```javascript
import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import snarkjs from 'snarkjs'
import { buildBabyjub, buildPoseidon } from 'circomlibjs'
import { createHash, randomBytes } from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ZK_DIR = path.resolve(__dirname, '..')
const WASM_PATH  = path.join(ZK_DIR, 'circuits', 'exploit_js', 'exploit.wasm')
const ZKEY_PATH  = path.join(ZK_DIR, 'circuit_final.zkey')
const PROOF_OUT  = path.join(ZK_DIR, 'proof.json')
const REVEAL_OUT = path.join(ZK_DIR, 'reveal.json')

function usage() {
  console.error('usage: node prove.mjs <a> <b> <victim-address-hex> <bounty-id> [salt-hex-64chars]')
  process.exit(2)
}

function hexToUint(hex) {
  return BigInt(hex.startsWith('0x') ? hex : '0x' + hex)
}

function numToBitsLE(n, bits) {
  const result = []
  for (let i = 0; i < bits; i++) {
    result.push(Number((BigInt(n) >> BigInt(i)) & 1n))
  }
  return result
}

function saltToBits(saltHex) {
  const bytes = Buffer.from(saltHex.replace('0x', ''), 'hex')
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

  const a = BigInt(args[0])
  const b = BigInt(args[1])
  const victimHex = args[2].startsWith('0x') ? args[2].slice(2) : args[2]
  const bountyId = BigInt(args[3])
  const saltHex = args[4]
    ? args[4].replace('0x', '').padStart(64, '0')
    : randomBytes(32).toString('hex')

  const target = 1_000_000n

  // Validate
  if (a * b !== target) { console.error(`Error: ${a} * ${b} = ${a*b}, expected ${target}`); process.exit(1) }
  if (a <= 1n || b <= 1n) { console.error('Error: a and b must be > 1'); process.exit(1) }
  if (a >= target || b >= target) { console.error('Error: a and b must be < target'); process.exit(1) }

  const victimUint = hexToUint(victimHex)

  // Build salt bits (MSB first for circom sha256)
  const saltBits = saltToBits(saltHex)

  // Compute expected fingerprint off-circuit (for reveal.json)
  // sha256( pad128(a)[32 bytes] ++ pad128(b)[32 bytes] ++ salt[32 bytes] ) = 96 bytes total
  // pad128(x): 16 zero bytes then x as 16-byte big-endian (uint128 big-endian)
  const preimage = Buffer.alloc(96)
  const aBuf = Buffer.alloc(32); aBuf.writeBigUInt64BE(a, 24)  // last 8 bytes of 32
  const bBuf = Buffer.alloc(32); bBuf.writeBigUInt64BE(b, 24)
  const saltBuf = Buffer.from(saltHex, 'hex')
  aBuf.copy(preimage, 0)
  bBuf.copy(preimage, 32)
  saltBuf.copy(preimage, 64)
  const fingerprint = createHash('sha256').update(preimage).digest()
  const fpHex = '0x' + fingerprint.toString('hex')

  console.log(`\na           : ${a}`)
  console.log(`b           : ${b}`)
  console.log(`victim      : 0x${victimHex}`)
  console.log(`bountyId    : ${bountyId}`)
  console.log(`salt        : 0x${saltHex}`)
  console.log(`fingerprint : ${fpHex}`)
  console.log('\nGenerating witness and proof (Groth16)...')

  const input = {
    a: a.toString(),
    b: b.toString(),
    salt: saltBits,
    victim_as_uint: victimUint.toString(),
    bountyId: bountyId.toString(),
    target: target.toString(),
  }

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, WASM_PATH, ZKEY_PATH)

  writeFileSync(PROOF_OUT, JSON.stringify({ ...proof, publicSignals }, null, 2))
  writeFileSync(REVEAL_OUT, JSON.stringify({ a: a.toString(), b: b.toString(), salt: '0x' + saltHex }, null, 2))

  console.log('\n✓ Done.')
  console.log(`  proof.json  : ${PROOF_OUT}  (public — upload to UI)`)
  console.log(`  reveal.json : ${REVEAL_OUT}  (private — do not publish)`)
  console.log(`\npublicSignals:`)
  publicSignals.forEach((s, i) => console.log(`  [${i}] ${s}`))
}

main().catch(e => { console.error(e); process.exit(1) })
```

- [ ] **Step 2: Test run prover dengan witness valid**

```powershell
cd zk
node scripts/prove.mjs 1000 1000 0x0000000000000000000000000000000000000001 0
```

Expected:
```
a           : 1000
b           : 1000
victim      : 0x0000000000000000000000000000000000000001
bountyId    : 0
salt        : 0x<random 64 hex chars>
fingerprint : 0x<64 hex chars>

Generating witness and proof (Groth16)...

✓ Done.
  proof.json  : ...zk/proof.json
  reveal.json : ...zk/reveal.json

publicSignals:
  [0] <fingerprint_hi>
  [1] <fingerprint_lo>
  [2] 1  (victim_as_uint)
  [3] 0  (bountyId)
  [4] 1000000  (target)
```

- [ ] **Step 3: Verifikasi proof secara lokal**

```powershell
node -e "
import('snarkjs').then(async ({default: snarkjs}) => {
  const { readFileSync } = await import('fs')
  const vk = JSON.parse(readFileSync('verification_key.json'))
  const { proof, publicSignals } = JSON.parse(readFileSync('proof.json'))
  const ok = await snarkjs.groth16.verify(vk, publicSignals, proof)
  console.log('Proof valid:', ok)
})
"
```

Expected: `Proof valid: true`

- [ ] **Step 4: Test reject witness invalid**

```powershell
node scripts/prove.mjs 2 3 0x0000000000000000000000000000000000000001 0
```

Expected: `Error: 2 * 3 = 6, expected 1000000` (exit code 1)

- [ ] **Step 5: Commit**

```powershell
git add zk/scripts/prove.mjs
git commit -m "feat(zk): add snarkjs prover script with CLI interface"
```

---

## Task 4: Smart contract — `IGroth16Verifier.sol` + `MockGroth16Verifier.sol`

**Files:**
- Create: `contracts/src/interfaces/IGroth16Verifier.sol`
- Create: `contracts/src/mocks/MockGroth16Verifier.sol`
- Delete: `contracts/src/interfaces/IRiscZeroVerifier.sol`
- Delete: `contracts/src/mocks/MockRiscZeroVerifier.sol`

**Interfaces:**
- Produces:
  - `IGroth16Verifier` interface dengan `verifyProof(uint[2],uint[2][2],uint[2],uint[5]) returns (bool)`
  - `MockGroth16Verifier` dengan `setAcceptAll(bool)`

- [ ] **Step 1: Buat `contracts/src/interfaces/IGroth16Verifier.sol`**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Interface untuk Groth16 verifier yang di-generate snarkjs.
/// @dev Signature verifyProof harus cocok persis dengan output snarkjs exportSolidityVerifier.
interface IGroth16Verifier {
    function verifyProof(
        uint[2] calldata pi_a,
        uint[2][2] calldata pi_b,
        uint[2] calldata pi_c,
        uint[5] calldata pubSignals
    ) external view returns (bool);
}
```

- [ ] **Step 2: Verifikasi signature cocok dengan Groth16Verifier.sol yang di-generate**

```powershell
Select-String -Path contracts/src/Groth16Verifier.sol -Pattern "function verifyProof"
```

Expected output mengandung: `function verifyProof(uint[2] memory a, uint[2][2] memory b, uint[2] memory c, uint[5] memory input)`

> snarkjs menggunakan `memory` bukan `calldata` dan nama `a,b,c,input`. Kita wrap lewat registry — tidak perlu match persis, cukup cast-compatible. Jika signature berbeda, sesuaikan interface di atas.

- [ ] **Step 3: Buat `contracts/src/mocks/MockGroth16Verifier.sol`**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IGroth16Verifier } from "../interfaces/IGroth16Verifier.sol";

contract MockGroth16Verifier is IGroth16Verifier {
    bool public acceptAll;

    function setAcceptAll(bool value) external {
        acceptAll = value;
    }

    function verifyProof(
        uint[2] calldata,
        uint[2][2] calldata,
        uint[2] calldata,
        uint[5] calldata
    ) external view returns (bool) {
        return acceptAll;
    }
}
```

- [ ] **Step 4: Hapus file RISC Zero lama**

```powershell
Remove-Item contracts/src/interfaces/IRiscZeroVerifier.sol
Remove-Item contracts/src/mocks/MockRiscZeroVerifier.sol
```

- [ ] **Step 5: Commit**

```powershell
git add contracts/src/interfaces/IGroth16Verifier.sol contracts/src/mocks/MockGroth16Verifier.sol
git add contracts/src/Groth16Verifier.sol
git rm contracts/src/interfaces/IRiscZeroVerifier.sol contracts/src/mocks/MockRiscZeroVerifier.sol
git commit -m "feat(contracts): add IGroth16Verifier interface and MockGroth16Verifier"
```

---

## Task 5: Update `VeilBountyRegistry.sol` — ganti RISC Zero ke Groth16

**Files:**
- Modify: `contracts/src/VeilBountyRegistry.sol`

**Interfaces:**
- Consumes: `IGroth16Verifier` dari Task 4
- Produces: `claim(uint bountyId, uint[2] pi_a, uint[2][2] pi_b, uint[2] pi_c, uint[5] pubSignals)` — signature baru

Perubahan ringkas:
- `IRiscZeroVerifier` → `IGroth16Verifier`
- `imageId bytes32` → `vkHash bytes32` (semantik beda, tipe sama)
- `claim(journal bytes, seal bytes)` → `claim(pi_a, pi_b, pi_c, pubSignals)`
- decode journal → baca langsung dari pubSignals
- `verifier.verify(seal, imageId, sha256(journal))` → `require(verifier.verifyProof(...))`

- [ ] **Step 1: Ganti import di `VeilBountyRegistry.sol`**

Buka `contracts/src/VeilBountyRegistry.sol`. Ganti baris:
```solidity
import { IRiscZeroVerifier } from "./interfaces/IRiscZeroVerifier.sol";
```
Dengan:
```solidity
import { IGroth16Verifier } from "./interfaces/IGroth16Verifier.sol";
```

- [ ] **Step 2: Ganti tipe verifier dan rename imageId → vkHash di struct + storage**

Ganti:
```solidity
    IRiscZeroVerifier public immutable verifier;
```
Dengan:
```solidity
    IGroth16Verifier public immutable verifier;
```

Di struct `CreateParams`, ganti:
```solidity
        bytes32 imageId;
```
Dengan:
```solidity
        bytes32 vkHash;
```

Di struct `Bounty`, ganti:
```solidity
        bytes32 imageId;
```
Dengan:
```solidity
        bytes32 vkHash;
```

- [ ] **Step 3: Update constructor**

Ganti:
```solidity
    constructor(IRiscZeroVerifier verifier_) {
```
Dengan:
```solidity
    constructor(IGroth16Verifier verifier_) {
```

- [ ] **Step 4: Update `createBounty` — simpan vkHash bukan imageId**

Di fungsi `createBounty`, ganti:
```solidity
        bounty.imageId = params.imageId;
```
Dengan:
```solidity
        bounty.vkHash = params.vkHash;
```

Di event `BountyCreated`, ganti parameter `bytes32 imageId` → `bytes32 vkHash`:
```solidity
    event BountyCreated(
        uint256 indexed bountyId,
        address indexed creator,
        address indexed victim,
        address token,
        uint256 rewardAmount,
        bytes32 vkHash
    );
```

Dan di emit:
```solidity
        emit BountyCreated(
            bountyId, msg.sender, params.victim, params.token, params.rewardAmount, params.vkHash
        );
```

- [ ] **Step 5: Ganti fungsi `claim()` sepenuhnya**

Hapus fungsi `claim` lama dan ganti dengan:

```solidity
    /// @notice Verifies a Groth16 proof and releases the bounty reward.
    /// @dev publicSignals: [fingerprint_hi, fingerprint_lo, victim_as_uint, bountyId, target]
    function claim(
        uint256 bountyId,
        uint[2] calldata pi_a,
        uint[2][2] calldata pi_b,
        uint[2] calldata pi_c,
        uint[5] calldata pubSignals
    ) external payable nonReentrant {
        Bounty storage bounty = _getBounty(bountyId);
        if (bounty.status != Status.Open) revert BountyNotOpen();
        if (_isExpired(bounty)) revert BountyExpired();

        // pubSignals[2] = victim address as uint, pubSignals[3] = bountyId
        address boundVictim = address(uint160(pubSignals[2]));
        uint256 boundBountyId = pubSignals[3];
        if (boundVictim != bounty.victim || boundBountyId != bountyId) revert InvalidJournal();

        // fingerprint = hi << 128 | lo
        bytes32 fingerprint = bytes32((pubSignals[0] << 128) | pubSignals[1]);
        if (fingerprint == bytes32(0)) revert InvalidJournal();

        if (!verifier.verifyProof(pi_a, pi_b, pi_c, pubSignals)) revert InvalidJournal();

        _takeAsset(bounty.token, msg.sender, bounty.stakeAmount, msg.value);

        uint256 reward = bounty.rewardAmount;
        bounty.rewardAmount = 0;
        bounty.status = Status.Claimed;
        bounty.hunter = msg.sender;
        bounty.fingerprint = fingerprint;
        bounty.claimedAt = uint64(block.timestamp);

        _sendAsset(bounty.token, msg.sender, reward);
        emit BountyClaimed(bountyId, msg.sender, reward, fingerprint);
    }
```

- [ ] **Step 6: Update `_validateCreate` — ganti imageId → vkHash**

Ganti:
```solidity
        if (params.imageId == bytes32(0)) revert InvalidImageId();
```
Dengan:
```solidity
        if (params.vkHash == bytes32(0)) revert InvalidImageId();
```

- [ ] **Step 7: Compile untuk cek tidak ada error**

```powershell
cd contracts
forge build
```

Expected: `Compiler run successful` tanpa error. Warning tentang unused variable boleh diabaikan.

- [ ] **Step 8: Commit**

```powershell
git add contracts/src/VeilBountyRegistry.sol
git commit -m "feat(contracts): migrate VeilBountyRegistry from RISC Zero to Groth16 verifier"
```

---

## Task 6: Update Foundry tests + deploy scripts

**Files:**
- Modify: `contracts/test/VeilBountyRegistry.t.sol`
- Modify: `contracts/script/DeployTestnet.s.sol`
- Modify: `contracts/script/DeployLocal.s.sol`

**Interfaces:**
- Consumes: `MockGroth16Verifier` dari Task 4, `VeilBountyRegistry` dari Task 5

- [ ] **Step 1: Update `contracts/test/VeilBountyRegistry.t.sol`**

Baca file test yang ada, lalu ganti semua referensi:

```powershell
(Get-Content contracts/test/VeilBountyRegistry.t.sol) `
  -replace 'MockRiscZeroVerifier','MockGroth16Verifier' `
  -replace 'IRiscZeroVerifier','IGroth16Verifier' `
  -replace 'imageId','vkHash' | `
  Set-Content contracts/test/VeilBountyRegistry.t.sol
```

Lalu buka file dan update fungsi yang memanggil `claim()` — signature lama `claim(id, journal, seal)` harus diganti ke `claim(id, pi_a, pi_b, pi_c, pubSignals)`. Untuk test, pakai MockGroth16Verifier dengan `acceptAll=true` sehingga nilai proof boleh dummy:

```solidity
// Di setup test
MockGroth16Verifier verifier;
verifier = new MockGroth16Verifier();
verifier.setAcceptAll(true);

// Dummy proof values untuk test
uint[2] memory pi_a = [uint(1), 2];
uint[2][2] memory pi_b = [[uint(3), 4], [uint(5), 6]];
uint[2] memory pi_c = [uint(7), 8];

// pubSignals: [fp_hi, fp_lo, victim_uint, bountyId, target]
// fingerprint harus non-zero; victim harus cocok dengan bounty.victim
address victim = address(0x1234);
uint[5] memory pubSignals = [
    uint(1),                      // fingerprint_hi (non-zero)
    uint(2),                      // fingerprint_lo
    uint160(victim),              // victim_as_uint
    uint(0),                      // bountyId = 0
    uint(1_000_000)               // target
];

registry.claim{value: stakeAmount}(0, pi_a, pi_b, pi_c, pubSignals);
```

Sesuaikan nilai `victim` dengan yang dipakai di `createBounty` dalam test.

- [ ] **Step 2: Update `contracts/script/DeployTestnet.s.sol`**

Ganti import dan penggunaan MockRiscZeroVerifier → MockGroth16Verifier:

```solidity
import { MockGroth16Verifier } from "../src/mocks/MockGroth16Verifier.sol";

// di run():
MockGroth16Verifier verifier = new MockGroth16Verifier();
verifier.setAcceptAll(true);
VeilBountyRegistry registry = new VeilBountyRegistry(IGroth16Verifier(address(verifier)));
```

Juga update import interface:
```solidity
import { IGroth16Verifier } from "../src/interfaces/IGroth16Verifier.sol";
```

- [ ] **Step 3: Update `contracts/script/DeployLocal.s.sol`** — sama seperti Step 2

```solidity
import { MockGroth16Verifier } from "../src/mocks/MockGroth16Verifier.sol";
import { IGroth16Verifier } from "../src/interfaces/IGroth16Verifier.sol";

// di run():
MockGroth16Verifier verifier = new MockGroth16Verifier();
verifier.setAcceptAll(true);
VeilBountyRegistry registry = new VeilBountyRegistry(IGroth16Verifier(address(verifier)));
```

- [ ] **Step 4: Jalankan Foundry tests**

```powershell
cd contracts
forge test -v
```

Expected: semua test PASS. Jika ada test fail karena `claim()` masih pakai signature lama, perbaiki sesuai Step 1.

- [ ] **Step 5: Commit**

```powershell
git add contracts/test/VeilBountyRegistry.t.sol contracts/script/DeployTestnet.s.sol contracts/script/DeployLocal.s.sol
git commit -m "feat(contracts): update tests and deploy scripts for Groth16 verifier"
```

---

## Task 7: Update `apps/web/src/lib/chain.ts` — format proof baru

**Files:**
- Modify: `apps/web/src/lib/chain.ts`

**Interfaces:**
- Consumes: `proof.json` format dari Task 3 — `{ pi_a: string[], pi_b: string[][], pi_c: string[], publicSignals: string[] }`
- Produces: fungsi `claim(bountyId, account, proof)` yang memanggil contract dengan signature baru

- [ ] **Step 1: Update ABI `claim` di `registryAbi`**

Di `chain.ts`, cari array `registryAbi`. Ganti entry `claim`:

```typescript
// HAPUS ini:
{ type: 'function', name: 'claim', stateMutability: 'payable',
  inputs: [
    { name: 'bountyId', type: 'uint256' },
    { name: 'journal', type: 'bytes' },
    { name: 'seal', type: 'bytes' }
  ], outputs: [] },

// GANTI dengan:
{
  type: 'function', name: 'claim', stateMutability: 'payable',
  inputs: [
    { name: 'bountyId', type: 'uint256' },
    { name: 'pi_a', type: 'uint256[2]' },
    { name: 'pi_b', type: 'uint256[2][2]' },
    { name: 'pi_c', type: 'uint256[2]' },
    { name: 'pubSignals', type: 'uint256[5]' },
  ],
  outputs: [],
},
```

Juga update event `BountyCreated` — ganti `imageId` → `vkHash`:
```typescript
{ name: 'vkHash', type: 'bytes32', indexed: false },
```

- [ ] **Step 2: Tambah type `Groth16Proof` dan update fungsi `claim`**

Di bagian atas file (setelah imports), tambahkan type:
```typescript
export interface Groth16Proof {
  pi_a: [string, string]
  pi_b: [[string, string], [string, string]]
  pi_c: [string, string]
  publicSignals: [string, string, string, string, string]
}
```

Ganti fungsi `claim` lama:
```typescript
// HAPUS:
export async function claim(bountyId: number, account: Address, journal: Hex, seal: Hex) { ... }

// GANTI dengan:
export async function claim(bountyId: number, account: Address, proof: Groth16Proof) {
  requireRegistry()
  const bounty = await publicClient.readContract({
    address: REGISTRY_ADDRESS, abi: registryAbi,
    functionName: 'getBounty', args: [BigInt(bountyId)],
  })
  await approveIfNeeded(bounty.token, account, bounty.stakeAmount)
  const client = await walletClient(account)

  const pi_a  = proof.pi_a.map(BigInt) as [bigint, bigint]
  const pi_b  = proof.pi_b.map(row => row.map(BigInt)) as [[bigint, bigint], [bigint, bigint]]
  const pi_c  = proof.pi_c.map(BigInt) as [bigint, bigint]
  const pubSignals = proof.publicSignals.map(BigInt) as [bigint, bigint, bigint, bigint, bigint]

  const hash = await client.writeContract({
    address: REGISTRY_ADDRESS,
    abi: registryAbi,
    functionName: 'claim',
    args: [BigInt(bountyId), pi_a, pi_b, pi_c, pubSignals],
    value: bounty.token === zeroAddress ? bounty.stakeAmount : BigInt(0),
  })
  await publicClient.waitForTransactionReceipt({ hash })
  return hash
}
```

- [ ] **Step 3: Update `VeilApp.tsx` — cara parse proof.json**

Buka `apps/web/src/components/VeilApp.tsx`. Ganti `proofRef` type dan `captureFile`:

```typescript
// Ganti type ref dari:
const proofRef = useRef<{ journal: Hex; seal: Hex } | null>(null)
// Menjadi:
const proofRef = useRef<Groth16Proof | null>(null)
```

Import `Groth16Proof` dari chain:
```typescript
import { ..., type Groth16Proof } from '@/lib/chain'
```

Ganti `captureFile`:
```typescript
const captureFile = async (file?: File) => {
  if (!file) { proofRef.current = null; loadFile('proof.json'); return }
  try {
    const txt = await file.text()
    const j = JSON.parse(txt)
    // snarkjs proof.json format: { pi_a, pi_b, pi_c, publicSignals }
    if (!j.pi_a || !j.pi_b || !j.pi_c || !j.publicSignals) throw new Error('invalid')
    proofRef.current = {
      pi_a: j.pi_a.slice(0, 2),
      pi_b: [j.pi_b[0].slice(0, 2), j.pi_b[1].slice(0, 2)],
      pi_c: j.pi_c.slice(0, 2),
      publicSignals: j.publicSignals.slice(0, 5),
    } as Groth16Proof
  } catch {
    proofRef.current = null
  }
  loadFile(file.name)
}
```

Ganti `startVerify` — cara kirim proof ke `claim`:
```typescript
// Ganti:
const hash = await claim(Number(activeId), addr, journal, seal)
// Dengan:
const hash = await claim(Number(activeId), addr, proofRef.current!)
```

- [ ] **Step 4: Update `createBounty` di chain.ts — ganti imageId → vkHash**

Di fungsi `createBounty`, ganti field `imageId`:
```typescript
// HAPUS:
imageId: asBytes32(input.imageId, 'ImageID'),
// GANTI:
vkHash: asBytes32(input.vkHash, 'vkHash'),
```

Update parameter fungsi:
```typescript
// Ganti: imageId: string → vkHash: string
export async function createBounty(input: {
  ...
  vkHash: string   // ganti dari imageId
  ...
})
```

- [ ] **Step 5: Update `Create.tsx` — label ImageID → vkHash**

Buka `apps/web/src/components/screens/Create.tsx`. Cari semua kemunculan `imageId` / `ImageID` di form dan ganti label display-nya ke `vkHash`. Field `onImageChange` prop tetap sama namanya untuk menghindari perubahan besar.

- [ ] **Step 6: Build TypeScript untuk cek tidak ada error**

```powershell
cd apps/web
npx tsc --noEmit
```

Expected: tidak ada error. Jika ada, perbaiki type mismatch.

- [ ] **Step 7: Commit**

```powershell
git add apps/web/src/lib/chain.ts apps/web/src/components/VeilApp.tsx apps/web/src/components/screens/Create.tsx
git commit -m "feat(web): update claim flow and proof format for Groth16/Circom"
```

---

## Task 8: Hapus seluruh folder Rust `zk/host` dan `zk/methods`

**Files:**
- Delete: `zk/host/` (seluruh folder)
- Delete: `zk/methods/` (seluruh folder)
- Delete: `zk/Cargo.toml`, `zk/Cargo.lock`, `zk/rust-toolchain.toml`
- Modify: `README.md` — update quick start (hapus referensi WSL/cargo)

- [ ] **Step 1: Hapus folder dan file Rust**

```powershell
Remove-Item -Recurse -Force zk/host
Remove-Item -Recurse -Force zk/methods
Remove-Item zk/Cargo.toml
Remove-Item zk/Cargo.lock
Remove-Item zk/rust-toolchain.toml
```

- [ ] **Step 2: Update `README.md` quick start section**

Ganti section "Quick start" — hapus referensi WSL, cargo, RISC Zero. Ganti dengan:

```markdown
## Quick start

Requirements: Node.js 20+, npm, circom binary (Windows), Foundry.

```powershell
npm install
copy apps\web\.env.example apps\web\.env.local
copy apps\agent\.env.example apps\agent\.env

# Setup ZK (satu kali — compile circuit + download ptau + generate keys)
cd zk && npm install && node scripts/setup.mjs && cd ..

# Jalankan web app
npm run dev
```

Open `http://localhost:3000`.

### Generate proof

```powershell
node zk/scripts/prove.mjs 1000 1000 0x<victim-address> <bounty-id>
# Output: zk/proof.json (upload ke UI), zk/reveal.json (simpan privat)
```
```

- [ ] **Step 3: Commit**

```powershell
git rm -r zk/host zk/methods zk/Cargo.toml zk/Cargo.lock zk/rust-toolchain.toml
git add README.md
git commit -m "chore(zk): remove RISC Zero Rust stack, update README for Circom workflow"
```

---

## Checklist Akhir

- [ ] `forge build` di `contracts/` tanpa error
- [ ] `forge test` di `contracts/` semua PASS
- [ ] `node zk/scripts/setup.mjs` selesai, `Groth16Verifier.sol` di-generate
- [ ] `node zk/scripts/prove.mjs 1000 1000 0x...1 0` menghasilkan `proof.json` valid
- [ ] Proof verify lokal: `snarkjs groth16 verify verification_key.json public.json proof.json`
- [ ] `npx tsc --noEmit` di `apps/web/` tanpa error
- [ ] Web app bisa drop `proof.json` dan panggil `claim()` ke contract (lokal atau testnet)
- [ ] Tidak ada file Rust di folder `zk/`
- [ ] Tidak ada referensi `IRiscZeroVerifier` atau `imageId` di contracts (kecuali komentar lama)

# Circom + SnarkJS Migration Design

**Replaces:** RISC Zero zkVM (Rust) dengan Circom + SnarkJS (Node.js)  
**Target chain:** BSC Testnet (chain 97) — Groth16Verifier.sol di-deploy sebagai contract biasa  
**No WSL required** — semua tooling jalan di Windows native

---

## Motivasi

RISC Zero tidak punya official deployment di BSC. Daripada mock verifier,
kita ganti stack ZK ke Circom + SnarkJS yang:
- Verifier Solidity-nya bisa di-deploy ke chain manapun termasuk BSC
- Toolchain ringan — hanya Node.js + npm, tidak butuh Rust
- Ekosistem paling mature di EVM hackathon (docs lengkap, banyak contoh)
- Trusted setup dari Hermez ceremony (dipakai hampir semua project Circom)

---

## Arsitektur baru

```
Hunter machine (Windows):          BSC Testnet:
  node prove.mjs a b victim id
        |                           Groth16Verifier.sol  ← di-generate snarkjs
        | proof.json                        |
        | { pi_a, pi_b, pi_c,       VeilBountyRegistry.sol
        |   publicSignals[5] }              |
        v                                   | verifyProof(pi_a,pi_b,pi_c,signals)
     UI drop → claim()                      |
                                    reward released ✓
```

**publicSignals[5]:**
```
[0] fingerprint_hi  — sha256(a,b,salt) high 128 bits sebagai uint256
[1] fingerprint_lo  — sha256(a,b,salt) low 128 bits sebagai uint256
[2] victim_as_uint  — address victim cast ke uint256
[3] bountyId        — uint256
[4] target          — uint256 (1_000_000, hard-coded di circuit)
```

---

## Komponen

### 1. Circuit: `zk/circuits/exploit.circom`

**Dependencies:** `circomlib` (Sha256, Num2Bits, comparators)

**Inputs:**
```
private: a (64-bit uint), b (64-bit uint), salt[256] (bits)
public:  victim_as_uint, bountyId, target
```

**Constraints:**
1. `a * b === target` — via `a_bits * b_bits` setelah Num2Bits
2. `a > 1` — via LessThan(64)
3. `b > 1` — via LessThan(64)  
4. `a < target` — via LessThan(64)
5. `b < target` — via LessThan(64)
6. `fingerprint = Sha256(pad_128(a) ++ pad_128(b) ++ salt)` — via circomlib Sha256_2 / custom sha256 template

**Outputs publik (signals):** `fingerprint_hi`, `fingerprint_lo`, `victim_as_uint`, `bountyId`, `target`

Estimasi constraints: ~28k (masuk dalam ptau_15 yang support hingga 2^15 = 32768 constraints).

### 2. Trusted Setup

**File:** `powersOfTau28_hez_final_15.ptau`  
**Source:** Hermez Network ceremony (dapat di-download dari URL resmi)  
**Tidak di-commit ke repo** — masuk `.gitignore`, di-download saat setup  
**circuit_final.zkey** — di-generate lokal dari ptau + circuit, tidak di-commit  
**verification_key.json** — publik, di-commit ke repo  

### 3. Prover: `zk/scripts/prove.mjs`

Mengganti `zk/host/src/main.rs`. Berjalan dengan Node.js 20+.

**CLI:**
```
node zk/scripts/prove.mjs <a> <b> <victim-address> <bounty-id> [salt-hex]
```

**Output:**
- `zk/proof.json` — `{ pi_a, pi_b, pi_c, publicSignals }` — public, upload ke UI
- `zk/reveal.json` — `{ a, b, salt }` — private, jangan publish

**Dependencies:** `snarkjs`, `circomlibjs` (untuk sha256 off-circuit)

### 4. Smart Contracts

#### `contracts/src/interfaces/IGroth16Verifier.sol` (baru)
```solidity
interface IGroth16Verifier {
    function verifyProof(
        uint[2] calldata pi_a,
        uint[2][2] calldata pi_b,
        uint[2] calldata pi_c,
        uint[5] calldata publicSignals
    ) external view returns (bool);
}
```

#### `contracts/src/Groth16Verifier.sol` (di-generate snarkjs)
Di-generate dengan `snarkjs zkey export solidityverifier circuit_final.zkey`.
Di-copy ke `contracts/src/`. Tidak diedit manual.

#### `contracts/src/VeilBountyRegistry.sol` (dimodifikasi)

Perubahan dari RISC Zero ke Circom:

| Field | Sebelum | Sesudah |
|---|---|---|
| `imageId` | bytes32 ImageID RISC Zero | `vkHash` bytes32 (sha256 dari verification_key.json) |
| `verifier` type | `IRiscZeroVerifier` | `IGroth16Verifier` |
| `claim()` verify call | `verifier.verify(seal, imageId, sha256(journal))` | `verifier.verifyProof(pi_a, pi_b, pi_c, signals)` |
| `claim()` inputs | `journal bytes`, `seal bytes` | `pi_a uint[2]`, `pi_b uint[2][2]`, `pi_c uint[2]`, `signals uint[5]` |
| journal decode | `abi.decode(journal, (address, uint256, bytes32))` | langsung dari `signals[2]`, `signals[3]`, `signals[0..1]` |

**Fingerprint reconstruction** dari signals:
```solidity
bytes32 fingerprint = bytes32(
    (signals[0] << 128) | signals[1]
);
```

#### `contracts/src/mocks/MockGroth16Verifier.sol` (baru, ganti MockRiscZeroVerifier)
```solidity
contract MockGroth16Verifier is IGroth16Verifier {
    bool public acceptAll;
    function setAcceptAll(bool v) external { acceptAll = v; }
    function verifyProof(uint[2] calldata, uint[2][2] calldata, uint[2] calldata, uint[5] calldata)
        external view returns (bool) { return acceptAll; }
}
```

#### `contracts/script/DeployTestnet.s.sol` (dimodifikasi)
Ganti `MockRiscZeroVerifier` → `MockGroth16Verifier`.
Setelah circuit di-compile dan `Groth16Verifier.sol` tersedia, deploy contract verifier nyata.

### 5. Web App: `apps/web/src/lib/chain.ts`

Perubahan pada fungsi `claim()` — format argumen ke contract:

**Sebelum:**
```typescript
claim(bountyId, journal: Hex, seal: Hex)
// journal = 0x<96 bytes>, seal = 0x<N bytes>
```

**Sesudah:**
```typescript
claim(bountyId, proof: Groth16Proof)
// proof = { pi_a: [Hex,Hex], pi_b: [[Hex,Hex],[Hex,Hex]], pi_c: [Hex,Hex], publicSignals: Hex[5] }
```

`proof.json` yang di-drop di UI langsung di-parse sebagai `Groth16Proof`. Format-nya adalah output standar `snarkjs groth16 prove` — tidak perlu transformasi.

Registry ABI di `chain.ts` juga diupdate sesuai signature `claim()` yang baru.

---

## File yang dihapus

- `zk/` seluruh folder Rust (host, methods, guest) — diganti `zk/circuits/` dan `zk/scripts/`
- `contracts/src/interfaces/IRiscZeroVerifier.sol`
- `contracts/src/mocks/MockRiscZeroVerifier.sol`
- `contracts/script/DeployLocal.s.sol` (opsional, bisa update saja)

## File yang dibuat

- `zk/circuits/exploit.circom`
- `zk/scripts/prove.mjs`
- `zk/scripts/setup.mjs` (compile circuit + generate zkey)
- `zk/package.json`
- `zk/verification_key.json` (committed)
- `contracts/src/interfaces/IGroth16Verifier.sol`
- `contracts/src/Groth16Verifier.sol` (generated)
- `contracts/src/mocks/MockGroth16Verifier.sol`

## File yang dimodifikasi

- `contracts/src/VeilBountyRegistry.sol`
- `contracts/script/DeployTestnet.s.sol`
- `apps/web/src/lib/chain.ts`
- `.gitignore` (tambah `zk/*.ptau`, `zk/*.zkey`, `zk/proof.json`, `zk/reveal.json`)

---

## Setup flow (satu kali, Windows native)

```powershell
# 1. Install circom (binary Windows)
# Download dari https://github.com/iden3/circom/releases → taruh di PATH

# 2. Install snarkjs
npm install -g snarkjs

# 3. Install zk dependencies
cd zk && npm install

# 4. Compile circuit
node scripts/setup.mjs
# → downloads ptau_15, compiles circuit, generates zkey, exports Groth16Verifier.sol

# 5. Deploy contracts
cd ../contracts
forge script script/DeployTestnet.s.sol --rpc-url $BSC_RPC --broadcast --legacy

# 6. Generate proof
node zk/scripts/prove.mjs 1000 1000 0x<victim> 0
# → zk/proof.json, zk/reveal.json

# 7. Drop proof.json di UI → claim
```

---

## Constraint pada vkHash

`vkHash` di bounty = `keccak256(abi.encode(verification_key_json_bytes))`.  
Registry memverifikasi bahwa circuit yang dipakai hunter sesuai dengan yang didaftarkan creator.  
Ini menggantikan peran `imageId` di RISC Zero.

---

## Batasan yang diketahui

- SHA256 dalam Circom menggunakan circomlib `Sha256_2` — input dibatasi dua 256-bit chunks. Kita perlu custom template untuk 3 chunks (a + b + salt). Sudah ada referensi di circomlib.
- `target` di-hardcode sebagai public input (bukan constant) agar circuit bisa digunakan untuk target lain di masa depan tanpa compile ulang.
- Proof generation dengan snarkjs Groth16 di Node.js: ~10-30 detik (jauh lebih cepat dari RISC Zero yang 5-30 menit).

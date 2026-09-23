# Veil BNB — Context untuk Claude

## Proyek ini apa?

Private bug-bounty protocol di BNB Smart Chain. Hunter membuktikan exploit dengan **Groth16 ZK proof** (Circom + SnarkJS) tanpa mengungkap detail exploit. Contract `VeilBountyRegistry` menerima proof, memverifikasi lewat `Groth16Verifier.sol`, dan release reward otomatis.

**Track hackathon:** Indonesia Web3 Hackathon 2026 — Finance & Commerce

## Stack teknologi

- **ZK**: Circom 2.x + SnarkJS 0.7.x (Groth16) — **bukan RISC Zero, tidak ada Rust**
- **Contracts**: Solidity ^0.8.20, Foundry (forge)
- **Web**: Next.js (apps/web), viem untuk BSC
- **Target chain**: BSC Testnet (chain ID 97)

## Struktur folder penting

```
contracts/
  src/
    VeilBountyRegistry.sol     ← registry utama, claim() pakai Groth16
    interfaces/IGroth16Verifier.sol
    mocks/MockGroth16Verifier.sol
    Groth16Verifier.sol        ← di-generate oleh node zk/scripts/setup.mjs
  test/
    VeilBountyRegistry.t.sol   ← Foundry tests (pakai MockGroth16Verifier)
  script/
    DeployTestnet.s.sol        ← deploy MockGroth16Verifier + registry + VictimVault ke BSC
    DeployLocal.s.sol          ← deploy ke Anvil lokal
    Deploy.s.sol               ← deploy dengan verifier asli (butuh GROTH16_VERIFIER env)
zk/
  circuits/
    exploit.circom             ← circuit utama
    sha256_3chunks.circom      ← helper SHA256 3 input chunks
  scripts/
    setup.mjs                  ← compile circuit + generate zkey + export Groth16Verifier.sol
    prove.mjs                  ← generate proof.json + reveal.json
  package.json                 ← snarkjs, circomlibjs, circomlib
apps/web/
  src/lib/chain.ts             ← ABI + fungsi claim(bountyId, account, Groth16Proof)
  src/components/VeilApp.tsx   ← parse proof.json { pi_a, pi_b, pi_c, publicSignals }
  .env.local                   ← NEXT_PUBLIC_REGISTRY_ADDRESS (isi setelah deploy)
docs/
  deploy-runbook.md            ← panduan deploy step-by-step (baca ini dulu!)
  submission-links.md          ← isi dengan alamat contract + tx hash setelah deploy
```

## Claim() signature (penting!)

```solidity
function claim(
    uint256 bountyId,
    uint[2] calldata pi_a,
    uint[2][2] calldata pi_b,
    uint[2] calldata pi_c,
    uint[5] calldata pubSignals
) external payable nonReentrant
```

**publicSignals order:** `[fingerprint_hi, fingerprint_lo, victim_as_uint, bountyId, target]`

**Fingerprint reconstruction:** `bytes32((pubSignals[0] << 128) | pubSignals[1])`

## proof.json format (output prove.mjs)

```json
{
  "pi_a": ["<str>", "<str>", "1"],
  "pi_b": [["<str>", "<str>"], ["<str>", "<str>"], ["1", "0"]],
  "pi_c": ["<str>", "<str>", "1"],
  "publicSignals": ["fp_hi", "fp_lo", "victim_uint", "bountyId", "1000000"]
}
```

## Task yang sudah selesai

Migrasi RISC Zero → Circom+SnarkJS **sudah selesai sepenuhnya** (semua 8 task + final review clean). Tidak ada lagi referensi RISC Zero di codebase.

## Task yang masih perlu dilakukan (manual, butuh credentials)

1. **Jalankan `forge test -vv`** di `contracts/` — verifikasi semua tests pass
2. **Isi `contracts/.env`** dengan `DEPLOYER_PRIVATE_KEY` dan `BSC_TESTNET_RPC_URL`
3. **Deploy ke BSC Testnet**: `forge script script/DeployTestnet.s.sol:DeployTestnet --rpc-url ... --broadcast --legacy`
4. **Update `apps/web/.env.local`** dengan `NEXT_PUBLIC_REGISTRY_ADDRESS`
5. **Jalankan `node zk/scripts/setup.mjs`** (di Windows, butuh circom binary di PATH)
6. **Buat bounty via UI** dan **generate proof** dengan `node zk/scripts/prove.mjs`
7. **Claim bounty via UI** — drop proof.json
8. **Isi `docs/submission-links.md`** dengan semua alamat contract + tx hash

## Cara jalankan forge di WSL

Path repo di WSL: `/mnt/e/Hackaton/Veil/veil-bnb`

```bash
# Cek forge tersedia
which forge || ~/.foundry/bin/forge --version

# Jalankan tests
cd /mnt/e/Hackaton/Veil/veil-bnb/contracts
forge test -vv

# Deploy (isi .env dulu!)
source .env
forge script script/DeployTestnet.s.sol:DeployTestnet \
  --rpc-url "$BSC_TESTNET_RPC_URL" \
  --broadcast --legacy
```

## Hal-hal yang JANGAN dilakukan

- Jangan commit `contracts/.env` atau file apapun yang berisi private key
- Jangan commit `zk/proof.json` atau `zk/reveal.json`
- Jangan commit `*.ptau` atau `*.zkey` (file besar, di-generate lokal)
- Jangan ganti stack ZK — sudah Circom+SnarkJS, bukan RISC Zero

## Environment variables yang dibutuhkan

```
contracts/.env:
  BSC_TESTNET_RPC_URL=https://bsc-testnet-dataseed.bnbchain.org
  DEPLOYER_PRIVATE_KEY=<hex tanpa 0x>

apps/web/.env.local:
  NEXT_PUBLIC_CHAIN_ID=97
  NEXT_PUBLIC_RPC_URL=https://bsc-testnet-dataseed.bnbchain.org
  NEXT_PUBLIC_EXPLORER_URL=https://testnet.bscscan.com
  NEXT_PUBLIC_REGISTRY_ADDRESS=<alamat VeilBountyRegistry setelah deploy>
```

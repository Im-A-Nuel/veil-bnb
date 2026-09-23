# Deploy & Demo Runbook — BSC Testnet

Jalankan langkah-langkah ini secara berurutan. Semua perintah PowerShell (Windows native — tidak butuh WSL).

---

## Prasyarat

- Node.js 20+ dan npm
- circom binary (Windows) — [download dari GitHub](https://github.com/iden3/circom/releases), rename jadi `circom.exe`, taruh di PATH
- Foundry (`forge`) — [install via foundryup-windows](https://book.getfoundry.sh/getting-started/installation)
- Wallet dengan tBNB testnet (faucet: https://www.bnbchain.org/en/testnet-faucet)
- MetaMask/Rabby di browser, BSC Testnet (chain 97) sudah ditambahkan

---

## Langkah 1 — ZK Setup (satu kali)

```powershell
cd zk
npm install
node scripts/setup.mjs
```

Proses:
1. Download `powersOfTau28_hez_final_15.ptau` (~1 MB) dari Hermez ceremony
2. Compile `circuits/exploit.circom` dengan circom
3. Generate `circuit_final.zkey`
4. Export `verification_key.json`
5. Generate `contracts/src/Groth16Verifier.sol`

Output yang diharapkan:
```
=== Veil ZK Setup ===
[1/5] Download Powers of Tau (Hermez ceremony)...
[2/5] Compile circuit...
[3/5] Generate zkey (phase 1)...
[4/5] Contribute beacon entropy...
[5/5] Export verification key and Solidity verifier...
✓ Setup complete.
```

Catat `vkHash` untuk dipakai di Langkah 3:
```powershell
# vkHash = keccak256 dari verification_key.json — hitung off-chain atau pakai tool:
node -e "
const fs = require('fs')
const { keccak256, toBytes } = require('viem')
const vk = fs.readFileSync('verification_key.json')
console.log('vkHash:', keccak256(toBytes(vk)))
"
```

---

## Langkah 2 — Deploy ke BSC Testnet

### 2a. Buat `contracts/.env`

```powershell
cd contracts
copy .env.example .env
```

Edit `.env` dan isi:
```dotenv
BSC_TESTNET_RPC_URL=https://bsc-testnet-dataseed.bnbchain.org
DEPLOYER_PRIVATE_KEY=<private key hex kamu, tanpa 0x>
```

**JANGAN commit file `.env` ini ke git.**

### 2b. Dry-run (tanpa broadcast)

```powershell
forge script script/DeployTestnet.s.sol:DeployTestnet `
  --rpc-url $env:BSC_TESTNET_RPC_URL `
  --legacy
```

Expected: `Simulation complete` tanpa error.

### 2c. Broadcast deploy

```powershell
forge script script/DeployTestnet.s.sol:DeployTestnet `
  --rpc-url $env:BSC_TESTNET_RPC_URL `
  --broadcast --legacy
```

Dari output, catat tiga alamat contract (cek di `contracts/broadcast/DeployTestnet.s.sol/97/run-latest.json`):
```
MockGroth16Verifier : 0xAAAA...
VeilBountyRegistry  : 0xBBBB...
VictimVault         : 0xCCCC...
```

### 2d. Update `docs/submission-links.md`

Isi tabel Deployments dengan alamat dan link BscScan.

### 2e. Update `apps/web/.env.local`

```dotenv
NEXT_PUBLIC_REGISTRY_ADDRESS=0x<alamat VeilBountyRegistry>
```

---

## Langkah 3 — Buat bounty via UI

Jalankan web app:
```powershell
npm run dev
```

Buka `http://localhost:3000` di browser.

1. Klik **Create Bounty**
2. Isi form dengan nilai berikut:

| Field | Nilai |
|---|---|
| Victim contract address | `0x<alamat VictimVault dari Langkah 2>` |
| vkHash | `0x<vkHash dari Langkah 1>` |
| Creator pubkey | `AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=` |
| Title | `Demo · VictimVault Factoring` |
| Description | `Prove non-trivial factors of 1,000,000 without revealing them. a*b=1000000, a>1, b>1.` |
| Reward | `0.01` BNB |
| Hunter stake | (kosong / 0) |
| Token | BNB |

3. Klik **Open bounty & lock reward** → konfirmasi di MetaMask
4. Catat bounty ID dari toast (biasanya `#0`)
5. Update `docs/submission-links.md` baris `createBounty`

---

## Langkah 4 — Generate proof

```powershell
cd zk
node scripts/prove.mjs 1000 1000 0x<alamat VictimVault> <bounty-id>
```

> Bounty ID adalah `0` kalau ini bounty pertama.
> Proses Groth16 proving memakan ~10–30 detik.

Output yang diharapkan:
```
a           : 1000
b           : 1000
victim      : 0x<alamat VictimVault>
bountyId    : 0
salt        : 0x<64 hex chars>
fingerprint : 0x<64 hex chars>

Generating witness and proof (Groth16)...

✓ Done.
  proof.json  : ...\zk\proof.json  (public — upload ke UI)
  reveal.json : ...\zk\reveal.json  (private — simpan)

publicSignals:
  [0] <fingerprint_hi>
  [1] <fingerprint_lo>
  [2] <victim_as_uint>
  [3] 0  (bountyId)
  [4] 1000000  (target)
```

---

## Langkah 5 — Claim reward via UI

Di `http://localhost:3000`:

1. Buka bounty **Demo · VictimVault Factoring**
2. Klik **Hunt** / **Submit Proof**
3. Drop atau browse file `zk/proof.json`
4. Klik **Verify & claim reward**
5. Konfirmasi transaksi di MetaMask

Expected: toast sukses, status bounty berubah jadi **Claimed**, saldo tBNB bertambah 0.01.

Verifikasi di BscScan:
- Buka link tx di `https://testnet.bscscan.com/tx/<hash>`
- Function: `claim` ✓
- Status: Success ✓
- Event `BountyClaimed` di Logs ✓

Update `docs/submission-links.md` baris `claim`.

---

## Langkah 6 — Final commit

```powershell
git add docs/submission-links.md
git commit -m "docs: add testnet deployment and claim transaction links"
```

---

## Troubleshooting

### `WrongNativeValue` saat createBounty
Pastikan field Reward di UI sama persis dengan nilai yang dikirim sebagai `msg.value`. Jangan ada decimal yang salah.

### Claim gagal dengan `InvalidJournal`
Pastikan victim address dan bounty ID di proof.json sesuai dengan bounty yang di-claim. Regenerate proof dengan victim address yang benar.

### Forge script gagal `insufficient funds`
Pastikan wallet punya cukup tBNB. Faucet: https://www.bnbchain.org/en/testnet-faucet

### RPC timeout
Ganti RPC ke `https://data-seed-prebsc-1-s1.binance.org:8545` di `.env`.

### circom: `command not found`
Download circom binary dari https://github.com/iden3/circom/releases dan pastikan ada di PATH.

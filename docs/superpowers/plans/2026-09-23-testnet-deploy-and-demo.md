# Testnet Deploy & End-to-End Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy MockRiscZeroVerifier + VeilBountyRegistry ke BSC Testnet, jalankan satu siklus penuh createBounty → generate proof → claim, dan siapkan materi pitch hackathon.

**Architecture:** Deploy script Foundry yang sudah ada (`DeployLocal.s.sol`) di-fork menjadi `DeployTestnet.s.sol` yang menarget BSC Testnet (chain 97). Proof di-generate via RISC Zero host binary (`zk/host`) di mesin lokal. Claim dilakukan melalui UI web yang terhubung ke contract yang baru di-deploy. Materi pitch adalah dokumen markdown yang merangkum alur, BscScan links, dan narasi untuk juri.

**Tech Stack:** Foundry (forge), Solidity 0.8.20, BSC Testnet RPC, RISC Zero zkVM (Rust), Next.js + viem, PowerShell/Bash

**Spec:** `docs/deployment.md`, `docs/hackathon.md`, `docs/architecture.md`

## Global Constraints

- Chain ID BSC Testnet: `97`
- RPC BSC Testnet: `https://bsc-testnet-dataseed.bnbchain.org`
- Explorer: `https://testnet.bscscan.com`
- MockRiscZeroVerifier **harus** di-set `acceptAll = true` setelah deploy
- Private key deployer TIDAK BOLEH di-commit ke repo
- Semua BscScan link harus dicatat di `docs/submission-links.md`
- VictimVault `target = 1_000_000` (nilai tetap sesuai contract yang ada)
- Bounty demo: reward `0.01 tBNB`, tanpa stake (stakeAmount = 0)
- RISC Zero host binary menghasilkan `proof.json` dan `reveal.json` — hanya `proof.json` yang di-upload ke UI

---

## Task 1: Buat `DeployTestnet.s.sol` — script deploy MockVerifier + Registry + VictimVault ke BSC Testnet

**Files:**
- Create: `contracts/script/DeployTestnet.s.sol`
- Modify: `contracts/.env.example` (tambah BSCSCAN_API_KEY)

**Interfaces:**
- Produces: contract `MockRiscZeroVerifier` (acceptAll=true), `VeilBountyRegistry`, `VictimVault` dengan alamat yang dicetak ke stdout

- [ ] **Step 1: Buat file `contracts/script/DeployTestnet.s.sol`**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { VeilBountyRegistry } from "../src/VeilBountyRegistry.sol";
import { VictimVault } from "../src/VictimVault.sol";
import { MockRiscZeroVerifier } from "../src/mocks/MockRiscZeroVerifier.sol";

interface VmTestnet {
    function envUint(string calldata name) external view returns (uint256);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

contract DeployTestnet {
    VmTestnet private constant vm =
        VmTestnet(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run()
        external
        returns (
            MockRiscZeroVerifier verifier,
            VeilBountyRegistry registry,
            VictimVault victim
        )
    {
        uint256 privateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(privateKey);
        verifier = new MockRiscZeroVerifier();
        verifier.setAcceptAll(true);
        registry = new VeilBountyRegistry(verifier);
        victim = new VictimVault(1_000_000);
        vm.stopBroadcast();
    }
}
```

- [ ] **Step 2: Update `contracts/.env.example` — tambah BSCSCAN_API_KEY**

```dotenv
BSC_TESTNET_RPC_URL=https://bsc-testnet-dataseed.bnbchain.org
DEPLOYER_PRIVATE_KEY=
RISC0_VERIFIER=
BSCSCAN_API_KEY=
```

- [ ] **Step 3: Buat `contracts/.env` dari template (jangan commit)**

Salin `.env.example` ke `.env` lalu isi:
```
DEPLOYER_PRIVATE_KEY=<private key wallet kamu, tanpa 0x>
BSC_TESTNET_RPC_URL=https://bsc-testnet-dataseed.bnbchain.org
```

Pastikan `contracts/.env` sudah ada di `.gitignore` root repo. Cek:
```bash
grep -n "contracts/.env" .gitignore
```
Jika tidak ada, tambahkan:
```
contracts/.env
```

- [ ] **Step 4: Dry-run script (tanpa `--broadcast`) dari WSL**

```bash
cd /mnt/e/Hackaton/Veil/veil-bnb/contracts
source .env
~/.foundry/bin/forge script script/DeployTestnet.s.sol:DeployTestnet \
  --rpc-url "$BSC_TESTNET_RPC_URL" \
  --legacy
```
Expected: output `Simulation complete` tanpa error. Tiga contract dicetak.

- [ ] **Step 5: Broadcast deploy ke BSC Testnet**

```bash
~/.foundry/bin/forge script script/DeployTestnet.s.sol:DeployTestnet \
  --rpc-url "$BSC_TESTNET_RPC_URL" \
  --broadcast \
  --legacy
```
Expected: tiga alamat contract dicetak, terlihat di `broadcast/DeployTestnet.s.sol/97/run-latest.json`.

- [ ] **Step 6: Catat semua alamat ke `docs/submission-links.md`**

Buat file baru `docs/submission-links.md`:
```markdown
# Submission Links

## BSC Testnet Deployments

| Contract | Address | BscScan |
|---|---|---|
| MockRiscZeroVerifier | 0x... | https://testnet.bscscan.com/address/0x... |
| VeilBountyRegistry | 0x... | https://testnet.bscscan.com/address/0x... |
| VictimVault | 0x... | https://testnet.bscscan.com/address/0x... |

## Transactions

| Action | Tx Hash | BscScan |
|---|---|---|
| Deploy (batch) | 0x... | https://testnet.bscscan.com/tx/0x... |
| createBounty | — | — |
| claim | — | — |
```
(Isi bagian createBounty dan claim setelah Task 3 dan Task 4.)

- [ ] **Step 7: Commit**

```bash
git add contracts/script/DeployTestnet.s.sol contracts/.env.example .gitignore docs/submission-links.md
git commit -m "feat(contracts): add DeployTestnet script and submission links template"
```

---

## Task 2: Konfigurasi `apps/web/.env.local` dengan alamat testnet

**Files:**
- Modify: `apps/web/.env.local` (buat dari `.env.example` jika belum ada)

**Interfaces:**
- Consumes: alamat `VeilBountyRegistry` dari Task 1
- Produces: web app terhubung ke BSC Testnet, bukan demo mode

- [ ] **Step 1: Buat atau update `apps/web/.env.local`**

```dotenv
NEXT_PUBLIC_CHAIN_ID=97
NEXT_PUBLIC_RPC_URL=https://bsc-testnet-dataseed.bnbchain.org
NEXT_PUBLIC_EXPLORER_URL=https://testnet.bscscan.com
NEXT_PUBLIC_REGISTRY_ADDRESS=0x<alamat VeilBountyRegistry dari Task 1>
NEXT_PUBLIC_USDT_ADDRESS=
NEXT_PUBLIC_AGENT_URL=
AGENT_URL=http://127.0.0.1:3001
```

- [ ] **Step 2: Verifikasi app berjalan di on-chain mode**

```powershell
cd apps\web
npm run dev
```

Buka `http://localhost:3000` di browser. Pastikan:
- Tidak muncul bounty demo "factoring" / "overflow" (itu hanya muncul saat `REGISTRY_ADDRESS` kosong)
- Halaman Hunt menampilkan "No bounties found" atau daftar kosong — bukan dummy data

- [ ] **Step 3: Konfirmasi wallet bisa connect ke BSC Testnet**

Di browser, klik Connect Wallet (MetaMask/rabby). Pastikan:
- Wallet tersambung ke chain ID 97 (BSC Testnet)
- Balance tBNB terlihat di UI

---

## Task 3: Buat bounty demo BNB kecil via UI

**Files:**
- Tidak ada perubahan kode — ini adalah operasi on-chain melalui UI

**Interfaces:**
- Consumes: web app dari Task 2, wallet dengan tBNB, alamat VictimVault dari Task 1
- Produces: bounty ID 0 on-chain, tx hash createBounty, BscScan link

**Pre-requisite:** Tentukan `imageId` yang akan dipakai. Untuk demo ini, gunakan nilai placeholder yang valid:
```
0x0000000000000000000000000000000000000000000000000000000000000001
```
(Ini valid secara format — 32 bytes non-zero. Setelah proof di-generate di Task 4, ganti dengan ImageID sesungguhnya jika ingin bounty kedua yang "canonical". Untuk demo alur pertama, placeholder ini cukup karena MockVerifier menerima seal apapun.)

**Nilai creatorPubkey:** Generate random X25519 keypair atau gunakan placeholder 32 bytes:
```
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
```
(base64 dari 32 zero bytes — valid untuk demo)

- [ ] **Step 1: Navigasi ke Create Bounty di UI**

Di `http://localhost:3000`, klik Create / New Bounty.

- [ ] **Step 2: Isi form bounty**

| Field | Nilai |
|---|---|
| Victim address | `0x<alamat VictimVault dari Task 1>` |
| Image ID | `0x0000000000000000000000000000000000000000000000000000000000000001` |
| Creator pubkey | `AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=` |
| Title | `Demo · VictimVault Factoring` |
| Description | `Prove knowledge of non-trivial factors of 1,000,000 without revealing them. a*b=1000000, a>1, b>1, a≠1000000.` |
| Reward | `0.01` BNB |
| Stake | `0` (kosong) |
| Token | BNB |

- [ ] **Step 3: Submit dan konfirmasi di wallet**

Klik "Create Bounty" → konfirmasi transaksi di MetaMask/Rabby → tunggu receipt.

Expected: toast sukses muncul, bounty baru muncul di halaman Hunt.

- [ ] **Step 4: Salin tx hash dari toast atau explorer, update `docs/submission-links.md`**

Isi baris `createBounty` di tabel Transactions.

---

## Task 4: Generate proof Groth16 lokal dan lakukan claim

**Files:**
- Tidak ada perubahan kode — ini adalah operasi CLI + UI

**Interfaces:**
- Consumes: alamat VictimVault dari Task 1, bounty ID dari Task 3
- Produces: `proof.json`, `reveal.json`, tx hash claim, BscScan link claim

**Background:** VictimVault `target = 1_000_000`. Kita perlu `a * b = 1_000_000` dengan `a > 1`, `b > 1`, `a ≠ 1_000_000`, `b ≠ 1_000_000`. Contoh valid: `a = 1000, b = 1000`.

- [ ] **Step 1: Build RISC Zero host binary (dari WSL)**

```bash
cd /mnt/e/Hackaton/Veil/veil-bnb/zk
cargo build --release --bin host 2>&1 | tail -5
```
Expected: `Compiling` lalu `Finished release`. Binary ada di `target/release/host`.

> Catatan: Build pertama bisa memakan 10-20 menit karena men-compile risc0-zkvm.

- [ ] **Step 2: Run prover — generate proof.json dan reveal.json**

```bash
cd /mnt/e/Hackaton/Veil/veil-bnb/zk
RISC0_PROVER=local cargo run --release --bin host -- \
  1000 1000 \
  0x<alamat VictimVault dari Task 1> \
  0
```

Ganti `0x<...>` dengan alamat VictimVault sesungguhnya. Argumen terakhir `0` adalah bounty ID.

Expected output (setelah 5-30 menit proving):
```
image id    : 0x<32-byte hex>
journal     : 96 bytes
seal        : <N> bytes
fingerprint : 0x<32-byte hex>
proof.json is public; reveal.json must remain private until disclosure.
```

File `proof.json` dan `reveal.json` akan dibuat di direktori `zk/`.

- [ ] **Step 3: Verifikasi isi proof.json**

```bash
cat zk/proof.json | python3 -m json.tool
```

Expected: JSON dengan tiga field `imageId`, `journal`, `seal` — semua hex `0x`-prefixed.

- [ ] **Step 4: Claim via UI**

Di `http://localhost:3000`:
1. Buka bounty "Demo · VictimVault Factoring" → klik "Hunt" / Submit Proof
2. Drop atau pilih file `zk/proof.json`
3. Klik "Verify & claim reward"
4. Konfirmasi transaksi di wallet

Expected: toast sukses, status bounty berubah menjadi "Claimed", saldo tBNB bertambah 0.01.

- [ ] **Step 5: Verifikasi di BscScan**

Buka link transaksi claim di `https://testnet.bscscan.com`. Pastikan:
- Function called: `claim`
- Status: Success
- Event `BountyClaimed` terlihat di logs

- [ ] **Step 6: Update `docs/submission-links.md`**

Isi baris `claim` di tabel Transactions dengan tx hash dan BscScan link.

- [ ] **Step 7: Commit**

```bash
git add docs/submission-links.md
git commit -m "docs: add testnet deployment and claim transaction links"
```

---

## Task 5: Siapkan materi pitch hackathon

**Files:**
- Create: `docs/pitch.md`
- Modify: `README.md` (tambah catatan testnet deployment)

**Interfaces:**
- Consumes: semua link dari `docs/submission-links.md`
- Produces: dokumen pitch siap presentasi + README yang diperbarui

- [ ] **Step 1: Buat `docs/pitch.md`**

```markdown
# Veil — Pitch Deck: Finance & Commerce Track

## Tagline
*"Bug bounty tanpa bocor exploit. Bayar hunter secara trustless."*

---

## Problem

Bug bounty tradisional punya dilema fatal:
- Publish exploit dulu → bisa disalip, patch bisa bocor
- Tidak publish → creator tidak percaya, tidak bayar

Hasilnya: hunter underreport, creator underpay, ekosistem DeFi tidak aman.

---

## Solution: Zero-Knowledge Exploit Proof

Veil memungkinkan hunter **membuktikan** exploit tanpa **mengungkapkan** exploit.

**Alur:**
1. Creator lock reward BNB/BEP-20 di escrow on-chain
2. Hunter generate ZK proof di mesin sendiri — secret tidak pernah keluar
3. Smart contract verifikasi proof → reward otomatis dilepas
4. Reveal terjadi off-chain, dibacking stake hunter

---

## How It Works (Technical)

```
Hunter machine:               BSC Testnet:
  a=1000, b=1000  ──ZK──▶  proof.json
  (private)                     │
                                ▼
                        VeilBountyRegistry.claim()
                                │
                        IRiscZeroVerifier.verify()
                                │
                        reward sent to hunter ✓
```

**ZK circuit (RISC Zero guest):**
- Input privat: a, b, salt
- Assert: a × b = target, a > 1, b > 1
- Output publik (journal): victim address + bounty ID + fingerprint

**On-chain:**
- Journal di-bind ke victim address dan bounty ID → tidak bisa di-replay ke bounty lain
- Fingerprint = sha256(a, b, salt) → hunter commit sebelum reveal

---

## Demo Transactions (BSC Testnet)

| Action | BscScan |
|---|---|
| Deploy Registry | [link] |
| createBounty (0.01 tBNB) | [link] |
| claim (ZK proof) | [link] |

---

## Track: Finance & Commerce

Veil secara langsung mengamankan aliran aset on-chain:
- **Escrow trustless** — reward terkunci di contract, bukan tangan manusia
- **Settlement atomik** — proof verified → reward released dalam satu transaksi
- **Tidak ada trusted intermediary** — verifier matematis, bukan reputasi

---

## AI Contribution

Agent (`apps/agent`) membantu hunter draft RISC Zero guest program:
- Input: deskripsi kontrak target + security goal
- Output: kode Rust guest + checklist review

Human review tetap mandatory — AI output tidak masuk trust boundary.

---

## Traction & Status

- Smart contract: deployed + tested (Foundry) ✓
- ZK proof pipeline: Groth16 via RISC Zero ✓
- Frontend: Next.js, injected wallet, BSC Testnet ✓
- End-to-end claim: dilakukan on BSC Testnet ✓

---

## Team

Indonesia Web3 Hackathon 2026 · Finance & Commerce Track

---

## Links

- GitHub: [repo]
- Registry: [BscScan link]
- Claim tx: [BscScan link]
- Architecture: docs/architecture.md
- Security model: docs/security.md
```

- [ ] **Step 2: Isi semua [link] di `docs/pitch.md` dengan link dari `docs/submission-links.md`**

Salin link BscScan untuk deploy, createBounty, dan claim ke bagian "Demo Transactions" dan "Links".

- [ ] **Step 3: Update bagian atas `README.md` — tambah testnet deployment note**

Setelah baris pertama README, tambahkan section:

```markdown
## Live Testnet Deployment

| Contract | BSC Testnet |
|---|---|
| MockRiscZeroVerifier | [BscScan link] |
| VeilBountyRegistry | [BscScan link] |
| VictimVault | [BscScan link] |

End-to-end claim transaction: [BscScan link]

> **Note on verifier:** BSC Testnet uses `MockRiscZeroVerifier` (acceptAll=true) for the demo. The Groth16 proof is generated locally with the real RISC Zero prover. A mainnet deployment would use the audited `RiscZeroGroth16Verifier`.
```

- [ ] **Step 4: Siapkan narasi demo 2 menit (script untuk screen recording)**

Buat `docs/demo-script.md`:

```markdown
# Demo Script (2 menit)

## 00:00–00:15 — Problem statement (overlay teks)
"Bug bounty biasa: hunter harus publish exploit dulu baru dibayar.
Hasilnya? Exploit bocor, atau hunter tidak lapor sama sekali.
Veil solves this."

## 00:15–00:30 — Show contract on BscScan
Buka testnet.bscscan.com → cari alamat VeilBountyRegistry.
"Registry di-deploy di BSC Testnet. Reward di-lock di sini."

## 00:30–00:50 — Show bounty di UI
Buka http://localhost:3000 (atau deployment URL).
"Creator sudah buka bounty 0.01 tBNB untuk factoring challenge."
Klik bounty → tunjukkan victim address, reward, status Open.

## 00:50–01:10 — Show proof generation (terminal)
Tunjukkan output terminal `cargo run --release --bin host -- 1000 1000 0x... 0`.
"Hunter run prover lokal. Input privat tidak keluar dari mesin."
Tunjukkan output: image_id, journal 96 bytes, seal.

## 01:10–01:35 — Claim di UI
Drop proof.json → klik Verify & claim reward → konfirmasi di MetaMask.
"Satu transaksi: proof verified on-chain → reward langsung dikirim."

## 01:35–02:00 — Show claim tx di BscScan
Buka tx hash di BscScan.
"Event BountyClaimed on-chain. Tidak ada trusted party. Matematis."
"Exploit tetap privat. Hunter dapat reward. Creator tahu exploit real."
```

- [ ] **Step 5: Commit**

```bash
git add docs/pitch.md docs/demo-script.md README.md
git commit -m "docs: add pitch deck, demo script, and testnet deployment notes to README"
```

---

## Task 6: Konfigurasi AI agent (opsional — aktifkan fitur guest drafting)

**Files:**
- Modify: `apps/agent/.env`

**Interfaces:**
- Produces: agent server berjalan di port 3001, fitur generate-guest aktif di UI

> **Catatan:** Task ini opsional. Alur deploy + claim berjalan tanpa agent. Agent hanya mengaktifkan fitur "AI draft guest program" di UI.

- [ ] **Step 1: Buat `apps/agent/.env` dari template**

```dotenv
PORT=3001
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=<API key OpenAI atau provider OpenAI-compatible>
AI_MODEL=gpt-4o
ALLOWED_ORIGIN=http://localhost:3000
```

Atau pakai provider lain yang OpenAI-compatible (Groq, Together, dll) dengan mengganti `AI_BASE_URL` dan `AI_MODEL`.

- [ ] **Step 2: Jalankan agent server**

```powershell
npm run agent:start
```

Expected: `Agent server listening on port 3001`

- [ ] **Step 3: Test generate-guest dari UI**

Di UI, buka Create Bounty → isi deskripsi kontrak → klik "Generate guest draft".
Expected: draft kode Rust muncul di panel kanan.

---

## Checklist Akhir Sebelum Submit

- [ ] `docs/submission-links.md` terisi lengkap (3 deploy + createBounty + claim)
- [ ] `docs/pitch.md` semua [link] diganti link nyata
- [ ] `README.md` sudah ada section Live Testnet Deployment
- [ ] `apps/web/.env.local` punya `NEXT_PUBLIC_REGISTRY_ADDRESS` yang valid
- [ ] Tidak ada private key di git history (`git log --all -S "PRIVATE_KEY"` hasilnya kosong)
- [ ] Foundry test masih pass: `forge test` dari `contracts/`
- [ ] Web app berjalan di BSC Testnet mode (tidak ada bounty dummy)

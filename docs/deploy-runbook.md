# Deploy & Demo Runbook — BSC Testnet

Jalankan langkah-langkah ini secara berurutan. Semua perintah dari WSL kecuali yang berlabel **[PowerShell]**.

---

## Prasyarat

- WSL distro dengan Foundry terinstall (`~/.foundry/bin/forge`)
- Rust toolchain di WSL (sesuai `zk/rust-toolchain.toml`)
- Wallet dengan tBNB testnet (faucet: https://www.bnbchain.org/en/testnet-faucet)
- Node.js 20+ dan npm (untuk web app)
- MetaMask/Rabby di browser, BSC Testnet (chain 97) sudah ditambahkan

---

## Langkah 1 — Build prover dan dapatkan ImageID

```bash
cd /path/to/veil-bnb/zk
cargo build --release --bin host
```

> Build pertama bisa 10–30 menit. Subsequent build jauh lebih cepat.

Setelah build selesai, jalankan prover dengan witness dummy untuk mendapatkan ImageID:

```bash
# a=1000, b=1000, victim=address dummy, bountyId=0 (hanya untuk ambil ImageID)
RISC0_PROVER=local cargo run --release --bin host -- \
  1000 1000 \
  0x0000000000000000000000000000000000000001 \
  0
```

Catat nilai `image id` dari output:
```
image id    : 0x<64-char-hex>   ← SALIN INI
```

> Simpan ImageID ini — akan dipakai di Langkah 3.

---

## Langkah 2 — Deploy ke BSC Testnet

### 2a. Buat `contracts/.env`

```bash
cd /path/to/veil-bnb/contracts
cp .env.example .env
```

Edit `.env` dan isi:
```dotenv
BSC_TESTNET_RPC_URL=https://bsc-testnet-dataseed.bnbchain.org
DEPLOYER_PRIVATE_KEY=<private key hex kamu, tanpa 0x>
```

### 2b. Dry-run (tanpa broadcast)

```bash
source .env
~/.foundry/bin/forge script script/DeployTestnet.s.sol:DeployTestnet \
  --rpc-url "$BSC_TESTNET_RPC_URL" \
  --legacy
```

Expected: `Simulation complete` tanpa error.

### 2c. Broadcast deploy

```bash
~/.foundry/bin/forge script script/DeployTestnet.s.sol:DeployTestnet \
  --rpc-url "$BSC_TESTNET_RPC_URL" \
  --broadcast \
  --legacy
```

Dari output, catat tiga alamat contract:
```
# Contoh output di bagian "== Logs ==" atau "Deployed to":
MockRiscZeroVerifier : 0xAAAA...
VeilBountyRegistry   : 0xBBBB...
VictimVault          : 0xCCCC...
```

Atau cek di `contracts/broadcast/DeployTestnet.s.sol/97/run-latest.json`:
```bash
cat broadcast/DeployTestnet.s.sol/97/run-latest.json | python3 -m json.tool | grep -A2 '"contractAddress"'
```

### 2d. Update `docs/submission-links.md`

Isi tabel Deployments dengan alamat dan link BscScan:
```
https://testnet.bscscan.com/address/<alamat>
```

### 2e. Update `apps/web/.env.local`

Buka file `apps/web/.env.local` dan isi:
```dotenv
NEXT_PUBLIC_REGISTRY_ADDRESS=0x<alamat VeilBountyRegistry>
```

---

## Langkah 3 — Buat bounty via UI

**[PowerShell]** — Jalankan web app:
```powershell
npm run dev
```

Buka `http://localhost:3000` di browser.

1. Klik **Create Bounty**
2. Isi form dengan nilai berikut:

| Field | Nilai |
|---|---|
| Victim address | `0x<alamat VictimVault dari Langkah 2>` |
| Image ID | `0x<ImageID dari Langkah 1>` |
| Creator pubkey | `AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=` |
| Title | `Demo · VictimVault Factoring` |
| Description | `Prove non-trivial factors of 1,000,000 without revealing them. a*b=1000000, a>1, b>1.` |
| Reward | `0.01` BNB |
| Stake | (kosong / 0) |
| Token | BNB |

3. Klik **Create Bounty** → konfirmasi di MetaMask
4. Catat tx hash dari toast sukses atau dari MetaMask
5. Update `docs/submission-links.md` baris `createBounty`

---

## Langkah 4 — Generate proof dengan victim address dan bounty ID sesungguhnya

```bash
cd /path/to/veil-bnb/zk
RISC0_PROVER=local cargo run --release --bin host -- \
  1000 1000 \
  0x<alamat VictimVault dari Langkah 2> \
  0
```

> Bounty ID adalah `0` karena ini bounty pertama di registry.
> Proses proving Groth16 memakan 5–30 menit.

Output yang diharapkan:
```
image id    : 0x<sama dengan Langkah 1>
journal     : 96 bytes
seal        : <N> bytes
fingerprint : 0x<32-byte hex>
proof.json is public; reveal.json must remain private until disclosure.
```

File yang dihasilkan:
- `zk/proof.json` — upload ke UI untuk claim
- `zk/reveal.json` — simpan privat

Verifikasi isi proof.json:
```bash
python3 -c "import json,sys; d=json.load(open('proof.json')); print('imageId:', d['imageId'][:20]+'...'); print('journal len:', len(d['journal'])//2-1, 'bytes'); print('seal len:', len(d['seal'])//2-1, 'bytes')"
```

---

## Langkah 5 — Claim reward via UI

Di `http://localhost:3000`:

1. Buka bounty **Demo · VictimVault Factoring**
2. Klik **Submit Proof** / Hunt
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

```bash
git add docs/submission-links.md
git commit -m "docs: add testnet deployment and claim transaction links"
```

---

## Troubleshooting

### `WrongNativeValue` saat createBounty
Pastikan field Reward di UI sama persis dengan nilai yang dikirim sebagai `msg.value`. Jangan ada decimal yang salah.

### Claim gagal dengan `InvalidJournal`
Pastikan bounty ID yang dipakai saat `cargo run -- ... 0` sesuai dengan ID bounty di contract. Bounty pertama selalu ID `0`.

### Claim gagal dengan `InvalidImageId` atau `VerificationFailed`
ImageID di bounty harus sama dengan ImageID dari binary prover. Ulangi Langkah 1 setelah rebuild jika perlu.

### Forge script gagal `insufficient funds`
Pastikan wallet punya cukup tBNB. Faucet: https://www.bnbchain.org/en/testnet-faucet

### RPC timeout
Ganti RPC ke `https://data-seed-prebsc-1-s1.binance.org:8545` di `.env`.

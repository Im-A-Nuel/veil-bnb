# zk/host — Host Program

Terima input rahasia dari hunter, jalankan guest, hasilkan receipt, lalu ekspor journal dan seal EVM untuk `VeilBountyRegistry.claim()`.

- Iterasi pakai `RISC0_DEV_MODE=1` (cepat).
- Proof asli untuk demo: `RISC0_DEV_MODE=0` (butuh Docker).
- Ekspor `receipt` (journal + seal) ke file/bytes → diteruskan frontend.

Detail: lihat [CLAUDE.md](../../CLAUDE.md) §7.2.

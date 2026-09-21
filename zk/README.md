# Veil RISC Zero prover

The guest proves knowledge of non-trivial factors for the demo `VictimVault`. Its 96-byte journal is ABI-compatible with the BSC registry:

```solidity
abi.encode(victimAddress, bountyId, sha256(revealPreimage))
```

The exploit witness and salt stay private. Only the victim address, bounty id, and reveal fingerprint become public.

## Generate a proof

Install the RISC Zero toolchain and Docker, then run:

```bash
cd zk
cargo run --release --bin host -- \
  1000 1000 \
  0x1111111111111111111111111111111111111111 \
  0
```

The host writes:

- `proof.json` — public `imageId`, `journal`, and EVM-encoded Groth16 `seal`.
- `reveal.json` — private witness material and the exact preimage used by `proveReveal`.

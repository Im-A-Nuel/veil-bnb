# Veil ZK — Circom + SnarkJS prover

The circuit proves knowledge of non-trivial factors for the demo `VictimVault`:
- `a * b == 1_000_000` with `a > 1`, `b > 1`, `a < target`, `b < target`
- Fingerprint = `sha256(pad128(a) ++ pad128(b) ++ salt)` committed publicly
- Victim address and bounty ID bound as public signals

Public signals order: `[fingerprint_hi, fingerprint_lo, victim_as_uint, bountyId, target]`

## One-time setup

```powershell
npm install
node scripts/setup.mjs
```

Downloads ptau, compiles the circuit, generates `circuit_final.zkey`, exports `verification_key.json` and `contracts/src/Groth16Verifier.sol`.

## Generate a proof

```powershell
node scripts/prove.mjs 1000 1000 0x<victim-address> <bounty-id>
```

Outputs:
- `zk/proof.json` — `{ pi_a, pi_b, pi_c, publicSignals }` — upload to UI
- `zk/reveal.json` — `{ a, b, salt }` — keep private

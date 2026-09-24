# Threat model

## Protected properties

- A reward can be paid only once.
- A Groth16 proof must verify through the configured verifier.
- The public journal must bind the proof to the intended victim and bounty ID.
- Native and token accounting must match the amount requested by the caller.
- A hunter stake cannot be returned and forfeited twice.
- The private witness is not sent to the web server or chain during a normal claim.

## Contract controls

- Checks-effects-interactions plus a reentrancy guard.
- Exact native value checks.
- Balance-delta checks reject fee-on-transfer tokens.
- Explicit lifecycle and deadline checks.
- Proof signals bound to the victim address and bounty ID.
- Creator/hunter authorization on reveal settlement.
- Escape hatch based on the proof-bound SHA-256 fingerprint.

## Trust assumptions

- The configured Groth16 verifier was generated from the same final zkey used by the prover.
- The final zkey's setup transcript and verification key are reviewed before deployment.
- The victim address and bounty description identify the intended target.
- The selected BEP-20 behaves as expected and uses 18 decimals in the current UI.
- Browser wallet extensions are trusted to display and sign the requested chain transaction correctly.

## Known limits

- The AI agent can draft incorrect or unsafe assertions. Its output is advisory.
- X25519 encryption protects disclosure only if the creator stores the private key safely.
- Using the on-chain escape hatch intentionally publishes the reveal preimage.
- The contracts have tests but have not received an independent production audit.
- The frontend queries all bounties at once; pagination/indexing is needed for a large registry.

## Before mainnet

Commission an independent audit, add invariant/fuzz campaigns, pin and verify the production verifier, add token metadata/decimal discovery, introduce indexed bounty reads, and run a monitored testnet program first.

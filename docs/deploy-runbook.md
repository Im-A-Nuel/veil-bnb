# Deploy and demo runbook — BSC Testnet

This runbook is for the real Circom + SnarkJS Groth16 flow. The repository's mock-verifier script is a local/UI smoke test only.

## Before you start

- Network: BSC Testnet, chain ID `97`, native token tBNB.
- Wallet: owner-controlled deployer address funded with tBNB.
- Secrets: `contracts/.env` exists locally and is ignored by Git.
- Tools: Foundry, Node.js 20+, Circom, and the `zk` npm dependencies.

Use the detailed [deployment guide](deployment.md) for the exact commands. The required sequence is:

1. Generate `Groth16Verifier.sol` from the circuit and final zkey.
2. Generate and locally verify one proof against those artifacts.
3. Deploy `Groth16Verifier`.
4. Put its address in `GROTH16_VERIFIER`.
5. Dry-run and broadcast `Deploy.s.sol:Deploy` for `VeilBountyRegistry`.
6. Place the registry address in `apps/web/.env.local`, restart the web app, and run one small bounty end-to-end.

## Demo parameters

For the deterministic `VictimVault` demo, use the deployed vault address as `victim`, set target to `1,000,000`, and generate a proof with `a=1000` and `b=1000`. The resulting `zk/proof.json` is public; keep `zk/reveal.json` private until the reveal process requires it.

## Mandatory acceptance checks

- `forge test -vv` passes.
- Both deployed addresses have non-empty bytecode on BSC Testnet.
- `VeilBountyRegistry.verifier()` is exactly the verifier address recorded in `.env`.
- A proof verifies locally and a claim emits `BountyClaimed` on BscScan.
- `docs/submission-links.md` contains the final verifier, registry, victim, and transaction links.

## Mock-only smoke test

`DeployTestnet.s.sol` deploys `MockGroth16Verifier` with `acceptAll=true`. It may be used to test wallet wiring without proof generation, but a claim against it is not ZK verification and must not be presented as such.

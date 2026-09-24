# BSC Testnet deployment

Veil deploys to BNB Smart Chain Testnet (chain ID `97`) and uses tBNB for gas. The public RPC configured by default is `https://bsc-testnet-dataseed.bnbchain.org`; confirm the current endpoint in the [BNB Chain RPC documentation](https://docs.bnbchain.org/bnb-smart-chain/developers/json_rpc/json-rpc-endpoint/) before deploying.

## What is deployed

The real deployment has two required contracts, in this order:

1. `Groth16Verifier` generated from the exact Circom circuit and final `.zkey`.
2. `VeilBountyRegistry`, constructed with that verifier address.

The production script also deploys `VictimVault`, a deterministic demo target. `DeployTestnet.s.sol` deploys `MockGroth16Verifier`, which accepts every proof. It is useful only for a UI smoke test and must not be used for the submitted ZK demo or any funded bounty.

## Prerequisites

- Foundry in WSL (`~/.foundry/bin/forge`)
- Node.js 20+ and `circom` for the ZK setup
- tBNB in the deployer wallet
- a local `contracts/.env`, never committed

Create `contracts/.env` from the template:

```dotenv
BSC_TESTNET_RPC_URL=https://bsc-testnet-dataseed.bnbchain.org
DEPLOYER_PRIVATE_KEY=<hex private key, without 0x>
GROTH16_VERIFIER=
BSCSCAN_API_KEY=
```

`BSCSCAN_API_KEY` is optional unless source verification is requested. Never paste `DEPLOYER_PRIVATE_KEY` into chat, a web form, or a committed file.

## 1. Generate and review the verifier

From the repository root, run:

```bash
cd /mnt/f/Hack/bnb/veil-bnb/zk
npm install
node scripts/setup.mjs
```

This creates `contracts/src/Groth16Verifier.sol`, `verification_key.json`, and the proving artifacts. The generated Solidity verifier must expose `verifyProof(uint[2],uint[2][2],uint[2],uint[5])` to match `IGroth16Verifier`.

Before using it with funds, run a real proof locally and verify it:

```bash
node scripts/prove.mjs 1000 1000 0x0000000000000000000000000000000000000001 0
```

The Groth16 setup uses a circuit-specific final zkey. Keep a record of its source, contribution/transcript, and hash with the submission. A deterministic or single-party setup is suitable only for an explicitly labelled hackathon demo, not for mainnet funds.

## 2. Compile and deploy the real verifier

```bash
cd /mnt/f/Hack/bnb/veil-bnb/contracts
~/.foundry/bin/forge build
~/.foundry/bin/forge create src/Groth16Verifier.sol:Groth16Verifier \
  --rpc-url "$BSC_TESTNET_RPC_URL" \
  --private-key "$DEPLOYER_PRIVATE_KEY" \
  --legacy
```

Record the returned verifier address and write it only in your untracked `contracts/.env`:

```dotenv
GROTH16_VERIFIER=0x...
```

Confirm it is a deployed contract before continuing:

```bash
~/.foundry/bin/cast code "$GROTH16_VERIFIER" --rpc-url "$BSC_TESTNET_RPC_URL"
```

The response must be non-empty bytecode.

## 3. Dry-run then deploy the registry

```bash
cd /mnt/f/Hack/bnb/veil-bnb/contracts
~/.foundry/bin/forge test -vv
~/.foundry/bin/forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$BSC_TESTNET_RPC_URL" \
  --legacy
```

Only after the simulation succeeds, add `--broadcast` to the last command. Foundry writes transaction receipts under the ignored `broadcast/` directory. Copy the registry address into `apps/web/.env.local`:

```dotenv
NEXT_PUBLIC_CHAIN_ID=97
NEXT_PUBLIC_RPC_URL=https://bsc-testnet-dataseed.bnbchain.org
NEXT_PUBLIC_EXPLORER_URL=https://testnet.bscscan.com
NEXT_PUBLIC_REGISTRY_ADDRESS=0x...
```

Restart the web app after changing this public environment variable. Record the verifier, registry, demo vault, and transaction hashes in `docs/submission-links.md`.

## Post-deployment checks

- `cast code` returns bytecode for both contracts.
- `verifier()` on the registry equals `GROTH16_VERIFIER`.
- A tiny native-BNB bounty can be created and claimed with a proof generated from the same zkey.
- The source and deployment transaction are verified on BscScan if an API key is available.

Do not use the mock verifier with a funded bounty. Do not deploy mainnet funds before an independent audit and a proper multi-party trusted setup.

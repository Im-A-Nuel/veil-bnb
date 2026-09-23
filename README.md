# Veil BNB

Veil is a private bug-bounty protocol on BNB Smart Chain. A hunter proves an exploit with a Groth16 ZK proof (Circom + SnarkJS), the registry releases the escrowed reward, and the exploit itself stays private until the hunter chooses the reveal path.

The project targets the **Finance & Commerce** track of Indonesia Web3 Hackathon 2026: it secures on-chain asset flows and automates settlement. The guest-drafting agent adds an AI-assisted workflow without making AI output a trusted security boundary.

## Repository

| Path | Purpose |
| --- | --- |
| `apps/web` | Next.js interface, injected EVM wallet support, and BSC contract client |
| `apps/agent` | AI-assisted circuit drafting and local compiler API |
| `contracts` | Solidity escrow registry, mocks, deployment scripts, and Foundry tests |
| `zk` | Circom circuit, SnarkJS prover, and setup scripts |
| `docs` | Architecture, deployment, security, and hackathon notes |

## Quick start

Requirements: Node.js 20+, npm, circom binary (Windows — [download](https://github.com/iden3/circom/releases)), Foundry.

```powershell
npm install
copy apps\web\.env.example apps\web\.env.local
copy apps\agent\.env.example apps\agent\.env

# One-time ZK setup (compile circuit, download ptau, generate keys)
cd zk
npm install
node scripts/setup.mjs
cd ..

# Run web app
npm run dev
```

Open `http://localhost:3000`. Without `NEXT_PUBLIC_REGISTRY_ADDRESS`, the interface shows two local demo bounties.

### Generate a proof

```powershell
node zk/scripts/prove.mjs 1000 1000 0x<victim-address> <bounty-id>
# Output: zk/proof.json (upload to UI), zk/reveal.json (keep private)
```

## Local chain

Start Anvil in another terminal, deploy the mock verifier + registry + victim:

```powershell
anvil
# In another terminal:
$env:DEPLOYER_PRIVATE_KEY="YOUR_ANVIL_PRIVATE_KEY"
forge script contracts/script/DeployLocal.s.sol:DeployLocal --rpc-url http://127.0.0.1:8545 --broadcast
```

Put the deployed registry address in `apps/web/.env.local` with chain ID `31337`, then restart the web server.

## BSC Testnet deploy

See [docs/deploy-runbook.md](docs/deploy-runbook.md) for the step-by-step guide.

## Documentation

- [Circom+SnarkJS migration design](docs/superpowers/specs/2026-09-23-circom-migration-design.md)
- [Deploy runbook](docs/deploy-runbook.md)
- [Hackathon submission links](docs/submission-links.md)

Never commit a deployer key or AI provider key.

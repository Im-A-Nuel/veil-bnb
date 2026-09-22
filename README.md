# Veil BNB

Veil is a private bug-bounty protocol on BNB Smart Chain. A hunter proves an exploit with a RISC Zero receipt, the registry releases the escrowed reward, and the exploit itself stays private until the hunter chooses the reveal path.

The project targets the **Finance & Commerce** track of Indonesia Web3 Hackathon 2026: it secures on-chain asset flows and automates settlement. The guest-drafting agent adds an AI-assisted workflow without making AI output a trusted security boundary.

## Repository

| Path | Purpose |
| --- | --- |
| `apps/web` | Next.js interface, injected EVM wallet support, and BSC contract client |
| `apps/agent` | AI-assisted RISC Zero guest drafting and local compiler API |
| `contracts` | Solidity escrow registry, mocks, deployment scripts, and Foundry tests |
| `zk` | RISC Zero guest, host prover, EVM seal encoding, and ImageID tool |
| `scripts` | Local compiler and full verification helpers |
| `docs` | Architecture, deployment, security, and hackathon notes |

## Quick start from CMD

Requirements: Node.js 20+, npm, WSL distro `Ubuntu-Ext`, Foundry in WSL, and the RISC Zero toolchain.

```cmd
cd /d F:\Hack\bnb\veil-bnb
npm install
copy apps\web\.env.example apps\web\.env.local
copy apps\agent\.env.example apps\agent\.env
npm run agent:start
```

Open a second CMD window:

```cmd
cd /d F:\Hack\bnb\veil-bnb
npm run dev
```

Then open `http://localhost:3000`. Without `NEXT_PUBLIC_REGISTRY_ADDRESS`, the interface clearly uses two local demo bounties. No mock bounty is shown after a registry address is configured.

Run the complete non-destructive check from PowerShell or CMD:

```cmd
powershell -ExecutionPolicy Bypass -File scripts\check.ps1
```

## Local chain

Start Anvil in another CMD window:

```cmd
wsl -d Ubuntu-Ext --cd /mnt/f/Hack/bnb/veil-bnb/contracts --exec /home/imanuel/.foundry/bin/anvil
```

Deploy the local mock verifier, registry, victim, and token using an Anvil private key:

```cmd
wsl -d Ubuntu-Ext --cd /mnt/f/Hack/bnb/veil-bnb/contracts --exec env DEPLOYER_PRIVATE_KEY=YOUR_ANVIL_PRIVATE_KEY /home/imanuel/.foundry/bin/forge script script/DeployLocal.s.sol:DeployLocal --rpc-url http://127.0.0.1:8545 --broadcast
```

Put the deployed registry/token addresses in `apps/web/.env.local`, set chain ID `31337`, and restart the web server.

## Documentation

- [System architecture](docs/architecture.md)
- [Local development](docs/local-development.md)
- [BSC Testnet deployment](docs/deployment.md)
- [Threat model](docs/security.md)
- [Hackathon positioning](docs/hackathon.md)
- [Interface direction](DESIGN.md)

The BSC deployment is intentionally left to the repository owner. Never commit a deployer key or AI provider key.

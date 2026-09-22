# Local development

## Install

From CMD:

```cmd
cd /d F:\Hack\bnb\veil-bnb
npm install
```

Install the RISC Zero toolchain in `Ubuntu-Ext` if it is not already present:

```cmd
wsl -d Ubuntu-Ext -- bash -lc "curl -L https://risczero.com/install | bash"
wsl -d Ubuntu-Ext -- bash -lc "~/.risc0/bin/rzup install"
```

Foundry and RISC Zero are Linux tools in this repository. The web and agent processes run from Windows; only their compiler/deployment commands cross into WSL.

## Environment

`apps/web/.env.local`:

```dotenv
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_EXPLORER_URL=http://127.0.0.1:8545
NEXT_PUBLIC_REGISTRY_ADDRESS=
NEXT_PUBLIC_USDT_ADDRESS=
AGENT_URL=http://127.0.0.1:3001
```

`apps/agent/.env`:

```dotenv
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=
AI_MODEL=
ALLOWED_ORIGIN=http://localhost:3000
WSL_DISTRO=Ubuntu-Ext
```

`AI_BASE_URL` may point at any provider implementing the OpenAI-compatible chat completions endpoint. The agent returns `503` until the three AI settings are supplied; contract and manual guest flows remain usable.

## Run

Terminal 1:

```cmd
npm run agent:start
```

Terminal 2:

```cmd
npm run dev
```

Terminal 3, optional local chain:

```cmd
wsl -d Ubuntu-Ext --cd /mnt/f/Hack/bnb/veil-bnb/contracts --exec /home/imanuel/.foundry/bin/anvil
```

## Tests

```cmd
powershell -ExecutionPolicy Bypass -File scripts\check.ps1
```

Individual commands:

```cmd
npm run test:agent
npm run typecheck
npm run build
wsl -d Ubuntu-Ext --cd /mnt/f/Hack/bnb/veil-bnb/contracts --exec /home/imanuel/.foundry/bin/forge test -vv
wsl -d Ubuntu-Ext --cd /mnt/f/Hack/bnb/veil-bnb/zk --exec env PATH=/home/imanuel/.cargo/bin:/home/imanuel/.risc0/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin cargo check
```

Generate the current ImageID without creating a proof:

```cmd
wsl -d Ubuntu-Ext --cd /mnt/f/Hack/bnb/veil-bnb --exec env PATH=/home/imanuel/.cargo/bin:/home/imanuel/.risc0/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin bash scripts/compile-guest.sh zk/methods/guest/src/main.rs
```

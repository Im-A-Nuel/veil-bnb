# BSC Testnet deployment

## Network

- Chain: BNB Smart Chain Testnet
- Chain ID: `97`
- Native token: `tBNB`
- Public RPC: `https://bsc-testnet-dataseed.bnbchain.org`
- Explorer: `https://testnet.bscscan.com`

Use the current endpoints published in the [BNB Chain wallet configuration guide](https://docs.bnbchain.org/bnb-smart-chain/developers/wallet-configuration/).

## Verifier prerequisite

`VeilBountyRegistry` requires a contract implementing the RISC Zero `IRiscZeroVerifier` ABI. Do not use `MockRiscZeroVerifier` outside local development.

RISC Zero keeps its supported network/router addresses in the `risc0-ethereum` deployment manifest. BSC is not assumed by this repository: confirm the current manifest and either use a verified compatible deployment or deploy the released verifier/router contracts to BSC Testnet first. See the official [RISC Zero EVM contracts repository](https://github.com/risc0/risc0-ethereum) and its [deployment scripts](https://github.com/risc0/risc0-ethereum/blob/main/contracts/script/README.md).

## Deploy registry

Copy `contracts/.env.example` to `contracts/.env` and fill in:

```dotenv
BSC_TESTNET_RPC_URL=https://bsc-testnet-dataseed.bnbchain.org
DEPLOYER_PRIVATE_KEY=
RISC0_VERIFIER=
```

Then run from WSL:

```bash
cd /mnt/f/Hack/bnb/veil-bnb/contracts
source .env
~/.foundry/bin/forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$BSC_TESTNET_RPC_URL" \
  --broadcast \
  --legacy
```

The script deploys the registry and a sample `VictimVault`. Record the emitted addresses, then set the web environment:

```dotenv
NEXT_PUBLIC_CHAIN_ID=97
NEXT_PUBLIC_RPC_URL=https://bsc-testnet-dataseed.bnbchain.org
NEXT_PUBLIC_EXPLORER_URL=https://testnet.bscscan.com
NEXT_PUBLIC_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_USDT_ADDRESS=0x...
```

`NEXT_PUBLIC_USDT_ADDRESS` is optional until a USDT bounty is created. Confirm token address and decimals independently; the current UI expects 18 decimals.

## Owner checklist

- Fund the deployer with testnet tBNB.
- Verify the verifier/router source and version.
- Dry-run the Foundry script before `--broadcast`.
- Deploy from an owner-controlled key; never paste it into the web app.
- Run one small native bounty end to end before using a BEP-20.
- Publish registry, verifier, ImageID, and transaction links with the submission.

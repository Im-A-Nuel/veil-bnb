# Veil contracts

The registry targets BNB Smart Chain and uses native BNB or a standard BEP-20 token for rewards and hunter stakes. It verifies RISC Zero receipts through the official `IRiscZeroVerifier` ABI.

## Local test

Run Foundry from WSL:

```bash
cd /mnt/f/Hack/bnb/veil-bnb/contracts
/home/imanuel/.foundry/bin/forge test -vv
```

## BSC Testnet deployment

Copy `.env.example` to `.env`, supply the deployer key and a RISC Zero verifier/router deployed for BSC Testnet, then run:

```bash
source .env
forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$BSC_TESTNET_RPC_URL" \
  --broadcast \
  --legacy
```

`RISC0_VERIFIER` is deliberately not hard-coded. RISC Zero does not list an official BSC deployment in its current deployment manifest, so the deployer must first deploy or independently verify a compatible router/verifier address.


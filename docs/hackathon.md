# Hackathon positioning

Indonesia Web3 Hackathon 2026 describes three tracks: AI Agents, Finance & Commerce, and Consumer Apps, with a USD 5,000 prize pool. The event is presented as an AI x Web3 program supported by Binance Academy and BNB Chain. See the [event listing](https://luma.com/pcc699dv).

## Primary track: Finance & Commerce

Veil protects commercial smart-contract flows by replacing trust-based vulnerability payouts with an on-chain escrow:

- the creator locks BNB or a BEP-20 reward;
- a hunter proves a valid exploit without publishing the witness;
- the verifier and registry settle the reward atomically;
- a stake-backed private reveal gives both parties a completion path.

## AI contribution

The agent turns a contract address, security goal, and risk description into a structured RISC Zero guest draft and review checklist. The draft is compiled locally to an ImageID. Human review remains mandatory, which keeps probabilistic model output outside the payout trust boundary.

## Demo sequence

1. Show a creator generating a reveal key and opening a native BNB bounty.
2. Show the published victim, ImageID, reward, and stake on BSC Testnet.
3. Generate or review the guest rule and compile its ImageID.
4. Run the prover locally with the private witness.
5. Upload only `proof.json` and claim the reward.
6. Show the registry transaction on BscScan.
7. Encrypt `reveal.json` to the creator and confirm the stake return.
8. Explain the on-chain escape hatch and its privacy tradeoff.

## Submission evidence

- GitHub history with implementation stages.
- Foundry test output.
- RISC Zero ImageID and successful compiler output.
- BSC Testnet deployment and claim transactions.
- Two-minute demo video following the sequence above.
- Architecture and threat-model links from this repository.

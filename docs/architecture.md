# Architecture

## Components

```text
Creator browser                         Hunter machine
     |                                      |
     | create bounty + escrow               | run zk/host with private witness
     v                                      v
Injected EVM wallet                  RISC Zero guest + prover
     |                                      |
     | signed BSC transaction               | proof.json: ImageID, journal, seal
     +------------------+-------------------+
                        v
              VeilBountyRegistry
                  |          |
                  | verify   | release reward / hold stake
                  v          v
          IRiscZeroVerifier  BNB or BEP-20

Optional authoring path:
contract description -> apps/agent -> guest draft -> local compiler -> ImageID
```

`VeilBountyRegistry` is the settlement boundary. It accepts native BNB or a standard BEP-20, checks the receipt through `IRiscZeroVerifier`, binds the journal to the victim and bounty ID, and pays the hunter in the same claim transaction.

## Canonical journal

The guest commits exactly 96 bytes, identical to:

```solidity
abi.encode(address(victim), uint256(bountyId), bytes32(fingerprint))
```

The fingerprint is `sha256(abi.encode(uint256(a), uint256(b), bytes32(salt)))`. The registry rejects journals with the wrong length, victim, bounty ID, or a zero fingerprint before calling the verifier.

## Reveal and stake lifecycle

1. The creator opens and funds a bounty.
2. A hunter proves the exploit and optionally deposits a stake.
3. The reward is paid immediately after proof verification.
4. The hunter encrypts `reveal.json` to the creator's X25519 public key.
5. The creator confirms the reveal and the contract returns the stake.
6. If the creator does not cooperate, the hunter can reveal the preimage on-chain during the escape window. This recovers the stake but makes the witness public.
7. If the reveal deadline passes, anyone can trigger forfeiture of the stake to the creator.

## AI boundary

The agent only drafts guest code and review notes. Its output is validated structurally and compiled locally, but it is not treated as an audit. The creator must review the assertion logic before publishing the resulting ImageID.

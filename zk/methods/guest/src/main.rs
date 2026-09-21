use risc0_zkvm::guest::env;
use risc0_zkvm::sha::{Impl, Sha256};

fn main() {
    // Private witness. These values never enter the journal.
    let a: u128 = env::read();
    let b: u128 = env::read();
    let salt: [u8; 32] = env::read();

    // Public claim binding supplied by the host and checked again by Solidity.
    let victim: [u8; 20] = env::read();
    let bounty_id: u64 = env::read();

    let target: u128 = 1_000_000;
    assert!(a.checked_mul(b) == Some(target), "a*b != target");
    assert!(a != 1 && b != 1, "trivial factorization");
    assert!(a != target && b != target, "trivial factorization");

    // The reveal preimage is Solidity abi.encode(uint256(a), uint256(b), bytes32(salt)).
    let mut reveal_preimage = [0u8; 96];
    reveal_preimage[16..32].copy_from_slice(&a.to_be_bytes());
    reveal_preimage[48..64].copy_from_slice(&b.to_be_bytes());
    reveal_preimage[64..96].copy_from_slice(&salt);
    let digest = Impl::hash_bytes(&reveal_preimage);
    let fingerprint: [u8; 32] = digest.as_bytes().try_into().unwrap();

    // Solidity decodes this exact byte sequence as (address, uint256, bytes32).
    let mut journal = [0u8; 96];
    journal[12..32].copy_from_slice(&victim);
    journal[56..64].copy_from_slice(&bounty_id.to_be_bytes());
    journal[64..96].copy_from_slice(&fingerprint);
    env::commit_slice(&journal);
}

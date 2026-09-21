use methods::{GUEST_ELF, GUEST_ID};
use rand::RngCore;
use risc0_ethereum_contracts::encode_seal;
use risc0_zkvm::{default_prover, sha::Digest as Risc0Digest, ExecutorEnv, ProverOpts};
use sha2::{Digest, Sha256};
use std::fs;

fn parse_address(value: &str) -> [u8; 20] {
    let bytes =
        hex::decode(value.trim_start_matches("0x")).expect("victim must be a hex EVM address");
    bytes
        .try_into()
        .expect("victim must contain exactly 20 bytes")
}

fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::filter::EnvFilter::from_default_env())
        .init();

    let args: Vec<String> = std::env::args().collect();
    if args.len() < 5 {
        eprintln!("usage: host <a> <b> <victim-address> <bounty-id> [salt-hex]");
        std::process::exit(2);
    }

    let a: u128 = args[1].parse().expect("a must be an unsigned integer");
    let b: u128 = args[2].parse().expect("b must be an unsigned integer");
    let victim = parse_address(&args[3]);
    let bounty_id: u64 = args[4]
        .parse()
        .expect("bounty id must be an unsigned integer");
    let salt: [u8; 32] = match args.get(5).and_then(|value| hex::decode(value).ok()) {
        Some(value) if value.len() == 32 => value.try_into().unwrap(),
        _ => {
            let mut value = [0u8; 32];
            rand::thread_rng().fill_bytes(&mut value);
            value
        }
    };

    let mut reveal_preimage = [0u8; 96];
    reveal_preimage[16..32].copy_from_slice(&a.to_be_bytes());
    reveal_preimage[48..64].copy_from_slice(&b.to_be_bytes());
    reveal_preimage[64..96].copy_from_slice(&salt);
    let fingerprint = Sha256::digest(reveal_preimage);

    let exec_env = ExecutorEnv::builder()
        .write(&a)
        .unwrap()
        .write(&b)
        .unwrap()
        .write(&salt)
        .unwrap()
        .write(&victim)
        .unwrap()
        .write(&bounty_id)
        .unwrap()
        .build()
        .unwrap();

    println!("Creating a Groth16 receipt. This requires the RISC Zero prover runtime.");
    let receipt = default_prover()
        .prove_with_opts(exec_env, GUEST_ELF, &ProverOpts::groth16())
        .expect("proof generation failed")
        .receipt;
    receipt
        .verify(GUEST_ID)
        .expect("receipt verification failed");

    let seal = encode_seal(&receipt).expect("EVM seal encoding failed");
    let journal = receipt.journal.bytes.clone();
    let image_id: [u8; 32] = Risc0Digest::from(GUEST_ID).as_bytes().try_into().unwrap();

    let proof = format!(
        "{{\"imageId\":\"0x{}\",\"journal\":\"0x{}\",\"seal\":\"0x{}\"}}",
        hex::encode(image_id),
        hex::encode(&journal),
        hex::encode(&seal)
    );
    fs::write("proof.json", proof).expect("unable to write proof.json");

    let reveal = format!(
        "{{\"a\":\"{}\",\"b\":\"{}\",\"salt\":\"0x{}\",\"preimage\":\"0x{}\"}}",
        a,
        b,
        hex::encode(salt),
        hex::encode(reveal_preimage)
    );
    fs::write("reveal.json", reveal).expect("unable to write reveal.json");

    println!("image id    : 0x{}", hex::encode(image_id));
    println!("journal     : {} bytes", journal.len());
    println!("seal        : {} bytes", seal.len());
    println!("fingerprint : 0x{}", hex::encode(fingerprint));
    println!("proof.json is public; reveal.json must remain private until disclosure.");
}

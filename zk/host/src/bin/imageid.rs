// Cetak ImageID (GUEST_ID) guest kita — dipakai sebagai `image_id` di bounty-verifier.
// Jalankan: cargo run --release --bin imageid
use methods::GUEST_ID;
use risc0_zkvm::sha::Digest;

fn main() {
    let digest = Digest::from(GUEST_ID);
    println!("ImageID (hex)   : {}", digest);
    println!("ImageID ([u32;8]): {:?}", GUEST_ID);
}

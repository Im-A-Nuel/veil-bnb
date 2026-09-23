pragma circom 2.1.9;

include "../node_modules/circomlib/circuits/sha256/sha256.circom";

// Compute sha256 of 768 bits = pad128(a)[256] ++ pad128(b)[256] ++ salt[256]
// where pad128(x) = 128 zero bits ++ x as 128-bit big-endian
template Sha256_3x256() {
    signal input a_bits[256];  // pad128(a): bits[0..127]=0, bits[128..255]=a
    signal input b_bits[256];  // pad128(b): bits[0..127]=0, bits[128..255]=b
    signal input salt[256];    // 256 random bits

    signal output out[256];    // sha256 digest bits

    component sha = Sha256(768);

    for (var i = 0; i < 256; i++) {
        sha.in[i]       <== a_bits[i];
        sha.in[256 + i] <== b_bits[i];
        sha.in[512 + i] <== salt[i];
    }

    for (var i = 0; i < 256; i++) {
        out[i] <== sha.out[i];
    }
}

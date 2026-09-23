// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Interface untuk Groth16 verifier yang di-generate snarkjs.
/// @dev Signature verifyProof harus cocok persis dengan output snarkjs exportSolidityVerifier.
interface IGroth16Verifier {
    function verifyProof(
        uint[2] calldata pi_a,
        uint[2][2] calldata pi_b,
        uint[2] calldata pi_c,
        uint[5] calldata pubSignals
    ) external view returns (bool);
}

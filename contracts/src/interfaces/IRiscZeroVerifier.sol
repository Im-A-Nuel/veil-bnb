// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

/// @notice Minimal interface implemented by the RISC Zero verifier and verifier router.
interface IRiscZeroVerifier {
    /// @dev Reverts when the seal does not prove a successful execution for the image and journal.
    function verify(bytes calldata seal, bytes32 imageId, bytes32 journalDigest) external view;
}


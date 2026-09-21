// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IRiscZeroVerifier } from "../interfaces/IRiscZeroVerifier.sol";

contract MockRiscZeroVerifier is IRiscZeroVerifier {
    error VerificationFailed();

    bool public acceptAll;
    mapping(bytes32 claimKey => bool) public accepted;

    function setAcceptAll(bool value) external {
        acceptAll = value;
    }

    function setAccepted(bytes32 imageId, bytes32 journalDigest, bool value) external {
        accepted[keccak256(abi.encode(imageId, journalDigest))] = value;
    }

    function verify(bytes calldata, bytes32 imageId, bytes32 journalDigest) external view {
        if (!acceptAll && !accepted[keccak256(abi.encode(imageId, journalDigest))]) {
            revert VerificationFailed();
        }
    }
}


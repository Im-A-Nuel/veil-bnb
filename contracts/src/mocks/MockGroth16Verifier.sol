// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IGroth16Verifier } from "../interfaces/IGroth16Verifier.sol";

contract MockGroth16Verifier is IGroth16Verifier {
    bool public acceptAll;

    function setAcceptAll(bool value) external {
        acceptAll = value;
    }

    function verifyProof(
        uint[2] calldata,
        uint[2][2] calldata,
        uint[2] calldata,
        uint[5] calldata
    ) external view returns (bool) {
        return acceptAll;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Deterministic vulnerable target used only for the end-to-end demo.
contract VictimVault {
    uint256 public immutable target;

    constructor(uint256 target_) {
        target = target_;
    }

    function isBroken(uint256 a, uint256 b) external view returns (bool) {
        if (a == 1 || b == 1 || a == target || b == target) return false;
        unchecked {
            if (a != 0 && b > type(uint256).max / a) return false;
            return a * b == target;
        }
    }
}


// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { VeilBountyRegistry } from "../src/VeilBountyRegistry.sol";
import { IRiscZeroVerifier } from "../src/interfaces/IRiscZeroVerifier.sol";

interface VmScript {
    function envAddress(string calldata name) external view returns (address);
    function envUint(string calldata name) external view returns (uint256);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

contract Deploy {
    VmScript private constant vm = VmScript(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run() external returns (VeilBountyRegistry registry) {
        uint256 privateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address verifier = vm.envAddress("RISC0_VERIFIER");

        vm.startBroadcast(privateKey);
        registry = new VeilBountyRegistry(IRiscZeroVerifier(verifier));
        vm.stopBroadcast();
    }
}


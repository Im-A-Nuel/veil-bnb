// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Groth16Verifier } from "../src/Groth16Verifier.sol";

interface VmVerifier {
    function envUint(string calldata name) external view returns (uint256);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

contract DeployGroth16Verifier {
    VmVerifier private constant vm = VmVerifier(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run() external returns (Groth16Verifier verifier) {
        uint256 privateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(privateKey);
        verifier = new Groth16Verifier();
        vm.stopBroadcast();
    }
}

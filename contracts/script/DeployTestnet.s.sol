// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { VeilBountyRegistry } from "../src/VeilBountyRegistry.sol";
import { VictimVault } from "../src/VictimVault.sol";
import { IGroth16Verifier } from "../src/interfaces/IGroth16Verifier.sol";
import { MockGroth16Verifier } from "../src/mocks/MockGroth16Verifier.sol";

interface VmTestnet {
    function envUint(string calldata name) external view returns (uint256);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

contract DeployTestnet {
    VmTestnet private constant vm =
        VmTestnet(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run()
        external
        returns (
            MockGroth16Verifier verifier,
            VeilBountyRegistry registry,
            VictimVault victim
        )
    {
        uint256 privateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(privateKey);
        verifier = new MockGroth16Verifier();
        verifier.setAcceptAll(true);
        registry = new VeilBountyRegistry(IGroth16Verifier(address(verifier)));
        victim = new VictimVault(1_000_000);
        vm.stopBroadcast();
    }
}

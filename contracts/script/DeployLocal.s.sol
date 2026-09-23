// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { VeilBountyRegistry } from "../src/VeilBountyRegistry.sol";
import { VictimVault } from "../src/VictimVault.sol";
import { MockERC20 } from "../src/mocks/MockERC20.sol";
import { IGroth16Verifier } from "../src/interfaces/IGroth16Verifier.sol";
import { MockGroth16Verifier } from "../src/mocks/MockGroth16Verifier.sol";

interface VmLocalScript {
    function envUint(string calldata name) external view returns (uint256);
    function addr(uint256 privateKey) external view returns (address);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

contract DeployLocal {
    VmLocalScript private constant vm =
        VmLocalScript(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run()
        external
        returns (
            MockGroth16Verifier verifier,
            VeilBountyRegistry registry,
            VictimVault victim,
            MockERC20 token
        )
    {
        uint256 privateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(privateKey);

        vm.startBroadcast(privateKey);
        verifier = new MockGroth16Verifier();
        verifier.setAcceptAll(true);
        registry = new VeilBountyRegistry(IGroth16Verifier(address(verifier)));
        victim = new VictimVault(1_000_000);
        token = new MockERC20();
        token.mint(deployer, 1_000_000 ether);
        vm.stopBroadcast();
    }
}

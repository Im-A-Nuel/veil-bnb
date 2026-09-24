// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { VeilBountyRegistry } from "../src/VeilBountyRegistry.sol";
import { VictimVault } from "../src/VictimVault.sol";
import { MockERC20 } from "../src/mocks/MockERC20.sol";
import { MockGroth16Verifier } from "../src/mocks/MockGroth16Verifier.sol";

interface Vm {
    function deal(address who, uint256 newBalance) external;
    function prank(address msgSender) external;
    function startPrank(address msgSender) external;
    function stopPrank() external;
    function warp(uint256 newTimestamp) external;
    function expectRevert(bytes4 selector) external;
}

contract VeilBountyRegistryTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    MockGroth16Verifier private proofVerifier;
    VeilBountyRegistry private registry;
    VictimVault private victim;
    MockERC20 private token;

    address private constant CREATOR = address(0xC0FFEE);
    address private constant HUNTER = address(0xB0B);
    address private constant KEEPER = address(0xCAFE);
    bytes32 private constant VK_HASH = keccak256("veil-demo-vk");
    bytes32 private constant PUBKEY = keccak256("creator-reveal-key");
    uint256 private constant REWARD = 5 ether;
    uint256 private constant STAKE = 1 ether;

    // Dummy proof values — verifier is MockGroth16Verifier with acceptAll=true
    uint[2] private PI_A = [uint(1), 2];
    uint[2][2] private PI_B = [[uint(3), 4], [uint(5), 6]];
    uint[2] private PI_C = [uint(7), 8];

    function setUp() public {
        proofVerifier = new MockGroth16Verifier();
        registry = new VeilBountyRegistry(proofVerifier);
        victim = new VictimVault(1_000_000);
        token = new MockERC20();
        vm.deal(CREATOR, 100 ether);
        vm.deal(HUNTER, 20 ether);
        token.mint(CREATOR, 100 ether);
        token.mint(HUNTER, 20 ether);
    }

    function testCreateAndReadNativeBounty() public {
        uint256 id = _createNative(REWARD, STAKE, uint64(block.timestamp + 7 days));
        VeilBountyRegistry.Bounty memory bounty = registry.getBounty(id);

        _assertEq(id, 0);
        _assertEq(registry.bountyCount(), 1);
        _assertEq(bounty.creator, CREATOR);
        _assertEq(bounty.victim, address(victim));
        _assertEq(bounty.rewardAmount, REWARD);
        _assertEq(uint256(bounty.status), uint256(VeilBountyRegistry.Status.Open));
        _assertEq(address(registry).balance, REWARD);
    }

    function testRejectsIncorrectNativeFunding() public {
        VeilBountyRegistry.CreateParams memory params = _params(address(0), REWARD, STAKE, 0);
        vm.prank(CREATOR);
        vm.expectRevert(VeilBountyRegistry.WrongNativeValue.selector);
        registry.createBounty{ value: REWARD - 1 }(params);
    }

    function testRejectsVerifierAddressWithoutCode() public {
        vm.expectRevert(VeilBountyRegistry.VerifierHasNoCode.selector);
        new VeilBountyRegistry(MockGroth16Verifier(address(0xBEEF)));
    }

    function testClaimPaysRewardAndLocksStake() public {
        uint256 id = _createNative(REWARD, STAKE, 0);
        proofVerifier.setAcceptAll(true);

        // pubSignals: [fp_hi, fp_lo, victim_uint, bountyId, target]
        uint[5] memory pubSignals = [
            uint(1),              // fingerprint_hi (non-zero)
            uint(2),              // fingerprint_lo
            uint160(address(victim)), // victim_as_uint
            id,                   // bountyId
            uint(1_000_000)       // target
        ];

        uint256 beforeBalance = HUNTER.balance;
        vm.prank(HUNTER);
        registry.claim{ value: STAKE }(id, PI_A, PI_B, PI_C, pubSignals);

        VeilBountyRegistry.Bounty memory bounty = registry.getBounty(id);
        _assertEq(HUNTER.balance, beforeBalance - STAKE + REWARD);
        _assertEq(address(registry).balance, STAKE);
        _assertEq(bounty.hunter, HUNTER);
        _assertEq(uint256(bounty.status), uint256(VeilBountyRegistry.Status.Claimed));
    }

    function testRejectsJournalBoundToDifferentVictim() public {
        uint256 id = _createNative(REWARD, STAKE, 0);
        proofVerifier.setAcceptAll(true);

        // victim_as_uint points to wrong address
        uint[5] memory pubSignals = [
            uint(1),
            uint(2),
            uint160(address(0xBAD)), // wrong victim
            id,
            uint(1_000_000)
        ];

        vm.prank(HUNTER);
        vm.expectRevert(VeilBountyRegistry.InvalidJournal.selector);
        registry.claim{ value: STAKE }(id, PI_A, PI_B, PI_C, pubSignals);
    }

    function testRejectsProofWhenVerifierReturnsFalse() public {
        uint256 id = _createNative(REWARD, STAKE, 0);
        // proofVerifier.acceptAll is false by default

        uint[5] memory pubSignals = [
            uint(1),
            uint(2),
            uint160(address(victim)),
            id,
            uint(1_000_000)
        ];

        vm.prank(HUNTER);
        vm.expectRevert(VeilBountyRegistry.InvalidJournal.selector);
        registry.claim{ value: STAKE }(id, PI_A, PI_B, PI_C, pubSignals);
    }

    function testCreatorConfirmationReturnsStake() public {
        uint256 id = _claimedNativeBounty();
        uint256 beforeBalance = HUNTER.balance;

        vm.prank(CREATOR);
        registry.confirmReveal(id);

        VeilBountyRegistry.Bounty memory bounty = registry.getBounty(id);
        _assertEq(HUNTER.balance, beforeBalance + STAKE);
        _assertTrue(bounty.revealed);
        _assertEq(address(registry).balance, 0);
    }

    function testHunterCanUseEscapeWindow() public {
        uint256 id = _createNative(REWARD, STAKE, 0);
        proofVerifier.setAcceptAll(true);

        bytes memory reveal = abi.encode(uint256(1000), uint256(1000), bytes32("private salt"));
        bytes32 fingerprint = sha256(reveal);

        // fingerprint_hi = upper 128 bits, fingerprint_lo = lower 128 bits
        uint256 fp = uint256(fingerprint);
        uint fpHi = fp >> 128;
        uint fpLo = fp & ((1 << 128) - 1);

        uint[5] memory pubSignals = [
            fpHi,
            fpLo,
            uint160(address(victim)),
            id,
            uint(1_000_000)
        ];

        vm.prank(HUNTER);
        registry.claim{ value: STAKE }(id, PI_A, PI_B, PI_C, pubSignals);
        VeilBountyRegistry.Bounty memory claimed = registry.getBounty(id);

        vm.warp(uint256(claimed.claimedAt) + claimed.revealWindow - claimed.escapeWindow);
        uint256 beforeBalance = HUNTER.balance;
        vm.prank(HUNTER);
        registry.proveReveal(id, reveal);

        _assertEq(HUNTER.balance, beforeBalance + STAKE);
        _assertTrue(registry.getBounty(id).revealed);
    }

    function testInvalidEscapeRevealReverts() public {
        uint256 id = _claimedNativeBounty();
        VeilBountyRegistry.Bounty memory claimed = registry.getBounty(id);
        vm.warp(uint256(claimed.claimedAt) + claimed.revealWindow - claimed.escapeWindow);

        vm.prank(HUNTER);
        vm.expectRevert(VeilBountyRegistry.InvalidReveal.selector);
        registry.proveReveal(id, bytes("wrong preimage"));
    }

    function testAnyoneCanForfeitStakeAfterDeadline() public {
        uint256 id = _claimedNativeBounty();
        VeilBountyRegistry.Bounty memory claimed = registry.getBounty(id);
        vm.warp(uint256(claimed.claimedAt) + claimed.revealWindow);
        uint256 beforeBalance = CREATOR.balance;

        vm.prank(KEEPER);
        registry.forfeitStake(id);

        _assertEq(CREATOR.balance, beforeBalance + STAKE);
        _assertTrue(registry.getBounty(id).forfeited);
    }

    function testCreatorWithdrawsExpiredBounty() public {
        uint64 expiry = uint64(block.timestamp + 1 days);
        uint256 id = _createNative(REWARD, STAKE, expiry);
        vm.warp(expiry);
        uint256 beforeBalance = CREATOR.balance;

        vm.prank(CREATOR);
        registry.withdrawExpired(id);

        _assertEq(CREATOR.balance, beforeBalance + REWARD);
        _assertEq(uint256(registry.getBounty(id).status), uint256(VeilBountyRegistry.Status.Refunded));
    }

    function testTokenBountyLifecycle() public {
        VeilBountyRegistry.CreateParams memory params = _params(address(token), REWARD, STAKE, 0);
        vm.startPrank(CREATOR);
        token.approve(address(registry), REWARD);
        uint256 id = registry.createBounty(params);
        vm.stopPrank();

        proofVerifier.setAcceptAll(true);

        uint[5] memory pubSignals = [
            uint(1),
            uint(2),
            uint160(address(victim)),
            id,
            uint(1_000_000)
        ];

        vm.startPrank(HUNTER);
        token.approve(address(registry), STAKE);
        uint256 hunterBefore = token.balanceOf(HUNTER);
        registry.claim(id, PI_A, PI_B, PI_C, pubSignals);
        vm.stopPrank();

        _assertEq(token.balanceOf(HUNTER), hunterBefore - STAKE + REWARD);
        _assertEq(token.balanceOf(address(registry)), STAKE);

        vm.prank(CREATOR);
        registry.confirmReveal(id);
        _assertEq(token.balanceOf(HUNTER), hunterBefore + REWARD);
        _assertEq(token.balanceOf(address(registry)), 0);
    }

    function testVictimDemoUsesCheckedMultiplication() public view {
        _assertTrue(victim.isBroken(1000, 1000));
        _assertFalse(victim.isBroken(1, 1_000_000));
        _assertFalse(victim.isBroken(type(uint256).max, 2));
    }

    function _claimedNativeBounty() private returns (uint256 id) {
        id = _createNative(REWARD, STAKE, 0);
        proofVerifier.setAcceptAll(true);

        bytes memory reveal = abi.encode(uint256(1000), uint256(1000), bytes32("secret salt"));
        bytes32 fingerprint = sha256(reveal);
        uint256 fp = uint256(fingerprint);
        uint fpHi = fp >> 128;
        uint fpLo = fp & ((1 << 128) - 1);

        uint[5] memory pubSignals = [
            fpHi,
            fpLo,
            uint160(address(victim)),
            id,
            uint(1_000_000)
        ];

        vm.prank(HUNTER);
        registry.claim{ value: STAKE }(id, PI_A, PI_B, PI_C, pubSignals);
    }

    function _createNative(uint256 reward, uint256 stake, uint64 expiry) private returns (uint256 id) {
        VeilBountyRegistry.CreateParams memory params = _params(address(0), reward, stake, expiry);
        vm.prank(CREATOR);
        id = registry.createBounty{ value: reward }(params);
    }

    function _params(address rewardToken, uint256 reward, uint256 stake, uint64 expiry)
        private
        view
        returns (VeilBountyRegistry.CreateParams memory)
    {
        return VeilBountyRegistry.CreateParams({
            victim: address(victim),
            token: rewardToken,
            rewardAmount: reward,
            stakeAmount: stake,
            vkHash: VK_HASH,
            creatorPubkey: PUBKEY,
            revealWindow: stake == 0 ? 0 : 1 hours,
            escapeWindow: stake == 0 ? 0 : 15 minutes,
            expiresAt: expiry,
            title: "Factoring guard",
            description: "Prove knowledge of non-trivial factors without publishing them."
        });
    }

    function _assertEq(uint256 a, uint256 b) private pure {
        require(a == b, "uint mismatch");
    }

    function _assertEq(address a, address b) private pure {
        require(a == b, "address mismatch");
    }

    function _assertEq(bytes32 a, bytes32 b) private pure {
        require(a == b, "bytes32 mismatch");
    }

    function _assertTrue(bool value) private pure {
        require(value, "expected true");
    }

    function _assertFalse(bool value) private pure {
        require(!value, "expected false");
    }
}

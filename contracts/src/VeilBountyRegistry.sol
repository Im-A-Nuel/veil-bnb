// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "./interfaces/IERC20.sol";
import { IGroth16Verifier } from "./interfaces/IGroth16Verifier.sol";
import { SafeTransferLib } from "./libraries/SafeTransferLib.sol";

/// @title VeilBountyRegistry
/// @notice Escrows bug bounties and settles valid private exploit proofs on EVM chains.
contract VeilBountyRegistry {
    using SafeTransferLib for address;

    enum Status {
        Open,
        Claimed,
        Refunded
    }

    struct CreateParams {
        address victim;
        address token;
        uint256 rewardAmount;
        uint256 stakeAmount;
        bytes32 vkHash;
        bytes32 creatorPubkey;
        uint64 revealWindow;
        uint64 escapeWindow;
        uint64 expiresAt;
        string title;
        string description;
    }

    struct Bounty {
        address creator;
        address victim;
        address token;
        uint256 rewardAmount;
        uint256 stakeAmount;
        bytes32 vkHash;
        bytes32 creatorPubkey;
        bytes32 fingerprint;
        address hunter;
        uint64 revealWindow;
        uint64 escapeWindow;
        uint64 expiresAt;
        uint64 claimedAt;
        Status status;
        bool revealed;
        bool forfeited;
        string title;
        string description;
    }

    error InvalidVerifier();
    error VerifierHasNoCode();
    error InvalidVictim();
    error InvalidImageId();
    error InvalidReward();
    error InvalidWindow();
    error InvalidExpiry();
    error EmptyTitle();
    error WrongNativeValue();
    error UnsupportedFeeToken();
    error BountyNotFound();
    error BountyNotOpen();
    error BountyExpired();
    error BountyNotExpired();
    error NotCreator();
    error NotHunter();
    error InvalidJournal();
    error InvalidReveal();
    error EscapeWindowClosed();
    error RevealDeadlineOpen();
    error StakeAlreadyResolved();
    error NoStake();
    error ReentrantCall();

    event BountyCreated(
        uint256 indexed bountyId,
        address indexed creator,
        address indexed victim,
        address token,
        uint256 rewardAmount,
        bytes32 vkHash
    );
    event BountyFunded(uint256 indexed bountyId, address indexed funder, uint256 amount);
    event BountyClaimed(
        uint256 indexed bountyId, address indexed hunter, uint256 rewardAmount, bytes32 fingerprint
    );
    event RevealConfirmed(uint256 indexed bountyId, address indexed hunter);
    event RevealProvenOnchain(uint256 indexed bountyId, address indexed hunter);
    event StakeForfeited(uint256 indexed bountyId, address indexed creator, uint256 amount);
    event BountyRefunded(uint256 indexed bountyId, address indexed creator, uint256 amount);

    IGroth16Verifier public immutable verifier;
    uint256 public bountyCount;

    mapping(uint256 bountyId => Bounty) private bounties;
    uint256 private unlocked = 1;

    modifier nonReentrant() {
        if (unlocked != 1) revert ReentrantCall();
        unlocked = 2;
        _;
        unlocked = 1;
    }

    constructor(IGroth16Verifier verifier_) {
        if (address(verifier_) == address(0)) revert InvalidVerifier();
        if (address(verifier_).code.length == 0) revert VerifierHasNoCode();
        verifier = verifier_;
    }

    /// @notice Creates and funds a bounty. address(0) denotes native BNB.
    function createBounty(CreateParams calldata params)
        external
        payable
        nonReentrant
        returns (uint256 bountyId)
    {
        _validateCreate(params);
        _takeAsset(params.token, msg.sender, params.rewardAmount, msg.value);

        bountyId = bountyCount++;
        Bounty storage bounty = bounties[bountyId];
        bounty.creator = msg.sender;
        bounty.victim = params.victim;
        bounty.token = params.token;
        bounty.rewardAmount = params.rewardAmount;
        bounty.stakeAmount = params.stakeAmount;
        bounty.vkHash = params.vkHash;
        bounty.creatorPubkey = params.creatorPubkey;
        bounty.revealWindow = params.revealWindow;
        bounty.escapeWindow = params.escapeWindow;
        bounty.expiresAt = params.expiresAt;
        bounty.title = params.title;
        bounty.description = params.description;

        emit BountyCreated(
            bountyId, msg.sender, params.victim, params.token, params.rewardAmount, params.vkHash
        );
    }

    function fundBounty(uint256 bountyId, uint256 amount) external payable nonReentrant {
        Bounty storage bounty = _getBounty(bountyId);
        if (bounty.status != Status.Open) revert BountyNotOpen();
        if (_isExpired(bounty)) revert BountyExpired();
        if (amount == 0) revert InvalidReward();

        _takeAsset(bounty.token, msg.sender, amount, msg.value);
        bounty.rewardAmount += amount;
        emit BountyFunded(bountyId, msg.sender, amount);
    }

    /// @notice Verifies a Groth16 proof and releases the bounty reward.
    /// @dev publicSignals: [fingerprint_hi, fingerprint_lo, victim_as_uint, bountyId, target]
    function claim(
        uint256 bountyId,
        uint[2] calldata pi_a,
        uint[2][2] calldata pi_b,
        uint[2] calldata pi_c,
        uint[5] calldata pubSignals
    ) external payable nonReentrant {
        Bounty storage bounty = _getBounty(bountyId);
        if (bounty.status != Status.Open) revert BountyNotOpen();
        if (_isExpired(bounty)) revert BountyExpired();

        address boundVictim = address(uint160(pubSignals[2]));
        uint256 boundBountyId = pubSignals[3];
        if (boundVictim != bounty.victim || boundBountyId != bountyId) revert InvalidJournal();

        bytes32 fingerprint = bytes32((pubSignals[0] << 128) | pubSignals[1]);
        if (fingerprint == bytes32(0)) revert InvalidJournal();

        if (!verifier.verifyProof(pi_a, pi_b, pi_c, pubSignals)) revert InvalidJournal();

        _takeAsset(bounty.token, msg.sender, bounty.stakeAmount, msg.value);

        uint256 reward = bounty.rewardAmount;
        bounty.rewardAmount = 0;
        bounty.status = Status.Claimed;
        bounty.hunter = msg.sender;
        bounty.fingerprint = fingerprint;
        bounty.claimedAt = uint64(block.timestamp);

        _sendAsset(bounty.token, msg.sender, reward);
        emit BountyClaimed(bountyId, msg.sender, reward, fingerprint);
    }

    function confirmReveal(uint256 bountyId) external nonReentrant {
        Bounty storage bounty = _getBounty(bountyId);
        if (msg.sender != bounty.creator) revert NotCreator();
        _requireUnresolvedStake(bounty);

        bounty.revealed = true;
        _sendAsset(bounty.token, bounty.hunter, bounty.stakeAmount);
        emit RevealConfirmed(bountyId, bounty.hunter);
    }

    /// @notice Lets the hunter reclaim a stake by revealing the committed preimage near the deadline.
    function proveReveal(uint256 bountyId, bytes calldata revealPreimage) external nonReentrant {
        Bounty storage bounty = _getBounty(bountyId);
        if (msg.sender != bounty.hunter) revert NotHunter();
        _requireUnresolvedStake(bounty);

        uint256 deadline = uint256(bounty.claimedAt) + bounty.revealWindow;
        uint256 escapeOpens = deadline - bounty.escapeWindow;
        if (block.timestamp < escapeOpens || block.timestamp >= deadline) revert EscapeWindowClosed();
        if (sha256(revealPreimage) != bounty.fingerprint) revert InvalidReveal();

        bounty.revealed = true;
        _sendAsset(bounty.token, bounty.hunter, bounty.stakeAmount);
        emit RevealProvenOnchain(bountyId, bounty.hunter);
    }

    function forfeitStake(uint256 bountyId) external nonReentrant {
        Bounty storage bounty = _getBounty(bountyId);
        _requireUnresolvedStake(bounty);
        if (block.timestamp < uint256(bounty.claimedAt) + bounty.revealWindow) revert RevealDeadlineOpen();

        bounty.forfeited = true;
        _sendAsset(bounty.token, bounty.creator, bounty.stakeAmount);
        emit StakeForfeited(bountyId, bounty.creator, bounty.stakeAmount);
    }

    function withdrawExpired(uint256 bountyId) external nonReentrant {
        Bounty storage bounty = _getBounty(bountyId);
        if (msg.sender != bounty.creator) revert NotCreator();
        if (bounty.status != Status.Open) revert BountyNotOpen();
        if (!_isExpired(bounty)) revert BountyNotExpired();

        uint256 refund = bounty.rewardAmount;
        bounty.rewardAmount = 0;
        bounty.status = Status.Refunded;
        _sendAsset(bounty.token, bounty.creator, refund);
        emit BountyRefunded(bountyId, bounty.creator, refund);
    }

    function getBounty(uint256 bountyId) external view returns (Bounty memory) {
        return _getBounty(bountyId);
    }

    function isExpired(uint256 bountyId) external view returns (bool) {
        return _isExpired(_getBounty(bountyId));
    }

    function _validateCreate(CreateParams calldata params) private view {
        if (params.victim == address(0)) revert InvalidVictim();
        if (params.vkHash == bytes32(0)) revert InvalidImageId();
        if (params.rewardAmount == 0) revert InvalidReward();
        if (bytes(params.title).length == 0 || bytes(params.title).length > 96) revert EmptyTitle();
        if (bytes(params.description).length > 1_024) revert EmptyTitle();
        if (params.stakeAmount > 0) {
            if (
                params.revealWindow == 0 || params.escapeWindow == 0
                    || params.escapeWindow > params.revealWindow
            ) {
                revert InvalidWindow();
            }
        } else if (params.revealWindow != 0 || params.escapeWindow != 0) {
            revert InvalidWindow();
        }
        if (params.expiresAt != 0 && params.expiresAt <= block.timestamp) revert InvalidExpiry();
    }

    function _takeAsset(address token, address from, uint256 amount, uint256 nativeValue) private {
        if (token == address(0)) {
            if (nativeValue != amount) revert WrongNativeValue();
            return;
        }
        if (nativeValue != 0) revert WrongNativeValue();
        if (amount == 0) return;

        uint256 beforeBalance = IERC20(token).balanceOf(address(this));
        token.safeTransferFrom(from, address(this), amount);
        if (IERC20(token).balanceOf(address(this)) - beforeBalance != amount) revert UnsupportedFeeToken();
    }

    function _sendAsset(address token, address to, uint256 amount) private {
        if (amount == 0) return;
        if (token == address(0)) to.safeTransferNative(amount);
        else token.safeTransfer(to, amount);
    }

    function _getBounty(uint256 bountyId) private view returns (Bounty storage bounty) {
        if (bountyId >= bountyCount) revert BountyNotFound();
        bounty = bounties[bountyId];
    }

    function _isExpired(Bounty storage bounty) private view returns (bool) {
        return bounty.expiresAt != 0 && block.timestamp >= bounty.expiresAt;
    }

    function _requireUnresolvedStake(Bounty storage bounty) private view {
        if (bounty.status != Status.Claimed) revert BountyNotOpen();
        if (bounty.stakeAmount == 0) revert NoStake();
        if (bounty.revealed || bounty.forfeited) revert StakeAlreadyResolved();
    }
}


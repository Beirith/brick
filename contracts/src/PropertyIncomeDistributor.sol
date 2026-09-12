// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {PropertyFactory} from "./PropertyFactory.sol";
import {PropertyMarketplace} from "./PropertyMarketplace.sol";

/// @notice Distributes demo rental income according to balances in the last finalized block before each deposit.
contract PropertyIncomeDistributor is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Distribution {
        address token;
        address depositor;
        uint256 amount;
        uint256 totalShares;
        uint48 snapshotBlock;
        uint64 createdAt;
        string memo;
    }

    error InvalidConfiguration();
    error UnknownProperty();
    error InvalidAmount();
    error InvalidMemo();
    error UnknownDistribution();
    error SnapshotUnavailable();
    error NoIncomeToClaim();
    error AlreadyClaimed();

    PropertyFactory public immutable factory;
    IERC20 public immutable currency;
    PropertyMarketplace public immutable marketplace;
    Distribution[] private _distributions;
    mapping(uint256 distributionId => mapping(address investor => bool claimed)) public hasClaimed;
    mapping(address token => uint256 amount) public totalIncomeGenerated;
    mapping(address token => mapping(address investor => uint256 amount)) public totalIncomeClaimed;

    event IncomeDeposited(
        uint256 indexed distributionId,
        address indexed token,
        address indexed depositor,
        uint256 amount,
        uint48 snapshotBlock,
        string memo
    );
    event IncomeClaimed(uint256 indexed distributionId, address indexed investor, uint256 amount, uint256 shares);

    constructor(address factory_, address currency_, address marketplace_) {
        if (factory_.code.length == 0 || currency_.code.length == 0 || marketplace_.code.length == 0) {
            revert InvalidConfiguration();
        }
        factory = PropertyFactory(factory_);
        currency = IERC20(currency_);
        marketplace = PropertyMarketplace(marketplace_);
    }

    function createDistribution(address token, uint256 amount, string calldata memo)
        external
        nonReentrant
        returns (uint256 distributionId)
    {
        // Anyone may deposit rent for a registered property (e.g. a tenant paying directly).
        // This is a demo; a production version would verify the payer against a lease record.
        if (!factory.isProperty(token)) revert UnknownProperty();
        if (amount == 0) revert InvalidAmount();
        if (bytes(memo).length > 200) revert InvalidMemo();

        uint256 totalShares = IERC20(token).totalSupply();
        // ERC20Votes only exposes past checkpoints. The preceding block is final
        // when this transaction executes and makes claims available immediately
        // after the deposit is confirmed.
        uint48 snapshotBlock = SafeCast.toUint48(block.number - 1);
        distributionId = _distributions.length;
        _distributions.push(
            Distribution({
                token: token,
                depositor: msg.sender,
                amount: amount,
                totalShares: totalShares,
                snapshotBlock: snapshotBlock,
                createdAt: SafeCast.toUint64(block.timestamp),
                memo: memo
            })
        );
        totalIncomeGenerated[token] += amount;
        currency.safeTransferFrom(msg.sender, address(this), amount);
        emit IncomeDeposited(distributionId, token, msg.sender, amount, snapshotBlock, memo);
    }

    function claim(uint256 distributionId) external nonReentrant returns (uint256 amount) {
        Distribution storage distribution = _distribution(distributionId);
        if (hasClaimed[distributionId][msg.sender]) revert AlreadyClaimed();
        if (block.number <= distribution.snapshotBlock) revert SnapshotUnavailable();
        uint256 shares = _sharesAtSnapshot(distribution, msg.sender);
        amount = Math.mulDiv(distribution.amount, shares, distribution.totalShares);
        if (amount == 0) revert NoIncomeToClaim();

        hasClaimed[distributionId][msg.sender] = true;
        totalIncomeClaimed[distribution.token][msg.sender] += amount;
        currency.safeTransfer(msg.sender, amount);
        emit IncomeClaimed(distributionId, msg.sender, amount, shares);
    }

    function claimable(uint256 distributionId, address investor) external view returns (uint256) {
        Distribution storage distribution = _distribution(distributionId);
        if (hasClaimed[distributionId][investor] || block.number <= distribution.snapshotBlock) return 0;
        uint256 shares = _sharesAtSnapshot(distribution, investor);
        return Math.mulDiv(distribution.amount, shares, distribution.totalShares);
    }

    /// @notice A holder's shares at the snapshot, including any of their own shares that were
    /// listed but not yet sold on the marketplace at that block. Without this, escrowed shares
    /// are checkpointed to the marketplace address, which never claims, and that portion of
    /// income would go unclaimed by anyone.
    function _sharesAtSnapshot(Distribution storage distribution, address investor) private view returns (uint256) {
        uint256 held = IVotes(distribution.token).getPastVotes(investor, distribution.snapshotBlock);
        uint256 reserved = marketplace.reservedSharesAt(distribution.token, investor, distribution.snapshotBlock);
        return held + reserved;
    }

    function distributionCount() external view returns (uint256) {
        return _distributions.length;
    }

    function getDistribution(uint256 distributionId) external view returns (Distribution memory) {
        return _distribution(distributionId);
    }

    function _distribution(uint256 distributionId) private view returns (Distribution storage distribution) {
        if (distributionId >= _distributions.length) revert UnknownDistribution();
        return _distributions[distributionId];
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Checkpoints} from "@openzeppelin/contracts/utils/structs/Checkpoints.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {PropertyFactory} from "./PropertyFactory.sol";

/// @notice Fixed-price demo listings with whole shares held in escrow.
contract PropertyMarketplace is ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Checkpoints for Checkpoints.Trace208;

    error InvalidConfiguration();
    error UnknownProperty();
    error InvalidAmount();
    error InvalidPrice();
    error InactiveListing();
    error UnauthorizedCancellation();

    struct Listing {
        address seller;
        address token;
        uint256 remainingShares;
        uint256 pricePerShare;
    }

    PropertyFactory public immutable factory;
    IERC20 public immutable currency;
    Listing[] public listings;
    // Tracks each seller's escrowed-but-unsold shares over time, so income distribution can
    // attribute a listing's shares back to the seller as of a past block instead of the
    // marketplace itself (which never claims income on anyone's behalf).
    mapping(address token => mapping(address seller => Checkpoints.Trace208)) private _reserved;

    event ListingCreated(
        uint256 indexed listingId, address indexed seller, address indexed token, uint256 shares, uint256 pricePerShare
    );
    event SharesPurchased(uint256 indexed listingId, address indexed buyer, uint256 shares, uint256 totalPrice);
    event ListingCancelled(uint256 indexed listingId, uint256 returnedShares);

    constructor(address factory_, address currency_) {
        if (factory_.code.length == 0 || currency_.code.length == 0) revert InvalidConfiguration();
        factory = PropertyFactory(factory_);
        currency = IERC20(currency_);
    }

    /// @notice Approve this marketplace to transfer the shares before listing.
    /// @param pricePerShare Price in currency base units; fixed for the lifetime of the listing.
    function createListing(address token, uint256 shares, uint256 pricePerShare)
        external
        nonReentrant
        returns (uint256 listingId)
    {
        if (!factory.isProperty(token)) revert UnknownProperty();
        if (shares == 0) revert InvalidAmount();
        if (pricePerShare == 0 || pricePerShare > type(uint256).max / shares) revert InvalidPrice();
        listingId = listings.length;
        listings.push(Listing(msg.sender, token, shares, pricePerShare));
        _addReserved(token, msg.sender, shares);
        IERC20(token).safeTransferFrom(msg.sender, address(this), shares);
        emit ListingCreated(listingId, msg.sender, token, shares, pricePerShare);
    }

    /// @notice Buy some or all remaining shares after approving the payment amount.
    function buyShares(uint256 listingId, uint256 shares) external nonReentrant {
        Listing storage listing = _activeListing(listingId);
        if (shares == 0 || shares > listing.remainingShares) revert InvalidAmount();
        uint256 totalPrice = shares * listing.pricePerShare;
        listing.remainingShares -= shares;
        _subReserved(listing.token, listing.seller, shares);
        currency.safeTransferFrom(msg.sender, listing.seller, totalPrice);
        IERC20(listing.token).safeTransfer(msg.sender, shares);
        emit SharesPurchased(listingId, msg.sender, shares, totalPrice);
    }

    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = _activeListing(listingId);
        if (msg.sender != listing.seller) revert UnauthorizedCancellation();
        uint256 shares = listing.remainingShares;
        listing.remainingShares = 0;
        _subReserved(listing.token, listing.seller, shares);
        IERC20(listing.token).safeTransfer(msg.sender, shares);
        emit ListingCancelled(listingId, shares);
    }

    function listingCount() external view returns (uint256) {
        return listings.length;
    }

    /// @notice Shares of `token` that `seller` had escrowed in unsold listings as of `blockNumber`.
    function reservedSharesAt(address token, address seller, uint256 blockNumber) external view returns (uint256) {
        return _reserved[token][seller].upperLookupRecent(SafeCast.toUint48(blockNumber));
    }

    function _addReserved(address token, address seller, uint256 shares) private {
        Checkpoints.Trace208 storage trace = _reserved[token][seller];
        trace.push(SafeCast.toUint48(block.number), SafeCast.toUint208(trace.latest() + shares));
    }

    function _subReserved(address token, address seller, uint256 shares) private {
        Checkpoints.Trace208 storage trace = _reserved[token][seller];
        trace.push(SafeCast.toUint48(block.number), SafeCast.toUint208(trace.latest() - shares));
    }

    function _activeListing(uint256 listingId) private view returns (Listing storage listing) {
        if (listingId >= listings.length) revert InactiveListing();
        listing = listings[listingId];
        if (listing.remainingShares == 0) revert InactiveListing();
    }
}

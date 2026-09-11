// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Fixed-supply token representing shares of a property registered in a PropertyFactory.
contract PropertyToken is ERC20 {
    error InvalidOwner();
    error InvalidFactory();
    error InvalidShareCount();
    error InvalidTokenMetadata();

    address public immutable initialOwner;
    address public immutable factory;
    uint256 public immutable propertyId;

    constructor(
        string memory name_,
        string memory symbol_,
        address owner_,
        address factory_,
        uint256 propertyId_,
        uint256 shareCount_
    ) ERC20(name_, symbol_) {
        if (owner_ == address(0)) revert InvalidOwner();
        if (factory_ == address(0)) revert InvalidFactory();
        if (shareCount_ == 0) revert InvalidShareCount();

        if (bytes(name_).length == 0 || bytes(symbol_).length == 0) {
            revert InvalidTokenMetadata();
        }

        initialOwner = owner_;
        factory = factory_;
        propertyId = propertyId_;

        _mint(owner_, shareCount_);
    }

    /// @notice Property shares are indivisible in the MVP.
    function decimals() public pure override returns (uint8) {
        return 0;
    }
}

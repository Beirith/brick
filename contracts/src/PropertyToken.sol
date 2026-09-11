// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Fixed supply of whole demo shares. Registration is not proof of legal ownership.
contract PropertyToken is ERC20 {
    error InvalidOwner();
    error InvalidShareCount();
    error InvalidPropertyValue();
    error InvalidTokenMetadata();

    address public immutable initialOwner;
    /// @notice Declared value in MockBRL base units (1 mBRL = 1e6 units).
    uint256 public immutable propertyValue;
    string public metadataURI;

    constructor(
        string memory name_,
        string memory symbol_,
        address owner_,
        uint256 shareCount_,
        uint256 propertyValue_,
        string memory metadataURI_
    ) ERC20(name_, symbol_) {
        if (owner_ == address(0)) revert InvalidOwner();
        if (shareCount_ == 0) revert InvalidShareCount();
        if (propertyValue_ < shareCount_) revert InvalidPropertyValue();
        if (bytes(name_).length == 0 || bytes(symbol_).length == 0) revert InvalidTokenMetadata();
        initialOwner = owner_;
        propertyValue = propertyValue_;
        metadataURI = metadataURI_;
        _mint(owner_, shareCount_);
    }

    function decimals() public pure override returns (uint8) {
        return 0;
    }

    /// @notice Initial reference price, rounded down to a MockBRL base unit.
    /// @dev The exact price ratio remains available as propertyValue / totalSupply.
    function initialTokenPrice() external view returns (uint256) {
        return propertyValue / totalSupply();
    }
}

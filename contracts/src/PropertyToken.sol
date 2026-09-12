// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/// @notice Fixed-supply token representing shares of a property registered in a PropertyFactory.
contract PropertyToken is ERC20, ERC20Votes {
    error InvalidOwner();
    error InvalidFactory();
    error InvalidShareCount();
    error InvalidTokenMetadata();
    error DelegationDisabled();

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
    ) ERC20(name_, symbol_) EIP712(name_, "1") {
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

    /// @notice Voting power follows balances automatically; holders do not need a delegation transaction.
    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Votes) {
        super._update(from, to, value);
        if (to != address(0) && delegates(to) == address(0)) {
            _delegate(to, to);
        }
    }

    /// @dev Delegation is deliberately disabled so one share always maps to its holder's voting power.
    function delegate(address) public pure override {
        revert DelegationDisabled();
    }

    /// @dev Signature delegation is disabled for the same reason as direct delegation.
    function delegateBySig(address, uint256, uint256, uint8, bytes32, bytes32) public pure override {
        revert DelegationDisabled();
    }
}

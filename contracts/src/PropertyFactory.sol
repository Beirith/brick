// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PropertyToken} from "./PropertyToken.sol";

/// @notice Permissionless registry of demo properties, not a verified property registry.
contract PropertyFactory {
    address[] public properties;
    mapping(address token => bool registered) public isProperty;

    event PropertyCreated(
        uint256 indexed propertyId,
        address indexed token,
        address indexed initialOwner,
        uint256 shareCount,
        uint256 propertyValue,
        string metadataURI
    );

    function createProperty(
        string calldata name,
        string calldata symbol,
        uint256 shareCount,
        uint256 propertyValue,
        string calldata metadataURI
    ) external returns (address token) {
        token = address(new PropertyToken(name, symbol, msg.sender, shareCount, propertyValue, metadataURI));
        uint256 propertyId = properties.length;
        properties.push(token);
        isProperty[token] = true;
        emit PropertyCreated(propertyId, token, msg.sender, shareCount, propertyValue, metadataURI);
    }

    function propertyCount() external view returns (uint256) {
        return properties.length;
    }
}

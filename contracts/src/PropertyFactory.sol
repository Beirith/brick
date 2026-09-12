// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PropertyToken} from "./PropertyToken.sol";
import {PropertyGovernance} from "./PropertyGovernance.sol";

/// @notice Permissionless registry of demo properties, not a verified property registry.
contract PropertyFactory {
    error InvalidPropertyValue();

    struct Property {
        address token;
        address creator;
        uint256 initialPropertyValue;
        string metadataURI;
    }

    Property[] public properties;

    address public immutable aiAgent;

    mapping(address token => bool registered) public isProperty;
    /// @notice Check isProperty(token) first: zero is also the first valid property ID.
    mapping(address token => uint256 propertyId) public propertyIdByToken;
    mapping(address token => address governance) public governanceByToken;

    event PropertyCreated(
        uint256 indexed propertyId,
        address indexed token,
        address indexed creator,
        uint256 shareCount,
        uint256 initialPropertyValue,
        string metadataURI
    );
    event PropertyGovernanceCreated(
        uint256 indexed propertyId, address indexed token, address indexed governance, address aiAgent
    );

    constructor(address aiAgent_) {
        // Zero deliberately disables the shared AI-agent account; creators remain proposers.
        aiAgent = aiAgent_;
    }

    function createProperty(
        string calldata name,
        string calldata symbol,
        uint256 shareCount,
        uint256 initialPropertyValue,
        string calldata metadataURI
    ) external returns (address token) {
        if (initialPropertyValue == 0) {
            revert InvalidPropertyValue();
        }

        uint256 propertyId = properties.length;

        token = address(new PropertyToken(name, symbol, msg.sender, address(this), propertyId, shareCount));
        address governance = address(new PropertyGovernance(token, msg.sender, aiAgent));

        properties.push(
            Property({
                token: token, creator: msg.sender, initialPropertyValue: initialPropertyValue, metadataURI: metadataURI
            })
        );

        isProperty[token] = true;
        propertyIdByToken[token] = propertyId;
        governanceByToken[token] = governance;

        emit PropertyCreated(propertyId, token, msg.sender, shareCount, initialPropertyValue, metadataURI);
        emit PropertyGovernanceCreated(propertyId, token, governance, aiAgent);
    }

    function propertyCount() external view returns (uint256) {
        return properties.length;
    }
}

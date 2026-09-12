// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {PropertyMarketplace} from "../src/PropertyMarketplace.sol";

/// @notice Replaces the marketplace on an existing Brick deployment without recreating the
/// factory or its properties. Any shares escrowed in listings on the previous marketplace stay
/// there; sellers must cancel and re-list on the new address.
contract DeployMarketplace is Script {
    function run() external returns (PropertyMarketplace marketplace) {
        address factory = vm.envAddress("PROPERTY_FACTORY_ADDRESS");
        address currency = vm.envAddress("MOCK_BRL_ADDRESS");
        vm.startBroadcast();
        marketplace = new PropertyMarketplace(factory, currency);
        vm.stopBroadcast();
        console2.log("PropertyMarketplace:", address(marketplace));
    }
}

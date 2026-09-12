// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {PropertyIncomeDistributor} from "../src/PropertyIncomeDistributor.sol";

/// @notice Adds income distribution to an existing Brick factory without resetting its properties.
contract DeployIncome is Script {
    function run() external returns (PropertyIncomeDistributor incomeDistributor) {
        address factory = vm.envAddress("PROPERTY_FACTORY_ADDRESS");
        address currency = vm.envAddress("MOCK_BRL_ADDRESS");
        address marketplace = vm.envAddress("PROPERTY_MARKETPLACE_ADDRESS");
        vm.startBroadcast();
        incomeDistributor = new PropertyIncomeDistributor(factory, currency, marketplace);
        vm.stopBroadcast();
        console2.log("PropertyIncomeDistributor:", address(incomeDistributor));
    }
}

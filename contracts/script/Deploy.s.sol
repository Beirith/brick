// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {MockBRL} from "../src/MockBRL.sol";
import {PropertyFactory} from "../src/PropertyFactory.sol";

contract Deploy is Script {
    function run() external returns (MockBRL currency, PropertyFactory factory) {
        vm.startBroadcast();
        currency = new MockBRL();
        factory = new PropertyFactory();
        vm.stopBroadcast();

        console2.log("MockBRL:", address(currency));
        console2.log("PropertyFactory:", address(factory));
    }
}

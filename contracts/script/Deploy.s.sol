// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {MockBRL} from "../src/MockBRL.sol";
import {PropertyFactory} from "../src/PropertyFactory.sol";

import {PropertyMarketplace} from "../src/PropertyMarketplace.sol";
import {PropertyIncomeDistributor} from "../src/PropertyIncomeDistributor.sol";

contract Deploy is Script {
    function run()
        external
        returns (
            MockBRL currency,
            PropertyFactory factory,
            PropertyMarketplace marketplace,
            PropertyIncomeDistributor incomeDistributor
        )
    {
        address aiAgent = vm.envOr("AI_AGENT_ADDRESS", address(0));
        vm.startBroadcast();
        currency = new MockBRL();
        factory = new PropertyFactory(aiAgent);
        marketplace = new PropertyMarketplace(address(factory), address(currency));
        incomeDistributor = new PropertyIncomeDistributor(address(factory), address(currency), address(marketplace));
        vm.stopBroadcast();

        console2.log("MockBRL:", address(currency));
        console2.log("PropertyFactory:", address(factory));
        console2.log("PropertyMarketplace:", address(marketplace));
        console2.log("PropertyIncomeDistributor:", address(incomeDistributor));
        console2.log("AI agent:", aiAgent);
    }
}

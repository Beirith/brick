// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {MockBRL} from "../src/MockBRL.sol";

contract MockBRLTest is Test {
    MockBRL currency;
    address alice = makeAddr("alice");

    function setUp() public {
        currency = new MockBRL();
    }

    function testAnyoneCanMintDemoCurrency() public {
        vm.prank(alice);
        currency.mint(alice, 5_000e6);
        assertEq(currency.balanceOf(alice), 5_000e6);
        assertEq(currency.totalSupply(), 5_000e6);
        assertEq(currency.decimals(), 6);
    }

    function testCannotMintToZeroAddress() public {
        vm.expectRevert(abi.encodeWithSelector(IERC20Errors.ERC20InvalidReceiver.selector, address(0)));
        currency.mint(address(0), 1);
    }
}

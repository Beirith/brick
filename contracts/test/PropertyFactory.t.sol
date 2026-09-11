// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PropertyFactory} from "../src/PropertyFactory.sol";
import {PropertyToken} from "../src/PropertyToken.sol";

contract PropertyFactoryTest is Test {
    PropertyFactory factory;
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        factory = new PropertyFactory();
    }

    function testIndependentPropertiesBelongToCallers() public {
        vm.prank(alice);
        address first = factory.createProperty("Apartment", "APT", 100, 500_000e6, "ipfs://apartment");
        vm.prank(bob);
        address second = factory.createProperty("House", "HOUSE", 200, 800_000e6, "");
        assertEq(factory.propertyCount(), 2);
        assertEq(factory.properties(0), first);
        assertEq(factory.properties(1), second);
        assertTrue(factory.isProperty(first));
        assertTrue(factory.isProperty(second));
        assertFalse(factory.isProperty(alice));
        assertEq(PropertyToken(first).balanceOf(alice), 100);
        assertEq(PropertyToken(second).balanceOf(bob), 200);
        assertEq(PropertyToken(first).balanceOf(address(factory)), 0);
        assertEq(PropertyToken(first).balanceOf(bob), 0);
        assertEq(PropertyToken(second).initialTokenPrice(), 4_000e6);
    }

    function testInvalidCreationDoesNotRegisterProperty() public {
        vm.expectRevert(PropertyToken.InvalidShareCount.selector);
        factory.createProperty("Apartment", "APT", 0, 500_000e6, "");
        assertEq(factory.propertyCount(), 0);
    }
}

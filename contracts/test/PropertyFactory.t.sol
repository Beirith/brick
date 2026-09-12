// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PropertyFactory} from "../src/PropertyFactory.sol";
import {PropertyToken} from "../src/PropertyToken.sol";
import {PropertyGovernance} from "../src/PropertyGovernance.sol";

contract PropertyFactoryTest is Test {
    PropertyFactory factory;
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address aiAgent = makeAddr("aiAgent");

    function setUp() public {
        factory = new PropertyFactory(aiAgent);
    }

    function testIndependentPropertiesBelongToCallers() public {
        vm.prank(alice);
        address first = factory.createProperty("Apartment", "APT", 100, 500_000e6, "ipfs://apartment");
        vm.prank(bob);
        address second = factory.createProperty("House", "HOUSE", 200, 800_000e6, "");
        assertEq(factory.propertyCount(), 2);
        (address firstToken, address firstCreator, uint256 firstValue, string memory firstURI) = factory.properties(0);
        assertEq(firstToken, first);
        assertEq(firstCreator, alice);
        assertEq(firstValue, 500_000e6);
        assertEq(firstURI, "ipfs://apartment");
        (address secondToken, address secondCreator, uint256 secondValue, string memory secondURI) =
            factory.properties(1);
        assertEq(secondToken, second);
        assertEq(secondCreator, bob);
        assertEq(secondValue, 800_000e6);
        assertEq(secondURI, "");
        assertEq(factory.propertyIdByToken(first), 0);
        assertEq(factory.propertyIdByToken(second), 1);
        assertEq(PropertyToken(first).factory(), address(factory));
        assertEq(PropertyToken(second).factory(), address(factory));
        assertEq(PropertyToken(first).propertyId(), 0);
        assertEq(PropertyToken(second).propertyId(), 1);
        assertTrue(factory.isProperty(first));
        assertTrue(factory.isProperty(second));
        assertFalse(factory.isProperty(alice));
        assertEq(PropertyToken(first).balanceOf(alice), 100);
        assertEq(PropertyToken(second).balanceOf(bob), 200);
        assertEq(PropertyToken(first).balanceOf(address(factory)), 0);
        assertEq(PropertyToken(first).balanceOf(bob), 0);
        address governance = factory.governanceByToken(first);
        assertEq(PropertyGovernance(governance).propertyToken(), first);
        assertTrue(PropertyGovernance(governance).hasRole(PropertyGovernance(governance).PROPOSER_ROLE(), alice));
        assertTrue(PropertyGovernance(governance).hasRole(PropertyGovernance(governance).AI_AGENT_ROLE(), aiAgent));
    }

    function testInvalidCreationDoesNotRegisterProperty() public {
        vm.expectRevert(PropertyToken.InvalidShareCount.selector);
        factory.createProperty("Apartment", "APT", 0, 500_000e6, "");
        assertEq(factory.propertyCount(), 0);
    }

    function testZeroValueDoesNotRegisterProperty() public {
        vm.expectRevert(PropertyFactory.InvalidPropertyValue.selector);
        factory.createProperty("Apartment", "APT", 100, 0, "");
        assertEq(factory.propertyCount(), 0);
    }

    function testUnknownTokenIsDistinctFromFirstProperty() public {
        address first = factory.createProperty("Apartment", "APT", 100, 1, "");
        assertEq(factory.propertyIdByToken(first), 0);
        assertEq(factory.propertyIdByToken(bob), 0);
        assertTrue(factory.isProperty(first));
        assertFalse(factory.isProperty(bob));
    }

    function testSharesCanExceedValueInBaseUnits() public {
        vm.prank(alice);
        address created = factory.createProperty("Apartment", "APT", 1_000_000, 1, "");
        assertEq(PropertyToken(created).totalSupply(), 1_000_000);
        assertEq(PropertyToken(created).balanceOf(alice), 1_000_000);
        (,, uint256 value,) = factory.properties(0);
        assertEq(value, 1);
    }

    function testFuzzSharesAndValueAreIndependent(uint256 shares, uint256 value) public {
        shares = bound(shares, 1, type(uint208).max);
        value = bound(value, 1, type(uint256).max);
        vm.prank(alice);
        address created = factory.createProperty("Apartment", "APT", shares, value, "");
        assertEq(PropertyToken(created).balanceOf(alice), shares);
        (,, uint256 storedValue,) = factory.properties(0);
        assertEq(storedValue, value);
    }
}

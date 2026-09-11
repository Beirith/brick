// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {PropertyToken} from "../src/PropertyToken.sol";

contract PropertyTokenTest is Test {
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    PropertyToken token;
    address factory = makeAddr("factory");

    function setUp() public {
        token = new PropertyToken("Floripa Apartment", "FLP", alice, factory, 7, 100);
    }

    function testInitialSharesAndRegistryReferences() public view {
        assertEq(token.balanceOf(alice), 100);
        assertEq(token.totalSupply(), 100);
        assertEq(token.decimals(), 0);
        assertEq(token.initialOwner(), alice);
        assertEq(token.factory(), factory);
        assertEq(token.propertyId(), 7);
    }

    function testTransferPreservesSupplyAndOriginalOwner() public {
        vm.prank(alice);
        token.transfer(bob, 25);
        assertEq(token.balanceOf(alice), 75);
        assertEq(token.balanceOf(bob), 25);
        assertEq(token.totalSupply(), 100);
        assertEq(token.initialOwner(), alice);
    }

    function testCannotTransferMoreThanBalance() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, alice, 100, 101));
        token.transfer(bob, 101);
    }

    function testRejectInvalidParameters() public {
        vm.expectRevert(PropertyToken.InvalidOwner.selector);
        new PropertyToken("A", "A", address(0), factory, 0, 100);
        vm.expectRevert(PropertyToken.InvalidFactory.selector);
        new PropertyToken("A", "A", alice, address(0), 0, 100);
        vm.expectRevert(PropertyToken.InvalidShareCount.selector);
        new PropertyToken("A", "A", alice, factory, 0, 0);
        vm.expectRevert(PropertyToken.InvalidTokenMetadata.selector);
        new PropertyToken("", "A", alice, factory, 0, 100);
        vm.expectRevert(PropertyToken.InvalidTokenMetadata.selector);
        new PropertyToken("A", "", alice, factory, 0, 100);
    }

    function testFuzzVariableSupply(uint256 shares) public {
        shares = bound(shares, 1, type(uint256).max);
        PropertyToken variableToken = new PropertyToken("A", "A", alice, factory, 0, shares);
        assertEq(variableToken.totalSupply(), shares);
        assertEq(variableToken.balanceOf(alice), shares);
    }
}

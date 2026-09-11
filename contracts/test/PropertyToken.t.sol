// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {PropertyToken} from "../src/PropertyToken.sol";

contract PropertyTokenTest is Test {
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    PropertyToken token;

    function setUp() public {
        token = new PropertyToken("Floripa Apartment", "FLP", alice, 100, 500_000e6, "ipfs://property");
    }

    function testInitialSharesAndPrice() public view {
        assertEq(token.balanceOf(alice), 100);
        assertEq(token.totalSupply(), 100);
        assertEq(token.decimals(), 0);
        assertEq(token.initialOwner(), alice);
        assertEq(token.propertyValue(), 500_000e6);
        assertEq(token.initialTokenPrice(), 5_000e6);
        assertEq(token.metadataURI(), "ipfs://property");
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
        new PropertyToken("A", "A", address(0), 100, 500_000e6, "");
        vm.expectRevert(PropertyToken.InvalidShareCount.selector);
        new PropertyToken("A", "A", alice, 0, 500_000e6, "");
        vm.expectRevert(PropertyToken.InvalidPropertyValue.selector);
        new PropertyToken("A", "A", alice, 100, 0, "");
        vm.expectRevert(PropertyToken.InvalidPropertyValue.selector);
        new PropertyToken("A", "A", alice, 100, 99, "");
        vm.expectRevert(PropertyToken.InvalidTokenMetadata.selector);
        new PropertyToken("", "A", alice, 100, 500_000e6, "");
        vm.expectRevert(PropertyToken.InvalidTokenMetadata.selector);
        new PropertyToken("A", "", alice, 100, 500_000e6, "");
    }

    function testFuzzVariableSupplyAndPrice(uint256 shares, uint256 value) public {
        shares = bound(shares, 1, 1e12);
        value = bound(value, shares, type(uint128).max);
        PropertyToken variableToken = new PropertyToken("A", "A", alice, shares, value, "");
        assertEq(variableToken.totalSupply(), shares);
        assertEq(variableToken.balanceOf(alice), shares);
        uint256 price = variableToken.initialTokenPrice();
        assertLe(price * shares, value);
        assertLt(value - price * shares, shares);
    }
}

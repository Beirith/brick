// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {MockBRL} from "../src/MockBRL.sol";
import {PropertyFactory} from "../src/PropertyFactory.sol";
import {PropertyToken} from "../src/PropertyToken.sol";
import {PropertyMarketplace} from "../src/PropertyMarketplace.sol";

contract PropertyMarketplaceTest is Test {
    MockBRL currency;
    PropertyFactory factory;
    PropertyToken token;
    PropertyMarketplace market;
    address seller = makeAddr("seller");
    address buyer = makeAddr("buyer");
    uint256 constant PRICE = 5_000e6;

    function setUp() public {
        currency = new MockBRL();
        factory = new PropertyFactory(address(0));
        market = new PropertyMarketplace(address(factory), address(currency));
        vm.prank(seller);
        token = PropertyToken(factory.createProperty("Apartment", "APT", 100, 500_000e6, ""));
        vm.prank(seller);
        assertTrue(token.approve(address(market), 100));
        currency.mint(buyer, 500_000e6);
        vm.prank(buyer);
        assertTrue(currency.approve(address(market), 500_000e6));
    }

    function _list(uint256 shares) internal returns (uint256 id) {
        vm.prank(seller);
        id = market.createListing(address(token), shares, PRICE);
    }

    function testPartialPurchaseAndCancellation() public {
        vm.expectEmit(true, true, true, true, address(market));
        emit PropertyMarketplace.ListingCreated(0, seller, address(token), 40, PRICE);
        uint256 id = _list(40);
        assertEq(token.balanceOf(seller), 60);
        assertEq(token.balanceOf(address(market)), 40);
        vm.expectEmit(true, true, false, true, address(market));
        emit PropertyMarketplace.SharesPurchased(id, buyer, 10, 10 * PRICE);
        vm.prank(buyer);
        market.buyShares(id, 10);
        assertEq(currency.balanceOf(seller), 10 * PRICE);
        assertEq(currency.balanceOf(buyer), 90 * PRICE);
        assertEq(token.balanceOf(buyer), 10);
        (,, uint256 remaining,) = market.listings(id);
        assertEq(remaining, 30);
        vm.expectEmit(true, false, false, true, address(market));
        emit PropertyMarketplace.ListingCancelled(id, 30);
        vm.prank(seller);
        market.cancelListing(id);
        assertEq(token.balanceOf(seller), 90);
        assertEq(token.balanceOf(address(market)), 0);
        assertEq(currency.balanceOf(address(market)), 0);
        vm.expectRevert(PropertyMarketplace.InactiveListing.selector);
        market.buyShares(id, 1);
        vm.prank(seller);
        vm.expectRevert(PropertyMarketplace.InactiveListing.selector);
        market.cancelListing(id);
    }

    function testFullPurchaseAndResale() public {
        uint256 id = _list(100);
        vm.prank(buyer);
        market.buyShares(id, 100);
        assertEq(token.balanceOf(buyer), 100);
        assertEq(currency.balanceOf(seller), 100 * PRICE);
        vm.expectRevert(PropertyMarketplace.InactiveListing.selector);
        market.buyShares(id, 1);
        vm.startPrank(buyer);
        assertTrue(token.approve(address(market), 20));
        uint256 resale = market.createListing(address(token), 20, PRICE + 1);
        vm.stopPrank();
        assertEq(resale, 1);
        assertEq(market.listingCount(), 2);
    }

    function testOnlySellerCanCancel() public {
        uint256 id = _list(20);
        vm.prank(buyer);
        vm.expectRevert(PropertyMarketplace.UnauthorizedCancellation.selector);
        market.cancelListing(id);
    }

    function testRejectInvalidListings() public {
        vm.expectRevert(PropertyMarketplace.UnknownProperty.selector);
        market.createListing(address(currency), 1, PRICE);
        vm.expectRevert(PropertyMarketplace.InvalidAmount.selector);
        market.createListing(address(token), 0, PRICE);
        vm.expectRevert(PropertyMarketplace.InvalidPrice.selector);
        market.createListing(address(token), 1, 0);
        vm.expectRevert(PropertyMarketplace.InvalidPrice.selector);
        market.createListing(address(token), 2, type(uint256).max);
        assertEq(market.listingCount(), 0);
    }

    function testRejectInvalidPurchases() public {
        vm.expectRevert(PropertyMarketplace.InactiveListing.selector);
        market.buyShares(0, 1);
        vm.expectRevert(PropertyMarketplace.InactiveListing.selector);
        market.cancelListing(0);
        uint256 id = _list(20);
        vm.expectRevert(PropertyMarketplace.InvalidAmount.selector);
        market.buyShares(id, 0);
        vm.expectRevert(PropertyMarketplace.InvalidAmount.selector);
        market.buyShares(id, 21);
    }

    function testMissingShareApprovalDoesNotCreateListing() public {
        vm.prank(seller);
        assertTrue(token.approve(address(market), 0));
        vm.prank(seller);
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, address(market), 0, 20)
        );
        market.createListing(address(token), 20, PRICE);
        assertEq(market.listingCount(), 0);
        assertEq(token.balanceOf(seller), 100);
    }

    function testCannotReserveSameSharesTwice() public {
        _list(80);
        vm.prank(seller);
        assertTrue(token.approve(address(market), 30));
        vm.prank(seller);
        vm.expectRevert(abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, seller, 20, 30));
        market.createListing(address(token), 30, PRICE);
        assertEq(market.listingCount(), 1);
        assertEq(token.balanceOf(address(market)), 80);
    }

    function testPaymentFailurePreservesListing() public {
        uint256 id = _list(20);
        vm.prank(buyer);
        assertTrue(currency.approve(address(market), 0));
        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, address(market), 0, PRICE)
        );
        market.buyShares(id, 1);
        (,, uint256 remaining,) = market.listings(id);
        assertEq(remaining, 20);
        assertEq(token.balanceOf(address(market)), 20);
        assertEq(token.balanceOf(buyer), 0);
        assertEq(currency.balanceOf(seller), 0);
    }

    function testInsufficientPaymentBalancePreservesListing() public {
        uint256 id = _list(20);
        address emptyBuyer = makeAddr("emptyBuyer");
        vm.startPrank(emptyBuyer);
        assertTrue(currency.approve(address(market), PRICE));
        vm.expectRevert(abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, emptyBuyer, 0, PRICE));
        market.buyShares(id, 1);
        vm.stopPrank();
        (,, uint256 remaining,) = market.listings(id);
        assertEq(remaining, 20);
        assertEq(token.balanceOf(address(market)), 20);
    }

    function testFuzzPurchaseThenCancelConservesBalances(uint256 shares) public {
        shares = bound(shares, 1, 99);
        uint256 id = _list(100);
        vm.prank(buyer);
        market.buyShares(id, shares);
        vm.prank(seller);
        market.cancelListing(id);
        assertEq(token.balanceOf(seller), 100 - shares);
        assertEq(token.balanceOf(buyer), shares);
        assertEq(token.balanceOf(address(market)), 0);
        assertEq(currency.balanceOf(seller), shares * PRICE);
        assertEq(currency.balanceOf(buyer), (100 - shares) * PRICE);
    }

    function testReservedSharesAtTracksListingLifecycle() public {
        uint256 id = _list(40);
        uint256 blockAtListing = block.number;
        assertEq(market.reservedSharesAt(address(token), seller, blockAtListing), 40);

        vm.roll(block.number + 1);
        vm.prank(buyer);
        market.buyShares(id, 10);
        uint256 blockAtPurchase = block.number;
        assertEq(market.reservedSharesAt(address(token), seller, blockAtPurchase), 30);
        // History before the purchase is unaffected by what happens afterwards.
        assertEq(market.reservedSharesAt(address(token), seller, blockAtListing), 40);

        vm.roll(block.number + 1);
        vm.prank(seller);
        market.cancelListing(id);
        assertEq(market.reservedSharesAt(address(token), seller, block.number), 0);
        assertEq(market.reservedSharesAt(address(token), seller, blockAtPurchase), 30);
    }

    function testRejectInvalidConfiguration() public {
        vm.expectRevert(PropertyMarketplace.InvalidConfiguration.selector);
        new PropertyMarketplace(address(0), address(currency));
        vm.expectRevert(PropertyMarketplace.InvalidConfiguration.selector);
        new PropertyMarketplace(address(factory), buyer);
    }
}

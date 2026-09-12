// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockBRL} from "../src/MockBRL.sol";
import {PropertyFactory} from "../src/PropertyFactory.sol";
import {PropertyToken} from "../src/PropertyToken.sol";
import {PropertyMarketplace} from "../src/PropertyMarketplace.sol";
import {PropertyIncomeDistributor} from "../src/PropertyIncomeDistributor.sol";

contract PropertyIncomeDistributorTest is Test {
    MockBRL currency;
    PropertyFactory factory;
    PropertyToken token;
    PropertyMarketplace marketplace;
    PropertyIncomeDistributor distributor;
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address carol = makeAddr("carol");
    address outsider = makeAddr("outsider");

    function setUp() public {
        currency = new MockBRL();
        factory = new PropertyFactory(address(0));
        vm.prank(alice);
        token = PropertyToken(factory.createProperty("Apartment", "APT", 1_000, 500_000e6, ""));
        vm.startPrank(alice);
        token.transfer(bob, 250);
        token.transfer(carol, 150);
        vm.stopPrank();
        marketplace = new PropertyMarketplace(address(factory), address(currency));
        distributor = new PropertyIncomeDistributor(address(factory), address(currency), address(marketplace));
        currency.mint(alice, 10_000e6);
        vm.prank(alice);
        currency.approve(address(distributor), 10_000e6);
    }

    function _deposit(uint256 amount) internal returns (uint256 id) {
        vm.roll(block.number + 1);
        vm.prank(alice);
        id = distributor.createDistribution(address(token), amount, "September rent");
    }

    function testOwnerCreatesDistributionForRegisteredProperty() public {
        uint256 id = _deposit(1_000e6);
        PropertyIncomeDistributor.Distribution memory distribution = distributor.getDistribution(id);
        assertEq(distribution.token, address(token));
        assertEq(distribution.depositor, alice);
        assertEq(distribution.amount, 1_000e6);
        assertEq(distribution.totalShares, 1_000);
        assertEq(distributor.totalIncomeGenerated(address(token)), 1_000e6);
        assertEq(currency.balanceOf(address(distributor)), 1_000e6);
    }

    function testIncomeIsProportionalToSnapshotShares() public {
        uint256 id = _deposit(1_000e6);
        assertEq(distributor.claimable(id, alice), 600e6);
        assertEq(distributor.claimable(id, bob), 250e6);
        assertEq(distributor.claimable(id, carol), 150e6);
    }

    function testInvestorsClaimTheirIncome() public {
        uint256 id = _deposit(1_000e6);
        vm.prank(bob);
        uint256 claimed = distributor.claim(id);
        assertEq(claimed, 250e6);
        assertEq(currency.balanceOf(bob), 250e6);
        assertEq(distributor.totalIncomeClaimed(address(token), bob), 250e6);
        assertTrue(distributor.hasClaimed(id, bob));
        assertEq(distributor.claimable(id, bob), 0);
    }

    function testCannotClaimTwice() public {
        uint256 id = _deposit(1_000e6);
        vm.startPrank(bob);
        distributor.claim(id);
        vm.expectRevert(PropertyIncomeDistributor.AlreadyClaimed.selector);
        distributor.claim(id);
        vm.stopPrank();
    }

    function testAddressWithoutSnapshotSharesCannotClaim() public {
        uint256 id = _deposit(1_000e6);
        vm.prank(outsider);
        vm.expectRevert(PropertyIncomeDistributor.NoIncomeToClaim.selector);
        distributor.claim(id);
    }

    function testTransferAfterDepositDoesNotChangeIncomeAllocation() public {
        uint256 id = _deposit(1_000e6);
        vm.prank(alice);
        token.transfer(bob, 600);
        assertEq(token.balanceOf(bob), 850);
        assertEq(distributor.claimable(id, alice), 600e6);
        assertEq(distributor.claimable(id, bob), 250e6);
    }

    function testEscrowedListingSharesStillEarnIncomeForSeller() public {
        // Alice lists 200 of her 600 shares before the deposit. Escrowed shares are checkpointed
        // to the marketplace, not alice, so without the fix her income would drop to 400/1000.
        vm.startPrank(alice);
        token.approve(address(marketplace), 200);
        marketplace.createListing(address(token), 200, 1e6);
        vm.stopPrank();
        assertEq(token.balanceOf(alice), 400);

        uint256 id = _deposit(1_000e6);
        assertEq(distributor.claimable(id, alice), 600e6);
        vm.prank(alice);
        assertEq(distributor.claim(id), 600e6);
    }

    function testListingCreatedAfterDepositDoesNotInflateOldClaim() public {
        uint256 id = _deposit(1_000e6);
        assertEq(distributor.claimable(id, alice), 600e6);

        // Listing shares after the snapshot must not add to a distribution that already priced
        // alice's shares in at 600 — otherwise she could double count and drain other rounds.
        vm.startPrank(alice);
        token.approve(address(marketplace), 200);
        marketplace.createListing(address(token), 200, 1e6);
        vm.stopPrank();
        assertEq(distributor.claimable(id, alice), 600e6);
    }

    function testAnyAddressCanDepositIncome() public {
        // A tenant paying rent directly (e.g. via a QR-code payment link) is not the property creator.
        vm.roll(block.number + 1);
        currency.mint(outsider, 1_000e6);
        vm.startPrank(outsider);
        currency.approve(address(distributor), 1_000e6);
        uint256 id = distributor.createDistribution(address(token), 1_000e6, "Rent");
        vm.stopPrank();
        PropertyIncomeDistributor.Distribution memory distribution = distributor.getDistribution(id);
        assertEq(distribution.depositor, outsider);
        assertEq(distributor.claimable(id, alice), 600e6);
    }

    function testRejectsUnknownPropertyAndZeroAmount() public {
        vm.expectRevert(PropertyIncomeDistributor.UnknownProperty.selector);
        distributor.createDistribution(address(currency), 1, "Rent");
        vm.prank(alice);
        vm.expectRevert(PropertyIncomeDistributor.InvalidAmount.selector);
        distributor.createDistribution(address(token), 0, "Rent");
    }
}

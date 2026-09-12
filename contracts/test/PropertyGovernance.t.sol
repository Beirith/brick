// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PropertyToken} from "../src/PropertyToken.sol";
import {PropertyGovernance} from "../src/PropertyGovernance.sol";

contract PropertyGovernanceTest is Test {
    PropertyToken token;
    PropertyGovernance governance;
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address carol = makeAddr("carol");
    address outsider = makeAddr("outsider");
    address aiAgent = makeAddr("aiAgent");
    uint256 constant VOTING_DURATION = 1 days;

    function setUp() public {
        token = new PropertyToken("Floripa Apartment", "FLP", alice, address(this), 0, 1_000);
        vm.startPrank(alice);
        token.transfer(bob, 250);
        token.transfer(carol, 150);
        vm.stopPrank();
        governance = new PropertyGovernance(address(token), alice, aiAgent);
    }

    function _createProposal() internal returns (uint256 proposalId) {
        vm.prank(alice);
        proposalId = governance.createProposal(
            "Replace air conditioning",
            "Replace the system because maintenance costs are increasing.",
            PropertyGovernance.AIRecommendation.APPROVE,
            "Projected maintenance now exceeds replacement cost.",
            3_500e6,
            VOTING_DURATION
        );
        vm.roll(block.number + 1);
    }

    function _votes(uint256 proposalId) internal view returns (uint256 votesFor, uint256 votesAgainst) {
        PropertyGovernance.Proposal memory proposal = governance.getProposal(proposalId);
        return (proposal.votesFor, proposal.votesAgainst);
    }

    function testCreatesProposalAssociatedWithCorrectToken() public {
        uint256 proposalId = _createProposal();
        assertEq(proposalId, 0);
        assertEq(governance.proposalCount(), 1);
        assertEq(governance.propertyToken(), address(token));
        PropertyGovernance.Proposal memory proposal = governance.getProposal(proposalId);
        assertEq(proposal.id, proposalId);
        assertEq(proposal.title, "Replace air conditioning");
        assertEq(uint8(proposal.aiRecommendation), uint8(PropertyGovernance.AIRecommendation.APPROVE));
    }

    function testHolderVoteUsesSnapshotTokenBalance() public {
        uint256 proposalId = _createProposal();
        vm.expectEmit(true, true, false, true, address(governance));
        emit PropertyGovernance.VoteCast(proposalId, alice, true, 600);
        vm.prank(alice);
        governance.voteFor(proposalId);
        (uint256 votesFor, uint256 votesAgainst) = _votes(proposalId);
        assertEq(votesFor, 600);
        assertEq(votesAgainst, 0);
    }

    function testAddressWithoutTokensCannotVote() public {
        uint256 proposalId = _createProposal();
        vm.prank(outsider);
        vm.expectRevert(PropertyGovernance.NoVotingPower.selector);
        governance.voteFor(proposalId);
    }

    function testAddressCannotVoteTwice() public {
        uint256 proposalId = _createProposal();
        vm.startPrank(bob);
        governance.voteFor(proposalId);
        vm.expectRevert(PropertyGovernance.AlreadyVoted.selector);
        governance.voteAgainst(proposalId);
        vm.stopPrank();
    }

    function testYesAndNoVotesAreCounted() public {
        uint256 proposalId = _createProposal();
        vm.prank(alice);
        governance.voteFor(proposalId);
        vm.prank(bob);
        governance.voteAgainst(proposalId);
        (uint256 votesFor, uint256 votesAgainst) = _votes(proposalId);
        assertEq(votesFor, 600);
        assertEq(votesAgainst, 250);
    }

    function testEndedVoteRejectsNewVotes() public {
        uint256 proposalId = _createProposal();
        vm.warp(block.timestamp + VOTING_DURATION);
        vm.prank(alice);
        vm.expectRevert(PropertyGovernance.VotingClosed.selector);
        governance.voteFor(proposalId);
    }

    function testFinalizesApprovedWhenYesExceedsNo() public {
        uint256 proposalId = _createProposal();
        vm.prank(alice);
        governance.voteFor(proposalId);
        vm.prank(bob);
        governance.voteAgainst(proposalId);
        vm.warp(block.timestamp + VOTING_DURATION);
        vm.expectEmit(true, false, false, true, address(governance));
        emit PropertyGovernance.ProposalFinalized(proposalId, true, 600, 250);
        governance.finalizeProposal(proposalId);
        assertEq(uint8(governance.status(proposalId)), uint8(PropertyGovernance.ProposalStatus.APPROVED));
    }

    function testTieFinalizesRejected() public {
        uint256 proposalId = _createProposal();
        vm.warp(block.timestamp + VOTING_DURATION);
        governance.finalizeProposal(proposalId);
        assertEq(uint8(governance.status(proposalId)), uint8(PropertyGovernance.ProposalStatus.REJECTED));
    }

    function testTransferAfterSnapshotCannotDuplicateVotingPower() public {
        uint256 proposalId = _createProposal();
        vm.prank(alice);
        governance.voteFor(proposalId);
        vm.prank(alice);
        token.transfer(bob, 600);
        assertEq(token.balanceOf(bob), 850);
        vm.prank(bob);
        governance.voteAgainst(proposalId);
        (uint256 votesFor, uint256 votesAgainst) = _votes(proposalId);
        assertEq(votesFor, 600);
        assertEq(votesAgainst, 250);
        assertEq(votesFor + votesAgainst, 850);
    }

    function testOnlyAuthorizedAccountsCreateProposalsAndAIAgentCanCreate() public {
        vm.prank(outsider);
        vm.expectRevert(PropertyGovernance.UnauthorizedProposer.selector);
        governance.createProposal(
            "Valid title", "Valid description", PropertyGovernance.AIRecommendation.NEUTRAL, "Reason", 0, 1 days
        );

        vm.prank(aiAgent);
        governance.createProposal(
            "AI proposal", "Valid description", PropertyGovernance.AIRecommendation.NEUTRAL, "Reason", 0, 1 days
        );
        assertEq(governance.proposalCount(), 1);
    }

    function testRequestsAndMockAdvicePersistAcrossShareholderVotes() public {
        vm.startPrank(alice);
        uint256 renovation = governance.createProposal(
            "Property renovation request",
            "Renovate the kitchen.",
            PropertyGovernance.AIRecommendation.APPROVE,
            "SIMULATED AI ANALYSIS: Potential 8% property value increase. Demo assumption only.",
            3_500e6,
            VOTING_DURATION
        );
        uint256 rent = governance.createProposal(
            "Rental price review request",
            "Review the monthly rent.",
            PropertyGovernance.AIRecommendation.APPROVE,
            "SIMULATED AI ANALYSIS: Rent is 3% below the regional average. No live market data.",
            0,
            VOTING_DURATION
        );
        vm.stopPrank();
        vm.roll(block.number + 1);
        vm.prank(bob);
        governance.voteFor(renovation);
        vm.prank(carol);
        governance.voteAgainst(renovation);
        vm.prank(carol);
        governance.voteFor(rent);
        PropertyGovernance.Proposal memory request = governance.getProposal(renovation);
        assertEq(request.description, "Renovate the kitchen.");
        assertEq(
            request.aiReasoning, "SIMULATED AI ANALYSIS: Potential 8% property value increase. Demo assumption only."
        );
        assertEq(request.votesFor, 250);
        assertEq(request.votesAgainst, 150);
        assertEq(governance.getProposal(rent).votesFor, 150);
        assertEq(uint8(governance.status(renovation)), uint8(PropertyGovernance.ProposalStatus.ACTIVE));
        vm.warp(block.timestamp + VOTING_DURATION);
        assertEq(uint8(governance.status(renovation)), uint8(PropertyGovernance.ProposalStatus.AWAITING_FINALIZATION));
        governance.finalizeProposal(renovation);
        assertEq(uint8(governance.status(renovation)), uint8(PropertyGovernance.ProposalStatus.APPROVED));
        assertFalse(governance.getProposal(renovation).executed);
        assertEq(token.balanceOf(bob), 250);
        assertEq(token.balanceOf(carol), 150);
    }

    function testAnyCurrentHolderCanPublishWithoutRole() public {
        assertFalse(governance.hasRole(governance.PROPOSER_ROLE(), bob));
        assertTrue(governance.canPropose(bob));
        vm.prank(bob);
        governance.createProposal(
            "Holder request",
            "Repair the kitchen",
            PropertyGovernance.AIRecommendation.NEUTRAL,
            "Demo analysis",
            0,
            1 days
        );
        assertEq(governance.proposalCount(), 1);
    }

    function testProposalPermissionFollowsOwnershipAndIsPropertySpecific() public {
        vm.prank(bob);
        token.transfer(outsider, 250);
        assertFalse(governance.canPropose(bob));
        assertTrue(governance.canPropose(outsider));
        vm.prank(bob);
        vm.expectRevert(PropertyGovernance.UnauthorizedProposer.selector);
        governance.createProposal(
            "Request", "Description", PropertyGovernance.AIRecommendation.NEUTRAL, "Demo", 0, 1 days
        );
        PropertyToken other = new PropertyToken("Other", "OTH", bob, address(this), 1, 100);
        assertEq(other.balanceOf(bob), 100);
        assertFalse(governance.canPropose(bob));
        vm.prank(outsider);
        governance.createProposal(
            "Request", "Description", PropertyGovernance.AIRecommendation.NEUTRAL, "Demo", 0, 1 days
        );
        assertEq(governance.proposalCount(), 1);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

/// @notice Token-weighted governance for one property. It records AI advice but gives it no execution authority.
contract PropertyGovernance is AccessControl {
    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
    bytes32 public constant AI_AGENT_ROLE = keccak256("AI_AGENT_ROLE");
    uint256 public constant MAX_VOTING_DURATION = 30 days;

    enum AIRecommendation {
        NEUTRAL,
        APPROVE,
        REJECT
    }

    enum ProposalStatus {
        ACTIVE,
        AWAITING_FINALIZATION,
        APPROVED,
        REJECTED,
        EXECUTED
    }

    struct Proposal {
        uint256 id;
        string title;
        string description;
        AIRecommendation aiRecommendation;
        string aiReasoning;
        uint256 estimatedCost;
        uint64 createdAt;
        uint64 votingEndsAt;
        uint48 snapshotBlock;
        uint256 votesFor;
        uint256 votesAgainst;
        bool finalized;
        bool approved;
        bool executed;
    }

    error InvalidConfiguration();
    error UnauthorizedProposer();
    error InvalidProposal();
    error InvalidVotingDuration();
    error UnknownProposal();
    error VotingClosed();
    error VotingStillActive();
    error NoVotingPower();
    error AlreadyVoted();
    error AlreadyFinalized();
    error ProposalNotApproved();
    error AlreadyExecuted();

    address public immutable propertyToken;
    Proposal[] private _proposals;
    mapping(uint256 proposalId => mapping(address voter => bool voted)) public hasVoted;

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        uint48 indexed snapshotBlock,
        uint64 votingEndsAt,
        AIRecommendation aiRecommendation
    );
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalFinalized(uint256 indexed proposalId, bool approved, uint256 votesFor, uint256 votesAgainst);
    event ProposalExecuted(uint256 indexed proposalId, address indexed recordedBy);

    constructor(address propertyToken_, address propertyOwner_, address aiAgent_) {
        if (propertyToken_.code.length == 0 || propertyOwner_ == address(0)) revert InvalidConfiguration();
        propertyToken = propertyToken_;
        _grantRole(DEFAULT_ADMIN_ROLE, propertyOwner_);
        _grantRole(PROPOSER_ROLE, propertyOwner_);
        if (aiAgent_ != address(0)) _grantRole(AI_AGENT_ROLE, aiAgent_);
    }

    /// @notice Any current shareholder may propose, in addition to explicitly authorized accounts.
    function canPropose(address account) public view returns (bool) {
        return hasRole(PROPOSER_ROLE, account) || hasRole(AI_AGENT_ROLE, account)
            || IERC20(propertyToken).balanceOf(account) > 0;
    }

    function createProposal(
        string calldata title,
        string calldata description,
        AIRecommendation aiRecommendation,
        string calldata aiReasoning,
        uint256 estimatedCost,
        uint256 votingDuration
    ) external returns (uint256 proposalId) {
        if (!canPropose(msg.sender)) {
            revert UnauthorizedProposer();
        }
        if (
            bytes(title).length == 0 || bytes(title).length > 120 || bytes(description).length == 0
                || bytes(description).length > 1_000 || bytes(aiReasoning).length == 0
                || bytes(aiReasoning).length > 2_000
        ) revert InvalidProposal();
        if (votingDuration == 0 || votingDuration > MAX_VOTING_DURATION) revert InvalidVotingDuration();

        proposalId = _proposals.length;
        uint64 createdAt = SafeCast.toUint64(block.timestamp);
        uint64 votingEndsAt = SafeCast.toUint64(block.timestamp + votingDuration);
        uint48 snapshotBlock = SafeCast.toUint48(block.number);
        _proposals.push(
            Proposal({
                id: proposalId,
                title: title,
                description: description,
                aiRecommendation: aiRecommendation,
                aiReasoning: aiReasoning,
                estimatedCost: estimatedCost,
                createdAt: createdAt,
                votingEndsAt: votingEndsAt,
                snapshotBlock: snapshotBlock,
                votesFor: 0,
                votesAgainst: 0,
                finalized: false,
                approved: false,
                executed: false
            })
        );
        emit ProposalCreated(proposalId, msg.sender, snapshotBlock, votingEndsAt, aiRecommendation);
    }

    function voteFor(uint256 proposalId) external {
        _vote(proposalId, true);
    }

    function voteAgainst(uint256 proposalId) external {
        _vote(proposalId, false);
    }

    function finalizeProposal(uint256 proposalId) external {
        Proposal storage proposal = _proposal(proposalId);
        if (block.timestamp < proposal.votingEndsAt) revert VotingStillActive();
        if (proposal.finalized) revert AlreadyFinalized();
        proposal.finalized = true;
        proposal.approved = proposal.votesFor > proposal.votesAgainst;
        emit ProposalFinalized(proposalId, proposal.approved, proposal.votesFor, proposal.votesAgainst);
    }

    /// @notice Records off-chain completion. This function cannot move funds or tokens.
    function markExecuted(uint256 proposalId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Proposal storage proposal = _proposal(proposalId);
        if (!proposal.finalized || !proposal.approved) revert ProposalNotApproved();
        if (proposal.executed) revert AlreadyExecuted();
        proposal.executed = true;
        emit ProposalExecuted(proposalId, msg.sender);
    }

    function proposalCount() external view returns (uint256) {
        return _proposals.length;
    }

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return _proposal(proposalId);
    }

    function votingPower(uint256 proposalId, address voter) external view returns (uint256) {
        Proposal storage proposal = _proposal(proposalId);
        if (block.number <= proposal.snapshotBlock) return 0;
        return IVotes(propertyToken).getPastVotes(voter, proposal.snapshotBlock);
    }

    function status(uint256 proposalId) external view returns (ProposalStatus) {
        Proposal storage proposal = _proposal(proposalId);
        if (proposal.executed) return ProposalStatus.EXECUTED;
        if (proposal.finalized) return proposal.approved ? ProposalStatus.APPROVED : ProposalStatus.REJECTED;
        if (block.timestamp < proposal.votingEndsAt) return ProposalStatus.ACTIVE;
        return ProposalStatus.AWAITING_FINALIZATION;
    }

    function _vote(uint256 proposalId, bool support) private {
        Proposal storage proposal = _proposal(proposalId);
        if (block.timestamp >= proposal.votingEndsAt) revert VotingClosed();
        if (hasVoted[proposalId][msg.sender]) revert AlreadyVoted();
        if (block.number <= proposal.snapshotBlock) revert NoVotingPower();
        uint256 weight = IVotes(propertyToken).getPastVotes(msg.sender, proposal.snapshotBlock);
        if (weight == 0) revert NoVotingPower();
        hasVoted[proposalId][msg.sender] = true;
        if (support) proposal.votesFor += weight;
        else proposal.votesAgainst += weight;
        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    function _proposal(uint256 proposalId) private view returns (Proposal storage proposal) {
        if (proposalId >= _proposals.length) revert UnknownProposal();
        return _proposals[proposalId];
    }
}

import { type Address, isAddress, parseAbi, zeroAddress } from 'viem';
export const tokenAbi = parseAbi([
  'function name() view returns (string)',
  'function balanceOf(address) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function approve(address,uint256) returns (bool)',
  'function mint(address,uint256)',
  'function getPastVotes(address,uint256) view returns (uint256)',
  'function allowance(address,address) view returns (uint256)',
]);
export const factoryAbi = parseAbi([
  'event PropertyCreated(uint256 indexed propertyId,address indexed token,address indexed creator,uint256 shareCount,uint256 initialPropertyValue,string metadataURI)',
  'function propertyCount() view returns (uint256)',
  'function properties(uint256) view returns (address token,address creator,uint256 initialPropertyValue,string metadataURI)',
  'function createProperty(string,string,uint256,uint256,string) returns (address)',
  'function governanceByToken(address) view returns (address)',
  'function isProperty(address) view returns (bool)',
]);
export const marketAbi = parseAbi([
  'function factory() view returns (address)',
  'function currency() view returns (address)',
  'function listingCount() view returns (uint256)',
  'function listings(uint256) view returns (address seller,address token,uint256 remainingShares,uint256 pricePerShare)',
  'function createListing(address,uint256,uint256) returns (uint256)',
  'function buyShares(uint256,uint256)',
  'function cancelListing(uint256)',
]);
export const governanceAbi = [
  { type: 'function', name: 'canPropose', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'PROPOSER_ROLE', stateMutability: 'view', inputs: [], outputs: [{ type: 'bytes32' }] },
  { type: 'function', name: 'AI_AGENT_ROLE', stateMutability: 'view', inputs: [], outputs: [{ type: 'bytes32' }] },
  { type: 'function', name: 'hasRole', stateMutability: 'view', inputs: [{ name: 'role', type: 'bytes32' }, { name: 'account', type: 'address' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'proposalCount', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  {
    type: 'function', name: 'getProposal', stateMutability: 'view', inputs: [{ name: 'proposalId', type: 'uint256' }],
    outputs: [{ type: 'tuple', components: [
      { name: 'id', type: 'uint256' }, { name: 'title', type: 'string' }, { name: 'description', type: 'string' },
      { name: 'aiRecommendation', type: 'uint8' }, { name: 'aiReasoning', type: 'string' }, { name: 'estimatedCost', type: 'uint256' },
      { name: 'createdAt', type: 'uint64' }, { name: 'votingEndsAt', type: 'uint64' }, { name: 'snapshotBlock', type: 'uint48' },
      { name: 'votesFor', type: 'uint256' }, { name: 'votesAgainst', type: 'uint256' }, { name: 'finalized', type: 'bool' },
      { name: 'approved', type: 'bool' }, { name: 'executed', type: 'bool' },
    ] }],
  },
  { type: 'function', name: 'status', stateMutability: 'view', inputs: [{ name: 'proposalId', type: 'uint256' }], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'votingPower', stateMutability: 'view', inputs: [{ name: 'proposalId', type: 'uint256' }, { name: 'voter', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'hasVoted', stateMutability: 'view', inputs: [{ name: 'proposalId', type: 'uint256' }, { name: 'voter', type: 'address' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'voteFor', stateMutability: 'nonpayable', inputs: [{ name: 'proposalId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'voteAgainst', stateMutability: 'nonpayable', inputs: [{ name: 'proposalId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'finalizeProposal', stateMutability: 'nonpayable', inputs: [{ name: 'proposalId', type: 'uint256' }], outputs: [] },
  {
    type: 'function', name: 'createProposal', stateMutability: 'nonpayable', outputs: [{ name: 'proposalId', type: 'uint256' }],
    inputs: [{ name: 'title', type: 'string' }, { name: 'description', type: 'string' }, { name: 'aiRecommendation', type: 'uint8' },
      { name: 'aiReasoning', type: 'string' }, { name: 'estimatedCost', type: 'uint256' }, { name: 'votingDuration', type: 'uint256' }],
  },
] as const;
export const incomeAbi = [
  { type: 'function', name: 'factory', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'currency', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'distributionCount', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'totalIncomeGenerated', stateMutability: 'view', inputs: [{ name: 'token', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'totalIncomeClaimed', stateMutability: 'view', inputs: [{ name: 'token', type: 'address' }, { name: 'investor', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'claimable', stateMutability: 'view', inputs: [{ name: 'distributionId', type: 'uint256' }, { name: 'investor', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'hasClaimed', stateMutability: 'view', inputs: [{ name: 'distributionId', type: 'uint256' }, { name: 'investor', type: 'address' }], outputs: [{ type: 'bool' }] },
  {
    type: 'function', name: 'getDistribution', stateMutability: 'view', inputs: [{ name: 'distributionId', type: 'uint256' }],
    outputs: [{ type: 'tuple', components: [
      { name: 'token', type: 'address' }, { name: 'depositor', type: 'address' }, { name: 'amount', type: 'uint256' },
      { name: 'totalShares', type: 'uint256' }, { name: 'snapshotBlock', type: 'uint48' }, { name: 'createdAt', type: 'uint64' },
      { name: 'memo', type: 'string' },
    ] }],
  },
  { type: 'function', name: 'createDistribution', stateMutability: 'nonpayable', inputs: [{ name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'memo', type: 'string' }], outputs: [{ name: 'distributionId', type: 'uint256' }] },
  { type: 'function', name: 'claim', stateMutability: 'nonpayable', inputs: [{ name: 'distributionId', type: 'uint256' }], outputs: [{ name: 'amount', type: 'uint256' }] },
] as const;
const environment = {
  currency: process.env.NEXT_PUBLIC_MOCK_BRL_ADDRESS || '',
  factory: process.env.NEXT_PUBLIC_PROPERTY_FACTORY_ADDRESS || '',
  marketplace: process.env.NEXT_PUBLIC_PROPERTY_MARKETPLACE_ADDRESS || '',
};
export const configuredAddresses = Object.values(environment).every(value => isAddress(value) && value.toLowerCase() !== zeroAddress)
  ? environment as Record<keyof typeof environment, Address>
  : undefined;
const income = process.env.NEXT_PUBLIC_PROPERTY_INCOME_ADDRESS || '';
export const configuredIncomeAddress = isAddress(income) && income.toLowerCase() !== zeroAddress ? income as Address : undefined;

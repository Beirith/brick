import { type Address, isAddress, parseAbi, zeroAddress } from 'viem';
export const tokenAbi = parseAbi([
  'function name() view returns (string)',
  'function balanceOf(address) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function approve(address,uint256) returns (bool)',
  'function mint(address,uint256)',
]);
export const factoryAbi = parseAbi([
  'event PropertyCreated(uint256 indexed propertyId,address indexed token,address indexed creator,uint256 shareCount,uint256 initialPropertyValue,string metadataURI)',
  'function propertyCount() view returns (uint256)',
  'function properties(uint256) view returns (address token,address creator,uint256 initialPropertyValue,string metadataURI)',
  'function createProperty(string,string,uint256,uint256,string) returns (address)',
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
const environment = {
  currency: process.env.NEXT_PUBLIC_MOCK_BRL_ADDRESS || '',
  factory: process.env.NEXT_PUBLIC_PROPERTY_FACTORY_ADDRESS || '',
  marketplace: process.env.NEXT_PUBLIC_PROPERTY_MARKETPLACE_ADDRESS || '',
};
export const configuredAddresses = Object.values(environment).every(value => isAddress(value) && value.toLowerCase() !== zeroAddress)
  ? environment as Record<keyof typeof environment, Address>
  : undefined;

import { type Address, type PublicClient, zeroAddress } from 'viem';
import { factoryAbi, marketAbi, tokenAbi, configuredAddresses } from '@/config/contracts';
import { locationFromMetadata } from './format';

export type Property = { id: bigint; token: Address; name: string; value: bigint; supply: bigint; owned: bigint; location?: string };
export type Listing = { id: bigint; seller: Address; token: Address; remaining: bigint; price: bigint };
export type BrickData = { properties: Property[]; listings: Listing[]; balance: bigint };

async function enumerate<T>(count: bigint, read: (id: bigint) => Promise<T>) {
  const results: T[] = [];
  // Bound concurrency, not the result set: older holdings and offers stay visible.
  for (let offset = 0n; offset < count; offset += 8n) {
    const size = Number(count - offset > 8n ? 8n : count - offset);
    results.push(...await Promise.all(Array.from({ length: size }, (_, i) => read(offset + BigInt(i)))));
  }
  return results;
}
export async function readBrick(client: PublicClient, owner?: Address): Promise<BrickData> {
  if (!configuredAddresses) throw new Error('Marketplace unavailable. Please try again later.');
  const { currency, factory, marketplace } = configuredAddresses;
  const [expectedFactory, expectedCurrency] = await Promise.all([
    client.readContract({ address: marketplace, abi: marketAbi, functionName: 'factory' }),
    client.readContract({ address: marketplace, abi: marketAbi, functionName: 'currency' }),
  ]);
  if (expectedFactory.toLowerCase() !== factory.toLowerCase() || expectedCurrency.toLowerCase() !== currency.toLowerCase()) throw new Error('Marketplace unavailable. Please try again later.');
  const [count, listingCount, balance] = await Promise.all([
    client.readContract({ address: factory, abi: factoryAbi, functionName: 'propertyCount' }),
    client.readContract({ address: marketplace, abi: marketAbi, functionName: 'listingCount' }),
    owner ? client.readContract({ address: currency, abi: tokenAbi, functionName: 'balanceOf', args: [owner] }) : Promise.resolve(0n),
  ]);
  const properties = await enumerate(count, async id => {
    const [token, , value, uri] = await client.readContract({ address: factory, abi: factoryAbi, functionName: 'properties', args: [id] });
    const [name, supply, owned] = await Promise.all([
      client.readContract({ address: token, abi: tokenAbi, functionName: 'name' }),
      client.readContract({ address: token, abi: tokenAbi, functionName: 'totalSupply' }),
      owner ? client.readContract({ address: token, abi: tokenAbi, functionName: 'balanceOf', args: [owner] }) : Promise.resolve(0n),
    ]);
    return { id, token, name, value, supply, owned, location: locationFromMetadata(uri) };
  });
  const listings = await enumerate(listingCount, async id => {
    const [seller, token, remaining, price] = await client.readContract({ address: marketplace, abi: marketAbi, functionName: 'listings', args: [id] });
    return { id, seller, token, remaining, price };
  });
  return { properties, listings: listings.filter(l => l.remaining > 0n && l.seller !== zeroAddress), balance };
}
export function propertyListings(data: BrickData, property: Property) {
  return data.listings.filter(l => l.token.toLowerCase() === property.token.toLowerCase());
}
export function reservedShares(listings: Listing[], owner?: string) {
  return listings.filter(l => l.seller.toLowerCase() === owner?.toLowerCase()).reduce((sum, l) => sum + l.remaining, 0n);
}

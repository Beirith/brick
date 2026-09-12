'use client';
import { useQuery } from '@tanstack/react-query';
import { useConnection, usePublicClient } from 'wagmi';
import { type Abi, type Address, type TransactionReceipt } from 'viem';
import { configuredAddresses, configuredIncomeAddress, incomeAbi, tokenAbi } from '@/config/contracts';
import { hskTestnet } from '@/config/wagmi';
import { type Property } from '@/lib/brick';

export type IncomeDistribution = {
  id: bigint;
  token: Address;
  depositor: Address;
  amount: bigint;
  totalShares: bigint;
  snapshotBlock: number;
  createdAt: bigint;
  memo: string;
  claimable: bigint;
  claimed: boolean;
  yourShare: bigint;
};
export type PropertyIncome = { generated: bigint; claimed: bigint; claimable: bigint; distributions: IncomeDistribution[] };

export function emptyIncome(): PropertyIncome {
  return { generated: 0n, claimed: 0n, claimable: 0n, distributions: [] };
}

/** Rounds this wallet can still claim for one property, oldest first. */
export function claimableIds(income: PropertyIncome) {
  return income.distributions.filter(distribution => distribution.claimable > 0n).map(distribution => distribution.id).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

type Send = (target: Address, abi: Abi, method: string, args: readonly unknown[], label: string) => Promise<TransactionReceipt>;

/** Claims every outstanding round for a property as one product action, one MetaMask confirmation per round. */
export async function claimIncome(send: Send, ids: bigint[]) {
  if (!configuredIncomeAddress) throw new Error('Income module unavailable.');
  for (const [index, id] of ids.entries()) {
    await send(configuredIncomeAddress, incomeAbi, 'claim', [id], ids.length > 1 ? `Claiming payment ${index + 1} of ${ids.length}` : 'Claiming rental income');
  }
}

export function useIncome(properties: Property[] = []) {
  const { address } = useConnection();
  const client = usePublicClient({ chainId: hskTestnet.id });
  return useQuery({
    queryKey: ['income', configuredIncomeAddress, address, properties.map(property => property.token).join(',')],
    enabled: !!client && !!configuredAddresses && !!configuredIncomeAddress,
    refetchInterval: 15_000,
    retry: 1,
    queryFn: async () => {
      const [factory, currency, count] = await Promise.all([
        client!.readContract({ address: configuredIncomeAddress!, abi: incomeAbi, functionName: 'factory' }),
        client!.readContract({ address: configuredIncomeAddress!, abi: incomeAbi, functionName: 'currency' }),
        client!.readContract({ address: configuredIncomeAddress!, abi: incomeAbi, functionName: 'distributionCount' }),
      ]);
      if (factory.toLowerCase() !== configuredAddresses!.factory.toLowerCase() || currency.toLowerCase() !== configuredAddresses!.currency.toLowerCase()) {
        throw new Error('Income module does not match the configured marketplace.');
      }

      const distributions: IncomeDistribution[] = [];
      for (let offset = 0n; offset < count; offset += 8n) {
        const size = Number(count - offset > 8n ? 8n : count - offset);
        distributions.push(...await Promise.all(Array.from({ length: size }, async (_, index) => {
          const id = offset + BigInt(index);
          const distribution = await client!.readContract({ address: configuredIncomeAddress!, abi: incomeAbi, functionName: 'getDistribution', args: [id] });
          const [claimable, claimed, votes] = address ? await Promise.all([
            client!.readContract({ address: configuredIncomeAddress!, abi: incomeAbi, functionName: 'claimable', args: [id, address] }),
            client!.readContract({ address: configuredIncomeAddress!, abi: incomeAbi, functionName: 'hasClaimed', args: [id, address] }),
            client!.readContract({ address: distribution.token, abi: tokenAbi, functionName: 'getPastVotes', args: [address, BigInt(distribution.snapshotBlock)] }),
          ]) : [0n, false, 0n] as const;
          // Read the holder's checkpointed votes directly so "your part" still shows after a round is claimed
          // (the contract's own claimable() view zeroes out once claimed).
          const yourShare = distribution.totalShares ? votes * distribution.amount / distribution.totalShares : 0n;
          return { id, ...distribution, claimable, claimed, yourShare } as IncomeDistribution;
        })));
      }

      const byToken = new Map<string, PropertyIncome>();
      await Promise.all(properties.map(async property => {
        const [generated, claimed] = await Promise.all([
          client!.readContract({ address: configuredIncomeAddress!, abi: incomeAbi, functionName: 'totalIncomeGenerated', args: [property.token] }),
          address ? client!.readContract({ address: configuredIncomeAddress!, abi: incomeAbi, functionName: 'totalIncomeClaimed', args: [property.token, address] }) : Promise.resolve(0n),
        ]);
        const related = distributions.filter(distribution => distribution.token.toLowerCase() === property.token.toLowerCase());
        byToken.set(property.token.toLowerCase(), {
          generated,
          claimed,
          claimable: related.reduce((total, distribution) => total + distribution.claimable, 0n),
          distributions: related,
        });
      }));
      return byToken;
    },
  });
}

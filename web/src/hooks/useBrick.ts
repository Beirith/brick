'use client';
import { useQuery } from '@tanstack/react-query';
import { useConnection, usePublicClient } from 'wagmi';
import { configuredAddresses } from '@/config/contracts';
import { hskTestnet } from '@/config/wagmi';
import { readBrick } from '@/lib/brick';

export function useBrick() {
  const { address } = useConnection();
  const client = usePublicClient({ chainId: hskTestnet.id });
  return useQuery({
    queryKey: ['brick', address, configuredAddresses],
    enabled: !!configuredAddresses && !!client,
    queryFn: () => readBrick(client!, address),
    refetchInterval: 20_000,
    staleTime: 5_000,
    retry: 1,
  });
}

'use client';
import type { ReactNode } from 'react';
import { configuredAddresses } from '@/config/contracts';
import { useBrick } from '@/hooks/useBrick';
import { EmptyState } from './ui';
import { useConnection } from 'wagmi';
import { hskTestnet } from '@/config/wagmi';

export function DataBoundary({ children }: { children: ReactNode }) {
  const query = useBrick();
  if (!configuredAddresses) return <EmptyState title="We’ll be ready soon"><p>The marketplace is being prepared. Please check back shortly.</p></EmptyState>;
  if (query.isPending) return <div className="empty-state" role="status"><span className="spinner" /> Loading properties…</div>;
  if (query.isError) return <EmptyState title="We couldn’t load the marketplace"><p>Please try again in a moment.</p><button onClick={() => query.refetch()}>Try again</button></EmptyState>;
  return children;
}
export function WalletHint() {
  const { address, chainId } = useConnection();
  if (!address) return <p className="notice">Connect your wallet using the button above to continue.</p>;
  if (chainId !== hskTestnet.id) return <p className="notice">Switch to HSK Testnet using the button above to continue.</p>;
  return null;
}

"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WagmiProvider } from "wagmi";

import { wagmiConfig } from "@/config/wagmi";
import { TransactionProvider } from '@/components/Transactions';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <TransactionProvider>{children}</TransactionProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

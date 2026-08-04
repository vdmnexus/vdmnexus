"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { getWagmiConfig } from "@/lib/wagmi";

/**
 * Wraps the whole app in `app/layout.tsx`. Children are passed through as
 * props, so server components below this boundary still render on the
 * server — only the wallet hooks become client-side.
 */
export function WalletProvider({ children }: { children: React.ReactNode }) {
  // One QueryClient per browser session; created in state so a re-render
  // never throws away the cache.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
      })
  );

  return (
    <WagmiProvider config={getWagmiConfig()}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

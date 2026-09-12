import { createConfig, http } from "wagmi";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors/injected";

export const hskTestnet = defineChain({
  id: 133,
  name: "HSKChain Testnet",
  nativeCurrency: {
    name: "HSK",
    symbol: "HSK",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://testnet.hsk.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "HSKChain Testnet Explorer",
      url: "https://testnet-explorer.hsk.xyz",
    },
  },
  testnet: true,
});

export const wagmiConfig = createConfig({
  chains: [hskTestnet],
  connectors: [injected()],
  transports: {
    [hskTestnet.id]: http("https://testnet.hsk.xyz"),
  },
  ssr: true,
});

export const CONTRACTS = {
  testUSDC: {
    address: "0x7f9B9D8DbDe8a5495374228a4D92284A2043981d" as `0x${string}`,
    chainId: 43113,
  },
  blackCat: {
    address: "0x4b532156D13F8A8C56cef272Ce6Ad20c4E8C7995" as `0x${string}`,
    chainId: 43113,
  },
} as const;

export const AVALANCHE_FUJI = {
  id: 43113,
  name: "Avalanche Fuji",
  nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://api.avax-test.network/ext/bc/C/rpc"] },
  },
  blockExplorers: {
    default: { name: "SnowTrace", url: "https://testnet.snowtrace.io" },
  },
  testnet: true,
} as const;

export const MASTER_ADDRESSES = {
  shadowAlpha: "0x5477656f6D587bea3ade5f17BDD6EDcbee4599bD" as `0x${string}`,
  cryptoNinja: "0x000000000000000000000000000000000000AA01" as `0x${string}`,
  whaleHunter: "0x000000000000000000000000000000000000BB02" as `0x${string}`,
} as const;

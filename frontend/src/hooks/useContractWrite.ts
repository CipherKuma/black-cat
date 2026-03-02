"use client";
import { useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom } from "viem";
import { avalancheFuji } from "viem/chains";
import { CONTRACTS } from "@/lib/contracts";
import BlackCatABI from "@/lib/abis/BlackCat.json";

export function useRegisterMaster() {
  const [loading, setLoading] = useState(false);
  const { wallets } = useWallets();
  const register = async (name: string) => {
    setLoading(true);
    try {
      const wallet = wallets[0];
      const provider = await wallet.getEthereumProvider();
      const wc = createWalletClient({ account: wallet.address as `0x${string}`, chain: avalancheFuji, transport: custom(provider) });
      await wc.writeContract({ address: CONTRACTS.BLACK_CAT as `0x${string}`, abi: BlackCatABI, functionName: "registerMaster", args: [name] });
    } finally { setLoading(false); }
  };
  return { register, loading };
}

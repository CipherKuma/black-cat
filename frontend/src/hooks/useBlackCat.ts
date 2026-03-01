"use client";
import { useState, useEffect } from "react";
import { publicClient } from "@/lib/viem";
import { CONTRACTS } from "@/lib/contracts";
import BlackCatABI from "@/lib/abis/BlackCat.json";

export function useLeaderboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const result = await publicClient.readContract({ address: CONTRACTS.BLACK_CAT as `0x${string}`, abi: BlackCatABI, functionName: "getLeaderboard" });
        setData(result);
      } catch {} finally { setLoading(false); }
    })();
  }, []);
  return { data, loading };
}

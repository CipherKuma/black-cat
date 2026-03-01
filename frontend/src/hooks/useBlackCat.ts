"use client";

import { useCallback, useEffect, useState } from "react";
import { publicClient } from "@/lib/viem";
import { CONTRACTS } from "@/lib/contracts";
import BlackCatAbi from "@/lib/abis/BlackCat.json";
import TestUSDCAbi from "@/lib/abis/TestUSDC.json";

export type Signal = {
  id: bigint;
  master: `0x${string}`;
  direction: number;
  tokenPair: string;
  entryPrice: bigint;
  targetPrice: bigint;
  stopLoss: bigint;
  createdAt: bigint;
  status: number;
  pnlBps: bigint;
};

export type MasterStats = {
  totalSignals: bigint;
  wins: bigint;
  losses: bigint;
  cumulativePnlBps: bigint;
  rank: bigint;
};

export type Master = {
  addr: `0x${string}`;
  name: string;
  registeredAt: bigint;
  active: boolean;
};

export type LeaderboardEntry = {
  address: `0x${string}`;
  master: Master;
  stats: MasterStats;
};

export type Subscription = {
  subscriber: `0x${string}`;
  tier: number;
  expiresAt: bigint;
};

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = (await publicClient.readContract({
        address: CONTRACTS.blackCat.address,
        abi: BlackCatAbi,
        functionName: "getLeaderboard",
      })) as [readonly `0x${string}`[], readonly MasterStats[]];

      const [addresses, statsArr] = result;

      const masterResults = await Promise.all(
        addresses.map((addr) =>
          publicClient.readContract({
            address: CONTRACTS.blackCat.address,
            abi: BlackCatAbi,
            functionName: "getMaster",
            args: [addr],
          }),
        ),
      );

      const combined: LeaderboardEntry[] = addresses.map((addr, i) => ({
        address: addr,
        master: masterResults[i] as unknown as Master,
        stats: {
          totalSignals: (statsArr[i] as MasterStats).totalSignals,
          wins: (statsArr[i] as MasterStats).wins,
          losses: (statsArr[i] as MasterStats).losses,
          cumulativePnlBps: (statsArr[i] as MasterStats).cumulativePnlBps,
          rank: (statsArr[i] as MasterStats).rank,
        },
      }));

      combined.sort((a, b) => Number(a.stats.rank) - Number(b.stats.rank));
      setEntries(combined);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load leaderboard",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { entries, loading, error, refetch: fetch };
}

export function useMasterSignals(address: `0x${string}` | undefined) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!address) return;
    try {
      setLoading(true);
      const result = await publicClient.readContract({
        address: CONTRACTS.blackCat.address,
        abi: BlackCatAbi,
        functionName: "getMasterSignals",
        args: [address],
      });
      setSignals(result as unknown as Signal[]);
    } catch {
      setSignals([]);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { signals, loading, refetch: fetch };
}

export function useMasterStats(address: `0x${string}` | undefined) {
  const [stats, setStats] = useState<MasterStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    (async () => {
      try {
        setLoading(true);
        const result = await publicClient.readContract({
          address: CONTRACTS.blackCat.address,
          abi: BlackCatAbi,
          functionName: "getMasterStats",
          args: [address],
        });
        setStats(result as unknown as MasterStats);
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [address]);

  return { stats, loading };
}

export function useMasterInfo(address: `0x${string}` | undefined) {
  const [master, setMaster] = useState<Master | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!address) return;
    try {
      setLoading(true);
      const result = await publicClient.readContract({
        address: CONTRACTS.blackCat.address,
        abi: BlackCatAbi,
        functionName: "getMaster",
        args: [address],
      });
      const m = result as unknown as Master;
      if (m.addr === "0x0000000000000000000000000000000000000000") {
        setMaster(null);
      } else {
        setMaster(m);
      }
    } catch {
      setMaster(null);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { master, loading, refetch: fetch };
}

export function useActiveSignals() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const result = await publicClient.readContract({
          address: CONTRACTS.blackCat.address,
          abi: BlackCatAbi,
          functionName: "getActiveSignals",
        });
        setSignals(result as unknown as Signal[]);
      } catch {
        setSignals([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { signals, loading };
}

export function useSubscription(address: `0x${string}` | undefined) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!address) return;
    try {
      setLoading(true);
      const result = await publicClient.readContract({
        address: CONTRACTS.blackCat.address,
        abi: BlackCatAbi,
        functionName: "subscriptions",
        args: [address],
      });
      const [subscriber, tier, expiresAt] = result as [
        `0x${string}`,
        number,
        bigint,
      ];
      if (
        subscriber === "0x0000000000000000000000000000000000000000" &&
        tier === 0
      ) {
        setSubscription(null);
      } else {
        setSubscription({ subscriber, tier, expiresAt });
      }
    } catch {
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { subscription, loading, refetch: fetch };
}

export function useUsdcBalance(address: `0x${string}` | undefined) {
  const [balance, setBalance] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!address) return;
    try {
      setLoading(true);
      const result = await publicClient.readContract({
        address: CONTRACTS.testUSDC.address,
        abi: TestUSDCAbi,
        functionName: "balanceOf",
        args: [address],
      });
      setBalance(result as bigint);
    } catch {
      setBalance(0n);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { balance, loading, refetch: fetch };
}

export function useAccessibleMasters(address: `0x${string}` | undefined) {
  const [masters, setMasters] = useState<`0x${string}`[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    (async () => {
      try {
        setLoading(true);
        const result = await publicClient.readContract({
          address: CONTRACTS.blackCat.address,
          abi: BlackCatAbi,
          functionName: "getAccessibleMasters",
          args: [address],
        });
        setMasters(result as `0x${string}`[]);
      } catch {
        setMasters([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [address]);

  return { masters, loading };
}

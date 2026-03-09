"use client";

import { useState, useCallback } from "react";
import { useActiveAccount } from "thirdweb/react";
import { viemAdapter } from "thirdweb/adapters/viem";
import { parseUnits } from "viem";
import { avalancheFuji } from "@/lib/viem";
import { client, chain } from "@/lib/thirdweb";
import { CONTRACTS } from "@/lib/contracts";
import BlackCatAbi from "@/lib/abis/BlackCat.json";
import TestUSDCAbi from "@/lib/abis/TestUSDC.json";
import { publicClient } from "@/lib/viem";

export function useRegisterMaster() {
  const account = useActiveAccount();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = useCallback(
    async (name: string) => {
      if (!account) throw new Error("Not connected");
      try {
        setLoading(true);
        setError(null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const wc: any = viemAdapter.walletClient.toViem({
          client,
          account,
          chain,
        });
        const hash = await wc.writeContract({
          address: CONTRACTS.blackCat.address,
          abi: BlackCatAbi,
          functionName: "registerMaster",
          args: [name],
          account: account.address as `0x${string}`,
          chain: avalancheFuji,
        });
        await publicClient.waitForTransactionReceipt({ hash });
        return hash;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Registration failed";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [account],
  );

  return { register, loading, error };
}

export function usePostSignal() {
  const account = useActiveAccount();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const post = useCallback(
    async (
      direction: number,
      tokenPair: string,
      entryPrice: string,
      targetPrice: string,
      stopLoss: string,
    ) => {
      if (!account) throw new Error("Not connected");
      try {
        setLoading(true);
        setError(null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const wc: any = viemAdapter.walletClient.toViem({
          client,
          account,
          chain,
        });
        const hash = await wc.writeContract({
          address: CONTRACTS.blackCat.address,
          abi: BlackCatAbi,
          functionName: "postSignal",
          args: [
            direction,
            tokenPair,
            parseUnits(entryPrice, 18),
            parseUnits(targetPrice, 18),
            parseUnits(stopLoss, 18),
          ],
          account: account.address as `0x${string}`,
          chain: avalancheFuji,
        });
        await publicClient.waitForTransactionReceipt({ hash });
        return hash;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to post signal";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [account],
  );

  return { post, loading, error };
}

export function useSubscribe() {
  const account = useActiveAccount();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<
    "idle" | "approving" | "subscribing" | "done" | "error"
  >("idle");

  const subscribe = useCallback(
    async (tier: number) => {
      if (!account) throw new Error("Not connected");
      try {
        setLoading(true);
        setError(null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const wc: any = viemAdapter.walletClient.toViem({
          client,
          account,
          chain,
        });

        if (tier === 1) {
          setStep("approving");
          const proFee = (await publicClient.readContract({
            address: CONTRACTS.blackCat.address,
            abi: BlackCatAbi,
            functionName: "PRO_FEE",
          })) as bigint;

          const approveHash = await wc.writeContract({
            address: CONTRACTS.testUSDC.address,
            abi: TestUSDCAbi,
            functionName: "approve",
            args: [CONTRACTS.blackCat.address, proFee],
            account: account.address as `0x${string}`,
            chain: avalancheFuji,
          });
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }

        setStep("subscribing");
        const subHash = await wc.writeContract({
          address: CONTRACTS.blackCat.address,
          abi: BlackCatAbi,
          functionName: "subscribe",
          args: [tier],
          account: account.address as `0x${string}`,
          chain: avalancheFuji,
        });
        await publicClient.waitForTransactionReceipt({ hash: subHash });
        setStep("done");
        return subHash;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Subscription failed";
        setError(msg);
        setStep("error");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [account],
  );

  return { subscribe, loading, error, step, resetStep: () => setStep("idle") };
}

export function useFaucet() {
  const account = useActiveAccount();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const claim = useCallback(async () => {
    if (!account) throw new Error("Not connected");
    try {
      setLoading(true);
      setError(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wc: any = viemAdapter.walletClient.toViem({
        client,
        account,
        chain,
      });
      const hash = await wc.writeContract({
        address: CONTRACTS.testUSDC.address,
        abi: TestUSDCAbi,
        functionName: "faucet",
        args: [1000000000n],
        account: account.address as `0x${string}`,
        chain: avalancheFuji,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Faucet failed";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account]);

  return { claim, loading, error };
}

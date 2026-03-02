"use client";

import { useState, useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  createWalletClient,
  custom,
  parseUnits,
  type WalletClient,
} from "viem";
import { avalancheFuji } from "@/lib/viem";
import { CONTRACTS } from "@/lib/contracts";
import BlackCatAbi from "@/lib/abis/BlackCat.json";
import TestUSDCAbi from "@/lib/abis/TestUSDC.json";
import { publicClient } from "@/lib/viem";

async function getWalletClient(
  wallets: ReturnType<typeof useWallets>["wallets"],
): Promise<WalletClient> {
  const wallet = wallets[0];
  if (!wallet) throw new Error("No wallet connected");
  const provider = await wallet.getEthereumProvider();
  return createWalletClient({
    chain: avalancheFuji,
    transport: custom(provider),
  });
}

export function useRegisterMaster() {
  const { wallets } = useWallets();
  const { authenticated } = usePrivy();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = useCallback(
    async (name: string) => {
      if (!authenticated || !wallets[0]) throw new Error("Not connected");
      try {
        setLoading(true);
        setError(null);
        const client = await getWalletClient(wallets);
        const [account] = await client.getAddresses();
        const hash = await client.writeContract({
          address: CONTRACTS.blackCat.address,
          abi: BlackCatAbi,
          functionName: "registerMaster",
          args: [name],
          account,
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
    [wallets, authenticated],
  );

  return { register, loading, error };
}

export function usePostSignal() {
  const { wallets } = useWallets();
  const { authenticated } = usePrivy();
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
      if (!authenticated || !wallets[0]) throw new Error("Not connected");
      try {
        setLoading(true);
        setError(null);
        const client = await getWalletClient(wallets);
        const [account] = await client.getAddresses();
        const hash = await client.writeContract({
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
          account,
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
    [wallets, authenticated],
  );

  return { post, loading, error };
}

export function useSubscribe() {
  const { wallets } = useWallets();
  const { authenticated } = usePrivy();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<
    "idle" | "approving" | "subscribing" | "done" | "error"
  >("idle");

  const subscribe = useCallback(
    async (tier: number) => {
      if (!authenticated || !wallets[0]) throw new Error("Not connected");
      try {
        setLoading(true);
        setError(null);

        const client = await getWalletClient(wallets);
        const [account] = await client.getAddresses();

        if (tier === 1) {
          setStep("approving");
          const proFee = (await publicClient.readContract({
            address: CONTRACTS.blackCat.address,
            abi: BlackCatAbi,
            functionName: "PRO_FEE",
          })) as bigint;

          const approveHash = await client.writeContract({
            address: CONTRACTS.testUSDC.address,
            abi: TestUSDCAbi,
            functionName: "approve",
            args: [CONTRACTS.blackCat.address, proFee],
            account,
            chain: avalancheFuji,
          });
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }

        setStep("subscribing");
        const subHash = await client.writeContract({
          address: CONTRACTS.blackCat.address,
          abi: BlackCatAbi,
          functionName: "subscribe",
          args: [tier],
          account,
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
    [wallets, authenticated],
  );

  return { subscribe, loading, error, step, resetStep: () => setStep("idle") };
}

export function useFaucet() {
  const { wallets } = useWallets();
  const { authenticated } = usePrivy();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const claim = useCallback(async () => {
    if (!authenticated || !wallets[0]) throw new Error("Not connected");
    try {
      setLoading(true);
      setError(null);
      const client = await getWalletClient(wallets);
      const [account] = await client.getAddresses();
      const hash = await client.writeContract({
        address: CONTRACTS.testUSDC.address,
        abi: TestUSDCAbi,
        functionName: "faucet",
        args: [1000000000n],
        account,
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
  }, [wallets, authenticated]);

  return { claim, loading, error };
}

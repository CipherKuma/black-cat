"use client";

import { useState } from "react";
import { useActiveAccount, useConnectModal } from "thirdweb/react";
import { client, wallets as thirdwebWallets, chain } from "@/lib/thirdweb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useMasterInfo,
  useMasterStats,
  useMasterSignals,
} from "@/hooks/useBlackCat";
import { useRegisterMaster, usePostSignal } from "@/hooks/useContractWrite";
import {
  formatPnlBps,
  formatWinRate,
  formatPrice,
  truncateAddress,
  timeAgo,
  DIRECTION_LABELS,
  STATUS_LABELS,
} from "@/lib/format";

const TOKEN_PAIRS = ["ETH/USD", "BTC/USD", "AVAX/USD"];

function RegisterForm({ onRegistered }: { onRegistered: () => void }) {
  const [name, setName] = useState("");
  const { register, loading, error } = useRegisterMaster();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await register(name.trim());
      onRegistered();
    } catch {
      // error is handled by the hook
    }
  };

  return (
    <div className="mx-auto max-w-lg py-24">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-white">
          Become a Master Trader
        </h1>
        <p className="text-muted-foreground">
          Register to start posting signals and build your on-chain reputation.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Trading Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ShadowAlpha"
                className="font-mono"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full bg-green-500 text-black hover:bg-green-400"
            >
              {loading ? "Registering..." : "Register as Master"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function PostSignalForm({ onPosted }: { onPosted: () => void }) {
  const [direction, setDirection] = useState(0);
  const [tokenPair, setTokenPair] = useState(TOKEN_PAIRS[0]);
  const [entryPrice, setEntryPrice] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const { post, loading, error } = usePostSignal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryPrice || !targetPrice || !stopLoss) return;
    try {
      await post(direction, tokenPair, entryPrice, targetPrice, stopLoss);
      setEntryPrice("");
      setTargetPrice("");
      setStopLoss("");
      onPosted();
    } catch {
      // error handled by hook
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Post Signal</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-white">
              Direction
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={direction === 0 ? "default" : "outline"}
                onClick={() => setDirection(0)}
                className={
                  direction === 0
                    ? "bg-green-500 text-black hover:bg-green-400"
                    : ""
                }
              >
                LONG
              </Button>
              <Button
                type="button"
                size="sm"
                variant={direction === 1 ? "default" : "outline"}
                onClick={() => setDirection(1)}
                className={
                  direction === 1
                    ? "bg-red-500 text-white hover:bg-red-400"
                    : ""
                }
              >
                SHORT
              </Button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white">
              Token Pair
            </label>
            <div className="flex gap-2">
              {TOKEN_PAIRS.map((pair) => (
                <Button
                  key={pair}
                  type="button"
                  size="sm"
                  variant={tokenPair === pair ? "default" : "outline"}
                  onClick={() => setTokenPair(pair)}
                >
                  {pair}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Entry Price
              </label>
              <Input
                value={entryPrice}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9.]/g, "");
                  setEntryPrice(v);
                }}
                placeholder="2450.00"
                className="font-mono"
                inputMode="decimal"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Target
              </label>
              <Input
                value={targetPrice}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9.]/g, "");
                  setTargetPrice(v);
                }}
                placeholder="2600.00"
                className="font-mono"
                inputMode="decimal"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Stop Loss
              </label>
              <Input
                value={stopLoss}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9.]/g, "");
                  setStopLoss(v);
                }}
                placeholder="2350.00"
                className="font-mono"
                inputMode="decimal"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button
            type="submit"
            disabled={loading || !entryPrice || !targetPrice || !stopLoss}
            className="w-full bg-green-500 text-black hover:bg-green-400"
          >
            {loading ? "Posting..." : "Post Signal"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function MasterDashboard({ address }: { address: `0x${string}` }) {
  const { master } = useMasterInfo(address);
  const { stats } = useMasterStats(address);
  const { signals, refetch } = useMasterSignals(address);

  const activeSignals = signals.filter((s) => s.status === 0);
  const settledSignals = signals.filter((s) => s.status !== 0);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-4">
          <img
            src={`https://api.dicebear.com/9.x/shapes/svg?seed=${address}`}
            alt=""
            className="h-12 w-12 rounded-full"
          />
          <div>
            <h1 className="text-2xl font-bold text-white">
              {master?.name || "Master"}
            </h1>
            <p className="font-mono text-sm text-muted-foreground">
              {truncateAddress(address)}
            </p>
          </div>
          {stats && stats.rank > 0n && (
            <Badge
              variant="outline"
              className="ml-auto border-green-500/30 text-green-500"
            >
              Rank #{stats.rank.toString()}
            </Badge>
          )}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs uppercase text-muted-foreground">
                Total Signals
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-white">
                {stats.totalSignals.toString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs uppercase text-muted-foreground">
                Win Rate
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-white">
                {formatWinRate(stats.wins, stats.totalSignals)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs uppercase text-muted-foreground">W / L</p>
              <p className="mt-1 font-mono text-2xl font-bold">
                <span className="text-green-500">{stats.wins.toString()}</span>
                <span className="text-muted-foreground"> / </span>
                <span className="text-red-500">{stats.losses.toString()}</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs uppercase text-muted-foreground">
                Cumulative PnL
              </p>
              <p
                className={`mt-1 font-mono text-2xl font-bold ${Number(stats.cumulativePnlBps) >= 0 ? "text-green-500" : "text-red-500"}`}
              >
                {formatPnlBps(stats.cumulativePnlBps)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <PostSignalForm onPosted={refetch} />

      {activeSignals.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-bold text-white">
            Active Signals ({activeSignals.length})
          </h2>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-card/50">
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">
                    Dir
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">
                    Pair
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase text-muted-foreground">
                    Entry
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase text-muted-foreground">
                    Target
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase text-muted-foreground">
                    Stop
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase text-muted-foreground">
                    Posted
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activeSignals.map((sig) => (
                  <tr key={sig.id.toString()}>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={
                          sig.direction === 0
                            ? "border-green-500/30 text-green-500"
                            : "border-red-500/30 text-red-500"
                        }
                      >
                        {DIRECTION_LABELS[sig.direction]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-white">
                      {sig.tokenPair}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground">
                      ${formatPrice(sig.entryPrice)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-green-500/70">
                      ${formatPrice(sig.targetPrice)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-red-500/70">
                      ${formatPrice(sig.stopLoss)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {timeAgo(sig.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {settledSignals.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-bold text-white">
            Signal History ({settledSignals.length})
          </h2>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-card/50">
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">
                    Dir
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">
                    Pair
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase text-muted-foreground">
                    Entry
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase text-muted-foreground">
                    PnL
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {settledSignals.map((sig) => {
                  const pnl = Number(sig.pnlBps);
                  return (
                    <tr key={sig.id.toString()}>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={
                            sig.direction === 0
                              ? "border-green-500/30 text-green-500"
                              : "border-red-500/30 text-red-500"
                          }
                        >
                          {DIRECTION_LABELS[sig.direction]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-white">
                        {sig.tokenPair}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground">
                        ${formatPrice(sig.entryPrice)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge
                          variant="outline"
                          className={
                            sig.status === 1
                              ? "border-green-500/30 text-green-500"
                              : "border-red-500/30 text-red-500"
                          }
                        >
                          {STATUS_LABELS[sig.status] ?? "UNKNOWN"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-mono text-sm font-medium ${pnl >= 0 ? "text-green-500" : "text-red-500"}`}
                        >
                          {formatPnlBps(sig.pnlBps)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MasterPage() {
  const account = useActiveAccount();
  const { connect } = useConnectModal();
  const address = account?.address as `0x${string}` | undefined;
  const { master, loading, refetch } = useMasterInfo(address);

  const handleConnect = () =>
    connect({ client, wallets: thirdwebWallets, chain });

  if (!account || !address) {
    return (
      <div className="mx-auto max-w-lg py-24 text-center">
        <h1 className="mb-4 text-3xl font-bold text-white">Master Dashboard</h1>
        <p className="mb-8 text-muted-foreground">
          Connect your wallet to register as a master trader or manage your
          signals.
        </p>
        <Button
          onClick={handleConnect}
          className="bg-green-500 text-black hover:bg-green-400"
        >
          Connect Wallet
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
      </div>
    );
  }

  if (!master) {
    return <RegisterForm onRegistered={refetch} />;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <MasterDashboard address={address} />
    </div>
  );
}

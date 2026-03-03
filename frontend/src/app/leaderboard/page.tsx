"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  useLeaderboard,
  useMasterSignals,
  type LeaderboardEntry,
} from "@/hooks/useBlackCat";
import {
  formatPnlBps,
  formatWinRate,
  formatPrice,
  truncateAddress,
  timeAgo,
  DIRECTION_LABELS,
  STATUS_LABELS,
} from "@/lib/format";

function SignalRow({
  signal,
}: {
  signal: {
    id: bigint;
    direction: number;
    tokenPair: string;
    entryPrice: bigint;
    targetPrice: bigint;
    stopLoss: bigint;
    createdAt: bigint;
    status: number;
    pnlBps: bigint;
  };
}) {
  const pnl = Number(signal.pnlBps);
  const isLong = signal.direction === 0;

  return (
    <tr className="border-b border-border/50 transition-colors hover:bg-card/20">
      <td className="px-4 py-3">
        <span className="font-mono text-xs text-muted-foreground">
          #{signal.id.toString()}
        </span>
      </td>
      <td className="px-4 py-3">
        <Badge
          variant="outline"
          className={
            isLong
              ? "border-green-500/30 text-green-500"
              : "border-red-500/30 text-red-500"
          }
        >
          {DIRECTION_LABELS[signal.direction] ?? "UNKNOWN"}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-sm text-white">{signal.tokenPair}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="font-mono text-sm text-muted-foreground">
          ${formatPrice(signal.entryPrice)}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="font-mono text-sm text-green-500/70">
          ${formatPrice(signal.targetPrice)}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="font-mono text-sm text-red-500/70">
          ${formatPrice(signal.stopLoss)}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <Badge
          variant="outline"
          className={
            signal.status === 0
              ? "border-yellow-500/30 text-yellow-500"
              : signal.status === 1
                ? "border-green-500/30 text-green-500"
                : "border-red-500/30 text-red-500"
          }
        >
          {STATUS_LABELS[signal.status] ?? "UNKNOWN"}
        </Badge>
      </td>
      <td className="px-4 py-3 text-right">
        <span
          className={`font-mono text-sm font-medium ${pnl >= 0 ? "text-green-500" : "text-red-500"}`}
        >
          {formatPnlBps(signal.pnlBps)}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-xs text-muted-foreground">
          {timeAgo(signal.createdAt)}
        </span>
      </td>
    </tr>
  );
}

function ExpandedRow({ entry }: { entry: LeaderboardEntry }) {
  const { signals, loading } = useMasterSignals(entry.address);

  return (
    <tr>
      <td colSpan={7} className="bg-card/20 px-6 py-4">
        <div className="mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium text-green-500">
            CRE Verified Signals
          </span>
          <span className="text-xs text-muted-foreground">
            ({signals.length} total)
          </span>
        </div>

        {loading ? (
          <div className="flex h-16 items-center justify-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
          </div>
        ) : signals.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No signals posted yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">
                    ID
                  </th>
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
                    Status
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase text-muted-foreground">
                    PnL
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase text-muted-foreground">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {signals.map((sig) => (
                  <SignalRow key={sig.id.toString()} signal={sig} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </td>
    </tr>
  );
}

export default function LeaderboardPage() {
  const { entries, loading, error } = useLeaderboard();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
          <Badge
            variant="outline"
            className="border-green-500/30 text-green-500"
          >
            <Shield className="mr-1 h-3 w-3" />
            CRE Verified
          </Badge>
        </div>
        <p className="mt-2 text-muted-foreground">
          Rankings determined by Chainlink CRE consensus. Click a row to view
          signals.
        </p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5">
          <p className="text-red-400">{error}</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card/50">
          <p className="text-muted-foreground">
            No masters on the leaderboard yet.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-card/50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Master
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Signals
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Win Rate
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  W / L
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Cumulative PnL
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Streak
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((entry, i) => {
                const pnl = Number(entry.stats.cumulativePnlBps);
                const isExpanded = expanded === entry.address;
                const wins = Number(entry.stats.wins);
                const streak = wins > 0 ? `${wins}W` : "0";

                return (
                  <>
                    <tr
                      key={entry.address}
                      onClick={() =>
                        setExpanded(isExpanded ? null : entry.address)
                      }
                      className="cursor-pointer transition-colors hover:bg-card/30"
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-bold text-white">
                          #{i + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={`https://api.dicebear.com/9.x/shapes/svg?seed=${entry.address}`}
                            alt=""
                            className="h-8 w-8 rounded-full"
                          />
                          <div>
                            <p className="text-sm font-medium text-white">
                              {entry.master.name || "Unnamed"}
                            </p>
                            <p className="font-mono text-xs text-muted-foreground">
                              {truncateAddress(entry.address)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-mono text-sm text-muted-foreground">
                          {entry.stats.totalSignals.toString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-mono text-sm text-white">
                          {formatWinRate(
                            entry.stats.wins,
                            entry.stats.totalSignals,
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-mono text-sm">
                          <span className="text-green-500">
                            {entry.stats.wins.toString()}
                          </span>
                          <span className="text-muted-foreground"> / </span>
                          <span className="text-red-500">
                            {entry.stats.losses.toString()}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`font-mono text-sm font-medium ${pnl >= 0 ? "text-green-500" : "text-red-500"}`}
                        >
                          {formatPnlBps(entry.stats.cumulativePnlBps)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-mono text-sm text-muted-foreground">
                          {streak}
                        </span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <ExpandedRow
                        key={`${entry.address}-expanded`}
                        entry={entry}
                      />
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
// CRE verified

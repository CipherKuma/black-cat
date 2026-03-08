"use client";

import Link from "next/link";
import { ArrowRight, Shield, Eye, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLeaderboard } from "@/hooks/useBlackCat";
import { formatPnlBps, formatWinRate, truncateAddress } from "@/lib/format";

function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-green-500/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-green-500/3 blur-2xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-24 lg:grid-cols-2 lg:py-32">
        <div className="flex flex-col justify-center">
          <h1 className="text-5xl font-bold leading-tight tracking-tight text-white lg:text-6xl">
            Private
            <br />
            <span className="text-green-500">Copy Trading</span>
            <br />
            Signals
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted-foreground">
            Encrypted trade signals verified by Chainlink CRE. No front-running,
            no strategy theft, no alpha decay, no data leaks. Copy the best traders without
            anyone knowing.
          </p>
          <div className="mt-8 flex gap-4">
            <Link href="/master">
              <Button
                size="lg"
                className="bg-green-500 text-black hover:bg-green-400"
              >
                Become a Master
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/subscribe">
              <Button size="lg" variant="outline">
                Subscribe
              </Button>
            </Link>
          </div>
        </div>

        <div className="hidden items-center justify-center lg:flex">
          <div className="relative w-full max-w-sm">
            <div className="rounded-xl border border-border bg-card/50 p-6 backdrop-blur-sm">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                <span className="font-mono text-xs text-muted-foreground">
                  LIVE SIGNAL
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Pair</span>
                  <span className="font-mono text-sm text-white">ETH/USD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Direction
                  </span>
                  <span className="font-mono text-sm text-green-500">LONG</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className="font-mono text-sm text-yellow-500">
                    ENCRYPTED
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-500/5 px-3 py-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-green-500">
                    CRE Verified in TEE
                  </span>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-3 -right-3 -z-10 h-full w-full rounded-xl border border-green-500/10 bg-green-500/5" />
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      verb: "Post.",
      rest: "Your Signal",
      description:
        "Master traders open positions on Hyperliquid, GMX, or Vertex, then register the signal on Black Cat. The signal is encrypted on-chain using eERC -- invisible to everyone.",
      icon: Eye,
      color: "text-green-500",
    },
    {
      number: "02",
      verb: "Verify.",
      rest: "With CRE",
      description:
        "Chainlink CRE runs inside a TEE, calling the external DEX API to confirm the master actually holds the claimed position. Fake signals get rejected. No trust required.",
      icon: Shield,
      color: "text-blue-400",
    },
    {
      number: "03",
      verb: "Rank.",
      rest: "The Leaderboard",
      description:
        "CRE nodes independently calculate real PnL across DEXes and reach consensus. The leaderboard is tamper-proof and updated hourly. Higher rank means better subscribers.",
      icon: TrendingUp,
      color: "text-purple-400",
    },
  ];

  return (
    <section className="border-b border-border py-24">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="mb-4 text-3xl font-bold text-white">How It Works</h2>
        <p className="mb-16 max-w-2xl text-muted-foreground">
          Three steps from signal to verified copy trade. No trust assumptions.
        </p>

        <div className="space-y-20">
          {steps.map((step) => (
            <div key={step.number} className="grid gap-8 lg:grid-cols-2">
              <div>
                <div className="mb-4 flex items-baseline gap-4">
                  <span
                    className={`font-mono text-5xl font-bold ${step.color} opacity-30`}
                  >
                    {step.number}
                  </span>
                  <div>
                    <span className="text-3xl font-bold text-white">
                      {step.verb}
                    </span>{" "}
                    <span className="text-3xl font-bold text-muted-foreground">
                      {step.rest}
                    </span>
                  </div>
                </div>
                <p className="max-w-md leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
              <div className="flex items-center justify-center">
                <div className="flex h-32 w-32 items-center justify-center rounded-2xl border border-border bg-card/50">
                  <step.icon className={`h-12 w-12 ${step.color} opacity-60`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LeaderboardPreview() {
  const { entries, loading } = useLeaderboard();
  const top5 = entries.slice(0, 5);

  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <h2 className="mb-2 text-3xl font-bold text-white">
              Live Leaderboard
            </h2>
            <p className="text-muted-foreground">
              Top-ranked masters, verified by CRE consensus.
            </p>
          </div>
          <Link href="/leaderboard">
            <Button variant="outline" size="sm">
              View All
              <ArrowRight className="ml-2 h-3 w-3" />
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
          </div>
        ) : top5.length === 0 ? (
          <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card/50">
            <p className="text-muted-foreground">
              No masters registered yet. Be the first.
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
                    Win Rate
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Cumulative PnL
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Signals
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {top5.map((entry, i) => {
                  const pnl = Number(entry.stats.cumulativePnlBps);
                  return (
                    <tr
                      key={entry.address}
                      className="transition-colors hover:bg-card/30"
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
                        <span className="font-mono text-sm text-white">
                          {formatWinRate(
                            entry.stats.wins,
                            entry.stats.totalSignals,
                          )}
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
                          {entry.stats.totalSignals.toString()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div>
      <HeroSection />
      <HowItWorksSection />
      <LeaderboardPreview />
    </div>
  );
}

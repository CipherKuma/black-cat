"use client";

import { useActiveAccount, useConnectModal } from "thirdweb/react";
import { client, wallets as thirdwebWallets, chain } from "@/lib/thirdweb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Loader2, X, Shield, Droplets } from "lucide-react";
import {
  useSubscription,
  useUsdcBalance,
  useAccessibleMasters,
  useMasterSignals,
  useMasterInfo,
} from "@/hooks/useBlackCat";
import { useSubscribe, useFaucet } from "@/hooks/useContractWrite";
import {
  formatUsdc,
  formatPnlBps,
  formatPrice,
  truncateAddress,
  DIRECTION_LABELS,
  STATUS_LABELS,
} from "@/lib/format";

const TIERS = [
  {
    id: 0,
    name: "FREE",
    price: "0",
    description: "View leaderboard. Top 3 master signals visible.",
    features: [
      "View leaderboard rankings",
      "See top 3 masters",
      "No copy trading",
    ],
  },
  {
    id: 1,
    name: "PRO",
    price: "100",
    description: "Full access to all masters and their signals.",
    features: [
      "All master signals visible",
      "Full signal history",
      "Priority copy execution",
    ],
  },
];

function TxStepsDialog({
  open,
  step,
  onClose,
}: {
  open: boolean;
  step: "idle" | "approving" | "subscribing" | "done" | "error";
  onClose: () => void;
}) {
  const steps = [
    { id: "approving", label: "Approving USDC spend" },
    { id: "subscribing", label: "Confirming subscription" },
  ];

  const getStepStatus = (stepId: string) => {
    const stepOrder = ["approving", "subscribing", "done"];
    const currentIndex = stepOrder.indexOf(step);
    const stepIndex = stepOrder.indexOf(stepId);

    if (step === "error") return "error";
    if (stepIndex < currentIndex) return "done";
    if (stepId === step) return "active";
    return "idle";
  };

  return (
    <Dialog
      open={open}
      onOpenChange={step === "done" || step === "error" ? onClose : undefined}
    >
      <DialogContent className="z-40 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "done"
              ? "Subscription Active"
              : step === "error"
                ? "Transaction Failed"
                : "Processing..."}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {steps.map((s) => {
            const status = getStepStatus(s.id);
            return (
              <div key={s.id} className="flex items-center gap-3">
                {status === "done" ? (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20">
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                ) : status === "active" ? (
                  <Loader2 className="h-6 w-6 animate-spin text-green-500" />
                ) : status === "error" ? (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/20">
                    <X className="h-4 w-4 text-red-500" />
                  </div>
                ) : (
                  <div className="h-6 w-6 rounded-full border border-border" />
                )}
                <span
                  className={`text-sm ${status === "active" ? "text-white" : status === "done" ? "text-green-500" : "text-muted-foreground"}`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
        {(step === "done" || step === "error") && (
          <Button
            onClick={onClose}
            variant={step === "error" ? "destructive" : "default"}
            className={
              step === "done"
                ? "bg-green-500 text-black hover:bg-green-400"
                : ""
            }
          >
            {step === "error" ? "Close" : "Done"}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AccessibleSignals({ address }: { address: `0x${string}` }) {
  const { masters } = useAccessibleMasters(address);

  if (masters.length === 0) {
    return (
      <div className="mt-8 flex h-32 items-center justify-center rounded-xl border border-border bg-card/50">
        <p className="text-muted-foreground">
          No accessible masters at your tier.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <h2 className="text-lg font-bold text-white">
        Accessible Signals ({masters.length} masters)
      </h2>
      {masters.map((masterAddr) => (
        <MasterSignalCard key={masterAddr} address={masterAddr} />
      ))}
    </div>
  );
}

function MasterSignalCard({ address }: { address: `0x${string}` }) {
  const { master } = useMasterInfo(address);
  const { signals } = useMasterSignals(address);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <img
            src={`https://api.dicebear.com/9.x/shapes/svg?seed=${address}`}
            alt=""
            className="h-8 w-8 rounded-full"
          />
          <div>
            <CardTitle className="text-sm">
              {master?.name || "Unnamed"}
            </CardTitle>
            <p className="font-mono text-xs text-muted-foreground">
              {truncateAddress(address)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {signals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No signals yet.</p>
        ) : (
          <div className="space-y-2">
            {signals.slice(0, 5).map((sig) => {
              const pnl = Number(sig.pnlBps);
              return (
                <div
                  key={sig.id.toString()}
                  className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
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
                    <span className="font-mono text-sm text-white">
                      {sig.tokenPair}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      @ ${formatPrice(sig.entryPrice)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={
                        sig.status === 0
                          ? "border-yellow-500/30 text-yellow-500"
                          : sig.status === 1
                            ? "border-green-500/30 text-green-500"
                            : "border-red-500/30 text-red-500"
                      }
                    >
                      {STATUS_LABELS[sig.status] ?? "UNKNOWN"}
                    </Badge>
                    <span
                      className={`font-mono text-sm ${pnl >= 0 ? "text-green-500" : "text-red-500"}`}
                    >
                      {formatPnlBps(sig.pnlBps)}
                    </span>
                  </div>
                </div>
              );
            })}
            {signals.length > 5 && (
              <p className="text-center text-xs text-muted-foreground">
                +{signals.length - 5} more signals
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SubscribePage() {
  const account = useActiveAccount();
  const { connect } = useConnectModal();
  const address = account?.address as `0x${string}` | undefined;
  const { subscription, refetch: refetchSub } = useSubscription(address);
  const { balance, refetch: refetchBalance } = useUsdcBalance(address);
  const { subscribe, step, resetStep } = useSubscribe();
  const { claim, loading: faucetLoading } = useFaucet();

  const showDialog = step !== "idle";
  const handleConnect = () =>
    connect({ client, wallets: thirdwebWallets, chain });

  const handleSubscribe = async (tier: number) => {
    try {
      await subscribe(tier);
      refetchSub();
      refetchBalance();
    } catch {
      // error shown in dialog
    }
  };

  const handleFaucet = async () => {
    try {
      await claim();
      refetchBalance();
    } catch {
      // error handled
    }
  };

  const handleCloseDialog = () => {
    resetStep();
    if (step === "done") {
      refetchSub();
      refetchBalance();
    }
  };

  const isActive =
    subscription &&
    subscription.expiresAt > BigInt(Math.floor(Date.now() / 1000));
  const currentTier = subscription?.tier ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <TxStepsDialog
        open={showDialog}
        step={step}
        onClose={handleCloseDialog}
      />

      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-white">Subscribe</h1>
        <p className="text-muted-foreground">
          Choose your tier to access master trader signals.
        </p>
      </div>

      {!!account && address && (
        <div className="mb-8 flex items-center justify-between rounded-xl border border-border bg-card/50 px-6 py-4">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                USDC Balance
              </p>
              <p className="font-mono text-lg font-bold text-white">
                {formatUsdc(balance)} USDC
              </p>
            </div>
            {isActive && (
              <div className="ml-8">
                <p className="text-xs uppercase text-muted-foreground">
                  Current Tier
                </p>
                <Badge className="mt-1 bg-green-500/20 text-green-500">
                  {TIERS[currentTier]?.name || `Tier ${currentTier}`}
                </Badge>
              </div>
            )}
            {isActive && subscription && (
              <div className="ml-8">
                <p className="text-xs uppercase text-muted-foreground">
                  Expires
                </p>
                <p className="font-mono text-sm text-white">
                  {new Date(
                    Number(subscription.expiresAt) * 1000,
                  ).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleFaucet}
            disabled={faucetLoading}
          >
            <Droplets className="mr-2 h-4 w-4" />
            {faucetLoading ? "Claiming..." : "Faucet 1000 USDC"}
          </Button>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {TIERS.map((tier) => {
          const isCurrent = isActive && currentTier === tier.id;
          return (
            <Card
              key={tier.id}
              className={tier.id === 1 ? "border-green-500/30" : ""}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{tier.name}</CardTitle>
                  {isCurrent && (
                    <Badge className="bg-green-500/20 text-green-500">
                      Active
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {tier.description}
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <span className="font-mono text-4xl font-bold text-white">
                    {tier.price === "0" ? "Free" : `$${tier.price}`}
                  </span>
                  {tier.price !== "0" && (
                    <span className="ml-1 text-sm text-muted-foreground">
                      USDC / month
                    </span>
                  )}
                </div>

                <ul className="space-y-2">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Shield className="h-4 w-4 text-green-500" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                {!!account ? (
                  isCurrent ? (
                    <Button disabled className="w-full">
                      Current Plan
                    </Button>
                  ) : tier.id === 0 ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleSubscribe(0)}
                    >
                      Select Free
                    </Button>
                  ) : (
                    <Button
                      className="w-full bg-green-500 text-black hover:bg-green-400"
                      onClick={() => handleSubscribe(1)}
                    >
                      Subscribe for ${tier.price} USDC
                    </Button>
                  )
                ) : (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={handleConnect}
                  >
                    Connect Wallet
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!!account && address && <AccessibleSignals address={address} />}
    </div>
  );
}

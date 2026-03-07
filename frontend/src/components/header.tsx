"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { truncateAddress, formatAvax } from "@/lib/format";
import { publicClient } from "@/lib/viem";

export function Header() {
  const { login, logout, authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const [balance, setBalance] = useState<string>("...");
  const [copied, setCopied] = useState(false);

  const address = wallets[0]?.address as `0x${string}` | undefined;

  useEffect(() => {
    if (!address) {
      setBalance("...");
      return;
    }
    (async () => {
      try {
        const bal = await publicClient.getBalance({ address });
        setBalance(formatAvax(bal));
      } catch {
        setBalance("-- AVAX");
      }
    })();
  }, [address]);

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <header aria-label="main navigation" className="sticky top-0 z-50 border-b border-border bg-[#0a0a0a]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
              <span className="text-lg">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                    fill="#22c55e"
                  />
                </svg>
              </span>
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              Black Cat
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/"
              className="text-sm text-muted-foreground transition-colors hover:text-white"
            >
              Home
            </Link>
            <Link
              href="/leaderboard"
              className="text-sm text-muted-foreground transition-colors hover:text-white"
            >
              Leaderboard
            </Link>
            <Link
              href="/master"
              className="text-sm text-muted-foreground transition-colors hover:text-white"
            >
              Master
            </Link>
            <Link
              href="/subscribe"
              className="text-sm text-muted-foreground transition-colors hover:text-white"
            >
              Subscribe
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {ready && authenticated && address ? (
            <>
              <div className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1.5">
                <img
                  src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/info/logo.png"
                  alt="AVAX"
                  className="h-4 w-4"
                />
                <span className="font-mono text-xs text-white">
                  {balance} AVAX
                </span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary/50 px-3 py-1.5 text-sm outline-none hover:bg-secondary/80">
                  <img
                    src={`https://api.dicebear.com/9.x/shapes/svg?seed=${address}`}
                    alt="avatar"
                    className="h-5 w-5 rounded-full"
                  />
                  <span className="font-mono text-xs">
                    {truncateAddress(address)}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleCopy}>
                    <Copy className="mr-2 h-4 w-4" />
                    {copied ? "Copied!" : "Copy Address"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Disconnect
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : ready ? (
            <Button
              onClick={login}
              size="sm"
              className="bg-green-500 text-black hover:bg-green-400"
            >
              Connect Wallet
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

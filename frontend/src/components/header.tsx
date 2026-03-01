"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";

export function Header() {
  const { login, logout, authenticated } = usePrivy();
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="text-xl font-bold tracking-tight text-white">Black Cat</Link>
        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/leaderboard" className="text-sm text-zinc-400 hover:text-white">Leaderboard</Link>
          <Link href="/master" className="text-sm text-zinc-400 hover:text-white">Master</Link>
          <Link href="/subscribe" className="text-sm text-zinc-400 hover:text-white">Subscribe</Link>
        </nav>
        <div>{authenticated ? <Button variant="outline" size="sm" onClick={logout}>Disconnect</Button> : <Button size="sm" onClick={login}>Connect</Button>}</div>
      </div>
    </header>
  );
}

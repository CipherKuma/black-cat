"use client";
import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export default function MasterPage() {
  const { authenticated } = usePrivy();
  const [name, setName] = useState("");
  if (!authenticated) return <div className="flex min-h-[60vh] items-center justify-center text-zinc-500">Connect wallet</div>;
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-8 text-3xl font-bold text-white">Master Dashboard</h1>
      <Card className="border-white/10 bg-zinc-900">
        <CardHeader><CardTitle>Register</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Trading alias" value={name} onChange={(e: any) => setName(e.target.value)} />
          <Button disabled={!name}>Register</Button>
        </CardContent>
      </Card>
    </div>
  );
}

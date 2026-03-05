"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export default function SubscribePage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-4 text-3xl font-bold text-white">Subscribe</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-white/10 bg-zinc-900"><CardHeader><CardTitle>Free</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold mb-4">$0</p><Button variant="outline" className="w-full">Subscribe</Button></CardContent></Card>
        <Card className="border-emerald-500/20 bg-zinc-900"><CardHeader><CardTitle className="text-emerald-400">Pro</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold mb-4">100 USDC</p><Button className="w-full bg-emerald-600">Subscribe</Button></CardContent></Card>
      </div>
    </div>
  );
}

"use client";
import { useLeaderboard } from "@/hooks/useBlackCat";
export default function LeaderboardPage() {
  const { data, loading } = useLeaderboard();
  if (loading) return <div className="flex justify-center py-20 text-zinc-500">Loading...</div>;
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-8 text-3xl font-bold text-white">Leaderboard</h1>
      <p className="text-zinc-400">Ranked table coming soon...</p>
    </div>
  );
}

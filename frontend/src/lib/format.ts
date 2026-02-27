import { formatEther } from "viem";

export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatAvax(wei: bigint): string {
  const formatted = formatEther(wei);
  const num = parseFloat(formatted);
  if (num === 0) return "0";
  if (num < 0.0001) return "<0.0001";
  return num.toFixed(4);
}

export function formatUsdc(raw: bigint): string {
  const num = Number(raw) / 1e6;
  if (num === 0) return "0";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPnlBps(bps: bigint): string {
  const num = Number(bps);
  const pct = num / 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

export function formatPrice(price: bigint): string {
  const num = Number(price) / 1e18;
  if (num >= 1000)
    return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (num >= 1) return num.toFixed(2);
  return num.toFixed(6);
}

export function formatWinRate(wins: bigint, total: bigint): string {
  if (total === 0n) return "0%";
  const rate = (Number(wins) / Number(total)) * 100;
  return `${rate.toFixed(1)}%`;
}

export function timeAgo(timestamp: bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - Number(timestamp);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export const DIRECTION_LABELS = ["LONG", "SHORT"] as const;
export const STATUS_LABELS = ["ACTIVE", "TARGET_HIT", "STOPPED_OUT"] as const;

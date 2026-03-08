import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { TokenMarketData } from "@/hooks/useTokenMarketData";

interface TokenPriceBadgeProps {
  data: TokenMarketData | null | undefined;
  compact?: boolean;
}

function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return "—";
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

function formatMarketCap(cap: number | null): string {
  if (cap === null || cap === undefined) return "—";
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(1)}M`;
  if (cap >= 1e3) return `$${(cap / 1e3).toFixed(0)}K`;
  return `$${cap.toFixed(0)}`;
}

export default function TokenPriceBadge({ data, compact = false }: TokenPriceBadgeProps) {
  if (!data || data.price_usd === null) return null;

  const change = data.price_change_24h;
  const isPositive = change !== null && change > 0;
  const isNegative = change !== null && change < 0;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <span className="font-semibold text-foreground">{formatPrice(data.price_usd)}</span>
        {change !== null && (
          <span className={`flex items-center gap-0.5 font-medium ${isPositive ? "text-green-500" : isNegative ? "text-red-500" : "text-muted-foreground"}`}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : isNegative ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-muted-foreground">Token Price</h3>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${data.data_source === "coingecko" ? "bg-green-500/15 text-green-500" : "bg-yellow-500/15 text-yellow-400"}`}>
          {data.data_source === "coingecko" ? "Live" : "Cached"}
        </span>
      </div>
      <div className="flex items-end gap-3">
        <span className="text-2xl font-bold text-foreground">{formatPrice(data.price_usd)}</span>
        {change !== null && (
          <span className={`flex items-center gap-0.5 text-sm font-semibold pb-0.5 ${isPositive ? "text-green-500" : isNegative ? "text-red-500" : "text-muted-foreground"}`}>
            {isPositive ? <TrendingUp className="h-4 w-4" /> : isNegative ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
            {Math.abs(change).toFixed(2)}%
          </span>
        )}
      </div>
      {data.market_cap_usd !== null && (
        <p className="mt-1 text-xs text-muted-foreground">Market Cap: {formatMarketCap(data.market_cap_usd)}</p>
      )}
    </div>
  );
}

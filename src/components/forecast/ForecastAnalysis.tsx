import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, BarChart3, Activity, DollarSign, Server, Users } from "lucide-react";

const sourceBadges: Record<string, { label: string; color: string }> = {
  coingecko: { label: "CoinGecko", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
  depin_pulse: { label: "DePIN Pulse", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  votes: { label: "Community Votes", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  pending: { label: "Pending", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
  unavailable: { label: "No API Source", color: "bg-muted text-muted-foreground" },
};

const dimensionMeta: Record<string, { label: string; icon: typeof TrendingUp; format: (v: number | null) => string }> = {
  token_price: {
    label: "Token Price",
    icon: DollarSign,
    format: (v) => v == null ? "N/A" : v < 0.01 ? `$${v.toFixed(6)}` : v < 1 ? `$${v.toFixed(4)}` : `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  },
  market_cap: {
    label: "Market Cap",
    icon: BarChart3,
    format: (v) => v == null ? "N/A" : v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : `$${v.toLocaleString()}`,
  },
  community_sentiment: {
    label: "Community Sentiment",
    icon: Users,
    format: (v) => v == null ? "N/A" : `${v.toFixed(1)}% Yes`,
  },
  active_nodes: {
    label: "Active Nodes",
    icon: Server,
    format: (v) => v == null ? "Pending" : v.toLocaleString(),
  },
  revenue: {
    label: "Revenue (30d)",
    icon: Activity,
    format: (v) => v == null ? "Pending" : `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
  },
};

interface Props {
  forecastId: string;
  isEnded: boolean;
  totalVotesYes?: number;
  totalVotesNo?: number;
  predictionTarget?: number | null;
  predictionDirection?: string | null;
  startPrice?: number | null;
  forecastDimension?: string | null;
  projectAId?: string;
}

export default function ForecastAnalysis({ forecastId, isEnded, totalVotesYes = 0, totalVotesNo = 0, predictionTarget, predictionDirection, startPrice, forecastDimension, projectAId }: Props) {
  const { data: targets = [] } = useQuery({
    queryKey: ["forecast-targets", forecastId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forecast_targets")
        .select("*")
        .eq("forecast_id", forecastId);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: snapshots = [] } = useQuery({
    queryKey: ["forecast-snapshots", forecastId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forecast_metric_snapshots")
        .select("*")
        .eq("forecast_id", forecastId);
      if (error) throw error;
      return data || [];
    },
    enabled: targets.length > 0,
  });

  // Fetch live market data for active forecasts or as fallback for ended ones without end snapshots
  const { data: liveMarketData } = useQuery({
    queryKey: ["forecast-live-market", projectAId],
    queryFn: async () => {
      if (!projectAId) return null;
      const { data, error } = await supabase
        .from("token_market_data")
        .select("price_usd, market_cap_usd")
        .eq("project_id", projectAId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!projectAId,
    refetchInterval: isEnded ? false : 60000, // refresh every minute for active forecasts
  });

  if (targets.length === 0) return null;

  const getSnapshot = (dim: string, type: string) => {
    if (dim === "community_sentiment") {
      const total = totalVotesYes + totalVotesNo;
      if (total === 0) return null;
      return (totalVotesYes / total) * 100;
    }
    const s = snapshots.find((s: any) => s.dimension === dim && s.snapshot_type === type);
    if (s?.value != null) return s.value;

    // Fallback: use live market data if no snapshot exists
    if (type === "end" || (!isEnded && type === "start")) {
      if (dim === "token_price" && liveMarketData?.price_usd != null) return Number(liveMarketData.price_usd);
      if (dim === "market_cap" && liveMarketData?.market_cap_usd != null) return Number(liveMarketData.market_cap_usd);
    }
    return null;
  };

  // For active forecasts, get "current" value from live data
  const getCurrentValue = (dim: string): number | null => {
    if (dim === "token_price" && liveMarketData?.price_usd != null) return Number(liveMarketData.price_usd);
    if (dim === "market_cap" && liveMarketData?.market_cap_usd != null) return Number(liveMarketData.market_cap_usd);
    return null;
  };

  const getSource = (dim: string) => {
    if (dim === "community_sentiment") return "votes";
    const s = snapshots.find((s: any) => s.dimension === dim && s.snapshot_type === "start");
    return s?.source ?? "pending";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-border flex items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground font-['Space_Grotesk']">Forecast Analysis</h2>
        {!isEnded && (
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            Tracking
          </span>
        )}
        {isEnded && (
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
            Final Results
          </span>
        )}
      </div>

      <div className="divide-y divide-border">
        {/* Prediction Target Section — for token_price / market_cap */}
        {(forecastDimension === "token_price" || forecastDimension === "market_cap") && startPrice != null && predictionTarget != null && predictionDirection && (() => {
          const pctChange = startPrice !== 0 ? ((predictionTarget - startPrice) / startPrice) * 100 : null;
          const dimLabel = forecastDimension === "token_price" ? "Price" : "Market Cap";
          const formatVal = (v: number) => {
            if (forecastDimension === "market_cap") {
              if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
              if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
              return `$${v.toLocaleString()}`;
            }
            return v < 0.01 ? `$${v.toFixed(6)}` : v < 1 ? `$${v.toFixed(4)}` : `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          };

          // Calculate progress toward target — use live data for active, end snapshot (or live fallback) for ended
          const dim = forecastDimension === "token_price" ? "token_price" : "market_cap";
          const endSnap = getSnapshot(dim, "end");
          const liveVal = getCurrentValue(dim);
          // For active forecasts: use live market data; for ended: use end snapshot, fallback to live
          const currentVal = isEnded ? (endSnap ?? liveVal) : (liveVal ?? endSnap);
          const totalDistance = predictionTarget - startPrice;
          const currentDistance = currentVal != null ? currentVal - startPrice : 0;
          const progressPct = totalDistance !== 0 ? Math.min(Math.max((currentDistance / totalDistance) * 100, 0), 100) : 0;
          const targetReached = progressPct >= 100;

          return (
            <div className="px-6 py-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${predictionDirection === "long" ? "bg-primary/10" : "bg-destructive/10"}`}>
                  {predictionDirection === "long" ? <TrendingUp className="h-4 w-4 text-primary" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
                </div>
                <span className="text-xs font-semibold text-foreground">
                  {predictionDirection === "long" ? "Long" : "Short"} — {dimLabel}
                </span>
                {pctChange != null && (
                  <span className={`ml-auto text-xs font-bold ${pctChange >= 0 ? "text-primary" : "text-destructive"}`}>
                    Target: {pctChange >= 0 ? "+" : ""}{pctChange.toFixed(2)}%
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-secondary/50 px-3 py-2.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{dimLabel} at Creation</p>
                  <p className="text-sm font-semibold text-foreground font-['Space_Grotesk']">{formatVal(startPrice)}</p>
                </div>
                <div className="rounded-lg bg-secondary/50 px-3 py-2.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Prediction Target</p>
                  <p className={`text-sm font-semibold font-['Space_Grotesk'] ${predictionDirection === "long" ? "text-primary" : "text-destructive"}`}>{formatVal(predictionTarget)}</p>
                </div>
              </div>

              {/* Progress toward target */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Progress to Target</span>
                  <span className={`text-[11px] font-bold font-['Space_Grotesk'] ${targetReached ? "text-primary" : "text-muted-foreground"}`}>
                    {progressPct.toFixed(1)}%
                  </span>
                </div>
                <div className="relative h-2.5 w-full rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${targetReached ? "bg-primary" : predictionDirection === "long" ? "bg-primary/70" : "bg-destructive/70"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[9px] text-muted-foreground">{formatVal(startPrice)}</span>
                  {currentVal != null && currentVal !== startPrice && (
                    <span className={`text-[9px] font-semibold ${currentDistance >= 0 === (totalDistance >= 0) ? "text-primary" : "text-destructive"}`}>
                      Current: {formatVal(currentVal)}
                    </span>
                  )}
                  <span className="text-[9px] text-muted-foreground">{formatVal(predictionTarget)}</span>
                </div>
              </div>
            </div>
          );
        })()}
        {targets.map((target: any) => {
          const isSentiment = target.dimension === "community_sentiment";
          const meta = dimensionMeta[target.dimension] || {
            label: target.dimension,
            icon: Activity,
            format: (v: number | null) => v?.toString() ?? "N/A",
          };
          const Icon = meta.icon;
          const source = getSource(target.dimension);
          const badge = sourceBadges[source] || sourceBadges.pending;

          if (isSentiment) {
            const total = totalVotesYes + totalVotesNo;
            const yesPct = total > 0 ? (totalVotesYes / total) * 100 : 0;
            const noPct = total > 0 ? (totalVotesNo / total) * 100 : 0;
            const result = isEnded ? (yesPct >= 50 ? "Yes" : "No") : null;

            return (
              <div key={target.id} className="px-6 py-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">{meta.label}</span>
                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${badge.color}`}>
                    {badge.label}
                  </span>
                  {isEnded && result && (
                    <span className={`ml-auto text-xs font-bold ${result === "Yes" ? "text-primary" : "text-destructive"}`}>
                      Result: {result}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-secondary/50 px-3 py-2.5">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Yes Votes</p>
                    <p className="text-sm font-semibold text-foreground font-['Space_Grotesk']">
                      {totalVotesYes} ({yesPct.toFixed(1)}%)
                    </p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 px-3 py-2.5">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">No Votes</p>
                    <p className="text-sm font-semibold text-foreground font-['Space_Grotesk']">
                      {totalVotesNo} ({noPct.toFixed(1)}%)
                    </p>
                  </div>
                </div>
                {total > 0 && (
                  <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${yesPct}%` }} />
                  </div>
                )}
              </div>
            );
          }

          const startVal = getSnapshot(target.dimension, "start");
          const endSnapVal = getSnapshot(target.dimension, "end");
          const liveVal = getCurrentValue(target.dimension);
          // For active: show live price; for ended: show end snapshot or live fallback
          const displayVal = isEnded ? (endSnapVal ?? liveVal) : (liveVal ?? endSnapVal);

          const change = startVal != null && displayVal != null && startVal !== 0
            ? ((displayVal - startVal) / startVal) * 100
            : null;

          return (
            <div key={target.id} className="px-6 py-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-xs font-semibold text-foreground">{meta.label}</span>
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${badge.color}`}>
                  {badge.label}
                </span>
                {change != null && (
                  <span className={`ml-auto flex items-center gap-1 text-xs font-bold ${
                    change > 0 ? "text-green-500" : change < 0 ? "text-destructive" : "text-muted-foreground"
                  }`}>
                    {change > 0 ? <TrendingUp className="h-3 w-3" /> : change < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                    {change > 0 ? "+" : ""}{change.toFixed(2)}%
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-secondary/50 px-3 py-2.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Price at Creation</p>
                  <p className="text-sm font-semibold text-foreground font-['Space_Grotesk']">
                    {meta.format(startVal)}
                  </p>
                </div>
                <div className="rounded-lg bg-secondary/50 px-3 py-2.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    {isEnded ? "Price at Close" : "Current Price"}
                  </p>
                  <p className="text-sm font-semibold text-foreground font-['Space_Grotesk']">
                    {displayVal != null ? meta.format(displayVal) : "—"}
                  </p>
                  {change != null && (
                    <p className={`text-[10px] font-bold mt-0.5 ${change > 0 ? "text-green-500" : change < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      {change > 0 ? "+" : ""}{change.toFixed(2)}% from creation
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!isEnded && (
        <div className="px-6 py-3 border-t border-border bg-secondary/20">
          <p className="text-[10px] text-muted-foreground text-center">
            Metrics are snapshotted at creation and compared when the forecast ends. Data from CoinGecko &amp; DePIN Pulse.
          </p>
        </div>
      )}
    </motion.div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { TrendingUp, TrendingDown, Minus, BarChart3, Activity, DollarSign, Server, Users } from "lucide-react";

const sourceBadges: Record<string, { label: string; color: string }> = {
  coingecko: { label: "CoinGecko", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
  depin_pulse: { label: "DePIN Pulse", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  votes: { label: "Community Votes", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  pending: { label: "Pending", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
  unavailable: { label: "No API Source", color: "bg-muted text-muted-foreground" },
};

const dimensionMeta: Record<string, { label: string; icon: typeof TrendingUp; format: (v: number | null) => string }> =
  {
    token_price: {
      label: "Token Price",
      icon: DollarSign,
      format: (v) =>
        v == null
          ? "N/A"
          : v < 0.01
            ? `$${v.toFixed(6)}`
            : v < 1
              ? `$${v.toFixed(4)}`
              : `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    market_cap: {
      label: "Market Cap",
      icon: BarChart3,
      format: (v) =>
        v == null
          ? "N/A"
          : v >= 1e9
            ? `$${(v / 1e9).toFixed(2)}B`
            : v >= 1e6
              ? `$${(v / 1e6).toFixed(2)}M`
              : `$${v.toLocaleString()}`,
    },
    active_nodes: {
      label: "Active Nodes",
      icon: Server,
      format: (v) => (v == null ? "Pending" : v.toLocaleString()),
    },
    revenue: {
      label: "Revenue (30d)",
      icon: Activity,
      format: (v) =>
        v == null
          ? "Pending"
          : `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
    },
  };

interface Props {
  predictionId: string;
  isEnded: boolean;
  totalVotesYes?: number;
  totalVotesNo?: number;
  predictionTarget?: number | null;
  predictionDirection?: string | null;
  startPrice?: number | null;
  predictionDimension?: string | null;
  projectAId?: string;
  projectBId?: string | null;
  projectAName?: string;
  projectBName?: string;
  isCreator?: boolean;
}

export default function PredictionAnalysis({
  predictionId,
  isEnded,
  totalVotesYes = 0,
  totalVotesNo = 0,
  predictionTarget,
  predictionDirection,
  startPrice,
  predictionDimension,
  projectAId,
  projectBId,
  projectAName,
  projectBName,
  isCreator = false,
}: Props) {
  const { data: targets = [] } = useQuery({
    queryKey: ["prediction-targets", predictionId],
    queryFn: async () => {
      const { data, error } = await supabase.from("forecast_targets").select("*").eq("forecast_id", predictionId);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: snapshots = [] } = useQuery({
    queryKey: ["prediction-snapshots", predictionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forecast_metric_snapshots")
        .select("*")
        .eq("forecast_id", predictionId);
      if (error) throw error;
      return data || [];
    },
    enabled: targets.length > 0,
  });

  // Check if end snapshots are missing for an ended prediction
  const hasEndSnapshots =
    isEnded && snapshots.length > 0 && snapshots.some((s: any) => s.snapshot_type === "end" && s.value != null);
  const needsFallback = isEnded && snapshots.length > 0 && !hasEndSnapshots;

  // Always fetch live market data — used as live tracker for active forecasts
  // AND as fallback for ended forecasts with missing end snapshots
  const { data: liveMarketData } = useQuery({
    queryKey: ["prediction-live-market", projectAId],
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
    refetchInterval: isEnded ? false : 60000,
  });

  // Always fetch live market data for Project B
  const { data: liveMarketDataB } = useQuery({
    queryKey: ["prediction-live-market-b", projectBId],
    queryFn: async () => {
      if (!projectBId) return null;
      const { data, error } = await supabase
        .from("token_market_data")
        .select("price_usd, market_cap_usd")
        .eq("project_id", projectBId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!projectBId,
    refetchInterval: isEnded ? false : 60000,
  });

  // Auto-trigger backfill when visiting an ended prediction with missing end snapshots
  const backfillTriggered = useRef(false);
  useEffect(() => {
    if (needsFallback && !backfillTriggered.current) {
      backfillTriggered.current = true;
      supabase.functions.invoke("backfill-prediction-snapshots").catch(() => {});
    }
  }, [needsFallback]);

  if (targets.length === 0) return null;

  const getSnapshot = (dim: string, type: string) => {
    const s = snapshots.find((s: any) => s.dimension === dim && s.snapshot_type === type);
    if (s?.value != null) return s.value;

    // Fallback: use live market data for active forecasts OR ended forecasts missing snapshots
    if (!isEnded || needsFallback) {
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
        <h2 className="text-sm font-semibold text-foreground font-['Space_Grotesk']">Prediction Analysis</h2>
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
        {/* Two-Project Comparison Section — for token_price / market_cap with two projects */}
        {(predictionDimension === "token_price" || predictionDimension === "market_cap") &&
          !!projectBId &&
          predictionTarget != null &&
          predictionDirection &&
          startPrice != null &&
          (() => {
            const dimLabel = predictionDimension === "token_price" ? "Price" : "Market Cap";
            const dimKey = predictionDimension === "token_price" ? "token_price" : "market_cap";
            const formatVal = (v: number) => {
              if (predictionDimension === "market_cap") {
                if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
                if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
                return `$${v.toLocaleString()}`;
              }
              return v < 0.01
                ? `$${v.toFixed(6)}`
                : v < 1
                  ? `$${v.toFixed(4)}`
                  : `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            };

            // Start prices
            const startA = startPrice;
            // Get Project B start from snapshots (look for a snapshot with project B context, or use a secondary approach)
            // For now, we derive B's start from the snapshot system or live data
            const startSnapB = snapshots.find((s: any) => s.dimension === `${dimKey}_b` && s.snapshot_type === "start");
            const startB = startSnapB?.value != null ? startSnapB.value : null;

            // Current/end values
            const liveA = liveMarketData
              ? predictionDimension === "token_price"
                ? Number(liveMarketData.price_usd)
                : Number(liveMarketData.market_cap_usd)
              : null;
            const liveB = liveMarketDataB
              ? predictionDimension === "token_price"
                ? Number(liveMarketDataB.price_usd)
                : Number(liveMarketDataB.market_cap_usd)
              : null;
            const endSnapA = getSnapshot(dimKey, "end");
            const endSnapB =
              snapshots.find((s: any) => s.dimension === `${dimKey}_b` && s.snapshot_type === "end")?.value ?? null;

            // For ended forecasts: prefer end snapshots, fall back to live data if snapshots missing
            const currentA = isEnded ? (endSnapA ?? liveA) : (liveA ?? endSnapA);
            const currentB = isEnded ? (endSnapB ?? liveB) : (liveB ?? endSnapB);

            // Calculate performance
            const changeA = startA && currentA != null ? ((currentA - startA) / startA) * 100 : null;
            const changeB =
              startB != null && currentB != null && startB !== 0 ? ((currentB - startB) / startB) * 100 : null;
            const outperformance = changeA != null && changeB != null ? changeA - changeB : null;
            const targetPct = predictionTarget; // stored as percentage

            // Progress: outperformance / targetPct
            const progressPct =
              outperformance != null && targetPct !== 0
                ? Math.min(Math.max((outperformance / targetPct) * 100, 0), 100)
                : 0;
            const targetReached = progressPct >= 100;

            return (
              <div className="px-6 py-5">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${predictionDirection === "long" ? "bg-primary/10" : "bg-destructive/10"}`}
                  >
                    {predictionDirection === "long" ? (
                      <TrendingUp className="h-4 w-4 text-primary" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-foreground block">
                      {predictionDirection === "long" ? "Long" : "Short"} — {dimLabel} Comparison
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {projectAName || "Project A"} vs {projectBName || "Project B"}
                    </span>
                  </div>
                  <span
                    className={`ml-auto text-xs font-bold ${predictionDirection === "long" ? "text-primary" : "text-destructive"}`}
                  >
                    Target: {predictionDirection === "long" ? "+" : "-"}
                    {targetPct.toFixed(1)}%
                  </span>
                </div>

                {/* Project comparison cards */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      {projectAName || "Project A"}
                    </p>
                    <p className="text-sm font-semibold text-foreground font-['Space_Grotesk'] mb-0.5">
                      {currentA != null ? formatVal(currentA) : "—"}
                    </p>
                    {changeA != null && (
                      <span
                        className={`text-[10px] font-semibold ${changeA >= 0 ? "text-primary" : "text-destructive"}`}
                      >
                        {changeA >= 0 ? "+" : ""}
                        {changeA.toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/50 px-3 py-2.5">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      {projectBName || "Project B"}
                    </p>
                    <p className="text-sm font-semibold text-foreground font-['Space_Grotesk'] mb-0.5">
                      {currentB != null ? formatVal(currentB) : "—"}
                    </p>
                    {changeB != null && (
                      <span
                        className={`text-[10px] font-semibold ${changeB >= 0 ? "text-primary" : "text-destructive"}`}
                      >
                        {changeB >= 0 ? "+" : ""}
                        {changeB.toFixed(2)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Outperformance metric */}
                {outperformance != null && (
                  <div className="rounded-lg bg-secondary/30 border border-border px-3 py-2.5 mb-4 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Current Outperformance
                    </span>
                    <span
                      className={`text-sm font-bold font-['Space_Grotesk'] ${outperformance >= 0 ? "text-primary" : "text-destructive"}`}
                    >
                      {outperformance >= 0 ? "+" : ""}
                      {outperformance.toFixed(2)}%
                    </span>
                  </div>
                )}

                {/* Progress toward target — creator only */}
                {isCreator && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        Progress to Target
                      </span>
                      <span
                        className={`text-[11px] font-bold font-['Space_Grotesk'] ${targetReached ? "text-primary" : "text-muted-foreground"}`}
                      >
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
                      <span className="text-[9px] text-muted-foreground">0%</span>
                      <span className="text-[9px] text-muted-foreground">{targetPct.toFixed(1)}%</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

        {/* Single-Project Prediction Target Section — for token_price / market_cap without project B */}
        {(predictionDimension === "token_price" || predictionDimension === "market_cap") &&
          !projectBId &&
          startPrice != null &&
          predictionTarget != null &&
          predictionDirection &&
          (() => {
            const pctChange = startPrice !== 0 ? ((predictionTarget - startPrice) / startPrice) * 100 : null;
            const dimLabel = predictionDimension === "token_price" ? "Price" : "Market Cap";
            const formatVal = (v: number) => {
              if (predictionDimension === "market_cap") {
                if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
                if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
                return `$${v.toLocaleString()}`;
              }
              return v < 0.01
                ? `$${v.toFixed(6)}`
                : v < 1
                  ? `$${v.toFixed(4)}`
                  : `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            };

            const dim = predictionDimension === "token_price" ? "token_price" : "market_cap";
            const endSnap = getSnapshot(dim, "end");
            const liveVal = getCurrentValue(dim);
            const currentVal = isEnded ? endSnap : (liveVal ?? endSnap);
            const totalDistance = predictionTarget - startPrice;
            const currentDistance = currentVal != null ? currentVal - startPrice : 0;
            const progressPct =
              totalDistance !== 0 ? Math.min(Math.max((currentDistance / totalDistance) * 100, 0), 100) : 0;
            const targetReached = progressPct >= 100;

            return (
              <div className="px-6 py-4">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${predictionDirection === "long" ? "bg-primary/10" : "bg-destructive/10"}`}
                  >
                    {predictionDirection === "long" ? (
                      <TrendingUp className="h-4 w-4 text-primary" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    {predictionDirection === "long" ? "Long" : "Short"} — {dimLabel}
                  </span>
                  {pctChange != null && (
                    <span
                      className={`ml-auto text-xs font-bold ${pctChange >= 0 ? "text-primary" : "text-destructive"}`}
                    >
                      Target: {pctChange >= 0 ? "+" : ""}
                      {pctChange.toFixed(2)}%
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-secondary/50 px-3 py-2.5">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      {dimLabel} at Creation
                    </p>
                    <p className="text-sm font-semibold text-foreground font-['Space_Grotesk']">
                      {formatVal(startPrice)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 px-3 py-2.5">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      Prediction Target
                    </p>
                    <p
                      className={`text-sm font-semibold font-['Space_Grotesk'] ${predictionDirection === "long" ? "text-primary" : "text-destructive"}`}
                    >
                      {formatVal(predictionTarget)}
                    </p>
                  </div>
                </div>

                {/* Progress toward target — creator only */}
                {isCreator && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        Progress to Target
                      </span>
                      <span
                        className={`text-[11px] font-bold font-['Space_Grotesk'] ${targetReached ? "text-primary" : "text-muted-foreground"}`}
                      >
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
                      <span className="text-[9px] text-muted-foreground">{formatVal(predictionTarget)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        {targets.map((target: any) => {
          const meta = dimensionMeta[target.dimension] || {
            label: target.dimension,
            icon: Activity,
            format: (v: number | null) => v?.toString() ?? "N/A",
          };
          const Icon = meta.icon;
          const source = getSource(target.dimension);
          const badge = sourceBadges[source] || sourceBadges.pending;

          const startVal = getSnapshot(target.dimension, "start");
          const endSnapVal = getSnapshot(target.dimension, "end");
          const liveVal = getCurrentValue(target.dimension);
          // Active: show live price; Ended: prefer end snapshot, fall back to live if missing
          const displayVal = isEnded ? (endSnapVal ?? liveVal) : (liveVal ?? endSnapVal);

          const change =
            startVal != null && displayVal != null && startVal !== 0
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
                  <span
                    className={`ml-auto flex items-center gap-1 text-xs font-bold ${
                      change > 0 ? "text-green-500" : change < 0 ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {change > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : change < 0 ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : (
                      <Minus className="h-3 w-3" />
                    )}
                    {change > 0 ? "+" : ""}
                    {change.toFixed(2)}%
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-secondary/50 px-3 py-2.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Price at Creation
                  </p>
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
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!isEnded && targets.length > 0 && (
        <div className="px-6 py-3 border-t border-border bg-secondary/20">
          <p className="text-[10px] text-muted-foreground text-center">
            Metrics are snapshotted at creation and compared when the prediction ends. Data from CoinGecko.
          </p>
        </div>
      )}
    </motion.div>
  );
}

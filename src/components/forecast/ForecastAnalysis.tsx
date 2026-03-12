import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, BarChart3, Activity, DollarSign, Server } from "lucide-react";

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
  active_nodes: {
    label: "Active Nodes",
    icon: Server,
    format: (v) => v == null ? "Pending" : v.toLocaleString(),
  },
  revenue: {
    label: "Revenue",
    icon: Activity,
    format: (v) => v == null ? "Pending" : `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  },
};

interface Props {
  forecastId: string;
  isEnded: boolean;
}

export default function ForecastAnalysis({ forecastId, isEnded }: Props) {
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

  if (targets.length === 0) return null;

  const getSnapshot = (dim: string, type: string) => {
    const s = snapshots.find((s: any) => s.dimension === dim && s.snapshot_type === type);
    return s?.value ?? null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-border flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
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
        {targets.map((target: any) => {
          const meta = dimensionMeta[target.dimension] || {
            label: target.dimension,
            icon: Activity,
            format: (v: number | null) => v?.toString() ?? "N/A",
          };
          const Icon = meta.icon;
          const startVal = getSnapshot(target.dimension, "start");
          const endVal = getSnapshot(target.dimension, "end");

          const change = startVal != null && endVal != null && startVal !== 0
            ? ((endVal - startVal) / startVal) * 100
            : null;

          return (
            <div key={target.id} className="px-6 py-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-xs font-semibold text-foreground">{meta.label}</span>
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
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Start</p>
                  <p className="text-sm font-semibold text-foreground font-['Space_Grotesk']">
                    {meta.format(startVal)}
                  </p>
                </div>
                <div className="rounded-lg bg-secondary/50 px-3 py-2.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    {isEnded ? "End" : "Current"}
                  </p>
                  <p className="text-sm font-semibold text-foreground font-['Space_Grotesk']">
                    {isEnded ? meta.format(endVal) : (endVal != null ? meta.format(endVal) : "—")}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!isEnded && (
        <div className="px-6 py-3 border-t border-border bg-secondary/20">
          <p className="text-[10px] text-muted-foreground text-center">
            Metrics are snapshotted at creation and will be compared when the forecast ends.
          </p>
        </div>
      )}
    </motion.div>
  );
}

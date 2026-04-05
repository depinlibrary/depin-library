import { useMemo } from "react";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import type { VoteHistoryEntry } from "@/hooks/usePredictionDetail";

interface VoteHistoryChartProps {
  voteHistory: VoteHistoryEntry[];
  yesLabel?: string;
  noLabel?: string;
}

export default function VoteHistoryChart({ voteHistory, yesLabel = "Yes", noLabel = "No" }: VoteHistoryChartProps) {
  const chartData = useMemo(() => {
    return voteHistory.map((entry) => {
      const total = entry.yes_count + entry.no_count;
      const yesPct = total > 0 ? Math.round((entry.yes_count / total) * 100 * 10) / 10 : 50;
      return {
        ...entry,
        yes_pct: yesPct,
        no_pct: 100 - yesPct,
        weighted_yes: entry.weighted_yes_pct,
        weighted_no: Math.round((100 - entry.weighted_yes_pct) * 10) / 10,
        total,
      };
    });
  }, [voteHistory]);

  if (voteHistory.length <= 1) return null;

  const latest = chartData[chartData.length - 1];
  const first = chartData[0];
  const pctChange = latest.weighted_yes - first.weighted_yes;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Probability Trend
        </h2>
        <div className="flex items-center gap-3">
          <span className={`text-[11px] font-semibold flex items-center gap-1 ${
            pctChange > 0 ? "text-primary" : pctChange < 0 ? "text-destructive" : "text-muted-foreground"
          }`}>
            {pctChange > 0 ? "↑" : pctChange < 0 ? "↓" : "→"} {Math.abs(pctChange).toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="p-6">
        {/* Legend */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span className="text-[10px] font-medium text-muted-foreground">{yesLabel}</span>
            <span className="text-[10px] font-semibold text-primary">{latest.weighted_yes.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
            <span className="text-[10px] font-medium text-muted-foreground">{noLabel}</span>
            <span className="text-[10px] font-semibold text-destructive">{latest.weighted_no.toFixed(1)}%</span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground/60">
            <span>{chartData.length} data points</span>
            <span>·</span>
            <span>{latest.total} total votes</span>
          </div>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="weightedYesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                  <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.06} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="weightedNoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.15} />
                  <stop offset="50%" stopColor="hsl(var(--destructive))" stopOpacity={0.04} />
                  <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
              <ReferenceLine y={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="6 4" opacity={0.25} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
                ticks={[0, 25, 50, 75, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  fontSize: "12px",
                  padding: "10px 14px",
                  boxShadow: "0 8px 30px -10px rgba(0,0,0,0.3)",
                }}
                labelStyle={{ fontWeight: 700, marginBottom: 6, color: "hsl(var(--foreground))", fontSize: "11px" }}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(1)}%`,
                  name === "weighted_yes" ? yesLabel : name === "weighted_no" ? noLabel : name,
                ]}
                itemStyle={{ padding: "2px 0" }}
              />
              {/* No line — destructive color */}
              <Area
                type="monotone"
                dataKey="weighted_no"
                name="weighted_no"
                stroke="hsl(var(--destructive))"
                fill="url(#weightedNoGrad)"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
                activeDot={{
                  r: 4,
                  strokeWidth: 2,
                  stroke: "hsl(var(--card))",
                  fill: "hsl(var(--destructive))",
                }}
              />
              {/* Yes line — primary color */}
              <Area
                type="monotone"
                dataKey="weighted_yes"
                name="weighted_yes"
                stroke="hsl(var(--primary))"
                fill="url(#weightedYesGrad)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 5,
                  strokeWidth: 2,
                  stroke: "hsl(var(--card))",
                  fill: "hsl(var(--primary))",
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
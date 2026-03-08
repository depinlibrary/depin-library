import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { VoteHistoryEntry } from "@/hooks/useForecastDetail";

interface VoteHistoryChartProps {
  voteHistory: VoteHistoryEntry[];
}

export default function VoteHistoryChart({ voteHistory }: VoteHistoryChartProps) {
  if (voteHistory.length <= 1) return null;

  // Calculate trend
  const latest = voteHistory[voteHistory.length - 1];
  const latestTotal = latest.yes_count + latest.no_count;
  const latestYesPct = latestTotal > 0 ? ((latest.yes_count / latestTotal) * 100).toFixed(0) : "50";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" /> Vote Trend
        </h2>
        <span className="text-[11px] text-muted-foreground">
          Current: <span className="font-semibold text-foreground">{latestYesPct}% Yes</span>
        </span>
      </div>
      <div className="p-6">
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={voteHistory} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="yesGradDetail" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="noGradDetail" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "10px",
                  fontSize: "12px",
                  padding: "8px 12px",
                  boxShadow: "0 8px 30px -10px rgba(0,0,0,0.3)",
                }}
                labelStyle={{ fontWeight: 600, marginBottom: 4, color: "hsl(var(--foreground))" }}
              />
              <Area
                type="monotone"
                dataKey="yes_count"
                name="Yes votes"
                stroke="hsl(var(--primary))"
                fill="url(#yesGradDetail)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "hsl(var(--card))" }}
              />
              <Area
                type="monotone"
                dataKey="no_count"
                name="No votes"
                stroke="hsl(var(--destructive))"
                fill="url(#noGradDetail)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "hsl(var(--card))" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

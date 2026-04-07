import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { TokenMarketData } from "@/hooks/useTokenMarketData";

interface Props {
  marketData: TokenMarketData | null | undefined;
  projectName: string;
  token: string;
}

export default function ProjectDetailChart({ marketData, projectName, token }: Props) {
  const sparkline = marketData?.sparkline_7d;
  const hasChart = sparkline && Array.isArray(sparkline) && sparkline.length > 0;
  const change24h = marketData?.price_change_24h ?? 0;
  const isPositive = change24h >= 0;
  const strokeColor = isPositive ? "hsl(var(--neon-green))" : "hsl(var(--destructive))";

  if (!hasChart) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">No chart data available for {projectName}.</p>
      </div>
    );
  }

  const chartData = (sparkline as number[]).map((v, i) => ({ idx: i, price: v }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Chart</h2>
        <span className="rounded-md border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
          7 Days
        </span>
      </div>

      <div className="h-72 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradChart" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={strokeColor} stopOpacity={0.2} />
                <stop offset="95%" stopColor={strokeColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="idx" hide />
            <YAxis
              domain={["dataMin", "dataMax"]}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => v < 0.01 ? v.toFixed(6) : v < 1 ? v.toFixed(4) : v.toFixed(2)}
              width={65}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
                padding: "8px 12px",
              }}
              labelFormatter={() => ""}
              formatter={(value: number) => [`$${value < 1 ? value.toFixed(6) : value.toFixed(2)}`, "Price"]}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={strokeColor}
              strokeWidth={2}
              fill="url(#priceGradChart)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "hsl(var(--card))" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

import { useState } from "react";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { TokenMarketData } from "@/hooks/useTokenMarketData";

type ChartMetric = "price" | "market_cap" | "volume";

interface Props {
  marketData: TokenMarketData | null | undefined;
  projectName: string;
  token: string;
}

export default function ProjectDetailChart({ marketData, projectName, token }: Props) {
  const [metric, setMetric] = useState<ChartMetric>("price");

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

  const priceData = (sparkline as number[]).map((v, i) => ({ idx: i, value: v }));

  // For market cap and volume, we simulate from current values since sparkline only has price
  const currentPrice = marketData?.price_usd ?? 1;
  const currentMarketCap = marketData?.market_cap_usd ?? 0;

  let chartData = priceData;
  let valueLabel = "Price";
  let formatValue = (v: number) => `$${v < 1 ? v.toFixed(6) : v.toFixed(2)}`;

  if (metric === "market_cap" && currentMarketCap > 0 && currentPrice > 0) {
    // Approximate market cap from price ratio
    const ratio = currentMarketCap / currentPrice;
    chartData = priceData.map((d) => ({ ...d, value: d.value * ratio }));
    valueLabel = "Market Cap";
    formatValue = (v: number) => {
      if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
      if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
      return `$${v.toFixed(0)}`;
    };
  } else if (metric === "volume") {
    // We don't have historical volume data, show message
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-5"
      >
        <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-semibold text-foreground">Chart</h2>
          <MetricToggle metric={metric} setMetric={setMetric} />
        </div>
        <div className="flex items-center justify-center h-72 text-muted-foreground">
          Volume history chart coming soon.
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-foreground">Chart</h2>
        <MetricToggle metric={metric} setMetric={setMetric} />
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
              tickFormatter={(v: number) => {
                if (metric === "market_cap") {
                  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
                  if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
                  return `${(v / 1e3).toFixed(0)}K`;
                }
                return v < 0.01 ? v.toFixed(6) : v < 1 ? v.toFixed(4) : v.toFixed(2);
              }}
              width={75}
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
              formatter={(value: number) => [formatValue(value), valueLabel]}
            />
            <Area
              type="monotone"
              dataKey="value"
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

function MetricToggle({ metric, setMetric }: { metric: ChartMetric; setMetric: (m: ChartMetric) => void }) {
  const options: { value: ChartMetric; label: string }[] = [
    { value: "price", label: "Price" },
    { value: "market_cap", label: "Market Cap" },
    { value: "volume", label: "Volume" },
  ];

  return (
    <div className="flex rounded-lg border border-border bg-secondary p-0.5 gap-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setMetric(opt.value)}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            metric === opt.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

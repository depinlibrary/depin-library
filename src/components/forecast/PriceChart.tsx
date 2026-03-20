import { useMemo } from "react";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useTokenMarketData } from "@/hooks/useTokenMarketData";

interface PriceChartProps {
  projectId: string;
  projectName: string;
  dimension: "token_price" | "market_cap";
}

export default function PriceChart({ projectId, projectName, dimension }: PriceChartProps) {
  const { data: marketData, isLoading } = useTokenMarketData(projectId);

  const chartData = useMemo(() => {
    if (!marketData?.sparkline_7d || !Array.isArray(marketData.sparkline_7d)) return [];
    const prices = marketData.sparkline_7d as number[];
    const now = Date.now();
    const interval = (7 * 24 * 60 * 60 * 1000) / prices.length;
    return prices.map((price, i) => {
      const time = new Date(now - (prices.length - 1 - i) * interval);
      return {
        date: time.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        value: dimension === "market_cap" && marketData.market_cap_usd && marketData.price_usd
          ? price * (marketData.market_cap_usd / marketData.price_usd)
          : price,
      };
    });
  }, [marketData, dimension]);

  if (isLoading || !marketData || chartData.length === 0) return null;

  const currentValue = dimension === "token_price" ? marketData.price_usd : marketData.market_cap_usd;
  const change24h = marketData.price_change_24h;
  const isPositive = (change24h ?? 0) >= 0;
  const label = dimension === "token_price" ? "Token Price" : "Market Cap";

  const formatValue = (v: number) => {
    if (dimension === "market_cap") {
      if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
      if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
      return `$${v.toLocaleString()}`;
    }
    return v >= 1 ? `$${v.toFixed(2)}` : `$${v.toFixed(6)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">{label} — {projectName}</h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-medium">7D</span>
        </div>
        <div className="flex items-center gap-2">
          {currentValue != null && (
            <span className="text-sm font-bold text-foreground font-['Space_Grotesk']">
              {formatValue(currentValue)}
            </span>
          )}
          {change24h != null && (
            <span className={`text-[11px] font-semibold flex items-center gap-0.5 ${isPositive ? "text-green-500" : "text-destructive"}`}>
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isPositive ? "+" : ""}{change24h.toFixed(2)}%
            </span>
          )}
        </div>
      </div>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] text-muted-foreground">Source: CoinGecko</span>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id={`priceGrad-${projectId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isPositive ? "hsl(var(--primary))" : "hsl(var(--destructive))"} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={isPositive ? "hsl(var(--primary))" : "hsl(var(--destructive))"} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatValue(v)}
                domain={["auto", "auto"]}
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
                labelStyle={{ fontWeight: 700, marginBottom: 4, color: "hsl(var(--foreground))", fontSize: "11px" }}
                formatter={(value: number) => [formatValue(value), label]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={isPositive ? "hsl(var(--primary))" : "hsl(var(--destructive))"}
                fill={`url(#priceGrad-${projectId})`}
                strokeWidth={2}
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

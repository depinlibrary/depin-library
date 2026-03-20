import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useTokenMarketData } from "@/hooks/useTokenMarketData";

interface ProjectInfo {
  projectId: string;
  projectName: string;
}

interface PriceChartProps {
  projects: ProjectInfo[];
  dimension: "token_price" | "market_cap";
}

function ProjectChart({ projectId, projectName, dimension }: { projectId: string; projectName: string; dimension: "token_price" | "market_cap" }) {
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

  if (isLoading) {
    return <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">Loading chart…</div>;
  }

  if (!marketData || chartData.length === 0) {
    return <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">No data available for {projectName}</div>;
  }

  const currentValue = dimension === "token_price" ? marketData.price_usd : marketData.market_cap_usd;
  const change24h = marketData.price_change_24h;
  const isPositive = (change24h ?? 0) >= 0;

  const formatValue = (v: number) => {
    if (dimension === "market_cap") {
      if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
      if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
      return `$${v.toLocaleString()}`;
    }
    return v >= 1 ? `$${v.toFixed(2)}` : `$${v.toFixed(6)}`;
  };

  const label = dimension === "token_price" ? "Price" : "Market Cap";

  return (
    <div className="px-0">
      {/* Current value + 24h change */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-y-1">
        <div className="flex items-center gap-2 min-w-0">
          {currentValue != null && (
            <span className="text-base font-bold text-foreground font-['Space_Grotesk']">
              {formatValue(currentValue)}
            </span>
          )}
          {change24h != null && (
            <span className={`text-xs font-semibold flex items-center gap-0.5 shrink-0 ${isPositive ? "text-green-500" : "text-destructive"}`}>
              {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {isPositive ? "+" : ""}{change24h.toFixed(2)}%
            </span>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground shrink-0">Source: CoinGecko · 7D</span>
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
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
              width={75}
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
  );
}

export default function PriceChart({ projects, dimension }: PriceChartProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const label = dimension === "token_price" ? "Token Price" : "Market Cap";

  if (projects.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground shrink-0">{label}</h2>
        {projects.length > 1 && (
          <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-0.5">
            {projects.map((p, i) => (
              <button
                key={p.projectId}
                onClick={() => setActiveIdx(i)}
                className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
                  activeIdx === i
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.projectName}
              </button>
            ))}
          </div>
        )}
        {projects.length === 1 && (
          <span className="text-[11px] text-muted-foreground font-medium truncate">{projects[0].projectName}</span>
        )}
      </div>
      <div className="p-6">
        <ProjectChart
          key={projects[activeIdx].projectId}
          projectId={projects[activeIdx].projectId}
          projectName={projects[activeIdx].projectName}
          dimension={dimension}
        />
      </div>
    </motion.div>
  );
}

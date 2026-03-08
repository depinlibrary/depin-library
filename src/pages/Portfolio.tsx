import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Briefcase, TrendingUp, TrendingDown, Minus, Pencil, Check, X, BarChart3, ChevronDown, ChevronUp, Eye, EyeOff, Download, Activity, Bell, Wallet } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis } from "recharts";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProjectLogo from "@/components/ProjectLogo";
import { useAuth } from "@/contexts/AuthContext";
import { useProjects } from "@/hooks/useProjects";
import { useAllTokenMarketData } from "@/hooks/useTokenMarketData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link, Navigate } from "react-router-dom";
import MyForecasts from "@/components/MyForecasts";
import PriceAlertsManager from "@/components/PriceAlertsManager";

function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return "—";
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

function formatValue(val: number): string {
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(2)}K`;
  return `$${val.toFixed(2)}`;
}

function formatCompact(val: number): string {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
  return `$${val.toFixed(2)}`;
}

const CHART_COLORS = [
  "hsl(175, 80%, 50%)",
  "hsl(200, 90%, 55%)",
  "hsl(265, 70%, 60%)",
  "hsl(140, 50%, 55%)",
  "hsl(45, 80%, 60%)",
  "hsl(350, 65%, 60%)",
  "hsl(220, 70%, 65%)",
  "hsl(30, 75%, 55%)",
];

const ChangeIndicator = ({ change, size = "sm" }: { change: number | null; size?: "sm" | "lg" }) => {
  if (change === null || change === undefined) return <span className="text-muted-foreground">—</span>;
  const isPositive = change > 0;
  const isNegative = change < 0;
  const textClass = size === "lg" ? "text-base font-bold" : "text-sm font-semibold";
  const iconClass = size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5";
  return (
    <span className={`flex items-center gap-0.5 ${textClass} ${isPositive ? "text-green-500" : isNegative ? "text-red-500" : "text-muted-foreground"}`}>
      {isPositive ? <TrendingUp className={iconClass} /> : isNegative ? <TrendingDown className={iconClass} /> : <Minus className={iconClass} />}
      {isPositive ? "+" : ""}{change.toFixed(2)}%
    </span>
  );
};

const MiniSparkline = ({ data, isPositive }: { data: number[]; isPositive: boolean }) => {
  if (!data || data.length < 2) return null;
  const step = Math.max(1, Math.floor(data.length / 24));
  const points = data.filter((_, i) => i % step === 0).map((v, i) => ({ i, v }));
  const color = isPositive ? "rgb(34,197,94)" : "rgb(239,68,68)";
  return (
    <div className="h-8 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points}>
          <defs>
            <linearGradient id={`mini-${isPositive ? 'g' : 'r'}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#mini-${isPositive ? 'g' : 'r'})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const Portfolio = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: projects = [] } = useProjects();
  const { data: marketDataMap = {} } = useAllTokenMarketData();
  const queryClient = useQueryClient();

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [tokenAmount, setTokenAmount] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [hideBalances, setHideBalances] = useState(false);
  const [sortBy, setSortBy] = useState<"value" | "change" | "name">("value");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [perfRange, setPerfRange] = useState<"1D" | "7D" | "30D" | "90D">("7D");
  const [activeTab, setActiveTab] = useState<"holdings" | "forecasts" | "alerts">("holdings");

  const { data: holdings = [], isLoading } = useQuery({
    queryKey: ["portfolio_holdings", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("portfolio_holdings")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const addHolding = useMutation({
    mutationFn: async ({ projectId, amount }: { projectId: string; amount: number }) => {
      const { data, error } = await supabase
        .from("portfolio_holdings")
        .upsert(
          { user_id: user!.id, project_id: projectId, token_amount: amount },
          { onConflict: "user_id,project_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio_holdings"] });
      setSelectedProjectId("");
      setTokenAmount("");
      setShowAddForm(false);
      toast.success("Holding added to portfolio");
    },
    onError: (err: any) => toast.error(err.message || "Failed to add holding"),
  });

  const updateHolding = useMutation({
    mutationFn: async ({ holdingId, amount }: { holdingId: string; amount: number }) => {
      const { error } = await supabase
        .from("portfolio_holdings")
        .update({ token_amount: amount })
        .eq("id", holdingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio_holdings"] });
      setEditingId(null);
      setEditAmount("");
      toast.success("Holding updated");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update holding"),
  });

  const deleteHolding = useMutation({
    mutationFn: async (holdingId: string) => {
      const { error } = await supabase
        .from("portfolio_holdings")
        .delete()
        .eq("id", holdingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio_holdings"] });
      toast.success("Holding removed");
    },
  });

  const handleAddHolding = useCallback(() => {
    if (!selectedProjectId || !tokenAmount || parseFloat(tokenAmount) <= 0) {
      toast.error("Select a project and enter a valid token amount");
      return;
    }
    addHolding.mutate({ projectId: selectedProjectId, amount: parseFloat(tokenAmount) });
  }, [selectedProjectId, tokenAmount, addHolding]);

  const handleStartEdit = (holdingId: string, currentAmount: number) => {
    setEditingId(holdingId);
    setEditAmount(String(currentAmount));
  };

  const handleSaveEdit = (holdingId: string) => {
    const amount = parseFloat(editAmount);
    if (!editAmount || amount <= 0) {
      toast.error("Enter a valid token amount");
      return;
    }
    updateHolding.mutate({ holdingId, amount });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditAmount("");
  };

  const toggleSort = (column: "value" | "change" | "name") => {
    if (sortBy === column) {
      setSortDir(d => d === "desc" ? "asc" : "desc");
    } else {
      setSortBy(column);
      setSortDir("desc");
    }
  };

  const handleExportCSV = useCallback(() => {
    if (portfolioData.length === 0) return;
    const headers = ["Project", "Token", "Amount", "Price (USD)", "Value (USD)", "24h Change (%)"];
    const rows = portfolioData.map((h: any) => [
      h.project?.name || "Unknown",
      h.project?.token || "",
      Number(h.token_amount),
      h.market?.price_usd?.toFixed(6) || "",
      h.value.toFixed(2),
      h.market?.price_change_24h?.toFixed(2) || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `portfolio-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Portfolio exported");
  }, []);

  // Compute portfolio data
  const portfolioData = useMemo(() => {
    const mapped = holdings.map((h: any) => {
      const project = projects.find((p) => p.id === h.project_id);
      const market = marketDataMap[h.project_id];
      const value = market?.price_usd ? h.token_amount * market.price_usd : 0;
      const pnl24h = market?.price_change_24h && market?.price_usd
        ? value * (market.price_change_24h / 100)
        : null;
      return { ...h, project, market, value, pnl24h };
    });

    return mapped.sort((a: any, b: any) => {
      const dir = sortDir === "desc" ? -1 : 1;
      if (sortBy === "value") return (b.value - a.value) * dir;
      if (sortBy === "change") return ((b.market?.price_change_24h ?? 0) - (a.market?.price_change_24h ?? 0)) * dir;
      if (sortBy === "name") return (a.project?.name ?? "").localeCompare(b.project?.name ?? "") * dir;
      return 0;
    });
  }, [holdings, projects, marketDataMap, sortBy, sortDir]);

  const totalNetWorth = useMemo(() => portfolioData.reduce((sum: number, h: any) => sum + h.value, 0), [portfolioData]);
  const totalPnl24h = useMemo(() => {
    const pnls = portfolioData.filter((h: any) => h.pnl24h !== null);
    if (pnls.length === 0) return null;
    return pnls.reduce((sum: number, h: any) => sum + (h.pnl24h || 0), 0);
  }, [portfolioData]);
  const pnlPercent = totalNetWorth > 0 && totalPnl24h !== null ? (totalPnl24h / (totalNetWorth - totalPnl24h)) * 100 : null;

  const chartData = useMemo(() => {
    if (totalNetWorth === 0) return [];
    return portfolioData
      .filter((h: any) => h.value > 0 && h.project)
      .map((h: any) => ({
        name: h.project?.token || h.project?.name || "Unknown",
        fullName: h.project?.name || "Unknown",
        value: h.value,
        percent: ((h.value / totalNetWorth) * 100).toFixed(1),
      }));
  }, [portfolioData, totalNetWorth]);

  const portfolioSparkline = useMemo(() => {
    const holdingsWithSparkline = portfolioData.filter(
      (h: any) => h.market?.sparkline_7d && Array.isArray(h.market.sparkline_7d) && h.market.sparkline_7d.length > 0
    );
    if (holdingsWithSparkline.length === 0) return null;

    const minLen = Math.min(...holdingsWithSparkline.map((h: any) => h.market.sparkline_7d.length));
    const rangeSlice: Record<string, number> = { "1D": 24, "7D": minLen, "30D": minLen, "90D": minLen };
    const sliceLen = Math.min(rangeSlice[perfRange] || minLen, minLen);
    const startIdx = minLen - sliceLen;
    const step = Math.max(1, Math.floor(sliceLen / 48));
    const indices = Array.from({ length: Math.ceil(sliceLen / step) }, (_, i) => startIdx + i * step);

    const points = indices.map((idx) => {
      let totalValue = 0;
      holdingsWithSparkline.forEach((h: any) => {
        const sparkline = h.market.sparkline_7d as number[];
        const price = sparkline[Math.min(idx, sparkline.length - 1)];
        totalValue += price * Number(h.token_amount);
      });
      return totalValue;
    });

    const startVal = points[0];
    const endVal = points[points.length - 1];
    const changePercent = startVal > 0 ? ((endVal - startVal) / startVal) * 100 : 0;
    const isPositive = changePercent >= 0;
    const hasData = perfRange === "1D" || perfRange === "7D";

    return { points, changePercent, isPositive, hasData };
  }, [portfolioData, perfRange]);

  const bestPerformer = useMemo(() => {
    const withChange = portfolioData.filter((h: any) => h.market?.price_change_24h != null && h.project);
    if (withChange.length === 0) return null;
    return withChange.reduce((best: any, h: any) => (h.market.price_change_24h > (best.market?.price_change_24h ?? -Infinity)) ? h : best, withChange[0]);
  }, [portfolioData]);

  const worstPerformer = useMemo(() => {
    const withChange = portfolioData.filter((h: any) => h.market?.price_change_24h != null && h.project);
    if (withChange.length === 0) return null;
    return withChange.reduce((worst: any, h: any) => (h.market.price_change_24h < (worst.market?.price_change_24h ?? Infinity)) ? h : worst, withChange[0]);
  }, [portfolioData]);

  const topHolding = useMemo(() => {
    const withValue = portfolioData.filter((h: any) => h.value > 0 && h.project);
    if (withValue.length === 0) return null;
    return withValue.reduce((top: any, h: any) => h.value > top.value ? h : top, withValue[0]);
  }, [portfolioData]);

  if (!user) return <Navigate to="/auth?redirect=/portfolio" replace />;

  const SortIcon = ({ column }: { column: "value" | "change" | "name" }) => {
    if (sortBy !== column) return null;
    return sortDir === "desc" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="relative pt-24 pb-20">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="gradient-radial-top absolute inset-0" />

        <div className="container relative mx-auto max-w-7xl px-4">
          {/* ── Hero Banner ── */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <div className="rounded-2xl border border-border bg-card p-6 md:p-8 relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/5 blur-[80px] pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-accent/5 blur-[60px] pointer-events-none" />

              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-1">Portfolio Value</p>
                  <div className="flex items-center gap-2 mb-3">
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight tabular-nums">
                      {hideBalances ? "••••••" : formatValue(totalNetWorth)}
                    </h1>
                    <button
                      onClick={() => setHideBalances(!hideBalances)}
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                    >
                      {hideBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground">24h PnL</span>
                      {totalPnl24h !== null ? (
                        <span className={`text-sm font-bold ${totalPnl24h >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {hideBalances ? "••••" : `${totalPnl24h >= 0 ? "+" : ""}${formatValue(Math.abs(totalPnl24h))}`}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                      {pnlPercent !== null && (
                        <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${pnlPercent >= 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                          {pnlPercent >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {Math.abs(pnlPercent).toFixed(2)}%
                        </span>
                      )}
                    </div>
                    <div className="h-3.5 w-px bg-border hidden sm:block" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground">Assets</span>
                      <span className="text-sm font-semibold text-foreground">{holdings.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Stats Cards ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-3"
          >
            {[
              {
                label: "Best (24h)",
                content: bestPerformer?.project ? (
                  <div className="flex items-center gap-2">
                    <ProjectLogo logoUrl={bestPerformer.project.logo_url} logoEmoji={bestPerformer.project.logo_emoji} name={bestPerformer.project.name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{bestPerformer.project.token}</p>
                      <ChangeIndicator change={bestPerformer.market?.price_change_24h ?? null} />
                    </div>
                  </div>
                ) : null,
              },
              {
                label: "Worst (24h)",
                content: worstPerformer?.project ? (
                  <div className="flex items-center gap-2">
                    <ProjectLogo logoUrl={worstPerformer.project.logo_url} logoEmoji={worstPerformer.project.logo_emoji} name={worstPerformer.project.name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{worstPerformer.project.token}</p>
                      <ChangeIndicator change={worstPerformer.market?.price_change_24h ?? null} />
                    </div>
                  </div>
                ) : null,
              },
              {
                label: "Top Holding",
                content: topHolding?.project ? (
                  <div className="flex items-center gap-2">
                    <ProjectLogo logoUrl={topHolding.project.logo_url} logoEmoji={topHolding.project.logo_emoji} name={topHolding.project.name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{topHolding.project.token}</p>
                      <p className="text-xs text-muted-foreground">{hideBalances ? "••••" : formatCompact(topHolding.value)}</p>
                    </div>
                  </div>
                ) : null,
              },
              {
                label: "Top Dominance",
                content: chartData[0] ? (
                  <div>
                    <p className="text-2xl font-bold text-foreground tabular-nums">{chartData[0].percent}%</p>
                    <p className="text-xs text-muted-foreground">{chartData[0].name}</p>
                  </div>
                ) : null,
              },
            ].map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.04 }}
                className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/20"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">{card.label}</p>
                {card.content || <p className="text-sm text-muted-foreground">—</p>}
              </motion.div>
            ))}
          </motion.div>

          {/* ── Charts Section ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-6 grid gap-4 lg:grid-cols-5"
          >
            {/* Allocation donut */}
            <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Allocation</p>
                <span className="text-[11px] text-muted-foreground">{chartData.length} asset{chartData.length !== 1 ? "s" : ""}</span>
              </div>
              {chartData.length > 0 ? (
                <>
                  <div className="h-[180px] mx-auto max-w-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={82} paddingAngle={2} strokeWidth={0}>
                          {chartData.map((_: any, index: number) => (
                            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [formatValue(value), ""]}
                          contentStyle={{ backgroundColor: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: "10px", color: "hsl(210, 20%, 92%)", fontSize: "12px" }}
                          itemStyle={{ color: "hsl(210, 20%, 92%)" }}
                          labelStyle={{ color: "hsl(210, 20%, 92%)" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {chartData.slice(0, 6).map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-foreground text-xs font-medium truncate">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-[11px] tabular-nums">{hideBalances ? "••••" : formatCompact(item.value)}</span>
                          <span className="text-foreground font-semibold text-xs w-11 text-right tabular-nums">{item.percent}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex h-[180px] items-center justify-center text-xs text-muted-foreground">
                  Add holdings to see allocation
                </div>
              )}
            </div>

            {/* Performance chart */}
            <div className="lg:col-span-3 rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Performance</p>
                  {portfolioSparkline?.hasData && (
                    <div className={`flex items-center gap-1 mt-0.5 text-sm font-semibold ${portfolioSparkline.isPositive ? "text-green-500" : "text-red-500"}`}>
                      {portfolioSparkline.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {portfolioSparkline.isPositive ? "+" : ""}{portfolioSparkline.changePercent.toFixed(2)}%
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-0.5 rounded-lg bg-secondary/50 p-0.5">
                  {(["1D", "7D", "30D", "90D"] as const).map((range) => (
                    <button
                      key={range}
                      onClick={() => setPerfRange(range)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                        perfRange === range
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
              {portfolioSparkline?.hasData ? (
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={portfolioSparkline.points.map((val, i) => ({ index: i, value: val }))}>
                      <defs>
                        <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={portfolioSparkline.isPositive ? "rgb(34,197,94)" : "rgb(239,68,68)"} stopOpacity={0.15} />
                          <stop offset="100%" stopColor={portfolioSparkline.isPositive ? "rgb(34,197,94)" : "rgb(239,68,68)"} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="index" hide />
                      <YAxis hide domain={["auto", "auto"]} />
                      <Tooltip
                        formatter={(value: number) => [hideBalances ? "••••" : formatValue(value), "Portfolio"]}
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "10px", color: "hsl(var(--foreground))", fontSize: "12px" }}
                        labelFormatter={() => ""}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={portfolioSparkline.isPositive ? "rgb(34,197,94)" : "rgb(239,68,68)"}
                        strokeWidth={2}
                        fill="url(#perfGrad)"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : portfolioSparkline && !portfolioSparkline.hasData ? (
                <div className="flex h-[240px] flex-col items-center justify-center text-center">
                  <BarChart3 className="h-7 w-7 text-muted-foreground/30 mb-2" />
                  <p className="text-sm font-medium text-foreground">{perfRange} data not available</p>
                  <p className="text-xs text-muted-foreground mt-1">Historical data is limited to 7 days. Select 1D or 7D.</p>
                </div>
              ) : (
                <div className="flex h-[240px] items-center justify-center text-xs text-muted-foreground">
                  Add holdings with market data to see performance
                </div>
              )}
            </div>
          </motion.div>


          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-1 rounded-lg bg-secondary/40 p-0.5">
              {([
                { key: "holdings" as const, label: "Holdings", icon: Wallet },
                { key: "alerts" as const, label: "Price Alerts", icon: Bell },
                { key: "forecasts" as const, label: "My Forecasts", icon: Activity },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                    activeTab === tab.key
                      ? "bg-card text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
            {activeTab === "holdings" && portfolioData.length > 0 && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExportCSV}>
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
            )}
          </motion.div>

          {/* ── Holdings Tab ── */}
          <AnimatePresence mode="wait">
            {activeTab === "holdings" && (
              <motion.div
                key="holdings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                <div className="flex items-center justify-between p-4 md:p-5 border-b border-border">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">Your Assets</h2>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{holdings.length} token{holdings.length !== 1 ? "s" : ""}</p>
                  </div>
                  <Button
                    onClick={() => setShowAddForm(!showAddForm)}
                    variant={showAddForm ? "secondary" : "default"}
                    size="sm"
                    className="gap-1.5 h-8 text-xs"
                  >
                    {showAddForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    {showAddForm ? "Cancel" : "Add Asset"}
                  </Button>
                </div>

                {/* Add form */}
                <AnimatePresence>
                  {showAddForm && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 md:p-5 border-b border-border bg-secondary/20">
                        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                          <div className="flex-1 min-w-0">
                            <label className="text-[11px] text-muted-foreground mb-1 block">Project</label>
                            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                              <SelectTrigger className="h-9 text-sm focus:ring-0 focus:ring-offset-0">
                                <SelectValue placeholder="Select a DePIN project" />
                              </SelectTrigger>
                              <SelectContent side="bottom" avoidCollisions={false}>
                                {projects.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    <span className="flex items-center gap-2">
                                      {p.logo_url && <img src={p.logo_url} alt="" className="w-4 h-4 rounded-[4px] object-contain" />}
                                      {p.name} ({p.token})
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-full sm:w-[160px]">
                            <label className="text-[11px] text-muted-foreground mb-1 block">Token Amount</label>
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="e.g. 1000"
                              value={tokenAmount}
                              onChange={(e) => setTokenAmount(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") handleAddHolding(); }}
                              className="h-9 text-sm"
                            />
                          </div>
                          <Button onClick={handleAddHolding} disabled={addHolding.isPending} className="h-9 gap-1.5 w-full sm:w-auto">
                            <Plus className="h-3.5 w-3.5" />
                            Add
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {isLoading ? (
                  <div className="p-12 text-center">
                    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      Loading holdings...
                    </div>
                  </div>
                ) : portfolioData.length === 0 ? (
                  <div className="p-12 md:p-16 text-center">
                    <div className="mx-auto h-14 w-14 rounded-2xl bg-secondary/50 flex items-center justify-center mb-3">
                      <Briefcase className="h-7 w-7 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">No holdings yet</p>
                    <p className="text-xs text-muted-foreground mb-4">Start building your DePIN portfolio</p>
                    <Button onClick={() => setShowAddForm(true)} size="sm" className="gap-1.5 h-8 text-xs">
                      <Plus className="h-3.5 w-3.5" />
                      Add your first asset
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border bg-secondary/20">
                            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground w-8">#</th>
                            <th
                              className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                              onClick={() => toggleSort("name")}
                            >
                              <span className="flex items-center gap-1">Name <SortIcon column="name" /></span>
                            </th>
                            <th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Price</th>
                            <th
                              className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                              onClick={() => toggleSort("change")}
                            >
                              <span className="flex items-center justify-end gap-1">24h % <SortIcon column="change" /></span>
                            </th>
                            <th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">7d</th>
                            <th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Amount</th>
                            <th
                              className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                              onClick={() => toggleSort("value")}
                            >
                              <span className="flex items-center justify-end gap-1">Value <SortIcon column="value" /></span>
                            </th>
                            <th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">PnL (24h)</th>
                            <th className="px-3 py-3 w-16"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {portfolioData.map((h: any, idx: number) => {
                            const sparkline = h.market?.sparkline_7d;
                            const sparkArr = Array.isArray(sparkline) ? sparkline : null;
                            const change = h.market?.price_change_24h ?? 0;
                            return (
                              <motion.tr
                                key={h.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: idx * 0.03 }}
                                className="border-b border-border/30 transition-colors hover:bg-secondary/20 group"
                              >
                                <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{idx + 1}</td>
                                <td className="px-4 py-3">
                                  {h.project ? (
                                    <Link to={`/project/${h.project.slug}`} className="flex items-center gap-2.5 group/link">
                                      <ProjectLogo logoUrl={h.project.logo_url} logoEmoji={h.project.logo_emoji} name={h.project.name} size="sm" />
                                      <div>
                                        <p className="text-sm font-medium text-foreground group-hover/link:text-primary transition-colors">{h.project.name}</p>
                                        <p className="text-[11px] text-muted-foreground">{h.project.token}</p>
                                      </div>
                                    </Link>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">Unknown</span>
                                  )}
                                </td>
                                <td className="px-3 py-3 text-right text-sm font-medium text-foreground tabular-nums">
                                  {formatPrice(h.market?.price_usd ?? null)}
                                </td>
                                <td className="px-3 py-3 text-right">
                                  <div className="flex justify-end">
                                    <ChangeIndicator change={h.market?.price_change_24h ?? null} />
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <div className="flex justify-end">
                                    {sparkArr && <MiniSparkline data={sparkArr as number[]} isPositive={change >= 0} />}
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-right">
                                  {editingId === h.id ? (
                                    <Input
                                      type="number"
                                      min="0"
                                      step="any"
                                      value={editAmount}
                                      onChange={(e) => setEditAmount(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveEdit(h.id);
                                        if (e.key === "Escape") handleCancelEdit();
                                      }}
                                      autoFocus
                                      className="h-7 w-24 ml-auto text-right text-xs"
                                    />
                                  ) : (
                                    <span className="text-sm text-foreground tabular-nums">
                                      {hideBalances ? "••••" : Number(h.token_amount).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-3 text-right text-sm font-bold text-foreground tabular-nums">
                                  {hideBalances ? "••••" : formatValue(h.value)}
                                </td>
                                <td className="px-3 py-3 text-right">
                                  {h.pnl24h !== null ? (
                                    <span className={`text-sm font-semibold tabular-nums ${h.pnl24h >= 0 ? "text-green-500" : "text-red-500"}`}>
                                      {hideBalances ? "••••" : `${h.pnl24h >= 0 ? "+" : ""}${formatValue(Math.abs(h.pnl24h))}`}
                                    </span>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">—</span>
                                  )}
                                </td>
                                <td className="px-3 py-3 text-right">
                                  <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {editingId === h.id ? (
                                      <>
                                        <button onClick={() => handleSaveEdit(h.id)} className="rounded-md p-1.5 text-green-500 transition-colors hover:bg-green-500/10">
                                          <Check className="h-3.5 w-3.5" />
                                        </button>
                                        <button onClick={handleCancelEdit} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary">
                                          <X className="h-3.5 w-3.5" />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button onClick={() => handleStartEdit(h.id, h.token_amount)} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                                          <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button onClick={() => deleteHolding.mutate(h.id)} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </motion.tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile card layout */}
                    <div className="md:hidden divide-y divide-border/30">
                      {portfolioData.map((h: any, idx: number) => {
                        const change = h.market?.price_change_24h ?? 0;
                        return (
                          <motion.div
                            key={h.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: idx * 0.03 }}
                            className="p-4 transition-colors hover:bg-secondary/10"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                {h.project ? (
                                  <Link to={`/project/${h.project.slug}`} className="flex items-center gap-2.5 min-w-0">
                                    <ProjectLogo logoUrl={h.project.logo_url} logoEmoji={h.project.logo_emoji} name={h.project.name} size="sm" />
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-foreground truncate">{h.project.name}</p>
                                      <p className="text-[11px] text-muted-foreground">{h.project.token}</p>
                                    </div>
                                  </Link>
                                ) : (
                                  <span className="text-sm text-muted-foreground">Unknown</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                {editingId === h.id ? (
                                  <>
                                    <button onClick={() => handleSaveEdit(h.id)} className="rounded-md p-1.5 text-green-500">
                                      <Check className="h-4 w-4" />
                                    </button>
                                    <button onClick={handleCancelEdit} className="rounded-md p-1.5 text-muted-foreground">
                                      <X className="h-4 w-4" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button onClick={() => handleStartEdit(h.id, h.token_amount)} className="rounded-md p-1.5 text-muted-foreground">
                                      <Pencil className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => deleteHolding.mutate(h.id)} className="rounded-md p-1.5 text-muted-foreground">
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <p className="text-muted-foreground mb-0.5">Amount</p>
                                {editingId === h.id ? (
                                  <Input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={editAmount}
                                    onChange={(e) => setEditAmount(e.target.value)}
                                    autoFocus
                                    className="h-6 w-full text-xs"
                                  />
                                ) : (
                                  <p className="font-medium text-foreground tabular-nums">
                                    {hideBalances ? "••••" : Number(h.token_amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                  </p>
                                )}
                              </div>
                              <div className="text-center">
                                <p className="text-muted-foreground mb-0.5">Value</p>
                                <p className="font-bold text-foreground tabular-nums">{hideBalances ? "••••" : formatValue(h.value)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-muted-foreground mb-0.5">24h</p>
                                <ChangeIndicator change={h.market?.price_change_24h ?? null} />
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* ── Price Alerts Tab ── */}
            {activeTab === "alerts" && (
              <motion.div
                key="alerts"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <PriceAlertsManager
                  projects={projects}
                  holdingProjectIds={holdings.map((h: any) => h.project_id)}
                />
              </motion.div>
            )}

            {/* ── Forecasts Tab ── */}
            {activeTab === "forecasts" && (
              <motion.div
                key="forecasts"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <MyForecasts />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Portfolio;

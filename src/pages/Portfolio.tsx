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
import { useBookmarks } from "@/hooks/useBookmarks";
import { Star } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"holdings" | "forecasts" | "alerts" | "watchlist">("holdings");

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

  const topDominance = useMemo(() => {
    if (chartData.length === 0) return null;
    return chartData.reduce((top: any, item: any) => (parseFloat(item.percent) > parseFloat(top.percent) ? item : top), chartData[0]);
  }, [chartData]);

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
    const hasData = points.length >= 2;

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
            <div className="group relative rounded-xl border border-border bg-card overflow-hidden">
              {/* Decorative corner accent */}
              <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-[60px] bg-primary/3 pointer-events-none" />

              <div className="relative p-4 md:p-5">
                {/* Header row */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                      <Briefcase className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">Portfolio Value</h2>
                      <p className="text-[10px] text-muted-foreground">{holdings.length} asset{holdings.length !== 1 ? "s" : ""} tracked</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setHideBalances(!hideBalances)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
                  >
                    {hideBalances ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {/* Value display */}
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight tabular-nums">
                      {hideBalances ? "••••••" : formatValue(totalNetWorth)}
                    </h1>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
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
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Stats Cards ── */}
          <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Best 24h */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="group relative rounded-xl border border-border bg-card p-4 overflow-hidden transition-all"
            >
              <div className="absolute top-0 right-0 w-16 h-16 rounded-bl-[40px] bg-green-500/5 transition-all group-hover:bg-green-500/10" />
              <div className="flex items-center gap-1.5 mb-3">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-green-500/10">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Best 24h</p>
              </div>
              {bestPerformer?.project ? (
                <div className="flex items-center gap-2.5">
                  <ProjectLogo logoUrl={bestPerformer.project.logo_url} logoEmoji={bestPerformer.project.logo_emoji} name={bestPerformer.project.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{bestPerformer.project.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-muted-foreground">{bestPerformer.project.token}</span>
                      <ChangeIndicator change={bestPerformer.market?.price_change_24h ?? null} />
                    </div>
                  </div>
                </div>
              ) : <p className="text-sm text-muted-foreground">—</p>}
            </motion.div>

            {/* Worst 24h */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
              className="group relative rounded-xl border border-border bg-card p-4 overflow-hidden transition-all"
            >
              <div className="absolute top-0 right-0 w-16 h-16 rounded-bl-[40px] bg-red-500/5 transition-all group-hover:bg-red-500/10" />
              <div className="flex items-center gap-1.5 mb-3">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-red-500/10">
                  <TrendingDown className="h-3 w-3 text-red-500" />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Worst 24h</p>
              </div>
              {worstPerformer?.project ? (
                <div className="flex items-center gap-2.5">
                  <ProjectLogo logoUrl={worstPerformer.project.logo_url} logoEmoji={worstPerformer.project.logo_emoji} name={worstPerformer.project.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{worstPerformer.project.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-muted-foreground">{worstPerformer.project.token}</span>
                      <ChangeIndicator change={worstPerformer.market?.price_change_24h ?? null} />
                    </div>
                  </div>
                </div>
              ) : <p className="text-sm text-muted-foreground">—</p>}
            </motion.div>

            {/* Top Holding */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="group relative rounded-xl border border-border bg-card p-4 overflow-hidden transition-all"
            >
              <div className="absolute top-0 right-0 w-16 h-16 rounded-bl-[40px] bg-primary/5 transition-all group-hover:bg-primary/10" />
              <div className="flex items-center gap-1.5 mb-3">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10">
                  <Briefcase className="h-3 w-3 text-primary" />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Top Holding</p>
              </div>
              {topHolding?.project ? (
                <div className="flex items-center gap-2.5">
                  <ProjectLogo logoUrl={topHolding.project.logo_url} logoEmoji={topHolding.project.logo_emoji} name={topHolding.project.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{topHolding.project.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-muted-foreground">{topHolding.project.token}</span>
                      <span className="text-xs font-semibold text-foreground tabular-nums">{hideBalances ? "••••" : formatCompact(topHolding.value)}</span>
                    </div>
                  </div>
                </div>
              ) : <p className="text-sm text-muted-foreground">—</p>}
            </motion.div>

            {/* Top Dominance */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="group relative rounded-xl border border-border bg-card p-4 overflow-hidden transition-all"
            >
              <div className="absolute top-0 right-0 w-16 h-16 rounded-bl-[40px] bg-accent/5 transition-all group-hover:bg-accent/10" />
              <div className="flex items-center gap-1.5 mb-3">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-accent/10">
                  <BarChart3 className="h-3 w-3 text-accent" />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Top Dominance</p>
              </div>
              {topDominance ? (
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-foreground tabular-nums leading-tight">{topDominance.percent}%</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{topDominance.fullName}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                    {topDominance.name}
                  </div>
                </div>
              ) : <p className="text-sm text-muted-foreground">—</p>}
            </motion.div>
          </div>

          {/* ── Charts Section ── */}
          <div className="mb-6 grid gap-3 lg:grid-cols-5">
            {/* Allocation donut */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26 }}
              className="group relative lg:col-span-2 rounded-xl border border-border bg-card p-5 overflow-hidden transition-all"
            >
              <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-[50px] bg-accent/5 transition-all group-hover:bg-accent/8" />
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1.5">
                  <div className="flex h-5 w-5 items-center justify-center rounded-md bg-accent/10">
                    <BarChart3 className="h-3 w-3 text-accent" />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Allocation</p>
                </div>
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
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "10px", color: "hsl(var(--foreground))", fontSize: "12px" }}
                          itemStyle={{ color: "hsl(var(--foreground))" }}
                          labelStyle={{ color: "hsl(var(--foreground))" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 space-y-2">
                    {chartData.slice(0, 6).map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-2.5 w-2.5 rounded-[3px] flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-foreground text-xs font-medium truncate">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="text-muted-foreground text-[11px] tabular-nums">{hideBalances ? "••••" : formatCompact(item.value)}</span>
                          <span className="text-foreground font-semibold text-xs w-11 text-right tabular-nums">{item.percent}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex h-[180px] flex-col items-center justify-center text-center">
                  <BarChart3 className="h-6 w-6 text-muted-foreground/20 mb-2" />
                  <p className="text-xs text-muted-foreground">Add holdings to see allocation</p>
                </div>
              )}
            </motion.div>

            {/* Performance chart */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="group relative lg:col-span-3 rounded-xl border border-border bg-card p-5 overflow-hidden transition-all"
            >
              <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-[50px] bg-primary/5 transition-all group-hover:bg-primary/8" />
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10">
                      <Activity className="h-3 w-3 text-primary" />
                    </div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Performance</p>
                  </div>
                  {portfolioSparkline?.hasData && (
                    <div className={`flex items-center gap-1 mt-1.5 ml-6.5 text-sm font-semibold ${portfolioSparkline.isPositive ? "text-green-500" : "text-red-500"}`}>
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
                          ? "bg-secondary text-foreground shadow-sm"
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
                  <BarChart3 className="h-6 w-6 text-muted-foreground/20 mb-2" />
                  <p className="text-sm font-medium text-foreground">{perfRange} data not available</p>
                  <p className="text-xs text-muted-foreground mt-1">Historical data is limited to 7 days. Select 1D or 7D.</p>
                </div>
              ) : (
                <div className="flex h-[240px] flex-col items-center justify-center text-center">
                  <Activity className="h-6 w-6 text-muted-foreground/20 mb-2" />
                  <p className="text-xs text-muted-foreground">Add holdings with market data to see performance</p>
                </div>
              )}
            </motion.div>
          </div>


          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-4"
          >
            <div className="flex items-center gap-1 rounded-lg bg-secondary/40 p-0.5 w-fit overflow-x-auto scrollbar-none max-w-full">
              {([
                { key: "holdings" as const, label: "Holdings", icon: Wallet },
                { key: "alerts" as const, label: "Alerts", icon: Bell },
                { key: "forecasts" as const, label: "Forecasts", icon: Activity },
                { key: "watchlist" as const, label: "Watchlist", icon: Star },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 rounded-md px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
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
                className="group relative rounded-xl border border-border bg-card overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-[60px] bg-primary/3 pointer-events-none" />

                <div className="relative flex items-center justify-between p-4 md:p-5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                      <Wallet className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">Your Assets</h2>
                      <p className="text-[10px] text-muted-foreground">{holdings.length} token{holdings.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {portfolioData.length > 0 && (
                      <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={handleExportCSV}>
                        <Download className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">CSV</span>
                      </Button>
                    )}
                    <Button
                      onClick={() => setShowAddForm(!showAddForm)}
                      variant={showAddForm ? "secondary" : "outline"}
                      size="sm"
                      className="gap-1.5 h-8 text-xs"
                    >
                      {showAddForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      {showAddForm ? "Cancel" : "Add Asset"}
                    </Button>
                  </div>
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
                      <div className="px-4 pb-4 md:px-5 md:pb-5">
                        <div className="rounded-lg border border-border bg-secondary/20 p-4">
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
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {isLoading ? (
                  <div className="p-12 text-center">
                    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-4 w-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                      Loading holdings...
                    </div>
                  </div>
                ) : portfolioData.length === 0 ? (
                  <div className="p-12 md:p-16 text-center">
                    <div className="mx-auto h-14 w-14 rounded-2xl bg-secondary/50 flex items-center justify-center mb-3">
                      <Briefcase className="h-7 w-7 text-muted-foreground/30" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">No holdings yet</p>
                    <p className="text-xs text-muted-foreground mb-4">Start building your DePIN portfolio</p>
                    <Button onClick={() => setShowAddForm(true)} variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                      <Plus className="h-3.5 w-3.5" />
                      Add your first asset
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Sort controls */}
                    <div className="flex items-center gap-2 px-4 md:px-5 pb-3">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Sort by</span>
                      <div className="flex items-center gap-0.5 rounded-lg bg-secondary/50 p-0.5">
                        {(["value", "change", "name"] as const).map((col) => (
                          <button
                            key={col}
                            onClick={() => toggleSort(col)}
                            className={`flex items-center gap-0.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                              sortBy === col
                                ? "bg-secondary text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {col === "value" ? "Value" : col === "change" ? "24h %" : "Name"}
                            {sortBy === col && (sortDir === "desc" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Desktop table */}
                    <div className="hidden md:block">
                      <div className="grid grid-cols-[2.5rem_1fr_5.5rem_5rem_5rem_5.5rem_6rem_5.5rem_3.5rem] gap-0 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground border-t border-border">
                        <span>#</span>
                        <span>Asset</span>
                        <span className="text-right">Price</span>
                        <span className="text-right">24h %</span>
                        <span className="text-right">7d</span>
                        <span className="text-right">Amount</span>
                        <span className="text-right">Value</span>
                        <span className="text-right">PnL 24h</span>
                        <span></span>
                      </div>
                      <div className="divide-y divide-border/30">
                        {portfolioData.map((h: any, idx: number) => {
                          const sparkline = h.market?.sparkline_7d;
                          const sparkArr = Array.isArray(sparkline) ? sparkline : null;
                          const change = h.market?.price_change_24h ?? 0;
                          return (
                            <motion.div
                              key={h.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: idx * 0.03 }}
                              className="grid grid-cols-[2.5rem_1fr_5.5rem_5rem_5rem_5.5rem_6rem_5.5rem_3.5rem] gap-0 items-center px-5 py-3 transition-colors hover:bg-secondary/10 group"
                            >
                              <span className="text-xs text-muted-foreground tabular-nums">{idx + 1}</span>
                              <div>
                                {h.project ? (
                                  <Link to={`/project/${h.project.slug}`} className="flex items-center gap-2.5 group/link">
                                    <ProjectLogo logoUrl={h.project.logo_url} logoEmoji={h.project.logo_emoji} name={h.project.name} size="sm" />
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-foreground group-hover/link:text-primary transition-colors truncate">{h.project.name}</p>
                                      <p className="text-[11px] text-muted-foreground">{h.project.token}</p>
                                    </div>
                                  </Link>
                                ) : (
                                  <span className="text-sm text-muted-foreground">Unknown</span>
                                )}
                              </div>
                              <span className="text-right text-sm font-medium text-foreground tabular-nums">
                                {formatPrice(h.market?.price_usd ?? null)}
                              </span>
                              <div className="flex justify-end">
                                <ChangeIndicator change={h.market?.price_change_24h ?? null} />
                              </div>
                              <div className="flex justify-end">
                                {sparkArr && <MiniSparkline data={sparkArr as number[]} isPositive={change >= 0} />}
                              </div>
                              <div className="text-right">
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
                              </div>
                              <span className="text-right text-sm font-bold text-foreground tabular-nums">
                                {hideBalances ? "••••" : formatValue(h.value)}
                              </span>
                              <div className="text-right">
                                {h.pnl24h !== null ? (
                                  <span className={`text-sm font-semibold tabular-nums ${h.pnl24h >= 0 ? "text-green-500" : "text-red-500"}`}>
                                    {hideBalances ? "••••" : `${h.pnl24h >= 0 ? "+" : ""}${formatValue(Math.abs(h.pnl24h))}`}
                                  </span>
                                ) : (
                                  <span className="text-sm text-muted-foreground">—</span>
                                )}
                              </div>
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
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Mobile card layout */}
                    <div className="md:hidden px-4 pb-4 space-y-2">
                      {portfolioData.map((h: any, idx: number) => (
                        <motion.div
                          key={h.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="rounded-lg border border-border/50 bg-secondary/10 p-3.5 transition-colors hover:bg-secondary/20"
                        >
                          <div className="flex items-center justify-between mb-2.5">
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
                            <div className="flex items-center gap-0.5">
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
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => deleteHolding.mutate(h.id)} className="rounded-md p-1.5 text-muted-foreground">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <p className="text-[10px] text-muted-foreground mb-0.5">Amount</p>
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
                              <p className="text-[10px] text-muted-foreground mb-0.5">Value</p>
                              <p className="font-bold text-foreground tabular-nums">{hideBalances ? "••••" : formatValue(h.value)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-muted-foreground mb-0.5">24h</p>
                              <ChangeIndicator change={h.market?.price_change_24h ?? null} />
                            </div>
                          </div>
                        </motion.div>
                      ))}
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

            {/* ── Watchlist Tab ── */}
            {activeTab === "watchlist" && (
              <motion.div
                key="watchlist"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                <div className="p-4 md:p-5 border-b border-border flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                    <Star className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Watchlist</h2>
                    <p className="text-[10px] text-muted-foreground">Projects you've bookmarked from the Market page</p>
                  </div>
                </div>
                <WatchlistContent projects={projects} marketDataMap={marketDataMap} />
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

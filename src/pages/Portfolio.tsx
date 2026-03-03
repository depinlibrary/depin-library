import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Briefcase, TrendingUp, TrendingDown, Minus, Pencil, Check, X } from "lucide-react";
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

function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return "—";
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

function formatValue(val: number): string {
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(2)}K`;
  return `$${val.toFixed(4)}`;
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(220, 70%, 65%)",
  "hsl(180, 60%, 55%)",
  "hsl(140, 50%, 55%)",
  "hsl(45, 80%, 60%)",
  "hsl(280, 60%, 65%)",
  "hsl(350, 65%, 60%)",
  "hsl(200, 55%, 50%)",
];

const ChangeIndicator = ({ change }: { change: number | null }) => {
  if (change === null || change === undefined) return <span className="text-muted-foreground">—</span>;
  const isPositive = change > 0;
  const isNegative = change < 0;
  return (
    <span className={`flex items-center gap-0.5 text-sm font-semibold ${isPositive ? "text-green-500" : isNegative ? "text-red-500" : "text-muted-foreground"}`}>
      {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : isNegative ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
      {isPositive ? "+" : ""}{change.toFixed(2)}%
    </span>
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

  // Fetch user holdings
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

  // Add holding mutation
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
      toast.success("Holding added to portfolio");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add holding");
    },
  });

  // Update holding mutation
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
    onError: (err: any) => {
      toast.error(err.message || "Failed to update holding");
    },
  });

  // Delete holding mutation
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

  // Compute portfolio data
  const portfolioData = useMemo(() => {
    return holdings.map((h: any) => {
      const project = projects.find((p) => p.id === h.project_id);
      const market = marketDataMap[h.project_id];
      const value = market?.price_usd ? h.token_amount * market.price_usd : 0;
      const pnl24h = market?.price_change_24h && market?.price_usd
        ? value * (market.price_change_24h / 100)
        : null;
      return { ...h, project, market, value, pnl24h };
    }).sort((a: any, b: any) => b.value - a.value);
  }, [holdings, projects, marketDataMap]);

  const totalNetWorth = useMemo(() => portfolioData.reduce((sum: number, h: any) => sum + h.value, 0), [portfolioData]);
  const totalPnl24h = useMemo(() => {
    const pnls = portfolioData.filter((h: any) => h.pnl24h !== null);
    if (pnls.length === 0) return null;
    return pnls.reduce((sum: number, h: any) => sum + (h.pnl24h || 0), 0);
  }, [portfolioData]);
  const pnlPercent = totalNetWorth > 0 && totalPnl24h !== null ? (totalPnl24h / (totalNetWorth - totalPnl24h)) * 100 : null;

  // Pie chart data
  const chartData = useMemo(() => {
    if (totalNetWorth === 0) return [];
    return portfolioData
      .filter((h: any) => h.value > 0 && h.project)
      .map((h: any) => ({
        name: h.project?.token || h.project?.name || "Unknown",
        value: h.value,
        percent: ((h.value / totalNetWorth) * 100).toFixed(2),
      }));
  }, [portfolioData, totalNetWorth]);

  // 7-day portfolio sparkline: sum each holding's sparkline weighted by token_amount
  const portfolioSparkline = useMemo(() => {
    const holdingsWithSparkline = portfolioData.filter(
      (h: any) => h.market?.sparkline_7d && Array.isArray(h.market.sparkline_7d) && h.market.sparkline_7d.length > 0
    );
    if (holdingsWithSparkline.length === 0) return null;

    // Normalize all sparklines to the same length (use the shortest)
    const minLen = Math.min(...holdingsWithSparkline.map((h: any) => h.market.sparkline_7d.length));
    const step = Math.max(1, Math.floor(minLen / 48)); // ~48 data points
    const indices = Array.from({ length: Math.ceil(minLen / step) }, (_, i) => i * step);

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

    return { points, changePercent, isPositive };
  }, [portfolioData]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="relative pt-24 pb-20">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="gradient-radial-top absolute inset-0" />

        <div className="container relative mx-auto max-w-6xl px-4">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Portfolio</h1>
            </div>
            <p className="text-muted-foreground">Track your DePIN token holdings and portfolio value</p>
          </motion.div>

          {/* Net Worth + Holdings Chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="mb-8 grid gap-4 md:grid-cols-2">
            {/* Net Worth Card */}
            <div className="rounded-xl border border-border bg-card p-6">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Net Worth</p>
              <p className="text-3xl font-bold text-foreground">{formatValue(totalNetWorth)}</p>

              <div className="mt-4 flex gap-8">
                <div>
                  <p className="text-xs text-muted-foreground">PnL (24h)</p>
                  {totalPnl24h !== null ? (
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${totalPnl24h >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {totalPnl24h >= 0 ? "+" : ""}{formatValue(Math.abs(totalPnl24h))}
                      </span>
                      {pnlPercent !== null && (
                        <span className={`text-sm ${pnlPercent >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {pnlPercent >= 0 ? "▲" : "▼"} {Math.abs(pnlPercent).toFixed(2)}%
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Tokens held</p>
                  <p className="text-lg font-semibold text-foreground">{holdings.length}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Projects tracked</p>
                  <p className="text-lg font-semibold text-foreground">{projects.length}</p>
                </div>
              </div>
            </div>

            {/* Holdings Pie Chart */}
            <div className="rounded-xl border border-border bg-card p-6">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                Holdings ({chartData.length} Tokens)
              </p>
              {chartData.length > 0 ? (
                <div className="flex items-center gap-4">
                  <div className="h-[180px] w-[180px] flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} strokeWidth={0}>
                          {chartData.map((_: any, index: number) => (
                            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => formatValue(value)}
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5 overflow-hidden">
                    {chartData.slice(0, 6).map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-foreground font-medium truncate">{item.name}</span>
                        <span className="text-muted-foreground ml-auto">{item.percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
                  Add holdings to see your portfolio breakdown
                </div>
              )}
            </div>
          </motion.div>

          {/* 7-Day Portfolio Performance */}
          {portfolioSparkline && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="mb-8 rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Portfolio Performance</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Last 7 days</p>
                </div>
                <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${portfolioSparkline.isPositive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                  {portfolioSparkline.isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {portfolioSparkline.isPositive ? "+" : ""}{portfolioSparkline.changePercent.toFixed(2)}%
                </div>
              </div>
              <div className="h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={portfolioSparkline.points.map((val, i) => ({ index: i, value: val }))}>
                    <defs>
                      <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={portfolioSparkline.isPositive ? "rgb(34,197,94)" : "rgb(239,68,68)"} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={portfolioSparkline.isPositive ? "rgb(34,197,94)" : "rgb(239,68,68)"} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="index" hide />
                    <YAxis hide domain={["auto", "auto"]} />
                    <Tooltip
                      formatter={(value: number) => [formatValue(value), "Portfolio Value"]}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))", fontSize: "12px" }}
                      labelFormatter={() => ""}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={portfolioSparkline.isPositive ? "rgb(34,197,94)" : "rgb(239,68,68)"}
                      strokeWidth={2}
                      fill="url(#portfolioGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {/* Add Holding Form */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="mb-8 rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">Add Holding</h2>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-muted-foreground mb-1 block">Project</label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger className="h-9 text-sm focus:ring-0 focus:ring-offset-0">
                    <SelectValue placeholder="Select a DePIN project" />
                  </SelectTrigger>
                  <SelectContent side="bottom" avoidCollisions={false}>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-2">
                          {p.name} ({p.token})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[180px]">
                <label className="text-xs text-muted-foreground mb-1 block">Token Amount</label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 1000"
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                  className="h-9 text-sm focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <Button onClick={handleAddHolding} disabled={addHolding.isPending} className="h-9 gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
          </motion.div>

          {/* Holdings Table */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-5 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Your Positions</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Tokens ({holdings.length})</p>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading holdings...</div>
            ) : portfolioData.length === 0 ? (
              <div className="p-12 text-center">
                <Briefcase className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-foreground">No holdings yet</p>
                <p className="text-xs text-muted-foreground mt-1">Add your first DePIN token above to start tracking your portfolio</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Name</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Price</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Amount</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">PnL (24h)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Value</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolioData.map((h: any) => (
                      <tr key={h.id} className="border-b border-border/50 transition-colors hover:bg-secondary/20">
                        <td className="px-4 py-3">
                          {h.project ? (
                            <Link to={`/project/${h.project.slug}`} className="flex items-center gap-2.5">
                              <ProjectLogo logoUrl={h.project.logo_url} logoEmoji={h.project.logo_emoji} name={h.project.name} size="sm" />
                              <div>
                                <p className="text-sm font-medium text-foreground">{h.project.name}</p>
                                <p className="text-xs text-muted-foreground">{h.project.token}</p>
                              </div>
                            </Link>
                          ) : (
                            <span className="text-sm text-muted-foreground">Unknown project</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-foreground">
                          {formatPrice(h.market?.price_usd ?? null)}
                        </td>
                        <td className="px-4 py-3 text-right">
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
                              className="h-7 w-28 ml-auto text-right text-sm focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                            />
                          ) : (
                            <span className="text-sm text-foreground">
                              {Number(h.token_amount).toLocaleString(undefined, { maximumFractionDigits: 5 })}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {h.pnl24h !== null ? (
                            <div>
                              <span className={`text-sm font-semibold ${h.pnl24h >= 0 ? "text-green-500" : "text-red-500"}`}>
                                {h.pnl24h >= 0 ? "+" : ""}{formatValue(Math.abs(h.pnl24h))}
                              </span>
                              <ChangeIndicator change={h.market?.price_change_24h ?? null} />
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-foreground">
                          {formatValue(h.value)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {editingId === h.id ? (
                              <>
                                <button
                                  onClick={() => handleSaveEdit(h.id)}
                                  className="rounded-md p-1.5 text-green-500 transition-colors hover:bg-green-500/10"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleStartEdit(h.id, h.token_amount)}
                                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteHolding.mutate(h.id)}
                                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Portfolio;

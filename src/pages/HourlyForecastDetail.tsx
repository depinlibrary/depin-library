import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, TrendingUp, TrendingDown, Minus, Clock, History, ArrowLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useVoteHourlyRound, useHourlyRoundHistory } from "@/hooks/useHourlyForecasts";
import { useTokenMarketData } from "@/hooks/useTokenMarketData";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function useCountdown(targetDate: string | null) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    if (!targetDate) { setTimeLeft(""); return; }
    const update = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("00:00"); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [targetDate]);
  return timeLeft;
}

function formatPrice(price: number | null | undefined): string {
  if (price == null) return "—";
  if (price < 0.01) return `$${price.toFixed(6)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function HourlyForecastDetail() {
  const { roundId } = useParams<{ roundId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const voteHourly = useVoteHourlyRound();

  // Fetch round data
  const { data: round, isLoading } = useQuery({
    queryKey: ["hourly-round-detail", roundId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hourly_forecast_rounds")
        .select("*")
        .eq("id", roundId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!roundId,
    refetchInterval: 15_000,
  });

  // Fetch project data
  const { data: project } = useQuery({
    queryKey: ["hourly-round-project", round?.project_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, slug, logo_url, logo_emoji, token, coingecko_id")
        .eq("id", round!.project_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!round?.project_id,
  });

  // Fetch user vote
  const { data: userVote } = useQuery({
    queryKey: ["hourly-round-user-vote", roundId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("hourly_forecast_votes")
        .select("vote")
        .eq("round_id", roundId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data?.vote || null;
    },
    enabled: !!roundId && !!user,
  });

  // Market data
  const { data: marketData } = useTokenMarketData(round?.project_id);

  // History
  const { data: history = [] } = useHourlyRoundHistory(round?.project_id);

  const isActive = round?.status === "active" && new Date(round.end_time) > new Date();
  const isInCooldown = round?.status === "resolved" && round.cooldown_end && new Date(round.cooldown_end) > new Date();
  const countdown = useCountdown(isActive ? round?.end_time ?? null : isInCooldown ? round?.cooldown_end ?? null : null);
  const totalVotes = (round?.total_votes_up || 0) + (round?.total_votes_down || 0);
  const upPct = totalVotes > 0 ? ((round?.total_votes_up || 0) / totalVotes) * 100 : 50;

  // Sparkline chart data
  const chartData = useMemo(() => {
    if (!marketData?.sparkline_7d || !Array.isArray(marketData.sparkline_7d)) return [];
    const prices = marketData.sparkline_7d as number[];
    const h24Count = Math.max(2, Math.round(prices.length * (24 / 168)));
    const prices24 = prices.slice(-h24Count);
    const now = Date.now();
    const interval = (24 * 60 * 60 * 1000) / prices24.length;
    return prices24.map((price, i) => {
      const time = new Date(now - (prices24.length - 1 - i) * interval);
      return {
        date: time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        value: price,
      };
    });
  }, [marketData]);

  const handleVote = (vote: "up" | "down") => {
    if (!user) {
      toast("Please log in to vote", { action: { label: "Log in", onClick: () => navigate("/auth?redirect=/forecasts") } });
      return;
    }
    if (userVote) {
      toast.info("You already voted on this round.");
      return;
    }
    if (!isActive) {
      toast.info("This round has ended.");
      return;
    }
    voteHourly.mutate({ roundId: roundId!, vote }, {
      onError: (e: any) => toast.error(e.message),
      onSuccess: () => toast.success(`Voted ${vote === "up" ? "Up" : "Down"}!`),
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-12 flex-1">
          <div className="max-w-3xl mx-auto space-y-6">
            {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-xl bg-secondary/30 animate-pulse" />)}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!round) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-12 flex-1 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Round not found</h1>
          <Link to="/forecasts" className="text-primary hover:underline text-sm">← Back to Predictions</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const projectName = project?.name || "Unknown";
  const isPositive = (marketData?.price_change_24h ?? 0) >= 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="container mx-auto px-4 pt-24 pb-12 flex-1">
        <div className="max-w-3xl mx-auto">
          {/* Back */}
          <Link to="/forecasts" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to Predictions
          </Link>

          {/* Header card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card overflow-hidden mb-6">
            <div className="p-6">
              {/* Project + status */}
              <div className="flex items-center justify-between mb-4">
                <Link to={`/project/${project?.slug}`} className="flex items-center gap-3 group">
                  {project?.logo_url ? (
                    <img src={project.logo_url} alt={projectName} className="w-10 h-10 rounded-xl object-contain border border-card bg-secondary" />
                  ) : (
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border border-card bg-secondary">{project?.logo_emoji || "⬡"}</span>
                  )}
                  <div>
                    <span className="text-sm font-semibold text-foreground group-hover:underline">{projectName}</span>
                    {project?.token && <span className="text-xs text-muted-foreground ml-2">${project.token}</span>}
                  </div>
                </Link>
                <div className="flex items-center gap-2">
                  {isActive && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      LIVE
                    </span>
                  )}
                  {isInCooldown && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <Clock className="h-3 w-3 inline mr-1" />Cooldown
                    </span>
                  )}
                  {!isActive && !isInCooldown && round.status === "resolved" && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">Resolved</span>
                  )}
                </div>
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-foreground font-['Space_Grotesk'] mb-2">
                {projectName} up or down in 1 hour
              </h1>
              <p className="text-sm text-muted-foreground mb-4">
                Round #{round.round_number} · Auto-recurring hourly prediction
              </p>

              {/* Countdown */}
              <div className="flex items-center gap-3 mb-6">
                <Timer className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-mono font-bold text-foreground tabular-nums">
                  {isActive ? countdown : isInCooldown ? `Next in ${countdown}` : "—"}
                </span>
              </div>

              {/* Vote bar */}
              <div className="space-y-3">
                <div className="relative h-3 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-primary"
                    initial={{ width: "50%" }}
                    animate={{ width: `${upPct}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-primary font-bold">{upPct.toFixed(0)}% Up <span className="text-muted-foreground font-normal">({round.total_votes_up})</span></span>
                  <span className="text-destructive font-bold">{(100 - upPct).toFixed(0)}% Down <span className="text-muted-foreground font-normal">({round.total_votes_down})</span></span>
                </div>
              </div>

              {/* Vote buttons */}
              <div className="mt-6">
                {isActive ? (
                  userVote ? (
                    <div className="text-center text-sm text-muted-foreground py-3 rounded-xl bg-secondary/50">
                      You voted <span className={`font-semibold ${userVote === "up" ? "text-primary" : "text-destructive"}`}>{userVote === "up" ? "Up" : "Down"}</span> · Note you can't change vote
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={() => handleVote("up")}
                        disabled={voteHourly.isPending}
                        variant="outline"
                        className="h-12 text-sm font-bold bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                      >
                        <TrendingUp className="h-4 w-4 mr-2" /> Vote Up
                      </Button>
                      <Button
                        onClick={() => handleVote("down")}
                        disabled={voteHourly.isPending}
                        variant="outline"
                        className="h-12 text-sm font-bold bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                      >
                        <TrendingDown className="h-4 w-4 mr-2" /> Vote Down
                      </Button>
                    </div>
                  )
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <span className="h-12 rounded-lg flex items-center justify-center text-sm font-bold bg-secondary text-muted-foreground opacity-60">Up</span>
                    <span className="h-12 rounded-lg flex items-center justify-center text-sm font-bold bg-secondary text-muted-foreground opacity-60">Down</span>
                  </div>
                )}
              </div>

              {/* Result for resolved */}
              {round.status === "resolved" && round.outcome && !isInCooldown && (
                <div className={`mt-4 flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-3 ${
                  round.outcome === "up" ? "bg-primary/10 text-primary" : round.outcome === "down" ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground"
                }`}>
                  {round.outcome === "up" ? <TrendingUp className="h-4 w-4" /> : round.outcome === "down" ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                  Price went {round.outcome === "up" ? "UP" : round.outcome === "down" ? "DOWN" : "FLAT"}
                  {round.start_price != null && round.end_price != null && (
                    <span className="text-muted-foreground font-normal ml-2">
                      ({formatPrice(round.start_price)} → {formatPrice(round.end_price)})
                    </span>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* Price info + chart */}
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            {/* Current price card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-4">Current Price</h3>
              {marketData?.price_usd != null ? (
                <div>
                  <span className="text-3xl font-bold text-foreground font-['Space_Grotesk']">{formatPrice(marketData.price_usd)}</span>
                  {marketData.price_change_24h != null && (
                    <span className={`ml-3 text-sm font-semibold ${isPositive ? "text-primary" : "text-destructive"}`}>
                      {isPositive ? "+" : ""}{marketData.price_change_24h.toFixed(2)}%
                    </span>
                  )}
                  {marketData.market_cap_usd != null && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Market Cap: {marketData.market_cap_usd >= 1e9 ? `$${(marketData.market_cap_usd / 1e9).toFixed(2)}B` : marketData.market_cap_usd >= 1e6 ? `$${(marketData.market_cap_usd / 1e6).toFixed(2)}M` : `$${marketData.market_cap_usd.toLocaleString()}`}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No price data available</p>
              )}

              {/* Round prices */}
              {(round.start_price != null || round.end_price != null) && (
                <div className="mt-4 pt-4 border-t border-border space-y-2">
                  {round.start_price != null && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Round Start Price</span>
                      <span className="font-semibold text-foreground">{formatPrice(round.start_price)}</span>
                    </div>
                  )}
                  {round.end_price != null && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Round End Price</span>
                      <span className="font-semibold text-foreground">{formatPrice(round.end_price)}</span>
                    </div>
                  )}
                  {round.start_price != null && round.end_price != null && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Change</span>
                      <span className={`font-semibold ${round.end_price >= round.start_price ? "text-primary" : "text-destructive"}`}>
                        {((round.end_price - round.start_price) / round.start_price * 100).toFixed(4)}%
                      </span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* 24h chart */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-4">24H Price Chart</h3>
              {chartData.length >= 2 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="hourlyGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatPrice(v)} domain={["auto", "auto"]} width={60} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-lg">
                              <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
                              <p className="text-sm font-semibold text-foreground">{formatPrice(payload[0]?.value as number)}</p>
                            </div>
                          );
                        }}
                      />
                      <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#hourlyGrad)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No chart data available</div>
              )}
            </motion.div>
          </div>

          {/* Round info */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl border border-border bg-card p-6 mb-6">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-4">Round Details</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Round</p>
                <p className="text-sm font-semibold text-foreground">#{round.round_number}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Total Votes</p>
                <p className="text-sm font-semibold text-foreground">{totalVotes}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Started</p>
                <p className="text-sm font-semibold text-foreground">{new Date(round.start_time).toLocaleTimeString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Ends</p>
                <p className="text-sm font-semibold text-foreground">{new Date(round.end_time).toLocaleTimeString()}</p>
              </div>
            </div>
          </motion.div>

          {/* History */}
          {history.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <History className="h-3.5 w-3.5" /> Past Rounds
                </h3>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {history.map((r: any) => {
                  const rTotal = r.total_votes_up + r.total_votes_down;
                  return (
                    <Link
                      key={r.id}
                      to={`/forecasts/hourly/${r.id}`}
                      className={`flex items-center justify-between px-6 py-3 text-xs border-b border-border/50 last:border-b-0 hover:bg-secondary/30 transition-colors ${r.id === roundId ? 'bg-primary/5' : ''}`}
                    >
                      <span className="text-muted-foreground font-medium">Round #{r.round_number}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">{rTotal} votes</span>
                        {r.start_price != null && r.end_price != null && (
                          <span className="text-muted-foreground">{formatPrice(r.start_price)} → {formatPrice(r.end_price)}</span>
                        )}
                        <span className={`font-semibold ${r.outcome === "up" ? "text-primary" : r.outcome === "down" ? "text-destructive" : "text-muted-foreground"}`}>
                          {r.outcome === "up" ? "↑ Up" : r.outcome === "down" ? "↓ Down" : "— Flat"}
                        </span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

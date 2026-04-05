import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Timer, TrendingUp, TrendingDown, Minus, Clock, History, ArrowLeft, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useVoteHourlyRound, useHourlyRoundHistory, useRealtimeHourlyRounds, isVotingOpen, getVotingDeadline, getUserOutcome } from "@/hooks/useHourlyPredictions";
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

export default function HourlyPredictionDetail() {
  const { roundId } = useParams<{ roundId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const voteHourly = useVoteHourlyRound();
  useRealtimeHourlyRounds();

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

  const { data: marketData } = useTokenMarketData(round?.project_id);
  const { data: history = [] } = useHourlyRoundHistory(round?.project_id);

  const isActive = round?.status === "active" && new Date(round.end_time) > new Date();
  const isResolved = round?.status === "resolved";
  const votingOpen = round ? isVotingOpen(round) : false;
  const votingDeadline = round ? getVotingDeadline(round.start_time, round.end_time) : null;
  const countdown = useCountdown(isActive ? round?.end_time ?? null : null);
  const votingCountdown = useCountdown(votingOpen && votingDeadline ? votingDeadline.toISOString() : null);
  const totalVotes = (round?.total_votes_up || 0) + (round?.total_votes_down || 0);
  const upPct = totalVotes > 0 ? ((round?.total_votes_up || 0) / totalVotes) * 100 : 50;
  const userOutcome = getUserOutcome(userVote || null, round?.outcome || null);

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
    if (userVote === vote) {
      toast.info("You already voted " + (vote === "up" ? "Up" : "Down"));
      return;
    }
    if (!votingOpen) {
      toast.info("Voting window has closed for this round.");
      return;
    }
    voteHourly.mutate({ roundId: roundId!, vote }, {
      onError: (e: any) => toast.error(e.message),
      onSuccess: () => toast.success(userVote ? `Switched to ${vote === "up" ? "Up" : "Down"}!` : `Voted ${vote === "up" ? "Up" : "Down"}!`),
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-12 flex-1">
          <div className="space-y-6">
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
        {/* Back */}
        <Link to="/forecasts" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Predictions
        </Link>

        {/* Full-width header card — Polymarket style */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card overflow-hidden mb-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left: Info + Vote */}
            <div className="p-6 sm:p-8 flex flex-col border-b lg:border-b-0 lg:border-r border-border">
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
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary">HOURLY</span>
                  {isActive && votingOpen && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      VOTING OPEN
                    </span>
                  )}
                  {isActive && !votingOpen && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      PREDICTING
                    </span>
                  )}
                  {isResolved && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">Resolved</span>
                  )}
                </div>
              </div>

              {/* Title */}
              <h1 className="text-xl sm:text-2xl font-bold text-foreground font-['Space_Grotesk'] tracking-tight mb-2">
                {projectName} up or down in 1 hour
              </h1>
              <p className="text-sm text-muted-foreground mb-5">
                Round #{round.round_number} · Auto-recurring hourly prediction
              </p>

              {/* Odds pills — Polymarket style */}
              <div className="flex flex-col gap-2.5 mb-5">
                <div className="flex w-full items-center justify-between rounded-xl border border-primary/25 bg-primary/5 px-4 py-2.5 text-sm font-bold text-foreground">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    Up
                  </span>
                  <span className="font-['Space_Grotesk'] text-base tabular-nums text-primary">{upPct.toFixed(0)}%</span>
                </div>
                <div className="flex w-full items-center justify-between rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-2.5 text-sm font-bold text-foreground">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-destructive" />
                    Down
                  </span>
                  <span className="font-['Space_Grotesk'] text-base tabular-nums text-destructive">{(100 - upPct).toFixed(0)}%</span>
                </div>
              </div>

              {/* Countdown */}
              <div className="flex items-center gap-3 mb-5">
                <Timer className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-mono font-bold text-foreground tabular-nums">
                  {isActive && votingOpen ? `Voting closes ${votingCountdown}` : isActive ? `Resolves ${countdown}` : "—"}
                </span>
                <span className="text-xs text-muted-foreground">{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</span>
              </div>

              {/* Vote buttons */}
              <div className="mt-auto">
                {isActive && votingOpen ? (
                  userVote ? (
                    <div className="space-y-3">
                      <div className="text-center text-sm text-muted-foreground">
                        You voted <span className={`font-semibold ${userVote === "up" ? "text-primary" : "text-destructive"}`}>{userVote === "up" ? "Up" : "Down"}</span> · Tap to switch
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          onClick={() => handleVote("up")}
                          disabled={voteHourly.isPending}
                          variant="outline"
                          className={`h-12 text-sm font-bold ${userVote === "up" ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90" : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"}`}
                        >
                          Up
                        </Button>
                        <Button
                          onClick={() => handleVote("down")}
                          disabled={voteHourly.isPending}
                          variant="outline"
                          className={`h-12 text-sm font-bold ${userVote === "down" ? "bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90" : "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"}`}
                        >
                          Down
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={() => handleVote("up")}
                        disabled={voteHourly.isPending}
                        variant="outline"
                        className="h-12 text-sm font-bold bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                      >
                        Up
                      </Button>
                      <Button
                        onClick={() => handleVote("down")}
                        disabled={voteHourly.isPending}
                        variant="outline"
                        className="h-12 text-sm font-bold bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                      >
                        Down
                      </Button>
                    </div>
                  )
                ) : isActive && !votingOpen ? (
                  userVote ? (
                    <div className="text-center text-sm text-muted-foreground py-3 rounded-xl bg-secondary/50">
                      You voted <span className={`font-semibold ${userVote === "up" ? "text-primary" : "text-destructive"}`}>{userVote === "up" ? "Up" : "Down"}</span> · Waiting for result
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <span className="h-12 rounded-lg flex items-center justify-center text-sm font-bold bg-secondary text-muted-foreground opacity-40 blur-[1px]">Up</span>
                        <span className="h-12 rounded-lg flex items-center justify-center text-sm font-bold bg-secondary text-muted-foreground opacity-40 blur-[1px]">Down</span>
                      </div>
                      <p className="text-center text-[10px] text-muted-foreground">Voting window closed · Waiting for result</p>
                    </div>
                  )
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <span className="h-12 rounded-lg flex items-center justify-center text-sm font-bold bg-secondary text-muted-foreground opacity-60">Up</span>
                    <span className="h-12 rounded-lg flex items-center justify-center text-sm font-bold bg-secondary text-muted-foreground opacity-60">Down</span>
                  </div>
                )}
              </div>

              {/* Result + user outcome for resolved */}
              {round.status === "resolved" && round.outcome && (
                <div className="mt-4 space-y-2">
                  <div className={`flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-3 ${
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
                  {userOutcome && (
                    <div className={`flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-3 ${
                      userOutcome === "correct"
                        ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                        : "bg-destructive/10 text-destructive border border-destructive/20"
                    }`}>
                      {userOutcome === "correct" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      {userOutcome === "correct" ? "You predicted correctly!" : "Your prediction was wrong"}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Price + Chart */}
            <div className="p-6 sm:p-8 flex flex-col">
              {/* Current price */}
              <div className="mb-4">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Current Price</span>
                {marketData?.price_usd != null ? (
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-foreground font-['Space_Grotesk']">{formatPrice(marketData.price_usd)}</span>
                    {marketData.price_change_24h != null && (
                      <span className={`ml-3 text-sm font-semibold ${isPositive ? "text-primary" : "text-destructive"}`}>
                        {isPositive ? "+" : ""}{marketData.price_change_24h.toFixed(2)}%
                      </span>
                    )}
                    {marketData.market_cap_usd != null && (
                      <p className="text-xs text-muted-foreground mt-1">
                        MCap: {marketData.market_cap_usd >= 1e9 ? `$${(marketData.market_cap_usd / 1e9).toFixed(2)}B` : marketData.market_cap_usd >= 1e6 ? `$${(marketData.market_cap_usd / 1e6).toFixed(2)}M` : `$${marketData.market_cap_usd.toLocaleString()}`}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">No price data</p>
                )}
              </div>

              {/* Round prices */}
              {(round.start_price != null || round.end_price != null) && (
                <div className="mb-4 grid grid-cols-2 gap-3">
                  {round.start_price != null && (
                    <div className="rounded-xl border border-border bg-secondary/20 px-3 py-2">
                      <p className="text-[10px] text-muted-foreground mb-1">Round Start</p>
                      <p className="text-sm font-semibold text-foreground">{formatPrice(round.start_price)}</p>
                    </div>
                  )}
                  {round.end_price != null && (
                    <div className="rounded-xl border border-border bg-secondary/20 px-3 py-2">
                      <p className="text-[10px] text-muted-foreground mb-1">Round End</p>
                      <p className="text-sm font-semibold text-foreground">{formatPrice(round.end_price)}</p>
                    </div>
                  )}
                </div>
              )}

              {/* 24h chart */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground">24H Price Chart</span>
                <span className="text-[10px] text-muted-foreground">CoinGecko</span>
              </div>
              <div className="flex-1 min-h-[200px]">
                {chartData.length >= 2 ? (
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
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No chart data available</div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Round details */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-border bg-card p-6 mb-6">
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-2xl border border-border bg-card overflow-hidden">
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

      <Footer />
    </div>
  );
}

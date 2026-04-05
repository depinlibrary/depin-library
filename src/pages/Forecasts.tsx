import { useState, useEffect, useMemo, useCallback, useRef, useSyncExternalStore } from "react";
import { getWeightedChance } from "@/lib/forecastUtils";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { Timer, ThumbsUp, ThumbsDown, Plus, TrendingUp, TrendingDown, Clock, Flame, ChevronLeft, ChevronRight, LogIn, Users, BarChart3, Zap, X, Filter, Trophy, CheckCircle, CheckCircle2, Circle, RotateCcw, DollarSign, Server, Activity, ArrowUpRight, ArrowDownRight, Copy, ChevronRight as ChevronRightIcon, Search, XCircle, Minus } from "lucide-react";

import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useActiveHourlyRounds, useRealtimeHourlyRounds, useVoteHourlyRound, isVotingOpen, getVotingDeadline, getUserOutcome, type HourlyRound } from "@/hooks/useHourlyForecasts";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useForecasts, useCreateForecast, useVoteForecast, type ForecastSortOption, type ForecastStatusFilter, type Forecast } from "@/hooks/useForecasts";
import { useProjects } from "@/hooks/useProjects";
import { useAllTokenMarketData, useTokenMarketData } from "@/hooks/useTokenMarketData";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const dimensionIconMap: Record<string, typeof DollarSign> = {
  token_price: DollarSign,
  market_cap: BarChart3,
  
  active_nodes: Server,
  revenue: Activity,
};

const dimensionLabelMap: Record<string, string> = {
  token_price: "Price",
  market_cap: "MCap",
  
  active_nodes: "Nodes",
  revenue: "Revenue",
};

const PAGE_SIZE = 12;

const sortOptions: { value: ForecastSortOption; label: string; icon: typeof Flame }[] = [
  { value: "votes", label: "Most Votes", icon: Flame },
  { value: "newest", label: "Newest", icon: Clock },
  { value: "ending_soon", label: "Ending Soon", icon: Timer },
];

function getTimeRemaining(endDate: string): string {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 30) return `${Math.floor(days / 30)}mo left`;
  if (days > 0) return `${days}d left`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  return `${hours}h left`;
}

const ForecastCard = ({ forecast, onVote, isAuthenticated, index, dimensions = [] }: {
  forecast: Forecast;
  onVote: (id: string, vote: "yes" | "no") => void;
  isAuthenticated: boolean;
  index: number;
  dimensions?: string[];
}) => {
  const totalVotes = forecast.total_votes_yes + forecast.total_votes_no;
  const { yesPct, noPct } = getWeightedChance(forecast);
  const isEnded = new Date(forecast.end_date) <= new Date();
  const timeLeft = getTimeRemaining(forecast.end_date);
  const finalResult = isEnded ? (forecast.outcome || (yesPct >= 50 ? "yes" : "no")) : null;
  const isPriceMarket = dimensions.some(d => d === "token_price" || d === "market_cap");
  const yesLabel = isPriceMarket ? "Long" : "Yes";
  const noLabel = isPriceMarket ? "Short" : "No";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className="group relative rounded-xl border border-border bg-card overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 h-full flex flex-col"
    >
      <div className="p-4 flex-1 flex flex-col">
        {/* Header row: logos + time */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center -space-x-1.5">
              {forecast.project_a_logo_url ? (
                <img src={forecast.project_a_logo_url} alt={forecast.project_a_name} className="w-7 h-7 rounded-lg object-contain border border-card bg-secondary relative z-10" />
              ) : (
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs border border-card bg-secondary relative z-10">{forecast.project_a_logo_emoji || "⬡"}</span>
              )}
              {forecast.project_b_name && (
                forecast.project_b_logo_url ? (
                  <img src={forecast.project_b_logo_url} alt={forecast.project_b_name} className="w-7 h-7 rounded-lg object-contain border border-card bg-secondary relative z-0" />
                ) : (
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs border border-card bg-secondary relative z-0">{forecast.project_b_logo_emoji || "⬡"}</span>
                )
              )}
            </div>
            <div className="flex items-center gap-1">
              <Link to={`/project/${forecast.project_a_slug}`} className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">{forecast.project_a_name}</Link>
              {forecast.project_b_name && (
                <>
                  <span className="text-muted-foreground/40 text-[9px]">vs</span>
                  <Link to={`/project/${forecast.project_b_slug}`} className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">{forecast.project_b_name}</Link>
                </>
              )}
            </div>
          </div>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isEnded ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600 dark:text-green-400'}`}>
            {timeLeft}
          </span>
        </div>

        {/* Title */}
        <Link to={`/forecasts/${forecast.id}`} className="block mb-auto">
          <h3 className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2 group-hover:underline transition-all duration-200">
            {forecast.title}
          </h3>
        </Link>

        {/* Percentage + votes */}
        <div className="mt-4 flex items-end justify-between">
          <span className="text-lg font-bold text-foreground tabular-nums">{yesPct.toFixed(0)}%<span className="text-xs font-normal text-muted-foreground ml-1">chance</span></span>
          <span className="text-[10px] text-muted-foreground">{totalVotes.toLocaleString()} vote{totalVotes !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Bottom section — compact Polymarket-style */}
      <div className="px-4 pb-4">
        {isEnded && forecast.user_vote ? (() => {
          const outcomeResult = finalResult;
          const userCorrect = outcomeResult === forecast.user_vote;
          const userVoteLabel = forecast.user_vote === "yes" ? yesLabel : noLabel;
          const resultLabel = outcomeResult === "yes" ? yesLabel : noLabel;
          return (
            <div className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-[10px] font-semibold mb-2 ${
              userCorrect
                ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}>
              <span>You voted {userVoteLabel}</span>
              <span className="flex items-center gap-1">
                {userCorrect ? (
                  <><CheckCircle2 className="h-3 w-3" /> Correct</>
                ) : (
                  <><XCircle className="h-3 w-3" /> Result: {resultLabel}</>
                )}
              </span>
            </div>
          );
        })() : null}

        {/* Vote buttons — inline Polymarket style */}
        <div className="flex gap-2">
          <button
            onClick={() => !isEnded ? (isAuthenticated ? onVote(forecast.id, "yes") : toast.error("Sign in to vote")) : undefined}
            disabled={isEnded}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all duration-200 ${
              isEnded
                ? "bg-secondary text-muted-foreground cursor-not-allowed opacity-60"
                : forecast.user_vote === "yes"
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
            }`}
          >
            {yesLabel}
          </button>
          <button
            onClick={() => !isEnded ? (isAuthenticated ? onVote(forecast.id, "no") : toast.error("Sign in to vote")) : undefined}
            disabled={isEnded}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all duration-200 ${
              isEnded
                ? "bg-secondary text-muted-foreground cursor-not-allowed opacity-60"
                : forecast.user_vote === "no"
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-destructive/10 text-destructive hover:bg-destructive/20"
            }`}
          >
            {noLabel}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ---- Hourly Round Card (integrated into main grid) ----
function useHourlyCountdown(targetDate: string | null) {
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

const HourlyRoundCard = ({ round, index }: { round: HourlyRound; index: number }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const voteHourly = useVoteHourlyRound();
  const isActive = round.status === "active" && new Date(round.end_time) > new Date();
  const isInCooldown = round.status === "resolved" && round.cooldown_end && new Date(round.cooldown_end) > new Date();
  const countdown = useHourlyCountdown(isActive ? round.end_time : isInCooldown ? round.cooldown_end : null);
  const totalVotes = round.total_votes_up + round.total_votes_down;
  const upPct = totalVotes > 0 ? (round.total_votes_up / totalVotes) * 100 : 50;

  const handleVote = (vote: "up" | "down") => {
    if (!user) {
      toast("Please log in to vote", { action: { label: "Log in", onClick: () => navigate("/auth?redirect=/forecasts") } });
      return;
    }
    if (round.user_vote) {
      toast.info("You already voted on this round.");
      return;
    }
    if (!isActive) {
      toast.info("This round has ended.");
      return;
    }
    voteHourly.mutate({ roundId: round.id, vote }, {
      onError: (e: any) => toast.error(e.message),
      onSuccess: () => toast.success(`Voted ${vote === "up" ? "Up" : "Down"}!`),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className="group relative rounded-xl border border-border bg-card overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 h-full flex flex-col"
    >
      <div className="p-4 flex-1 flex flex-col">
        {/* Header row: logo + status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {round.project_logo_url ? (
              <img src={round.project_logo_url} alt={round.project_name} className="w-7 h-7 rounded-lg object-contain border border-card bg-secondary" />
            ) : (
              <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs border border-card bg-secondary">{round.project_logo_emoji}</span>
            )}
            <Link to={`/project/${round.project_slug}`} className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">{round.project_name}</Link>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">HOURLY</span>
            {isActive && (
              <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                LIVE
              </span>
            )}
            {isInCooldown && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">Cooldown</span>
            )}
            {!isActive && !isInCooldown && round.status === "resolved" && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Resolved</span>
            )}
          </div>
        </div>

        {/* Title */}
        <Link to={`/forecasts/hourly/${round.id}`} className="block mb-auto">
          <h3 className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2 group-hover:underline transition-all duration-200">
            {round.project_name} up or down in 1 hour
          </h3>
        </Link>

        {/* Percentage + votes — same style as regular cards */}
        <div className="mt-4 flex items-end justify-between">
          <span className="text-lg font-bold text-foreground tabular-nums">{upPct.toFixed(0)}%<span className="text-xs font-normal text-muted-foreground ml-1">chance Up</span></span>
          <span className="text-[10px] text-muted-foreground">{totalVotes.toLocaleString()} vote{totalVotes !== 1 ? "s" : ""}</span>
        </div>

        {/* Countdown */}
        <div className="mt-1.5 flex items-center gap-1.5">
          <Timer className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-mono font-semibold text-muted-foreground tabular-nums">
            {isActive ? countdown : isInCooldown ? `Next ${countdown}` : "—"}
          </span>
        </div>

        {/* Result for resolved */}
        {round.status === "resolved" && round.outcome && !isInCooldown && (
          <div className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${
            round.outcome === "up" ? "text-primary" : round.outcome === "down" ? "text-destructive" : "text-muted-foreground"
          }`}>
            {round.outcome === "up" ? <TrendingUp className="h-3.5 w-3.5" /> : round.outcome === "down" ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
            Price went {round.outcome === "up" ? "UP" : round.outcome === "down" ? "DOWN" : "FLAT"}
          </div>
        )}
      </div>

      {/* Vote buttons */}
      <div className="px-4 pb-4">
        {isActive ? (
          round.user_vote ? (
            <div className="text-center text-[10px] text-muted-foreground py-2">
              You voted <span className={`font-semibold ${round.user_vote === "up" ? "text-primary" : "text-destructive"}`}>{round.user_vote === "up" ? "Up" : "Down"}</span> · Note you can't change vote
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => handleVote("up")} disabled={voteHourly.isPending} className="flex-1 rounded-lg py-2 text-xs font-bold text-center bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                Up
              </button>
              <button onClick={() => handleVote("down")} disabled={voteHourly.isPending} className="flex-1 rounded-lg py-2 text-xs font-bold text-center bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                Down
              </button>
            </div>
          )
        ) : (
          <div className="flex gap-2">
            <span className="flex-1 rounded-lg py-2 text-xs font-bold text-center bg-secondary text-muted-foreground opacity-60">Up</span>
            <span className="flex-1 rounded-lg py-2 text-xs font-bold text-center bg-secondary text-muted-foreground opacity-60">Down</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ---- Hero Section — Full-width prediction market showcase ----
const HeroSection = ({ forecasts, user, setShowCreate, heroDimensionsMap, search, setSearch, setPage, navigate, dailyRemaining }: {
  forecasts: Forecast[];
  user: any;
  setShowCreate: (v: boolean) => void;
  heroDimensionsMap: Record<string, string[]>;
  search: string;
  setSearch: (v: string) => void;
  setPage: (v: number) => void;
  navigate: any;
  dailyRemaining: number;
}) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Only show price/market cap predictions in hero, max 8
  const heroForecasts = useMemo(() => {
    return forecasts
      .filter(f => {
        const dims = heroDimensionsMap[f.id] || [];
        return dims.some(d => d === "token_price" || d === "market_cap");
      })
      .slice(0, 8);
  }, [forecasts, heroDimensionsMap]);

  // Clamp activeSlide if list shrinks
  useEffect(() => {
    if (activeSlide >= heroForecasts.length && heroForecasts.length > 0) {
      setActiveSlide(0);
    }
  }, [heroForecasts.length, activeSlide]);

  // Get market data for active prediction's project
  const activeProjectAId = heroForecasts[activeSlide]?.project_a_id;
  const activeProjectBId = heroForecasts[activeSlide]?.project_b_id;
  const { data: heroMarketData } = useTokenMarketData(activeProjectAId);
  const { data: heroMarketDataB } = useTokenMarketData(activeProjectBId || undefined);
  const cDims = heroDimensionsMap[heroForecasts[activeSlide]?.id] || [];
  const hasTwoProjects = !!heroForecasts[activeSlide]?.project_b_name;

  const tokenChartData = useMemo(() => {
    if (!heroMarketData?.sparkline_7d || !Array.isArray(heroMarketData.sparkline_7d)) return [];
    const prices = heroMarketData.sparkline_7d as number[];
    // Use last ~24h of data (last 24 out of 168 hours = last ~24/168 of datapoints)
    const h24Count = Math.max(2, Math.round(prices.length * (24 / 168)));
    const prices24 = prices.slice(-h24Count);
    const now = Date.now();
    const interval = (24 * 60 * 60 * 1000) / prices24.length;
    const dim = cDims.some(d => d === "market_cap") ? "market_cap" : "token_price";
    return prices24.map((price, i) => {
      const time = new Date(now - (prices24.length - 1 - i) * interval);
      return {
        date: time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        value: dim === "market_cap" && heroMarketData.market_cap_usd && heroMarketData.price_usd
          ? price * (heroMarketData.market_cap_usd / heroMarketData.price_usd)
          : price,
      };
    });
  }, [heroMarketData, cDims]);

  // Project B chart data for cross-chart
  const tokenChartDataB = useMemo(() => {
    if (!hasTwoProjects || !heroMarketDataB?.sparkline_7d || !Array.isArray(heroMarketDataB.sparkline_7d)) return [];
    const prices = heroMarketDataB.sparkline_7d as number[];
    const h24Count = Math.max(2, Math.round(prices.length * (24 / 168)));
    const prices24 = prices.slice(-h24Count);
    const now = Date.now();
    const interval = (24 * 60 * 60 * 1000) / prices24.length;
    const dim = cDims.some(d => d === "market_cap") ? "market_cap" : "token_price";
    return prices24.map((price, i) => {
      const time = new Date(now - (prices24.length - 1 - i) * interval);
      return {
        date: time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        valueB: dim === "market_cap" && heroMarketDataB.market_cap_usd && heroMarketDataB.price_usd
          ? price * (heroMarketDataB.market_cap_usd / heroMarketDataB.price_usd)
          : price,
      };
    });
  }, [heroMarketDataB, cDims, hasTwoProjects]);

  // Merge A and B data for cross chart
  const mergedChartData = useMemo(() => {
    if (!hasTwoProjects || tokenChartDataB.length === 0) return tokenChartData;
    const maxLen = Math.min(tokenChartData.length, tokenChartDataB.length);
    return tokenChartData.slice(-maxLen).map((d, i) => ({
      ...d,
      valueB: tokenChartDataB.slice(-maxLen)[i]?.valueB,
    }));
  }, [tokenChartData, tokenChartDataB, hasTwoProjects]);

  useEffect(() => {
    if (heroForecasts.length <= 1 || isPaused) return;
    intervalRef.current = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % heroForecasts.length);
    }, 10000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [heroForecasts.length, isPaused]);

  const goToSlide = useCallback((index: number) => {
    setActiveSlide(index);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % heroForecasts.length);
    }, 10000);
  }, [heroForecasts.length]);

  if (heroForecasts.length === 0) {
    return (
      <section className="relative overflow-hidden pt-24 pb-8">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="gradient-radial-top absolute inset-0" />
        <div className="container relative mx-auto px-4">
          <div className="flex items-center gap-1 mb-4">
            <button className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary/10 text-primary border border-primary/20">Predictions</button>
            <button className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground/50 cursor-default" disabled>
              Leaderboard <span className="ml-1 text-[9px] bg-secondary px-1.5 py-0.5 rounded-full">Soon</span>
            </button>
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-8 flex flex-col items-center justify-center text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <h2 className="text-lg font-bold text-foreground font-['Space_Grotesk'] mb-1">No predictions yet</h2>
            <p className="text-sm text-muted-foreground mb-4">Create the first prediction for the community.</p>
            <Button onClick={() => user ? setShowCreate(true) : (window.location.href = "/auth?redirect=/forecasts")} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Create Prediction
            </Button>
          </motion.div>
        </div>
      </section>
    );
  }

  const current = heroForecasts[activeSlide];
  const { yesPct: cYesPct } = getWeightedChance(current);
  const cIsEnded = new Date(current.end_date) <= new Date();
  const cTimeLeft = getTimeRemaining(current.end_date);
  const cIsPriceMarket = cDims.some(d => d === "token_price" || d === "market_cap");
  const cYesLabel = cIsPriceMarket ? "Long" : "Yes";
  const cNoLabel = cIsPriceMarket ? "Short" : "No";
  const cStatusLabel = cIsEnded ? "Ended" : "Live";
  const isMarketCapChart = cDims.some(d => d === "market_cap");
  const dimLabel = isMarketCapChart ? "Market Cap" : "Token Price";
  const currentValueA = isMarketCapChart ? (heroMarketData?.market_cap_usd ?? null) : (heroMarketData?.price_usd ?? null);
  const currentValueB = hasTwoProjects
    ? (isMarketCapChart ? (heroMarketDataB?.market_cap_usd ?? null) : (heroMarketDataB?.price_usd ?? null))
    : null;
  const isPositiveA = (heroMarketData?.price_change_24h ?? 0) >= 0;
  const isPositiveB = (heroMarketDataB?.price_change_24h ?? 0) >= 0;
  const currentDifference = currentValueA !== null && currentValueB !== null ? currentValueA - currentValueB : null;

  const formatChartVal = (v: number) => {
    if (isMarketCapChart) {
      if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
      if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
      return `$${v.toLocaleString()}`;
    }
    return v >= 1 ? `$${v.toFixed(2)}` : `$${v.toFixed(6)}`;
  };

  return (
    <section className="relative overflow-hidden pt-24 pb-4">
      <div className="absolute inset-0 bg-grid opacity-10" />
      <div className="gradient-radial-top absolute inset-0" />

      <div className="container relative mx-auto px-4">
        {/* Tabs at top left + search/create at right */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-1">
            <button className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary/10 text-primary border border-primary/20">Predictions</button>
            <button className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground/50 cursor-default" disabled>
              Leaderboard <span className="ml-1 text-[9px] bg-secondary px-1.5 py-0.5 rounded-full">Soon</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-[220px] sm:w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input
                placeholder="Search predictions..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="h-10 w-full text-sm placeholder:text-muted-foreground/50 bg-secondary/40 border-border pl-9 pr-3"
              />
            </div>
            <Button
              onClick={() => {
                if (user) {
                  if (dailyRemaining <= 0) {
                    toast.error("You've reached your daily limit of 5 predictions. Try again tomorrow.");
                    return;
                  }
                  setShowCreate(true);
                } else {
                  toast("Please log in to create a prediction", {
                    action: { label: "Log in", onClick: () => navigate("/auth?redirect=/forecasts") },
                  });
                }
              }}
              size="sm"
              className="h-10 gap-1.5 shrink-0 text-xs px-4 rounded-full !shadow-none !transition-none !hover:bg-primary !hover:text-primary-foreground !hover:shadow-none !hover:translate-y-0"
            >
              <Plus className="h-3.5 w-3.5" /> Create Prediction
            </Button>
          </div>
        </div>

        {/* Main hero card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="rounded-2xl border border-border bg-card overflow-hidden relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 lg:min-h-[360px]">
                  {/* Left: market info */}
                  <div className="p-6 sm:p-7 flex flex-col border-b lg:border-b-0 lg:border-r border-border">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex items-center -space-x-1.5 shrink-0">
                        {current.project_a_logo_url ? (
                          <img src={current.project_a_logo_url} alt={current.project_a_name} className="w-8 h-8 rounded-lg object-contain bg-secondary border border-card relative z-10" />
                        ) : (
                          <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-secondary border border-card relative z-10">{current.project_a_logo_emoji || "⬡"}</span>
                        )}
                        {current.project_b_name && (
                          current.project_b_logo_url ? (
                            <img src={current.project_b_logo_url} alt={current.project_b_name} className="w-8 h-8 rounded-lg object-contain bg-secondary border border-card relative z-0" />
                          ) : (
                            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-secondary border border-card relative z-0">{current.project_b_logo_emoji || "⬡"}</span>
                          )
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Link to={`/project/${current.project_a_slug}`} className="font-medium hover:text-foreground transition-colors">{current.project_a_name}</Link>
                          {current.project_b_name && (
                            <>
                              <span className="text-muted-foreground/40">vs</span>
                              <Link to={`/project/${current.project_b_slug}`} className="font-medium hover:text-foreground transition-colors">{current.project_b_name}</Link>
                            </>
                          )}
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                            cIsEnded ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${cIsEnded ? "bg-destructive" : "bg-primary"}`} />
                            {cStatusLabel}
                          </span>
                          {!cIsEnded && <span className="text-[11px] text-muted-foreground">{cTimeLeft}</span>}
                        </div>
                      </div>
                    </div>

                    <Link to={`/forecasts/${current.id}`}>
                      <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight font-['Space_Grotesk'] tracking-tight hover:underline transition-all line-clamp-2 mb-5">
                        {current.title}
                      </h2>
                    </Link>

                    <div className="mt-auto flex flex-col gap-2.5">
                      <div className="flex w-full items-center justify-between rounded-xl border border-primary/25 bg-primary/5 px-4 py-2.5 text-sm font-bold text-foreground">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-primary" />
                          {cYesLabel}
                        </span>
                        <span className="font-['Space_Grotesk'] text-base tabular-nums text-primary">{cYesPct.toFixed(0)}%</span>
                      </div>
                      <div className="flex w-full items-center justify-between rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-2.5 text-sm font-bold text-foreground">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-destructive" />
                          {cNoLabel}
                        </span>
                        <span className="font-['Space_Grotesk'] text-base tabular-nums text-destructive">{(100 - cYesPct).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Token Price Chart — 24H */}
                  <div className="p-6 sm:p-7 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {dimLabel}
                        {hasTwoProjects && current.project_b_name && <span className="ml-1 text-muted-foreground/50">({current.project_a_name} vs {current.project_b_name})</span>}
                      </span>
                      <span className="text-[10px] text-muted-foreground">CoinGecko</span>
                    </div>
                    {(hasTwoProjects ? currentValueA !== null || currentValueB !== null : currentValueA !== null) && (
                      <>
                        <div className={`mb-3 ${hasTwoProjects ? "grid gap-2 sm:grid-cols-2" : "flex items-center gap-2 flex-wrap"}`}>
                          {currentValueA !== null && (
                            <div className={hasTwoProjects ? "rounded-xl border border-border bg-secondary/20 px-3 py-2" : "flex items-center gap-2 flex-wrap"}>
                              {hasTwoProjects && (
                                <p className="mb-1 text-[10px] font-medium text-muted-foreground">{current.project_a_name || "Project A"}</p>
                              )}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-base font-bold text-foreground font-['Space_Grotesk']">
                                  {formatChartVal(currentValueA)}
                                </span>
                                {heroMarketData?.price_change_24h != null && (
                                  <span className={`text-xs font-semibold flex items-center gap-0.5 ${isPositiveA ? "text-primary" : "text-destructive"}`}>
                                    {isPositiveA ? <TrendingUp className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                    {isPositiveA ? "+" : ""}{heroMarketData.price_change_24h.toFixed(2)}%
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          {hasTwoProjects && currentValueB !== null && (
                            <div className="rounded-xl border border-border bg-secondary/20 px-3 py-2">
                              <p className="mb-1 text-[10px] font-medium text-muted-foreground">{current.project_b_name || "Project B"}</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-base font-bold text-foreground font-['Space_Grotesk']">
                                  {formatChartVal(currentValueB)}
                                </span>
                                {heroMarketDataB?.price_change_24h != null && (
                                  <span className={`text-xs font-semibold flex items-center gap-0.5 ${isPositiveB ? "text-primary" : "text-destructive"}`}>
                                    {isPositiveB ? <TrendingUp className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                    {isPositiveB ? "+" : ""}{heroMarketDataB.price_change_24h.toFixed(2)}%
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                    <div className="flex-1 min-h-[200px]">
                      {(hasTwoProjects ? mergedChartData : tokenChartData).length >= 2 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={hasTwoProjects ? mergedChartData : tokenChartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="heroTokenGradA" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.01} />
                              </linearGradient>
                              {hasTwoProjects && (
                                <linearGradient id="heroTokenGradB" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.15} />
                                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.01} />
                                </linearGradient>
                              )}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                            <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatChartVal(v)} domain={["auto", "auto"]} width={65} />
                            <Tooltip
                              cursor={{ stroke: "hsl(var(--border))", strokeDasharray: "4 4" }}
                              content={({ active, payload, label }) => {
                                if (!active || !payload?.length) return null;
                                const pointA = payload.find((item: any) => item.dataKey === "value");
                                const pointB = payload.find((item: any) => item.dataKey === "valueB");
                                const valueA = typeof pointA?.value === "number" ? pointA.value : null;
                                const valueB = typeof pointB?.value === "number" ? pointB.value : null;
                                const difference = valueA !== null && valueB !== null ? valueA - valueB : null;

                                return (
                                  <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-lg">
                                    <p className="mb-2 text-[11px] font-semibold text-foreground">{label}</p>
                                    {valueA !== null && (
                                      <div className="flex items-center justify-between gap-4 text-[11px]">
                                        <span className="text-muted-foreground">{current.project_a_name || "Project A"}</span>
                                        <span className="font-semibold text-foreground">{formatChartVal(valueA)}</span>
                                      </div>
                                    )}
                                    {valueB !== null && (
                                      <div className="mt-1 flex items-center justify-between gap-4 text-[11px]">
                                        <span className="text-muted-foreground">{current.project_b_name || "Project B"}</span>
                                        <span className="font-semibold text-foreground">{formatChartVal(valueB)}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              }}
                            />
                            <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#heroTokenGradA)" strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "hsl(var(--card))", strokeWidth: 2 }} name={current.project_a_name || "Project A"} />
                            {hasTwoProjects && (
                              <Area type="monotone" dataKey="valueB" stroke="hsl(var(--destructive))" fill="url(#heroTokenGradB)" strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "hsl(var(--card))", strokeWidth: 2 }} name={current.project_b_name || "Project B"} />
                            )}
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <BarChart3 className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">No price data available</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Slide dots — outside the card, left-aligned */}
        {heroForecasts.length > 1 && (
          <div className="flex items-center gap-1.5 mt-3">
            {heroForecasts.map((_, i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === activeSlide
                    ? "w-5 h-1.5 bg-primary"
                    : "w-1.5 h-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
const Forecasts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: projects = [] } = useProjects();
  const [sort, setSort] = useState<ForecastSortOption>("newest");
  const [page, setPage] = useState(1);
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<ForecastStatusFilter>("all");
  const [topicFilter, setTopicFilter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const { data, isLoading, isFetching } = useForecasts(sort, page, PAGE_SIZE, projectFilter || undefined, search || undefined, statusFilter, topicFilter || undefined);
  const createForecast = useCreateForecast();
  const voteForecast = useVoteForecast();
  const [showCreate, setShowCreate] = useState(false);

  // Hourly predictions data
  useRealtimeHourlyRounds();
  const { data: hourlyRounds = [] } = useActiveHourlyRounds();

  // Create form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectAId, setProjectAId] = useState("");
  const [projectBId, setProjectBId] = useState("");
  const [endDate, setEndDate] = useState("");
  const [timePreset, setTimePreset] = useState<string>("");
  const [predictionDirection, setPredictionDirection] = useState<"long" | "short" | "">("");
  const [predictionTarget, setPredictionTarget] = useState<string>("");

  // Track if viewport is lg+ (1024px) to conditionally render Dialog vs inline panel
  const isLgScreen = useSyncExternalStore(
    (cb) => { const mql = window.matchMedia("(min-width: 1024px)"); mql.addEventListener("change", cb); return () => mql.removeEventListener("change", cb); },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => true
  );

  // Query user's daily forecast count for rate limit display
  const { data: dailyForecastCount = 0 } = useQuery({
    queryKey: ["daily-forecast-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("forecasts")
        .select("*", { count: "exact", head: true })
        .eq("creator_user_id", user.id)
        .gte("created_at", oneDayAgo);
      return count ?? 0;
    },
    enabled: !!user,
    staleTime: 30_000,
  });
  const dailyRemaining = Math.max(0, 5 - dailyForecastCount);


  const timePresets = [
    { value: "4h", label: "4 Hours", hours: 4 },
    { value: "24h", label: "24 Hours", hours: 24 },
    { value: "7d", label: "7 Days", hours: 168 },
    { value: "30d", label: "30 Days", hours: 720 },
    { value: "custom", label: "Custom", hours: 0 },
  ];

  const dimensionOptions = [
    { value: "token_price", label: "Token Price", disabled: false },
    { value: "market_cap", label: "Market Cap", disabled: false },
    
    { value: "node", label: "Node", disabled: true },
    { value: "revenue", label: "Revenue", disabled: true },
    { value: "infrastructure", label: "Infrastructure", disabled: true },
  ];

  const handleTimePreset = (preset: string) => {
    setTimePreset(preset);
    if (preset !== "custom") {
      const p = timePresets.find(t => t.value === preset);
      if (p) {
        const now = new Date();
        const end = new Date(now.getTime() + p.hours * 60 * 60 * 1000);
        // Format for datetime-local input in local timezone
        const year = end.getFullYear();
        const month = String(end.getMonth() + 1).padStart(2, '0');
        const day = String(end.getDate()).padStart(2, '0');
        const hours = String(end.getHours()).padStart(2, '0');
        const minutes = String(end.getMinutes()).padStart(2, '0');
        setEndDate(`${year}-${month}-${day}T${hours}:${minutes}`);
      }
    } else {
      setEndDate("");
    }
  };

  const [forecastMarket, setForecastMarket] = useState<string>("");

  // Fetch token market data to filter projects with price/market cap
  const { data: allMarketData = {} } = useAllTokenMarketData();

  // Filter projects based on selected prediction market
  const filteredProjects = useMemo(() => {
    if (forecastMarket === "token_price" || forecastMarket === "market_cap") {
      return projects.filter(p => {
        const md = allMarketData[p.id];
        if (!md) return false;
        if (forecastMarket === "token_price") return md.price_usd != null && md.price_usd > 0;
        if (forecastMarket === "market_cap") return md.market_cap_usd != null && md.market_cap_usd > 0;
        return true;
      });
    }
    return projects;
  }, [projects, forecastMarket, allMarketData]);

  // Auto-open create dialog from compare page
  useEffect(() => {
    if (searchParams.get("create") === "true" && user) {
      setShowCreate(true);
      const a = searchParams.get("a");
      const b = searchParams.get("b");
      if (a) setProjectAId(a);
      if (b) setProjectBId(b);

      // Pre-fill from comparison results
      const prefill = sessionStorage.getItem('forecast_prefill');
      if (prefill) {
        try {
          const { title: prefillTitle, description: prefillDesc } = JSON.parse(prefill);
          if (prefillTitle) setTitle(prefillTitle);
          if (prefillDesc) setDescription(prefillDesc);
        } catch {}
        sessionStorage.removeItem('forecast_prefill');
      }

      setSearchParams({}, { replace: true });
    }
  }, [searchParams, user]);

  const forecasts = data?.forecasts || [];

  // Accumulate forecasts for infinite scroll
  const [allForecasts, setAllForecasts] = useState<Forecast[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const isPagingRef = useRef(false);

  // Reset accumulated forecasts when filters/sort change
  useEffect(() => {
    setAllForecasts([]);
    setTotalCount(0);
    setPage(1);
    isPagingRef.current = false;
  }, [sort, projectFilter, search, statusFilter, topicFilter]);

  useEffect(() => {
    if (typeof data?.total === "number") {
      setTotalCount(data.total);
    }
  }, [data?.total]);

  // Append new page data
  useEffect(() => {
    if (!forecasts.length) return;
    setAllForecasts(prev => {
      if (page === 1) return forecasts;
      // Dedupe by id
      const existingIds = new Set(prev.map(f => f.id));
      const newItems = forecasts.filter(f => !existingIds.has(f.id));
      return [...prev, ...newItems];
    });
  }, [forecasts, page]);

  useEffect(() => {
    if (!isFetching) {
      isPagingRef.current = false;
    }
  }, [isFetching]);

  const total = totalCount;
  const hasMorePages = allForecasts.length < totalCount && forecasts.length > 0;
  const isInitialLoading = isLoading && allForecasts.length === 0;
  const isFetchingMore = isFetching && allForecasts.length > 0;

  // Infinite scroll observer
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasMorePages || isFetching) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isPagingRef.current) {
          isPagingRef.current = true;
          setPage((p) => p + 1);
        }
      },
      { rootMargin: "320px 0px", threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMorePages, isFetching]);

  // Fetch forecast targets (dimensions) for displayed forecasts
  const forecastIds = useMemo(() => allForecasts.map(f => f.id), [allForecasts]);
  const { data: forecastTargetsMap = {} } = useQuery({
    queryKey: ["forecast-targets-batch", forecastIds],
    queryFn: async () => {
      if (forecastIds.length === 0) return {};
      const { data } = await supabase
        .from("forecast_targets")
        .select("forecast_id, dimension")
        .in("forecast_id", forecastIds);
      const map: Record<string, string[]> = {};
      (data || []).forEach((t: any) => {
        if (!map[t.forecast_id]) map[t.forecast_id] = [];
        map[t.forecast_id].push(t.dimension);
      });
      return map;
    },
    enabled: forecastIds.length > 0,
    staleTime: 60_000,
  });

  // Trending projects by forecast vote activity
  const { data: trendingTopics = [] } = useQuery({
    queryKey: ["trending-forecast-projects"],
    queryFn: async () => {
      // Get projects with most total votes across forecasts
      const { data: topForecasts } = await supabase
        .from("forecasts")
        .select("project_a_id, total_votes_yes, total_votes_no")
        .order("total_votes_yes", { ascending: false })
        .limit(50);

      if (!topForecasts || topForecasts.length === 0) return [];

      // Aggregate votes per project
      const projectVotes: Record<string, number> = {};
      topForecasts.forEach((f: any) => {
        const votes = (f.total_votes_yes || 0) + (f.total_votes_no || 0);
        projectVotes[f.project_a_id] = (projectVotes[f.project_a_id] || 0) + votes;
      });

      // Sort and take top 5
      const sorted = Object.entries(projectVotes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const projectIds = sorted.map(([id]) => id);
      if (projectIds.length === 0) return [];

      const { data: projectsData } = await supabase
        .from("projects")
        .select("id, name, slug, logo_url, logo_emoji")
        .in("id", projectIds);

      const projectMap: Record<string, any> = {};
      (projectsData || []).forEach((p: any) => { projectMap[p.id] = p; });

      return sorted.map(([id, votes]) => ({
        ...projectMap[id],
        totalVotes: votes,
      })).filter(p => p.name);
    },
    staleTime: 5 * 60_000,
  });

  // Unfiltered forecasts for hero carousel — fetch ALL (up to 50)
  const { data: heroDataAll } = useForecasts("newest", 1, 50, undefined, undefined, "all");
  // Separate: top live forecasts for sidebar (highest votes, active only)
  const { data: heroDataTopLive } = useForecasts("votes", 1, 5, undefined, undefined, "active");
  const heroAllForecasts = useMemo(() => heroDataAll?.forecasts || [], [heroDataAll]);
  const heroTopLiveForecasts = useMemo(() => heroDataTopLive?.forecasts || [], [heroDataTopLive]);

  // Fetch dimensions for hero forecasts
  const heroForecastIds = useMemo(() => heroAllForecasts.map(f => f.id), [heroAllForecasts]);
  const { data: heroDimensionsMap = {} } = useQuery({
    queryKey: ["hero-forecast-dimensions", heroForecastIds],
    queryFn: async () => {
      if (heroForecastIds.length === 0) return {};
      const { data } = await supabase
        .from("forecast_targets")
        .select("forecast_id, dimension")
        .in("forecast_id", heroForecastIds);
      const map: Record<string, string[]> = {};
      (data || []).forEach((t: any) => {
        if (!map[t.forecast_id]) map[t.forecast_id] = [];
        map[t.forecast_id].push(t.dimension);
      });
      return map;
    },
    enabled: heroForecastIds.length > 0,
    staleTime: 60_000,
  });

  // Stats
  const stats = useMemo(() => {
    const totalVotes = forecasts.reduce((sum, f) => sum + f.total_votes_yes + f.total_votes_no, 0);
    const activeCount = forecasts.filter(f => new Date(f.end_date) > new Date()).length;
    return { total, totalVotes, activeCount };
  }, [forecasts, total]);

  const handleVote = (forecastId: string, vote: "yes" | "no") => {
    voteForecast.mutate({ forecastId, vote });
  };

  const hasTwoProjectsForCreate = projectBId && projectBId !== "none";
  const handleCreate = async () => {
    if (!title.trim()) { toast.error("Title required"); return; }
    if (!description.trim()) { toast.error("Description required"); return; }
    if (!projectAId) { toast.error("Select a project"); return; }
    if (!forecastMarket) { toast.error("Prediction market required"); return; }
    if (!endDate) { toast.error("End date required"); return; }
    if (new Date(endDate) <= new Date()) { toast.error("End date must be in the future"); return; }

    // Validate prediction direction and target for price-based markets
    const isPriceMarket = forecastMarket === "token_price" || forecastMarket === "market_cap";
    if (isPriceMarket && !predictionDirection) { toast.error("Select Long or Short"); return; }
    if (isPriceMarket && !predictionTarget) { toast.error(hasTwoProjectsForCreate ? "Enter a target percentage" : "Enter a target price"); return; }

    const currentPrice = isPriceMarket && projectAId ? (forecastMarket === "token_price" ? allMarketData[projectAId]?.price_usd : allMarketData[projectAId]?.market_cap_usd) : undefined;

    try {
      await createForecast.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        projectAId,
        projectBId: projectBId && projectBId !== "none" ? projectBId : undefined,
        endDate: new Date(endDate).toISOString(),
        analysisDimensions: [forecastMarket],
        predictionTarget: isPriceMarket ? parseFloat(predictionTarget) : undefined,
        predictionDirection: isPriceMarket ? predictionDirection : undefined,
        startPrice: currentPrice ?? undefined,
      });
      toast.success("Prediction created!");
      setShowCreate(false);
      setTitle("");
      setDescription("");
      setProjectAId("");
      setProjectBId("");
      setEndDate("");
      setTimePreset("");
      setForecastMarket("");
      setPredictionDirection("");
      setPredictionTarget("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create forecast");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Polymarket-style Hero with Auto-Slide — uses unfiltered data */}
      <HeroSection
        forecasts={heroAllForecasts}
        user={user}
        setShowCreate={setShowCreate}
        heroDimensionsMap={heroDimensionsMap as Record<string, string[]>}
        search={search}
        setSearch={setSearch}
        setPage={setPage}
        navigate={navigate}
        dailyRemaining={dailyRemaining}
      />

      {/* Hourly predictions are now integrated into the main grid below */}

      {/* Controls — Polymarket-style single row */}
      <section className="sticky top-16 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-2.5">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {/* All Markets label */}
            <span className="text-xs font-bold text-foreground uppercase tracking-wide shrink-0">All Markets</span>

            {/* Divider */}
            <div className="h-5 w-px bg-border shrink-0" />

            {/* Topic chips */}
            {[
              { value: "", label: "All" },
              
              { value: "token_price", label: "Token Price", comingSoon: false },
              { value: "market_cap", label: "Market Cap", comingSoon: false },
              
              { value: "revenue", label: "Revenue", comingSoon: true },
              { value: "node", label: "Nodes", comingSoon: true },
              { value: "infrastructure", label: "Infrastructure", comingSoon: true },
            ].map((topic) => (
              <button
                key={topic.value}
                onClick={() => {
                  if (topic.comingSoon) {
                    toast.info(`${topic.label} market is coming soon`);
                    return;
                  }
                  setTopicFilter(topic.value);
                  setPage(1);
                }}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
                  topicFilter === topic.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : topic.comingSoon
                      ? "text-muted-foreground/50 hover:bg-secondary/50 cursor-default"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {topic.label}
                {topic.comingSoon && (
                  <span className="ml-1 text-[9px] bg-secondary px-1 py-0.5 rounded-full">Soon</span>
                )}
              </button>
            ))}

            {/* Spacer pushes filter to right */}
            <div className="flex-1 min-w-0" />

            {/* Filter toggle button — right-aligned */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                showFilters || statusFilter !== "all" || sort !== "votes" || projectFilter
                  ? "bg-secondary text-foreground border border-border"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Filters</span>
              {(statusFilter !== "all" || sort !== "votes" || projectFilter) && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  {[statusFilter !== "all", sort !== "votes", !!projectFilter].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          {/* Expandable filter panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 pt-2.5 pb-1 flex-wrap">
                  <Select value={sort} onValueChange={(v) => { setSort(v as ForecastSortOption); setPage(1); }}>
                    <SelectTrigger className="h-8 w-[130px] text-xs bg-secondary/50 border-border rounded-full">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent position="popper" side="bottom" sideOffset={4}>
                      {sortOptions.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as ForecastStatusFilter); setPage(1); }}>
                    <SelectTrigger className="h-8 w-[110px] text-xs bg-secondary/50 border-border rounded-full">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent position="popper" side="bottom" sideOffset={4}>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="ended">Ended</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={projectFilter || "all"} onValueChange={(v) => { setProjectFilter(v === "all" ? "" : v); setPage(1); }}>
                    <SelectTrigger className="h-8 w-[140px] text-xs bg-secondary/50 border-border rounded-full">
                      <SelectValue placeholder="All Projects" />
                    </SelectTrigger>
                    <SelectContent position="popper" side="bottom" sideOffset={4}>
                      <SelectItem value="all">All Projects</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="flex items-center gap-2">
                            {p.logo_url ? (
                              <img src={p.logo_url} alt={p.name} className="w-4 h-4 rounded-[7px] overflow-hidden object-contain" />
                            ) : (
                              <span className="w-4 h-4 flex items-center justify-center text-xs">{p.logo_emoji}</span>
                            )}
                            {p.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {projectFilter && (
                    <button
                      onClick={() => { setProjectFilter(""); setPage(1); }}
                      className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/15 transition-colors whitespace-nowrap"
                    >
                      {projects.find(p => p.id === projectFilter)?.name}
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  {(statusFilter !== "all" || sort !== "votes" || projectFilter) && (
                    <button
                      onClick={() => { setStatusFilter("all"); setSort("votes"); setProjectFilter(""); setPage(1); }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Forecast Grid + Create Panel */}
      <div className="container mx-auto px-4 py-8 flex-1 flex gap-6">
        {/* Main content */}
        <section className={`flex-1 min-w-0 transition-all duration-300`}>
          {isInitialLoading ? (
             <div className={`grid gap-3 sm:grid-cols-2 ${showCreate ? 'lg:grid-cols-2' : 'lg:grid-cols-3 xl:grid-cols-4'}`}>
                {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl border border-border bg-card overflow-hidden">
                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-[7px] bg-secondary" />
                      <div className="h-3 w-24 bg-secondary rounded" />
                    </div>
                    <div className="h-4 w-3/4 bg-secondary rounded" />
                    <div className="h-3 w-full bg-secondary rounded" />
                    <div className="h-2 w-full bg-secondary rounded-full mt-4" />
                  </div>
                  <div className="h-10 border-t border-border bg-secondary/30" />
                </div>
              ))}
            </div>
          ) : allForecasts.length === 0 && !isLoading ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">No predictions yet</h3>
              <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
                Be the first to create a prediction and let the community vote on it.
              </p>
              <Button onClick={() => {
                if (user) { setShowCreate(true); }
                else { toast("Please log in to create a prediction", { action: { label: "Log in", onClick: () => navigate("/auth?redirect=/forecasts") } }); }
              }} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Create First Prediction
              </Button>
            </motion.div>
          ) : (
            <>
              <div className={`grid gap-3 sm:grid-cols-2 ${showCreate ? 'lg:grid-cols-2' : 'lg:grid-cols-3 xl:grid-cols-4'}`}>
                <AnimatePresence mode="popLayout">
                  {(() => {
                    const now = new Date();
                    // Show hourly round cards first (unless filtering by non-hourly topic)
                    const showHourly = topicFilter === "" || topicFilter === "hourly";
                    const hideRegular = topicFilter === "hourly";
                    const hourlyCards = showHourly ? hourlyRounds.map((round, i) => (
                      <HourlyRoundCard key={`hourly-${round.id}`} round={round} index={i} />
                    )) : [];
                    const sorted = hideRegular ? [] : [...allForecasts].sort((a, b) => {
                      const aActive = new Date(a.end_date) > now ? 0 : 1;
                      const bActive = new Date(b.end_date) > now ? 0 : 1;
                      return aActive - bActive;
                    });
                    const regularCards = sorted.map((forecast, i) => (
                      <ForecastCard
                        key={forecast.id}
                        forecast={forecast}
                        onVote={handleVote}
                        isAuthenticated={!!user}
                        index={hourlyCards.length + i}
                        dimensions={forecastTargetsMap[forecast.id] || []}
                      />
                    ));
                    return [...hourlyCards, ...regularCards];
                  })()}
                </AnimatePresence>
              </div>

              {/* Infinite scroll sentinel */}
              {hasMorePages && (
                <div ref={loadMoreRef} className="py-4">
                  {isFetchingMore ? (
                    <div className={`grid gap-3 sm:grid-cols-2 ${showCreate ? 'lg:grid-cols-2' : 'lg:grid-cols-3 xl:grid-cols-4'}`}>
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={`skel-${i}`} className="animate-pulse rounded-xl border border-border bg-card overflow-hidden">
                          <div className="p-4 space-y-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-secondary" />
                              <div className="h-3 w-20 bg-secondary rounded" />
                            </div>
                            <div className="h-4 w-3/4 bg-secondary rounded" />
                            <div className="h-3 w-full bg-secondary rounded" />
                            <div className="flex items-end justify-between mt-4">
                              <div className="h-5 w-16 bg-secondary rounded" />
                              <div className="h-3 w-12 bg-secondary rounded" />
                            </div>
                          </div>
                          <div className="px-4 pb-4 flex gap-2">
                            <div className="flex-1 h-8 bg-secondary rounded-lg" />
                            <div className="flex-1 h-8 bg-secondary rounded-lg" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-px w-full" />
                  )}
                </div>
              )}
            </>
          )}
        </section>

        {/* Inline Create Prediction Panel — desktop */}
        <AnimatePresence>
          {showCreate && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 420, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="hidden lg:block shrink-0"
              style={{ overflow: "clip" }}
            >
              <div className="w-[420px] sticky top-[7rem] z-40">
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  {/* Panel header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-foreground font-['Space_Grotesk']">Create Prediction</h2>
                      {user && (
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${dailyRemaining === 0 ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-muted-foreground'}`}>
                          {dailyRemaining}/5 today
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {(title || description) && (
                        <Button variant="ghost" size="sm" onClick={() => { setTitle(""); setDescription(""); }} className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                          <RotateCcw className="h-3 w-3" /> Reset
                        </Button>
                      )}
                      <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Panel body */}
                  <div className="p-5 space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Title *</label>
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Will Hivemapper surpass Helium nodes by 2026?" className="mt-1.5" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description *</label>
                      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Additional context about this prediction..." className="mt-1.5 min-h-[80px] resize-y" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Prediction Market *</label>
                      <p className="text-[10px] text-muted-foreground mt-0.5 mb-2">Select the market to track</p>
                      <Select value={forecastMarket} onValueChange={(v) => { setForecastMarket(v); setPredictionDirection(""); setPredictionTarget(""); if (v === "token_price" || v === "market_cap") { setProjectAId(""); setProjectBId(""); } }}>
                        <SelectTrigger className="mt-1.5 h-9"><SelectValue placeholder="Select prediction market" /></SelectTrigger>
                        <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false} className="max-h-60">
                          {dimensionOptions.map((dim) => (
                            <SelectItem key={dim.value} value={dim.value} disabled={dim.disabled}>
                              <span className="flex items-center gap-2">{dim.label}{dim.disabled && <span className="ml-1 text-[10px] rounded-full bg-secondary px-1.5 py-0.5 text-muted-foreground">Coming soon</span>}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {(forecastMarket === "token_price" || forecastMarket === "market_cap") && (
                      <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Position Direction *</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => setPredictionDirection("long")} className={`rounded-lg py-2.5 text-sm font-bold transition-all border ${predictionDirection === "long" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
                            <TrendingUp className="h-3.5 w-3.5 inline mr-1.5" />Long
                          </button>
                          <button type="button" onClick={() => setPredictionDirection("short")} className={`rounded-lg py-2.5 text-sm font-bold transition-all border ${predictionDirection === "short" ? "border-destructive bg-destructive/10 text-destructive" : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
                            <ArrowDownRight className="h-3.5 w-3.5 inline mr-1.5" />Short
                          </button>
                        </div>
                        {predictionDirection && projectAId && (() => {
                          const mdA = allMarketData[projectAId];
                          const currentPriceA = forecastMarket === "token_price" ? mdA?.price_usd : mdA?.market_cap_usd;
                          const hasTwoProjects = projectBId && projectBId !== "none";
                          const mdB = hasTwoProjects ? allMarketData[projectBId] : null;
                          const currentPriceB = mdB ? (forecastMarket === "token_price" ? mdB.price_usd : mdB.market_cap_usd) : null;
                          const projectAName = filteredProjects.find(p => p.id === projectAId)?.name || "Project A";
                          const projectBName = hasTwoProjects ? (filteredProjects.find(p => p.id === projectBId)?.name || "Project B") : null;
                          const formatVal = (v: number | null | undefined) => {
                            if (v == null) return "—";
                            if (forecastMarket === "market_cap") { if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`; if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`; return `$${v.toLocaleString()}`; }
                            return v < 0.01 ? `$${v.toFixed(6)}` : v < 1 ? `$${v.toFixed(4)}` : `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                          };
                          if (hasTwoProjects) {
                            const targetPct = parseFloat(predictionTarget);
                            const impliedPriceA = currentPriceA != null && !isNaN(targetPct) ? currentPriceA * (1 + targetPct / 100) : null;
                            return (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="rounded-lg bg-card border border-border px-3 py-2"><span className="text-muted-foreground block text-[10px] mb-0.5">{projectAName}</span><span className="font-semibold text-foreground">{formatVal(currentPriceA)}</span></div>
                                  <div className="rounded-lg bg-card border border-border px-3 py-2"><span className="text-muted-foreground block text-[10px] mb-0.5">{projectBName}</span><span className="font-semibold text-foreground">{formatVal(currentPriceB)}</span></div>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Target Outperformance % *</label>
                                  <div className="relative mt-1.5"><Input type="number" step="any" value={predictionTarget} onChange={(e) => setPredictionTarget(e.target.value)} placeholder="e.g. 25" className="pr-7 h-9" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span></div>
                                </div>
                                {impliedPriceA != null && !isNaN(targetPct) && targetPct !== 0 && (
                                  <div className="rounded-lg bg-card border border-border px-3 py-2.5 space-y-1">
                                    <p className="text-[10px] text-muted-foreground">If {projectBName} stays the same, {projectAName} needs to reach:</p>
                                    <p className={`text-sm font-bold font-['Space_Grotesk'] ${predictionDirection === "long" ? "text-primary" : "text-destructive"}`}>{formatVal(impliedPriceA)}</p>
                                  </div>
                                )}
                              </div>
                            );
                          }
                          const targetNum = parseFloat(predictionTarget);
                          const pctChange = currentPriceA && targetNum ? (((targetNum - currentPriceA) / currentPriceA) * 100) : null;
                          return (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Current {forecastMarket === "token_price" ? "Price" : "Market Cap"}</span><span className="font-semibold text-foreground">{formatVal(currentPriceA)}</span></div>
                              <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Target {forecastMarket === "token_price" ? "Price" : "Market Cap"} *</label>
                                <div className="relative mt-1.5"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span><Input type="number" step="any" value={predictionTarget} onChange={(e) => setPredictionTarget(e.target.value)} placeholder="0.00" className="pl-7 h-9" /></div>
                              </div>
                              {pctChange != null && !isNaN(pctChange) && (
                                <div className={`flex items-center gap-1.5 text-xs font-semibold ${pctChange >= 0 ? "text-primary" : "text-destructive"}`}>
                                  {pctChange >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                                  {pctChange >= 0 ? "+" : ""}{pctChange.toFixed(2)}% from current
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Project A *</label>
                        <Select value={projectAId} onValueChange={setProjectAId}>
                          <SelectTrigger className="mt-1.5 h-9"><SelectValue placeholder="Select project" /></SelectTrigger>
                          <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false} className="max-h-60">
                            {filteredProjects.map((p) => (<SelectItem key={p.id} value={p.id}><span className="flex items-center gap-2">{p.logo_url ? <img src={p.logo_url} alt={p.name} className="w-5 h-5 rounded-[7px] overflow-hidden object-contain" /> : <span className="w-5 h-5 flex items-center justify-center text-sm">{p.logo_emoji}</span>}{p.name}</span></SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Project B <span className="normal-case text-muted-foreground/60">(optional)</span></label>
                        <Select value={projectBId} onValueChange={setProjectBId}>
                          <SelectTrigger className="mt-1.5 h-9"><SelectValue placeholder="Select project" /></SelectTrigger>
                          <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false} className="max-h-60">
                            <SelectItem value="none">None</SelectItem>
                            {filteredProjects.filter((p) => p.id !== projectAId).map((p) => (<SelectItem key={p.id} value={p.id}><span className="flex items-center gap-2">{p.logo_url ? <img src={p.logo_url} alt={p.name} className="w-5 h-5 rounded-[7px] overflow-hidden object-contain" /> : <span className="w-5 h-5 flex items-center justify-center text-sm">{p.logo_emoji}</span>}{p.name}</span></SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Time Window *</label>
                      <div className="grid grid-cols-5 gap-1.5 mt-1.5">
                        {timePresets.map((preset) => (
                          <button key={preset.value} type="button" onClick={() => handleTimePreset(preset.value)} className={`rounded-lg px-2 py-2 text-[11px] font-semibold transition-all border ${timePreset === preset.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
                            {preset.label}
                          </button>
                        ))}
                      </div>
                      {timePreset === "custom" && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-muted-foreground mb-1 block">Date</label>
                            <Input
                              type="date"
                              value={endDate ? endDate.split("T")[0] : ""}
                              onChange={(e) => {
                                const time = endDate ? endDate.split("T")[1] || "12:00" : "12:00";
                                setEndDate(`${e.target.value}T${time}`);
                              }}
                              min={new Date().toISOString().slice(0, 10)}
                              className="h-9"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground mb-1 block">Time</label>
                            <Input
                              type="time"
                              value={endDate ? endDate.split("T")[1] || "12:00" : "12:00"}
                              onChange={(e) => {
                                const date = endDate ? endDate.split("T")[0] : new Date().toISOString().slice(0, 10);
                                setEndDate(`${date}T${e.target.value}`);
                              }}
                              className="h-9"
                            />
                          </div>
                        </div>
                      )}
                      {timePreset && timePreset !== "custom" && endDate && <p className="text-[10px] text-muted-foreground mt-1.5">Ends: {new Date(endDate).toLocaleString()}</p>}
                    </div>
                  </div>

                  {/* Panel footer */}
                  <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border">
                    <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-xs">Cancel</Button>
                    <Button onClick={handleCreate} disabled={createForecast.isPending} className="gap-1.5">
                      {createForecast.isPending ? "Creating..." : "Create Prediction"}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Mobile fallback: Dialog on smaller screens */}
        {showCreate && !isLgScreen && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-['Space_Grotesk']">Create Prediction</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Title *</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Prediction title..." className="mt-1.5" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description *</label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Context..." className="mt-1.5 min-h-[80px] resize-y" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Prediction Market *</label>
                  <Select value={forecastMarket} onValueChange={(v) => { setForecastMarket(v); setPredictionDirection(""); setPredictionTarget(""); if (v === "token_price" || v === "market_cap") { setProjectAId(""); setProjectBId(""); } }}>
                    <SelectTrigger className="mt-1.5 h-9"><SelectValue placeholder="Select market" /></SelectTrigger>
                    <SelectContent>{dimensionOptions.map((dim) => (<SelectItem key={dim.value} value={dim.value} disabled={dim.disabled}>{dim.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Project A *</label>
                    <Select value={projectAId} onValueChange={setProjectAId}>
                      <SelectTrigger className="mt-1.5 h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{filteredProjects.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Project B</label>
                    <Select value={projectBId} onValueChange={setProjectBId}>
                      <SelectTrigger className="mt-1.5 h-9"><SelectValue placeholder="Optional" /></SelectTrigger>
                      <SelectContent><SelectItem value="none">None</SelectItem>{filteredProjects.filter((p) => p.id !== projectAId).map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Time Window *</label>
                  <div className="grid grid-cols-5 gap-1.5 mt-1.5">
                    {timePresets.map((preset) => (
                      <button key={preset.value} type="button" onClick={() => handleTimePreset(preset.value)}
                        className={`rounded-lg px-2 py-2 text-[11px] font-semibold border ${timePreset === preset.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/50 text-muted-foreground"}`}>
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  {timePreset === "custom" && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-1 block">Date</label>
                        <Input
                          type="date"
                          value={endDate ? endDate.split("T")[0] : ""}
                          onChange={(e) => {
                            const time = endDate ? endDate.split("T")[1] || "12:00" : "12:00";
                            setEndDate(`${e.target.value}T${time}`);
                          }}
                          min={new Date().toISOString().slice(0, 10)}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-1 block">Time</label>
                        <Input
                          type="time"
                          value={endDate ? endDate.split("T")[1] || "12:00" : "12:00"}
                          onChange={(e) => {
                            const date = endDate ? endDate.split("T")[0] : new Date().toISOString().slice(0, 10);
                            setEndDate(`${date}T${e.target.value}`);
                          }}
                          className="h-9"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createForecast.isPending}>{createForecast.isPending ? "Creating..." : "Create"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Forecasts;
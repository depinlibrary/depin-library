import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, ThumbsUp, ThumbsDown, Plus, TrendingUp, Clock, Flame, ChevronLeft, ChevronRight, LogIn, Users, BarChart3, Zap, X, Filter, Trophy, CheckCircle, CheckCircle2, Circle, RotateCcw, DollarSign, Server, Activity, ArrowUpRight, ArrowDownRight, Bookmark, Copy, ChevronRight as ChevronRightIcon, Radio, Search, XCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useForecasts, useCreateForecast, useVoteForecast, type ForecastSortOption, type ForecastStatusFilter, type Forecast } from "@/hooks/useForecasts";
import { useProjects } from "@/hooks/useProjects";
import { useAllTokenMarketData } from "@/hooks/useTokenMarketData";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const dimensionIconMap: Record<string, typeof DollarSign> = {
  token_price: DollarSign,
  market_cap: BarChart3,
  community_sentiment: Users,
  active_nodes: Server,
  revenue: Activity,
};

const dimensionLabelMap: Record<string, string> = {
  token_price: "Price",
  market_cap: "MCap",
  community_sentiment: "Sentiment",
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
  const yesPct = totalVotes > 0 ? (forecast.total_votes_yes / totalVotes) * 100 : 50;
  const noPct = 100 - yesPct;
  const isEnded = new Date(forecast.end_date) <= new Date();
  const timeLeft = getTimeRemaining(forecast.end_date);
  const finalResult = isEnded ? (forecast.outcome || (yesPct >= 50 ? "yes" : "no")) : null;
  const isPriceMarket = dimensions.some(d => d === "token_price" || d === "market_cap");
  const isSentimentWithTwoProjects = dimensions.some(d => d === "community_sentiment") && !!forecast.project_b_name;
  const yesLabel = isPriceMarket ? "Long" : isSentimentWithTwoProjects ? (forecast.project_a_name || "Yes") : "Yes";
  const noLabel = isPriceMarket ? "Short" : isSentimentWithTwoProjects ? (forecast.project_b_name || "No") : "No";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className="group relative rounded-xl border border-border bg-card overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 h-full flex flex-col"
    >
      <div className="p-5 flex-1 flex flex-col">
        {/* Header row: logos + time */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center -space-x-2">
              {forecast.project_a_logo_url ? (
                <img src={forecast.project_a_logo_url} alt={forecast.project_a_name} className="w-9 h-9 rounded-lg object-contain border border-card bg-secondary relative z-10" />
              ) : (
                <span className="w-9 h-9 rounded-lg flex items-center justify-center text-sm border border-card bg-secondary relative z-10">{forecast.project_a_logo_emoji || "⬡"}</span>
              )}
              {forecast.project_b_name && (
                forecast.project_b_logo_url ? (
                  <img src={forecast.project_b_logo_url} alt={forecast.project_b_name} className="w-9 h-9 rounded-lg object-contain border border-card bg-secondary relative z-0" />
                ) : (
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center text-sm border border-card bg-secondary relative z-0">{forecast.project_b_logo_emoji || "⬡"}</span>
                )
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Link to={`/project/${forecast.project_a_slug}`} className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">{forecast.project_a_name}</Link>
              {forecast.project_b_name && (
                <>
                  <span className="text-muted-foreground/40 text-[10px]">vs</span>
                  <Link to={`/project/${forecast.project_b_slug}`} className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">{forecast.project_b_name}</Link>
                </>
              )}
            </div>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${isEnded ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600 dark:text-green-400'}`}>
            {timeLeft}
          </span>
        </div>

        {/* Title only */}
        <Link to={`/forecasts/${forecast.id}`} className="block mb-auto">
          <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:underline transition-all duration-200">
            {forecast.title}
          </h3>
        </Link>

        {/* Percentage + bar */}
        <div className="mt-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-foreground">{yesPct.toFixed(0)}% chance</span>
            <span className="text-xs text-muted-foreground">{totalVotes.toLocaleString()} vote{totalVotes !== 1 ? "s" : ""}</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${yesPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full bg-primary"
            />
          </div>
        </div>
      </div>

      {/* Bottom section — consistent spacing for all card states */}
      <div className="px-5 pb-5">
        {isEnded && forecast.user_vote ? (() => {
          const outcomeResult = finalResult;
          const userCorrect = outcomeResult === forecast.user_vote;
          const userVoteLabel = forecast.user_vote === "yes" ? yesLabel : noLabel;
          const resultLabel = outcomeResult === "yes" ? yesLabel : noLabel;
          return (
            <div className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-[11px] font-semibold ${
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

        {/* Vote buttons — always shown, disabled when ended */}
        <div className="flex gap-2.5 mt-2">
          <button
            onClick={() => !isEnded ? (isAuthenticated ? onVote(forecast.id, "yes") : toast.error("Sign in to vote")) : undefined}
            disabled={isEnded}
            className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all duration-200 ${
              isEnded
                ? "bg-secondary text-muted-foreground cursor-not-allowed opacity-60"
                : forecast.user_vote === "yes"
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
            }`}
          >
            {isPriceMarket && <TrendingUp className="h-3.5 w-3.5 inline mr-1" />}
            {yesLabel}
          </button>
          <button
            onClick={() => !isEnded ? (isAuthenticated ? onVote(forecast.id, "no") : toast.error("Sign in to vote")) : undefined}
            disabled={isEnded}
            className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all duration-200 ${
              isEnded
                ? "bg-secondary text-muted-foreground cursor-not-allowed opacity-60"
                : forecast.user_vote === "no"
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-destructive/10 text-destructive hover:bg-destructive/20"
            }`}
          >
            {isPriceMarket && <ArrowDownRight className="h-3.5 w-3.5 inline mr-1" />}
            {noLabel}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
// ---- Hero Section with Auto-Sliding Carousel + Sentiment Chart ----
const HeroSection = ({ forecasts, topLiveForecasts, trendingTopics, user, setShowCreate, heroDimensionsMap }: {
  forecasts: Forecast[];
  topLiveForecasts: Forecast[];
  trendingTopics: any[];
  user: any;
  setShowCreate: (v: boolean) => void;
  heroDimensionsMap: Record<string, string[]>;
}) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Left carousel: only show top 6 forecasts
  const heroForecasts = useMemo(() => {
    if (forecasts.length === 0) return [];
    return forecasts.slice(0, 6);
  }, [forecasts]);

  const [isPaused, setIsPaused] = useState(false);

  // Auto-slide every 10 seconds, pause on hover
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

  // Build per-slide chart data showing vote breakdown for the current forecast
  const currentChartData = useMemo(() => {
    const f = heroForecasts[activeSlide];
    if (!f) return [];
    const t = f.total_votes_yes + f.total_votes_no;
    if (t === 0) return [
      { name: "Yes", value: 50, fill: "hsl(var(--primary))" },
      { name: "No", value: 50, fill: "hsl(var(--destructive))" },
    ];
    return [
      { name: "Yes", value: f.total_votes_yes, fill: "hsl(var(--primary))" },
      { name: "No", value: f.total_votes_no, fill: "hsl(var(--destructive))" },
    ];
  }, [heroForecasts, activeSlide]);

  if (heroForecasts.length === 0) {
    return (
      <section className="relative overflow-hidden pt-24 pb-8">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="gradient-radial-top absolute inset-0" />
        <div className="container relative mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-card p-8 flex flex-col items-center justify-center text-center"
          >
            <BarChart3 className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <h2 className="text-lg font-bold text-foreground font-['Space_Grotesk'] mb-1">No forecasts yet</h2>
            <p className="text-sm text-muted-foreground mb-4">Create the first prediction for the community.</p>
            <Button onClick={() => {
                if (user) {
                  setShowCreate(true);
                } else {
                  window.location.href = "/auth?redirect=/forecasts";
                }
              }} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Create Forecast
              </Button>
          </motion.div>
        </div>
      </section>
    );
  }

  const current = heroForecasts[activeSlide];
  const cTotal = current.total_votes_yes + current.total_votes_no;
  const cYesPct = cTotal > 0 ? (current.total_votes_yes / cTotal) * 100 : 50;
  const cIsEnded = new Date(current.end_date) <= new Date();
  const cTimeLeft = getTimeRemaining(current.end_date);

  // Dynamic labels based on dimension
  const cDims = heroDimensionsMap[current.id] || [];
  const cIsPriceMarket = cDims.some(d => d === "token_price" || d === "market_cap");
  const cIsSentimentDual = cDims.some(d => d === "community_sentiment") && !!current.project_b_name;
  const cYesLabel = cIsPriceMarket ? "Long" : cIsSentimentDual ? (current.project_a_name || "Yes") : "Yes";
  const cNoLabel = cIsPriceMarket ? "Short" : cIsSentimentDual ? (current.project_b_name || "No") : "No";

  return (
    <section className="relative overflow-hidden pt-24 pb-8">
      <div className="absolute inset-0 bg-grid opacity-10" />
      <div className="gradient-radial-top absolute inset-0" />
      <div className="container relative mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* LEFT: Auto-sliding featured card with chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div className="rounded-2xl border border-border bg-card overflow-hidden h-[520px] p-6 sm:p-8">
              {/* Slide content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.35 }}
                >
                  {/* Header with live/ended indicator */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center -space-x-2">
                        {current.project_a_logo_url ? (
                          <img src={current.project_a_logo_url} alt={current.project_a_name} className="w-10 h-10 rounded-xl object-contain border-2 border-card bg-secondary relative z-10" />
                        ) : (
                          <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border-2 border-card bg-secondary relative z-10">{current.project_a_logo_emoji || "⬡"}</span>
                        )}
                        {current.project_b_name && (
                          current.project_b_logo_url ? (
                            <img src={current.project_b_logo_url} alt={current.project_b_name} className="w-10 h-10 rounded-xl object-contain border-2 border-card bg-secondary" />
                          ) : (
                            <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border-2 border-card bg-secondary">{current.project_b_logo_emoji || "⬡"}</span>
                          )
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {current.project_a_name}{current.project_b_name ? ` · ${current.project_b_name}` : ''}
                        </span>
                        {/* Blinking live/ended indicator */}
                        <span className="flex items-center gap-1.5">
                          <span className={`relative flex h-2 w-2`}>
                            {!cIsEnded && (
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-green-500" />
                            )}
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${cIsEnded ? 'bg-destructive animate-pulse' : 'bg-green-500'}`} />
                          </span>
                          <span className={`text-[10px] font-semibold ${cIsEnded ? 'text-destructive' : 'text-green-500'}`}>
                            {cIsEnded ? 'Ended' : `Live · ${cTimeLeft}`}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          const url = `${window.location.origin}/forecasts/${current.id}`;
                          navigator.clipboard.writeText(url);
                          toast.success("Link copied!");
                        }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        title="Copy link"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                        <Bookmark className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <Link to={`/forecasts/${current.id}`}>
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight mb-5 font-['Space_Grotesk'] tracking-tight hover:underline transition-all">
                      {current.title}
                    </h2>
                  </Link>

                  {/* Vote outcomes */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/10 px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {cIsPriceMarket ? <TrendingUp className="h-4 w-4 text-primary" /> : <ArrowUpRight className="h-4 w-4 text-primary" />}
                        <span className="text-sm font-semibold text-foreground">{cYesLabel}</span>
                      </div>
                      <span className="text-xl font-bold text-foreground font-['Space_Grotesk']">{cYesPct.toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-destructive/5 border border-destructive/10 px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <ArrowDownRight className="h-4 w-4 text-destructive" />
                        <span className="text-sm font-semibold text-foreground">{cNoLabel}</span>
                      </div>
                      <span className="text-xl font-bold text-foreground font-['Space_Grotesk']">{(100 - cYesPct).toFixed(0)}%</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span>{cTotal.toLocaleString()} votes</span>
                    </div>
                    <Link to={`/forecasts/${current.id}`} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                      View details <ChevronRightIcon className="h-3 w-3" />
                    </Link>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Per-slide Trading-style Chart */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`chart-${current.id}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-5 pt-5 border-t border-border"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vote Trend · {current.project_a_name}</h3>
                    <span className="text-[10px] font-semibold text-primary font-['Space_Grotesk']">{cYesPct.toFixed(1)}%</span>
                  </div>
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={(() => {
                        // Generate trading-style data points
                        const total = current.total_votes_yes + current.total_votes_no;
                        if (total === 0) return [{ t: "Start", pct: 50 }, { t: "Now", pct: 50 }];
                        const base = cYesPct;
                        const points = [];
                        for (let i = 0; i < 12; i++) {
                          const variance = (Math.sin(i * 1.3 + total) * 8) + (Math.cos(i * 0.7 + current.total_votes_yes) * 5);
                          const pct = Math.max(5, Math.min(95, base + variance - (variance * (i / 12))));
                          points.push({ t: i === 0 ? "Start" : i === 11 ? "Now" : ``, pct: Math.round(pct * 10) / 10 });
                        }
                        points[points.length - 1].pct = Math.round(base * 10) / 10;
                        return points;
                      })()} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="heroTradingGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                        <XAxis dataKey="t" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "10px",
                            fontSize: "11px",
                            padding: "6px 10px",
                          }}
                          formatter={(value: number) => [`${value}%`, "Yes %"]}
                          labelStyle={{ fontWeight: 600, marginBottom: 2, color: "hsl(var(--foreground))" }}
                        />
                        <Area type="monotone" dataKey="pct" name="Yes %" stroke="hsl(var(--primary))" fill="url(#heroTradingGrad)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "hsl(var(--primary))", stroke: "hsl(var(--card))", strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              </AnimatePresence>

            </div>

            {/* Slide dots - left aligned, tight spacing */}
            {heroForecasts.length > 1 && (
              <div className="flex items-center justify-start gap-0.5 mt-3">
                {heroForecasts.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToSlide(i)}
                    className="p-0.5"
                    aria-label={`Go to slide ${i + 1}`}
                  >
                    <span className={`block rounded-full transition-all duration-300 ${
                      i === activeSlide
                        ? 'w-5 h-1.5 bg-primary'
                        : 'w-1.5 h-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    }`} />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Right sidebar — matches left column height */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col gap-4 h-[520px]"
          >
            {/* Top Forecasts */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden flex-1 flex flex-col min-h-0">
              <div className="px-5 py-3.5 flex items-center justify-between shrink-0">
                <h3 className="text-base font-bold text-foreground font-['Space_Grotesk']">Top Forecasts</h3>
                <span></span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {topLiveForecasts.slice(0, 4).map((f, i) => {
                  const fTotal = f.total_votes_yes + f.total_votes_no;
                  const fYesPct = fTotal > 0 ? (f.total_votes_yes / fTotal) * 100 : 50;
                  const fIsEnded = new Date(f.end_date) <= new Date();
                  return (
                    <Link key={f.id} to={`/forecasts/${f.id}`} className="flex items-start gap-3 px-5 py-3 hover:bg-secondary/30 transition-colors">
                      <span className="text-xs font-bold text-muted-foreground/50 mt-0.5 w-4 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">{f.title}</p>
                        <span className="flex items-center gap-1 mt-1">
                          <span className="relative flex h-1.5 w-1.5">
                            {!fIsEnded && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-green-500" />}
                            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${fIsEnded ? 'bg-destructive' : 'bg-green-500'}`} />
                          </span>
                          <span className={`text-[9px] font-medium ${fIsEnded ? 'text-destructive/70' : 'text-green-500/70'}`}>{fIsEnded ? 'Ended' : 'Live'}</span>
                        </span>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-sm font-bold text-foreground font-['Space_Grotesk']">{fYesPct.toFixed(0)}%</span>
                        <span className={`text-[10px] font-medium flex items-center gap-0.5 ${
                          fIsEnded ? 'text-muted-foreground' : fYesPct >= 50 ? 'text-primary' : 'text-destructive'
                        }`}>
                          {fIsEnded ? '' : fYesPct >= 50 ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                          {fIsEnded ? 'Ended' : `${fTotal} votes`}
                        </span>
                      </div>
                    </Link>
                  );
                })}
                {topLiveForecasts.length === 0 && (
                  <div className="px-5 py-6 text-center text-xs text-muted-foreground">No live forecasts</div>
                )}
              </div>
            </div>

            {/* Trending Projects */}
            {trendingTopics.length > 0 && (
              <div className="rounded-2xl border border-border bg-card overflow-hidden shrink-0 flex flex-col" style={{ maxHeight: '220px' }}>
                <div className="px-5 py-3.5 flex items-center justify-between shrink-0">
                  <h3 className="text-base font-bold text-foreground font-['Space_Grotesk']">Trending Projects</h3>
                  <TrendingUp className="h-4 w-4 text-primary/60" />
                </div>
                <div className="overflow-y-auto flex-1">
                  {trendingTopics.slice(0, 4).map((project: any, i: number) => (
                    <Link key={project.id} to={`/project/${project.slug}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-secondary/30 transition-colors">
                      <span className="text-xs font-bold text-muted-foreground/50 w-4 shrink-0">{i + 1}</span>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {project.logo_url ? (
                          <img src={project.logo_url} alt={project.name} className="w-7 h-7 rounded-md object-contain bg-secondary" />
                        ) : (
                          <span className="w-7 h-7 rounded-md flex items-center justify-center text-sm bg-secondary">{project.logo_emoji || "⬡"}</span>
                        )}
                        <span className="text-xs font-semibold text-foreground truncate">{project.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] font-medium text-muted-foreground">{project.totalVotes} votes</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
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
  const { data, isLoading } = useForecasts(sort, page, PAGE_SIZE, projectFilter || undefined, search || undefined, statusFilter, topicFilter || undefined);
  const createForecast = useCreateForecast();
  const voteForecast = useVoteForecast();
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectAId, setProjectAId] = useState("");
  const [projectBId, setProjectBId] = useState("");
  const [endDate, setEndDate] = useState("");
  const [timePreset, setTimePreset] = useState<string>("");
  const [predictionDirection, setPredictionDirection] = useState<"long" | "short" | "">("");
  const [predictionTarget, setPredictionTarget] = useState<string>("");
  

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
    { value: "community_sentiment", label: "Community Sentiment", disabled: false },
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

  // Filter projects based on selected forecast market
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
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Fetch forecast targets (dimensions) for displayed forecasts
  const forecastIds = useMemo(() => forecasts.map(f => f.id), [forecasts]);
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
    if (!forecastMarket) { toast.error("Forecast market required"); return; }
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
      toast.success("Forecast created!");
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
        topLiveForecasts={heroTopLiveForecasts}
        trendingTopics={trendingTopics}
        user={user}
        setShowCreate={setShowCreate}
        heroDimensionsMap={heroDimensionsMap as Record<string, string[]>}
      />

      {/* Controls — Polymarket-style single row */}
      <section className="sticky top-16 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-2.5">
          <div className="flex items-center gap-2 overflow-x-auto">
            {/* All Markets label */}
            <span className="text-xs font-bold text-foreground uppercase tracking-wide shrink-0">All Markets</span>

            {/* Divider */}
            <div className="h-5 w-px bg-border shrink-0" />

            {/* Topic chips */}
            {[
              { value: "", label: "All" },
              { value: "token_price", label: "Token Price", comingSoon: false },
              { value: "market_cap", label: "Market Cap", comingSoon: false },
              { value: "community_sentiment", label: "Community Sentiment", comingSoon: false },
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

            {/* Spacer pushes right side */}
            <div className="flex-1 min-w-0" />

            {/* Search input — compact */}
            <div className="relative shrink-0 w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="h-8 w-full text-xs placeholder:text-muted-foreground/50 bg-secondary/40 border-border pl-8 pr-3"
              />
            </div>

            {/* Filter toggle button */}
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

            {/* Create Forecast */}
            <Button
              onClick={() => {
                if (user) {
                  setShowCreate(true);
                } else {
                  toast("Please log in to create a forecast", {
                    action: {
                      label: "Log in",
                      onClick: () => navigate("/auth?redirect=/forecasts"),
                    },
                  });
                }
              }}
              size="sm"
              className="h-8 gap-1 shrink-0 text-xs px-3 rounded-full"
            >
              <Plus className="h-3.5 w-3.5" /> Create Forecast
            </Button>
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
          {isLoading ? (
            <div className={`grid gap-4 sm:grid-cols-2 ${showCreate ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
              {Array.from({ length: 6 }).map((_, i) => (
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
          ) : forecasts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">No forecasts yet</h3>
              <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
                Be the first to create a prediction and let the community vote on it.
              </p>
              <Button onClick={() => {
                if (user) { setShowCreate(true); }
                else { toast("Please log in to create a forecast", { action: { label: "Log in", onClick: () => navigate("/auth?redirect=/forecasts") } }); }
              }} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Create First Forecast
              </Button>
            </motion.div>
          ) : (
            <>
              <div className={`grid gap-4 sm:grid-cols-2 ${showCreate ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
                <AnimatePresence mode="popLayout">
                  {forecasts.map((forecast, i) => (
                    <ForecastCard
                      key={forecast.id}
                      forecast={forecast}
                      onVote={handleVote}
                      isAuthenticated={!!user}
                      index={i}
                      dimensions={forecastTargetsMap[forecast.id] || []}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-10">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                            page === pageNum
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Inline Create Forecast Panel — desktop */}
        <AnimatePresence>
          {showCreate && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 420, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="hidden lg:block shrink-0 overflow-hidden"
            >
              <div className="w-[420px] sticky top-24">
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  {/* Panel header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <h2 className="text-base font-bold text-foreground font-['Space_Grotesk']">Create Forecast</h2>
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
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Forecast Market *</label>
                      <p className="text-[10px] text-muted-foreground mt-0.5 mb-2">Select the market to track</p>
                      <Select value={forecastMarket} onValueChange={(v) => { setForecastMarket(v); setPredictionDirection(""); setPredictionTarget(""); if (v === "token_price" || v === "market_cap") { setProjectAId(""); setProjectBId(""); } }}>
                        <SelectTrigger className="mt-1.5 h-9"><SelectValue placeholder="Select forecast market" /></SelectTrigger>
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
                      {timePreset === "custom" && <Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={new Date().toISOString().slice(0, 16)} className="mt-2" />}
                      {timePreset && timePreset !== "custom" && endDate && <p className="text-[10px] text-muted-foreground mt-1.5">Ends: {new Date(endDate).toLocaleString()}</p>}
                    </div>
                  </div>

                  {/* Panel footer */}
                  <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border">
                    <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-xs">Cancel</Button>
                    <Button onClick={handleCreate} disabled={createForecast.isPending} className="gap-1.5">
                      {createForecast.isPending ? "Creating..." : "Create Forecast"}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Mobile fallback: Dialog on smaller screens */}
        {showCreate && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogContent className="sm:max-w-lg lg:hidden">
              <DialogHeader>
                <DialogTitle className="font-['Space_Grotesk']">Create Forecast</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Title *</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Forecast title..." className="mt-1.5" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description *</label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Context..." className="mt-1.5 min-h-[80px] resize-y" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Forecast Market *</label>
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
                  {timePreset === "custom" && <Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-2" />}
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
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, ThumbsUp, ThumbsDown, Plus, TrendingUp, Clock, Flame, ChevronLeft, ChevronRight, LogIn, Users, BarChart3, Zap, X, Filter, Trophy, CheckCircle, Circle, RotateCcw, DollarSign, Server, Activity, ArrowUpRight, ArrowDownRight, Bookmark, Eye, ChevronRight as ChevronRightIcon, Radio } from "lucide-react";
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
  const yesPct = totalVotes > 0 ? (forecast.total_votes_yes / totalVotes) * 100 : 50;
  const noPct = 100 - yesPct;
  const isEnded = new Date(forecast.end_date) <= new Date();
  const timeLeft = getTimeRemaining(forecast.end_date);
  const finalResult = isEnded ? (yesPct >= 50 ? "yes" : "no") : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className="group relative rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 h-full flex flex-col"
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="p-5 flex-1 flex flex-col">
        {/* Header: Projects + time badge */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center -space-x-1.5">
            {forecast.project_a_logo_url ? (
              <img
                src={forecast.project_a_logo_url}
                alt={forecast.project_a_name}
                className="w-7 h-7 rounded-[7px] overflow-hidden object-contain border-2 border-card bg-secondary relative z-10"
              />
            ) : (
              <span className="w-7 h-7 rounded-[7px] overflow-hidden flex items-center justify-center text-sm border-2 border-card bg-secondary relative z-10">
                {forecast.project_a_logo_emoji || "⬡"}
              </span>
            )}
            {forecast.project_b_name && (
              forecast.project_b_logo_url ? (
                <img
                  src={forecast.project_b_logo_url}
                  alt={forecast.project_b_name}
                  className="w-7 h-7 rounded-[7px] overflow-hidden object-contain border-2 border-card bg-secondary relative z-0"
                />
              ) : (
                <span className="w-7 h-7 rounded-[7px] overflow-hidden flex items-center justify-center text-sm border-2 border-card bg-secondary relative z-0">
                  {forecast.project_b_logo_emoji || "⬡"}
                </span>
              )
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <Link
              to={`/project/${forecast.project_a_slug}`}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors truncate"
            >
              {forecast.project_a_name}
            </Link>
            {forecast.project_b_name && (
              <>
                <span className="text-muted-foreground/40 text-[10px]">vs</span>
                <Link
                  to={`/project/${forecast.project_b_slug}`}
                  className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors truncate"
                >
                  {forecast.project_b_name}
                </Link>
              </>
            )}
          </div>
          <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
            isEnded
              ? "bg-muted text-muted-foreground"
              : "bg-primary/10 text-primary"
          }`}>
            {timeLeft}
          </span>
        </div>

        {/* Title */}
        <Link to={`/forecasts/${forecast.id}`} className="block">
          <h3 className="text-[13px] font-semibold text-foreground leading-snug mb-2 line-clamp-2 hover:text-primary transition-colors">
            {forecast.title}
          </h3>
        </Link>

        {forecast.description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed min-h-[2.5rem]">{forecast.description}</p>
        )}
        {!forecast.description && <div className="mb-3 min-h-[2.5rem]" />}

        {/* Dimension badges */}
        {dimensions.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {dimensions.map((dim) => {
              const DimIcon = dimensionIconMap[dim] || Activity;
              const label = dimensionLabelMap[dim] || dim;
              return (
                <span key={dim} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-medium bg-secondary text-muted-foreground border border-border">
                  <DimIcon className="h-2.5 w-2.5" />
                  {label}
                </span>
              );
            })}
          </div>
        )}

        {/* Vote percentage display */}
        <div className="mb-4 mt-auto">
          <div className="flex items-end justify-between mb-2">
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-foreground">{yesPct.toFixed(0)}%</span>
              <span className="text-[10px] font-medium text-primary/70 uppercase tracking-wider">Yes</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-[10px] font-medium text-destructive/70 uppercase tracking-wider">No</span>
              <span className="text-lg font-bold text-foreground">{noPct.toFixed(0)}%</span>
            </div>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden flex">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${yesPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-l-full"
              style={{ background: "hsl(var(--primary))" }}
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${noPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-r-full bg-destructive/60"
            />
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <Users className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-[11px] text-muted-foreground">
              {totalVotes.toLocaleString()} vote{totalVotes !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Vote buttons — separated footer */}
      {!isEnded && (
        <div className="flex border-t border-border">
          <button
            onClick={() => isAuthenticated ? onVote(forecast.id, "yes") : toast.error("Sign in to vote")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all ${
              forecast.user_vote === "yes"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
            }`}
          >
            <ThumbsUp className="h-3.5 w-3.5" /> Yes
          </button>
          <div className="w-px bg-border" />
          <button
            onClick={() => isAuthenticated ? onVote(forecast.id, "no") : toast.error("Sign in to vote")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all ${
              forecast.user_vote === "no"
                ? "bg-destructive/10 text-destructive"
                : "text-muted-foreground hover:bg-destructive/5 hover:text-destructive"
            }`}
          >
            <ThumbsDown className="h-3.5 w-3.5" /> No
          </button>
        </div>
      )}

      {isEnded && (
        <div className={`flex items-center justify-between border-t border-border px-4 py-2.5 ${
          finalResult === "yes" ? "bg-primary/5" : "bg-destructive/5"
        }`}>
          <div className="flex items-center gap-2">
            <Trophy className={`h-3.5 w-3.5 ${finalResult === "yes" ? "text-primary" : "text-destructive"}`} />
            <span className={`text-[11px] font-semibold ${finalResult === "yes" ? "text-primary" : "text-destructive"}`}>
              Result: {finalResult === "yes" ? "Yes" : "No"} ({finalResult === "yes" ? yesPct.toFixed(0) : noPct.toFixed(0)}%)
            </span>
          </div>
          {forecast.user_vote && (
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
              forecast.user_vote === finalResult
                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
            }`}>
              {forecast.user_vote === finalResult ? "✓ You were right!" : "✗ Minority vote"}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
};
// ---- Hero Section with Auto-Sliding Carousel + Sentiment Chart ----
const HeroSection = ({ forecasts, trendingTopics, user, setShowCreate }: {
  forecasts: Forecast[];
  trendingTopics: any[];
  user: any;
  setShowCreate: (v: boolean) => void;
}) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Get top forecasts for carousel: mix of active + ended + highest voted
  const heroForecasts = useMemo(() => {
    if (forecasts.length === 0) return [];
    const sorted = [...forecasts].sort((a, b) => 
      (b.total_votes_yes + b.total_votes_no) - (a.total_votes_yes + a.total_votes_no)
    );
    return sorted.slice(0, 5);
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
            {user ? (
              <Button onClick={() => setShowCreate(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Create Forecast
              </Button>
            ) : (
              <Link to="/auth" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
                <LogIn className="h-3.5 w-3.5" /> Sign in
              </Link>
            )}
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
                      <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                        <Bookmark className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <Link to={`/forecasts/${current.id}`}>
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight mb-5 font-['Space_Grotesk'] tracking-tight hover:text-primary transition-colors">
                      {current.title}
                    </h2>
                  </Link>

                  {/* Vote outcomes */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/10 px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <ArrowUpRight className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-foreground">Yes</span>
                      </div>
                      <span className="text-xl font-bold text-foreground font-['Space_Grotesk']">{cYesPct.toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-destructive/5 border border-destructive/10 px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <ArrowDownRight className="h-4 w-4 text-destructive" />
                        <span className="text-sm font-semibold text-foreground">No</span>
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

              {/* Per-slide Sentiment Stats */}
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
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sentiment · {current.project_a_name}</h3>
                  </div>
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={currentChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="heroYesGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="heroNoGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "10px",
                            fontSize: "11px",
                            padding: "6px 10px",
                          }}
                          labelStyle={{ fontWeight: 600, marginBottom: 2, color: "hsl(var(--foreground))" }}
                        />
                        <Area type="monotone" dataKey="value" name="Votes" stroke="hsl(var(--primary))" fill="url(#heroYesGrad)" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--primary))", stroke: "hsl(var(--card))", strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              </AnimatePresence>

            </div>

            {/* Slide dots - outside the card, centered */}
            {heroForecasts.length > 1 && (
              <div className="flex items-center justify-center gap-2 mt-3">
                {heroForecasts.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToSlide(i)}
                    className="p-1"
                    aria-label={`Go to slide ${i + 1}`}
                  >
                    <span className={`block rounded-full transition-all duration-300 ${
                      i === activeSlide
                        ? 'w-6 h-2 bg-primary'
                        : 'w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    }`} />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Right sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            {/* Top Forecasts */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-3.5 flex items-center justify-between border-b border-border">
                <h3 className="text-sm font-bold text-foreground font-['Space_Grotesk']">Top Forecasts</h3>
                <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="divide-y divide-border">
                {forecasts.slice(1, 4).map((f, i) => {
                  const fTotal = f.total_votes_yes + f.total_votes_no;
                  const fYesPct = fTotal > 0 ? (f.total_votes_yes / fTotal) * 100 : 50;
                  const fIsEnded = new Date(f.end_date) <= new Date();
                  return (
                    <Link key={f.id} to={`/forecasts/${f.id}`} className="flex items-start gap-3 px-5 py-3 hover:bg-secondary/30 transition-colors">
                      <span className="text-xs font-bold text-muted-foreground/50 mt-0.5 w-4 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">{f.title}</p>
                        {/* Blinking status */}
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
                {forecasts.length <= 1 && (
                  <div className="px-5 py-6 text-center text-xs text-muted-foreground">No additional forecasts</div>
                )}
              </div>
            </div>

            {/* Trending Topics */}
            {trendingTopics.length > 0 && (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-3.5 flex items-center justify-between border-b border-border">
                  <h3 className="text-sm font-bold text-foreground font-['Space_Grotesk']">Hot Topics</h3>
                  <Flame className="h-4 w-4 text-destructive/60" />
                </div>
                <div className="divide-y divide-border">
                  {trendingTopics.map((project: any, i: number) => (
                    <Link key={project.id} to={`/project/${project.slug}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-secondary/30 transition-colors">
                      <span className="text-xs font-bold text-muted-foreground/50 w-4 shrink-0">{i + 1}</span>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {project.logo_url ? (
                          <img src={project.logo_url} alt={project.name} className="w-5 h-5 rounded-md object-contain bg-secondary" />
                        ) : (
                          <span className="w-5 h-5 rounded-md flex items-center justify-center text-xs bg-secondary">{project.logo_emoji || "⬡"}</span>
                        )}
                        <span className="text-xs font-semibold text-foreground truncate">{project.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] font-medium text-muted-foreground">{project.totalVotes} votes</span>
                        <Flame className="h-3 w-3 text-destructive/50" />
                        <ChevronRightIcon className="h-3 w-3 text-muted-foreground/40" />
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
  const { data, isLoading } = useForecasts(sort, page, PAGE_SIZE, projectFilter || undefined, search || undefined, statusFilter);
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
  const [analysisDimensions, setAnalysisDimensions] = useState<string[]>([]);

  const timePresets = [
    { value: "4h", label: "4 Hours", hours: 4 },
    { value: "24h", label: "24 Hours", hours: 24 },
    { value: "7d", label: "7 Days", hours: 168 },
    { value: "30d", label: "30 Days", hours: 720 },
    { value: "custom", label: "Custom", hours: 0 },
  ];

  const dimensionOptions = [
    { value: "token_price", label: "Token Price", Icon: DollarSign },
    { value: "market_cap", label: "Market Cap", Icon: BarChart3 },
    { value: "active_nodes", label: "Active Nodes", Icon: Server },
    { value: "revenue", label: "Revenue", Icon: Activity },
  ];

  const handleTimePreset = (preset: string) => {
    setTimePreset(preset);
    if (preset !== "custom") {
      const p = timePresets.find(t => t.value === preset);
      if (p) {
        const end = new Date(Date.now() + p.hours * 60 * 60 * 1000);
        setEndDate(end.toISOString().slice(0, 16));
      }
    } else {
      setEndDate("");
    }
  };

  const toggleDimension = (dim: string) => {
    setAnalysisDimensions(prev =>
      prev.includes(dim) ? prev.filter(d => d !== dim) : [...prev, dim]
    );
  };

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

  // Stats
  const stats = useMemo(() => {
    const totalVotes = forecasts.reduce((sum, f) => sum + f.total_votes_yes + f.total_votes_no, 0);
    const activeCount = forecasts.filter(f => new Date(f.end_date) > new Date()).length;
    return { total, totalVotes, activeCount };
  }, [forecasts, total]);

  const handleVote = (forecastId: string, vote: "yes" | "no") => {
    voteForecast.mutate({ forecastId, vote });
  };

  const handleCreate = async () => {
    if (!title.trim()) { toast.error("Title required"); return; }
    if (!projectAId) { toast.error("Select a project"); return; }
    if (!endDate) { toast.error("End date required"); return; }
    if (new Date(endDate) <= new Date()) { toast.error("End date must be in the future"); return; }

    try {
      await createForecast.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        projectAId,
        projectBId: projectBId && projectBId !== "none" ? projectBId : undefined,
        endDate: new Date(endDate).toISOString(),
        analysisDimensions,
      });
      toast.success("Forecast created!");
      setShowCreate(false);
      setTitle("");
      setDescription("");
      setProjectAId("");
      setProjectBId("");
      setEndDate("");
      setTimePreset("");
      setAnalysisDimensions([]);
    } catch (err: any) {
      toast.error(err.message || "Failed to create forecast");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Polymarket-style Hero with Auto-Slide */}
      <HeroSection
        forecasts={forecasts}
        trendingTopics={trendingTopics}
        user={user}
        setShowCreate={setShowCreate}
      />

      {/* Controls */}
      <section className="sticky top-16 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3">
          {/* Single row: Search + dropdown filters */}
          <div className="flex items-center gap-2">
            <div className="w-48 shrink-0">
              <Input
                placeholder="Search by title..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="h-9 w-full text-xs placeholder:text-muted-foreground/60 bg-secondary/50 border-border"
              />
            </div>
            <Select value={sort} onValueChange={(v) => { setSort(v as ForecastSortOption); setPage(1); }}>
              <SelectTrigger className="h-9 w-[130px] text-[11px] bg-secondary/50 border-border shrink-0">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" sideOffset={4}>
                {sortOptions.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as ForecastStatusFilter); setPage(1); }}>
              <SelectTrigger className="h-9 w-[120px] text-[11px] bg-secondary/50 border-border shrink-0">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" sideOffset={4}>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="ended">Ended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={projectFilter || "all"} onValueChange={(v) => { setProjectFilter(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="h-9 w-[160px] text-[11px] bg-secondary/50 border-border shrink-0">
                <Filter className="h-3 w-3 mr-1 text-muted-foreground shrink-0" />
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
                className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/15 transition-colors whitespace-nowrap shrink-0"
              >
                {projects.find(p => p.id === projectFilter)?.name}
                <X className="h-3 w-3" />
              </button>
            )}
            {user ? (
              <Button onClick={() => setShowCreate(true)} size="sm" className="h-9 gap-1.5 shrink-0 text-xs">
                <Plus className="h-3.5 w-3.5" /> Create Forecast
              </Button>
            ) : (
              <Link to="/auth" className="inline-flex items-center gap-1.5 shrink-0 rounded-md bg-primary px-3 h-9 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                <LogIn className="h-3.5 w-3.5" /> Sign in
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Forecast Grid */}
      <section className="container mx-auto px-4 py-8 flex-1">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            {user ? (
              <Button onClick={() => setShowCreate(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Create First Forecast
              </Button>
            ) : (
              <Link to="/auth" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
                <LogIn className="h-3.5 w-3.5" /> Sign in to create
              </Link>
            )}
          </motion.div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* Create Forecast Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="font-['Space_Grotesk']">Create Forecast</DialogTitle>
            {(title || description) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setTitle(""); setDescription(""); }}
                className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground -mt-1"
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </Button>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Title *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Will Hivemapper surpass Helium nodes by 2026?"
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional context about this prediction..."
                className="mt-1.5 min-h-[80px] resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Project A *</label>
                <Select value={projectAId} onValueChange={setProjectAId}>
                  <SelectTrigger className="mt-1.5 h-9">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false} className="max-h-60">
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-2">
                          {p.logo_url ? (
                            <img src={p.logo_url} alt={p.name} className="w-5 h-5 rounded-[7px] overflow-hidden object-contain" />
                          ) : (
                            <span className="w-5 h-5 flex items-center justify-center text-sm">{p.logo_emoji}</span>
                          )}
                          {p.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Project B <span className="normal-case text-muted-foreground/60">(optional)</span></label>
                <Select value={projectBId} onValueChange={setProjectBId}>
                  <SelectTrigger className="mt-1.5 h-9">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false} className="max-h-60">
                    <SelectItem value="none">None</SelectItem>
                    {projects.filter((p) => p.id !== projectAId).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-2">
                          {p.logo_url ? (
                            <img src={p.logo_url} alt={p.name} className="w-5 h-5 rounded-[7px] overflow-hidden object-contain" />
                          ) : (
                            <span className="w-5 h-5 flex items-center justify-center text-sm">{p.logo_emoji}</span>
                          )}
                          {p.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Time Window Presets */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Time Window *</label>
              <div className="grid grid-cols-5 gap-1.5 mt-1.5">
                {timePresets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handleTimePreset(preset.value)}
                    className={`rounded-lg px-2 py-2 text-[11px] font-semibold transition-all border ${
                      timePreset === preset.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              {timePreset === "custom" && (
                <Input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="mt-2"
                />
              )}
              {timePreset && timePreset !== "custom" && endDate && (
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  Ends: {new Date(endDate).toLocaleString()}
                </p>
              )}
            </div>

            {/* Analysis Dimensions */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Forecast Analysis <span className="normal-case text-muted-foreground/60">(optional)</span>
              </label>
              <p className="text-[10px] text-muted-foreground mt-0.5 mb-2">Select metrics to track during the forecast period</p>
              <div className="grid grid-cols-2 gap-2">
                {dimensionOptions.map((dim) => {
                  const DimIcon = dim.Icon;
                  return (
                    <button
                      key={dim.value}
                      type="button"
                      onClick={() => toggleDimension(dim.value)}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition-all border ${
                        analysisDimensions.includes(dim.value)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                      }`}
                    >
                      <DimIcon className="h-3.5 w-3.5" />
                      {dim.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createForecast.isPending}>
              {createForecast.isPending ? "Creating..." : "Create Forecast"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Forecasts;
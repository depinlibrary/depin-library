import { useState, useEffect, useMemo } from "react";
import { getWeightedChance } from "@/lib/forecastUtils";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Clock, CalendarDays, Timer, Users, ExternalLink, Copy, ArrowUpRight, ArrowDownRight, ThumbsUp, ThumbsDown, Gauge, Target, Zap, CheckCircle2, XCircle, TrendingUp, TrendingDown, Minus, Trophy } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { useTokenMarketData } from "@/hooks/useTokenMarketData";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import DiscussionSection from "@/components/forecast/DiscussionSection";
import ForecastAnalysis from "@/components/forecast/ForecastAnalysis";
import ForecastAnalysis from "@/components/forecast/ForecastAnalysis";
import UserAvatar from "@/components/UserAvatar";
import UserStatsHoverCard from "@/components/UserStatsHoverCard";
import { useAuth } from "@/contexts/AuthContext";
import { useVoteForecast } from "@/hooks/useForecasts";
import {
  useForecastDetail,
  useForecastComments,
  useAddForecastComment,
  useDeleteForecastComment,
  useEditForecastComment,
  useForecastVoteHistory,
} from "@/hooks/useForecastDetail";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import confetti from "canvas-confetti";

function getTimeRemaining(endDate: string): string {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 30) return `${Math.floor(days / 30)}mo left`;
  if (days > 0) return `${days}d left`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 0) return `${hours}h left`;
  const mins = Math.floor(diff / (1000 * 60));
  return `${mins}m left`;
}

function formatTokenPrice(price: number | null): string {
  if (price === null || price === undefined) return "—";
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

const confidenceLabels: Record<number, { label: string; color: string }> = {
  1: { label: "Low", color: "text-muted-foreground" },
  2: { label: "Moderate", color: "text-yellow-500" },
  3: { label: "High", color: "text-primary" },
  4: { label: "Very High", color: "text-primary" },
  5: { label: "Maximum", color: "text-accent" },
};

function CreatorCardWithCountdown({ forecast, isEnded, timeLeft }: { forecast: any; isEnded: boolean; timeLeft: string }) {
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (isEnded) {
      setCountdown("Ended");
      return;
    }
    const tick = () => {
      const now = Date.now();
      const end = new Date(forecast.end_date).getTime();
      const diff = end - now;
      if (diff <= 0) { setCountdown("Ended"); return; }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      const parts: string[] = [];
      if (d > 0) parts.push(`${d}d`);
      parts.push(`${String(h).padStart(2, "0")}h`);
      parts.push(`${String(m).padStart(2, "0")}m`);
      parts.push(`${String(s).padStart(2, "0")}s`);
      setCountdown(parts.join(" "));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [forecast.end_date, isEnded]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <UserStatsHoverCard userId={forecast.creator_user_id} displayName={forecast.creator_name} avatarUrl={forecast.creator_avatar_url}>
            <div className="flex items-center gap-3 cursor-pointer group">
              <UserAvatar avatarUrl={forecast.creator_avatar_url} displayName={forecast.creator_name} size="md" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{forecast.creator_name}</span>
                <span className="text-[10px] text-muted-foreground">Forecast Creator</span>
              </div>
            </div>
          </UserStatsHoverCard>
          {/* Countdown — hidden when ended */}
          {!isEnded && countdown !== "Ended" && (
            <div className="text-right shrink-0">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
                Time Left
              </p>
              <p className="text-xs font-bold font-['Space_Grotesk'] tabular-nums text-primary">
                {countdown}
              </p>
            </div>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 text-center">
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">Created</p>
            <p className="text-[11px] font-medium text-foreground">{format(new Date(forecast.created_at), "MMM d, yyyy")}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">{isEnded ? "Ended" : "Ends"}</p>
            <p className="text-[11px] font-medium text-foreground">{format(new Date(forecast.end_date), "MMM d, yyyy")}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const ForecastDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: forecast, isLoading } = useForecastDetail(id);
  const { data: comments = [], isLoading: commentsLoading } = useForecastComments(id);
  const { data: voteHistory = [] } = useForecastVoteHistory(id);
  const marketDataA = useTokenMarketData(forecast?.project_a_id);
  const marketDataB = useTokenMarketData(forecast?.project_b_id || undefined);
  const { data: relatedForecasts = [] } = useRelatedForecasts(id, forecast?.project_a_id, forecast?.project_b_id);
  const voteForecast = useVoteForecast();
  const addComment = useAddForecastComment();
  const deleteComment = useDeleteForecastComment();
  const editComment = useEditForecastComment();
  const [heroChartTab, setHeroChartTab] = useState<"probability" | "price">("probability");
  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [confidence, setConfidence] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(`forecast-confidence-${id}`);
      return saved ? parseInt(saved, 10) : 3;
    }
    return 3;
  });

  // Persist confidence to sessionStorage when it changes
  useEffect(() => {
    if (id) sessionStorage.setItem(`forecast-confidence-${id}`, String(confidence));
  }, [confidence, id]);

  // Fetch forecast dimension (token_price, market_cap, community_sentiment, etc.)
  const { data: forecastDimension } = useQuery({
    queryKey: ["forecast-dimension", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forecast_targets")
        .select("dimension")
        .eq("forecast_id", id!)
        .maybeSingle();
      if (error) throw error;
      return data?.dimension || null;
    },
  });

  const { data: allVoters = [] } = useQuery({
    queryKey: ["forecast-voters", id],
    enabled: !!id,
    queryFn: async () => {
      const { data: votes, error } = await supabase
        .from("forecast_votes")
        .select("user_id, vote, confidence_level, created_at")
        .eq("forecast_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!votes?.length) return [];

      const userIds = [...new Set(votes.map(v => v.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap: Record<string, any> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });

      return votes.map((v: any) => ({
        ...v,
        display_name: profileMap[v.user_id]?.display_name || "Anonymous",
        avatar_url: profileMap[v.user_id]?.avatar_url || null,
      }));
    },
  });

  // Dynamic OG meta tags
  useEffect(() => {
    if (!forecast) return;
    const totalVotes = forecast.total_votes_yes + forecast.total_votes_no;
    const { yesPct: yesPctNum } = getWeightedChance(forecast);
    const yesPct = yesPctNum.toFixed(0);
    const projectNames = [forecast.project_a?.name, forecast.project_b?.name].filter(Boolean).join(" vs ");
    const title = `${forecast.title} — DePIN Forecast`;
    const description = `${yesPct}% Yes · ${totalVotes} votes · ${projectNames} — ${forecast.description?.slice(0, 120) || "Community prediction on DePIN projects"}`;
    document.title = title;
    const setMeta = (property: string, content: string, isName = false) => {
      const attr = isName ? "name" : "property";
      let el = document.querySelector(`meta[${attr}="${property}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, property); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    setMeta("og:title", title); setMeta("og:description", description); setMeta("og:type", "article");
    setMeta("og:url", window.location.href); setMeta("twitter:card", "summary", true);
    setMeta("twitter:title", title, true); setMeta("twitter:description", description, true);
    setMeta("description", description, true);
    return () => {
      document.title = "DePIN Library — Discover Decentralized Infrastructure";
      setMeta("og:title", "DePIN Library — Discover the DePIN Ecosystem");
      setMeta("og:description", "Explore, compare, and understand Decentralized Physical Infrastructure Networks — all in one place.");
      setMeta("og:type", "website");
      setMeta("description", "The central hub to explore, compare, and understand Decentralized Physical Infrastructure Networks (DePIN).", true);
    };
  }, [forecast]);

  const fireConfetti = () => {
    const end = Date.now() + 1500;
    const colors = ["hsl(175, 80%, 50%)", "hsl(265, 70%, 60%)", "#FFD700", "#FF6B6B"];
    (function frame() {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  };

  const handleVote = (vote: "yes" | "no") => {
    if (!user) { toast.error("Sign in to vote"); return; }
    if (!id) return;
    if (!forecast?.user_vote) { fireConfetti(); toast.success("🎉 Vote cast! Nice prediction."); }
    voteForecast.mutate({ forecastId: id, vote, confidenceLevel: confidence });
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    if (!user) { toast.error("Sign in to comment"); return; }
    if (!id) return;
    try {
      await addComment.mutateAsync({ forecastId: id, commentText: commentText.trim() });
      setCommentText("");
    } catch { toast.error("Failed to post comment"); }
  };

  const handleShareX = () => {
    if (!forecast) return;
    const totalVotes = forecast.total_votes_yes + forecast.total_votes_no;
    const { yesPct: yesPctNum } = getWeightedChance(forecast);
    const yesPct = yesPctNum.toFixed(0);
    const ogUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-forecast?id=${forecast.id}&site=${encodeURIComponent(window.location.origin)}`;
    const text = `${forecast.title} — ${yesPct}% Yes | ${totalVotes} votes`;
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(ogUrl)}`, "_blank", "noopener,noreferrer,width=550,height=420");
  };

  const handleCopyLink = () => {
    if (!forecast) return;
    const ogUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-forecast?id=${forecast.id}&site=${encodeURIComponent(window.location.origin)}`;
    navigator.clipboard.writeText(ogUrl);
    toast.success("Link copied!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-16">
          <Skeleton className="h-5 w-32 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <Skeleton className="h-[140px] w-full rounded-2xl" />
              <Skeleton className="h-[200px] w-full rounded-2xl" />
              <Skeleton className="h-[250px] w-full rounded-2xl" />
            </div>
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-[400px] w-full rounded-2xl" />
              <Skeleton className="h-[300px] w-full rounded-2xl" />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!forecast) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="container mx-auto px-4 pt-28 pb-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Forecast not found</h1>
          <Link to="/forecasts" className="text-primary hover:underline text-sm">← Back to Forecasts</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const totalVotes = forecast.total_votes_yes + forecast.total_votes_no;
  const { yesPct, noPct } = getWeightedChance(forecast);
  const isEnded = new Date(forecast.end_date) <= new Date();
  const timeLeft = getTimeRemaining(forecast.end_date);
  const confInfo = confidenceLabels[confidence] || confidenceLabels[3];
  const isPriceMarket = forecastDimension === "token_price" || forecastDimension === "market_cap";
  const isSentimentWithTwoProjects = forecastDimension === "community_sentiment" && !!forecast.project_b;
  const yesLabel = isPriceMarket ? "Long" : isSentimentWithTwoProjects ? forecast.project_a?.name : "Yes";
  const noLabel = isPriceMarket ? "Short" : isSentimentWithTwoProjects ? forecast.project_b?.name : "No";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="container mx-auto px-4 pt-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* ═══════ LEFT COLUMN (2/3): Hero Card + Tabs ═══════ */}
          <div className="lg:col-span-2 lg:pt-4 lg:pb-16">
            {/* Breadcrumb */}
            <Link to="/forecasts" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-5">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Forecasts
            </Link>
            <div className="space-y-4">
            {/* Hero Card — compact header with project + title + odds */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-card overflow-hidden"
            >
              <div className="p-6 sm:p-8">
                {/* Top row: status tag + share */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5">
                      <span className="relative flex h-1.5 w-1.5">
                        {!isEnded && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-green-500" />}
                        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isEnded ? 'bg-destructive' : 'bg-green-500'}`} />
                      </span>
                      <span className={`text-[10px] font-semibold ${isEnded ? 'text-destructive' : 'text-green-500'}`}>
                        {isEnded ? 'Ended' : timeLeft}
                      </span>
                    </span>
                    {forecastDimension && (
                      <span className="text-[10px] font-semibold text-primary uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/5 border border-primary/15">
                        {({ token_price: "Price", market_cap: "MCap", community_sentiment: "Sentiment" }[forecastDimension] || forecastDimension)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={handleShareX} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Share on X">
                      <ExternalLink className="h-4 w-4" />
                    </button>
                    <button onClick={handleCopyLink} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Copy link">
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Project logos + names joined with title */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center -space-x-1.5">
                    {forecast.project_a?.logo_url ? (
                      <img src={forecast.project_a.logo_url} alt={forecast.project_a.name} className="w-8 h-8 rounded-lg object-contain bg-secondary border border-card relative z-10" />
                    ) : (
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-secondary border border-card relative z-10">{forecast.project_a?.logo_emoji || "⬡"}</span>
                    )}
                    {forecast.project_b && (
                      forecast.project_b.logo_url ? (
                        <img src={forecast.project_b.logo_url} alt={forecast.project_b.name} className="w-8 h-8 rounded-lg object-contain bg-secondary border border-card relative z-0" />
                      ) : (
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-secondary border border-card relative z-0">{forecast.project_b?.logo_emoji || "⬡"}</span>
                      )
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Link to={`/project/${forecast.project_a?.slug}`} className="font-medium hover:text-foreground transition-colors">{forecast.project_a?.name}</Link>
                    {forecast.project_b && (
                      <>
                        <span className="text-muted-foreground/40">vs</span>
                        <Link to={`/project/${forecast.project_b?.slug}`} className="font-medium hover:text-foreground transition-colors">{forecast.project_b?.name}</Link>
                      </>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight mb-5 font-['Space_Grotesk'] tracking-tight">
                  {forecast.title}
                </h1>

                {/* Odds pills — Long/Short or Yes/No with percentages */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-primary/25 bg-primary/5 text-sm font-bold text-foreground tabular-nums">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      {yesLabel} {yesPct.toFixed(0)}%
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-destructive/25 bg-destructive/5 text-sm font-bold text-foreground tabular-nums">
                      <span className="w-2 h-2 rounded-full bg-destructive" />
                      {noLabel} {noPct.toFixed(0)}%
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{totalVotes.toLocaleString()} vote{totalVotes !== 1 ? "s" : ""}</span>
                </div>
              </div>
            </motion.div>

            {/* Charts section — Probability Trend + Token Price */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-2xl border border-border bg-card overflow-hidden"
            >
              <div className="p-6 sm:p-8 flex flex-col">
                {(() => {
                  const hasPriceData = (forecastDimension === "token_price" || forecastDimension === "market_cap") && marketDataA.data?.sparkline_7d;

                  return (
                    <>
                      {/* Tab switcher */}
                      {hasPriceData && (
                        <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-0.5 mb-4 self-start">
                          <button
                            onClick={() => setHeroChartTab("probability")}
                            className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                              heroChartTab === "probability"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Probability
                          </button>
                          <button
                            onClick={() => setHeroChartTab("price")}
                            className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                              heroChartTab === "price"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {forecastDimension === "market_cap" ? "Market Cap" : "Token Price"}
                          </button>
                        </div>
                      )}

                      {/* Probability Trend */}
                      {heroChartTab === "probability" && (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-muted-foreground">Probability Trend</span>
                            <div className="flex items-center gap-4 ml-auto">
                              <span className="flex items-center gap-1.5 text-[11px]">
                                <span className="w-2 h-2 rounded-full bg-primary" />
                                <span className="font-medium text-muted-foreground">{yesLabel}</span>
                                <span className="font-semibold text-primary font-['Space_Grotesk']">{yesPct.toFixed(1)}%</span>
                              </span>
                              <span className="flex items-center gap-1.5 text-[11px]">
                                <span className="w-2 h-2 rounded-full bg-destructive" />
                                <span className="font-medium text-muted-foreground">{noLabel}</span>
                                <span className="font-semibold text-destructive font-['Space_Grotesk']">{noPct.toFixed(1)}%</span>
                              </span>
                            </div>
                          </div>
                          <div className="min-h-[220px]">
                            {voteHistory.length >= 2 ? (
                              <ResponsiveContainer width="100%" height={220}>
                                <AreaChart data={voteHistory.map(v => ({
                                  ...v,
                                  yes_pct: v.weighted_yes_pct,
                                  no_pct: 100 - v.weighted_yes_pct,
                                }))} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                  <defs>
                                    <linearGradient id="detailYesGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.01} />
                                    </linearGradient>
                                    <linearGradient id="detailNoGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.15} />
                                      <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.01} />
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                                  <ReferenceLine y={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="6 4" opacity={0.25} />
                                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                                  <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} />
                                  <Tooltip
                                    contentStyle={{
                                      backgroundColor: "hsl(var(--card))",
                                      border: "1px solid hsl(var(--border))",
                                      borderRadius: "10px",
                                      fontSize: "11px",
                                      padding: "6px 10px",
                                    }}
                                    formatter={(value: number, name: string) => [`${value}%`, name === "yes_pct" ? yesLabel : noLabel]}
                                    labelStyle={{ fontWeight: 600, marginBottom: 2, color: "hsl(var(--foreground))" }}
                                  />
                                  <Area type="monotone" dataKey="yes_pct" name="yes_pct" stroke="hsl(var(--primary))" fill="url(#detailYesGrad)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "hsl(var(--primary))", stroke: "hsl(var(--card))", strokeWidth: 2 }} />
                                  <Area type="monotone" dataKey="no_pct" name="no_pct" stroke="hsl(var(--destructive))" fill="url(#detailNoGrad)" strokeWidth={1.5} strokeDasharray="4 2" dot={false} activeDot={{ r: 3, fill: "hsl(var(--destructive))", stroke: "hsl(var(--card))", strokeWidth: 2 }} />
                                </AreaChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="flex items-center justify-center h-[220px] text-xs text-muted-foreground">
                                Not enough votes for a trend chart yet
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {/* Token Price chart */}
                      {heroChartTab === "price" && hasPriceData && (() => {
                        const hasTwoProjects = !!forecast.project_b && marketDataB.data?.price_usd != null;
                        const dimLabel = forecastDimension === "market_cap" ? "Market Cap" : "Token Price";
                        const priceA = forecastDimension === "market_cap" ? marketDataA.data?.market_cap_usd : marketDataA.data?.price_usd;
                        const priceB = hasTwoProjects ? (forecastDimension === "market_cap" ? marketDataB.data?.market_cap_usd : marketDataB.data?.price_usd) : null;
                        const changeA = marketDataA.data?.price_change_24h ?? 0;
                        const changeB = hasTwoProjects ? (marketDataB.data?.price_change_24h ?? 0) : 0;

                        const buildPricePoints = (currentPrice: number, change24h: number) => {
                          const startPrice = currentPrice / (1 + change24h / 100);
                          return Array.from({ length: 12 }, (_, i) => {
                            const t = i / 11;
                            const noise = Math.sin(i * 1.5) * 0.003 + Math.cos(i * 2.3) * 0.002;
                            return startPrice + (currentPrice - startPrice) * t + currentPrice * noise;
                          });
                        };

                        const pointsA = priceA ? buildPricePoints(priceA, changeA) : [];
                        const pointsB = hasTwoProjects && priceB ? buildPricePoints(priceB, changeB) : [];

                        const priceChartData = pointsA.map((pa, i) => ({
                          t: i === 0 ? "24h ago" : i === 11 ? "Now" : "",
                          priceA: pa,
                          ...(hasTwoProjects && pointsB.length > 0 ? { priceB: pointsB[i] } : {}),
                        }));

                        const formatVal = (v: number) => {
                          if (forecastDimension === "market_cap") {
                            if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
                            if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
                            return `$${v.toLocaleString()}`;
                          }
                          return formatTokenPrice(v);
                        };

                        return (
                          <>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-semibold text-muted-foreground">{dimLabel} · 24h</span>
                              <span className="text-[10px] text-muted-foreground">CoinGecko</span>
                            </div>
                            <div className="flex items-center gap-4 mb-3">
                              <span className="flex items-center gap-1.5 text-[11px]">
                                <span className="w-2 h-2 rounded-full bg-primary" />
                                <span className="font-medium text-muted-foreground">{forecast.project_a?.name}</span>
                                <span className="font-semibold text-foreground font-['Space_Grotesk'] tabular-nums">{priceA ? formatVal(priceA) : "—"}</span>
                                {changeA !== 0 && (
                                  <span className={`text-[10px] font-semibold ${changeA >= 0 ? "text-green-500" : "text-destructive"}`}>
                                    {changeA >= 0 ? "+" : ""}{changeA.toFixed(2)}%
                                  </span>
                                )}
                              </span>
                              {hasTwoProjects && (
                                <span className="flex items-center gap-1.5 text-[11px]">
                                  <span className="w-2 h-2 rounded-full bg-accent" />
                                  <span className="font-medium text-muted-foreground">{forecast.project_b?.name}</span>
                                  <span className="font-semibold text-foreground font-['Space_Grotesk'] tabular-nums">{priceB ? formatVal(priceB) : "—"}</span>
                                  {changeB !== 0 && (
                                    <span className={`text-[10px] font-semibold ${changeB >= 0 ? "text-green-500" : "text-destructive"}`}>
                                      {changeB >= 0 ? "+" : ""}{changeB.toFixed(2)}%
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                            <div className="min-h-[220px]">
                              <ResponsiveContainer width="100%" height={220}>
                                <AreaChart data={priceChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                  <defs>
                                    <linearGradient id="priceGradA" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.01} />
                                    </linearGradient>
                                    {hasTwoProjects && (
                                      <linearGradient id="priceGradB" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0.01} />
                                      </linearGradient>
                                    )}
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                                  <XAxis dataKey="t" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                                  <YAxis
                                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v: number) => formatVal(v)}
                                    {...(hasTwoProjects ? { yAxisId: "left" } : {})}
                                  />
                                  {hasTwoProjects && (
                                    <YAxis
                                      yAxisId="right"
                                      orientation="right"
                                      tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                                      tickLine={false}
                                      axisLine={false}
                                      tickFormatter={(v: number) => formatVal(v)}
                                    />
                                  )}
                                  <Tooltip
                                    contentStyle={{
                                      backgroundColor: "hsl(var(--card))",
                                      border: "1px solid hsl(var(--border))",
                                      borderRadius: "10px",
                                      fontSize: "11px",
                                      padding: "6px 10px",
                                    }}
                                    formatter={(value: number, name: string) => [
                                      formatVal(value),
                                      name === "priceA" ? forecast.project_a?.name : forecast.project_b?.name
                                    ]}
                                    labelStyle={{ fontWeight: 600, marginBottom: 2, color: "hsl(var(--foreground))" }}
                                  />
                                  <Area
                                    type="monotone"
                                    dataKey="priceA"
                                    stroke="hsl(var(--primary))"
                                    fill="url(#priceGradA)"
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4, fill: "hsl(var(--primary))", stroke: "hsl(var(--card))", strokeWidth: 2 }}
                                    {...(hasTwoProjects ? { yAxisId: "left" } : {})}
                                  />
                                  {hasTwoProjects && (
                                    <Area
                                      type="monotone"
                                      dataKey="priceB"
                                      stroke="hsl(var(--accent))"
                                      fill="url(#priceGradB)"
                                      strokeWidth={1.5}
                                      strokeDasharray="4 2"
                                      dot={false}
                                      activeDot={{ r: 3, fill: "hsl(var(--accent))", stroke: "hsl(var(--card))", strokeWidth: 2 }}
                                      yAxisId="right"
                                    />
                                  )}
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </>
                        );
                      })()}
                    </>
                  );
                })()}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-border bg-card overflow-hidden"
            >
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full rounded-none border-b border-border bg-transparent h-auto p-0">
                  <TabsTrigger value="overview" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 text-xs font-semibold">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 text-xs font-semibold">
                    Comments ({comments.length})
                  </TabsTrigger>
                  <TabsTrigger value="votes" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 text-xs font-semibold">
                    Votes ({totalVotes})
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-0 p-6">
                  <h3 className="text-sm font-bold text-foreground mb-3 font-['Space_Grotesk']">About This Forecast</h3>
                  {forecast.description ? (
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{forecast.description}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground/60 italic">No description provided.</p>
                  )}

                  {/* Project info */}
                  <div className="mt-6 pt-4 border-t border-border">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Projects</h4>
                    <div className="space-y-2">
                      <Link to={`/project/${forecast.project_a?.slug}`} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-secondary/50 transition-colors">
                        {forecast.project_a?.logo_url ? (
                          <img src={forecast.project_a.logo_url} alt={forecast.project_a.name} className="w-8 h-8 rounded-lg object-contain bg-secondary" />
                        ) : (
                          <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-secondary">{forecast.project_a?.logo_emoji || "⬡"}</span>
                        )}
                        <div>
                          <p className="text-xs font-semibold text-foreground">{forecast.project_a?.name}</p>
                          {forecast.project_a?.tagline && <p className="text-[10px] text-muted-foreground line-clamp-1">{forecast.project_a.tagline}</p>}
                        </div>
                      </Link>
                      {forecast.project_b && (
                        <Link to={`/project/${forecast.project_b?.slug}`} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-secondary/50 transition-colors">
                          {forecast.project_b?.logo_url ? (
                            <img src={forecast.project_b.logo_url} alt={forecast.project_b.name} className="w-8 h-8 rounded-lg object-contain bg-secondary" />
                          ) : (
                            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-secondary">{forecast.project_b?.logo_emoji || "⬡"}</span>
                          )}
                          <div>
                            <p className="text-xs font-semibold text-foreground">{forecast.project_b?.name}</p>
                            {forecast.project_b?.tagline && <p className="text-[10px] text-muted-foreground line-clamp-1">{forecast.project_b.tagline}</p>}
                          </div>
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Key dates */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Timeline</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1.5"><CalendarDays className="h-3 w-3" /> Created</span>
                        <span className="font-medium text-foreground">{format(new Date(forecast.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1.5"><Timer className="h-3 w-3" /> {isEnded ? "Ended" : "Ends"}</span>
                        <span className="font-medium text-foreground">{format(new Date(forecast.end_date), "MMM d, yyyy 'at' h:mm a")}</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Comments Tab */}
                <TabsContent value="comments" className="mt-0">
                  <div className="p-6">
                    <DiscussionSection
                      forecastId={forecast.id}
                      comments={comments}
                      commentsLoading={commentsLoading}
                      onAddComment={handleAddComment}
                      commentText={commentText}
                      setCommentText={setCommentText}
                      addCommentPending={addComment.isPending}
                      editingCommentId={editingCommentId}
                      setEditingCommentId={setEditingCommentId}
                      editingText={editingText}
                      setEditingText={setEditingText}
                      onEditComment={(commentId, forecastId, text) => editComment.mutate({ commentId, forecastId, commentText: text })}
                      editCommentPending={editComment.isPending}
                      onDeleteComment={(commentId, forecastId) => deleteComment.mutate({ commentId, forecastId })}
                    />
                  </div>
                </TabsContent>

                {/* Votes Tab */}
                <TabsContent value="votes" className="mt-0">
                  <div className="p-6">
                    {allVoters.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No votes yet. Be the first to vote!</p>
                    ) : (
                      <div className="space-y-2">
                        {allVoters.map((voter: any, i: number) => (
                          <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-secondary/30 transition-colors">
                            <div className="flex items-center gap-2.5">
                              <UserStatsHoverCard userId={voter.user_id} displayName={voter.display_name} avatarUrl={voter.avatar_url}>
                                <div className="flex items-center gap-2.5 cursor-pointer">
                                  <UserAvatar avatarUrl={voter.avatar_url} displayName={voter.display_name} size="sm" />
                                  <div>
                                    <p className="text-xs font-semibold text-foreground hover:text-primary transition-colors">{voter.display_name}</p>
                                    <p className="text-[10px] text-muted-foreground">{format(new Date(voter.created_at), "MMM d, yyyy")}</p>
                                  </div>
                                </div>
                              </UserStatsHoverCard>
                            </div>
                            <div className="flex items-center gap-2">
                              {voter.confidence_level && (
                                <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                                  <Gauge className="h-2.5 w-2.5" /> {voter.confidence_level}/5
                                </span>
                              )}
                              <Badge
                                variant={voter.vote === "yes" ? "default" : "destructive"}
                                className={`text-[10px] ${voter.vote === "yes" ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/10" : "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10"}`}
                              >
                                {voter.vote === "yes" ? yesLabel : noLabel}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </motion.div>
            </div>
          </div>

          {/* ═══════ RIGHT COLUMN (1/3): Creator + Vote + Analysis + Related ═══════ */}
          <div className="lg:pt-4 lg:pb-16 lg:sticky lg:top-20">
            <div className="space-y-4">
            {/* Creator Card — compact with countdown */}
            <CreatorCardWithCountdown forecast={forecast} isEnded={isEnded} timeLeft={timeLeft} />

            {/* Forecast Results — shown below creator when ended */}
            {isEnded && (() => {
              const outcomeResult = forecast.outcome
                ? forecast.outcome
                : (yesPct >= 50 ? "yes" : "no");
              const outcomeLabel = outcomeResult === "yes" ? yesLabel : noLabel;
              const outcomeIsLong = outcomeResult === "yes";
              const userVote = forecast.user_vote;
              const userCorrect = userVote ? userVote === outcomeResult : null;
              const userVoteLabel = userVote === "yes" ? yesLabel : noLabel;

              return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 }}
                  className="rounded-2xl border border-border bg-card overflow-hidden"
                >
                  <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground font-['Space_Grotesk']">Forecast Results</h3>
                  </div>
                  <div className="p-5 space-y-3">
                    {/* Overall result */}
                    <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                      outcomeIsLong
                        ? "bg-green-500/10 border border-green-500/20"
                        : "bg-destructive/10 border border-destructive/20"
                    }`}>
                      <span className="text-xs font-medium text-muted-foreground">Final Outcome</span>
                      <Badge
                        variant="secondary"
                        className={`text-xs font-bold ${outcomeIsLong ? "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/25" : "bg-destructive/15 text-destructive border-destructive/25"}`}
                      >
                        {outcomeLabel} {!isPriceMarket ? `(${outcomeIsLong ? yesPct.toFixed(0) : noPct.toFixed(0)}%)` : ""}
                      </Badge>
                    </div>

                    {/* Target hit info for price markets */}
                    {forecast.status === "resolved" && isPriceMarket && forecast.prediction_target != null && (
                      <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/15 shrink-0">
                          <Target className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold text-primary block">Target Hit</span>
                          <p className="text-[10px] text-muted-foreground leading-snug">
                            {forecast.project_b_id
                              ? `Outperformance reached ${forecast.prediction_direction === "long" ? "+" : "-"}${Number(forecast.prediction_target).toFixed(1)}%`
                              : `${forecastDimension === "market_cap" ? "Market cap" : "Price"} reached $${Number(forecast.prediction_target).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* User's prediction result */}
                    {userVote ? (
                      <div className={`flex items-center justify-between rounded-xl px-4 py-3 text-xs font-semibold ${
                        userCorrect
                          ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                          : "bg-destructive/10 text-destructive border border-destructive/20"
                      }`}>
                        <span>Your Prediction: {userVoteLabel}</span>
                        <span className="flex items-center gap-1">
                          {userCorrect ? (
                            <><CheckCircle2 className="h-3.5 w-3.5" /> Correct</>
                          ) : (
                            <><XCircle className="h-3.5 w-3.5" /> Incorrect</>
                          )}
                        </span>
                      </div>
                    ) : (
                      <div className="rounded-xl px-4 py-3 bg-secondary/30 border border-border/50 text-xs text-muted-foreground text-center">
                        You did not vote on this forecast
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })()}

            {/* Cast Your Vote — hide for ended price/market cap forecasts */}
            {!(isEnded && isPriceMarket) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-2xl border border-border bg-card overflow-hidden"
              >
                <div className="px-5 py-3.5 border-b border-border">
                  <h3 className="text-sm font-bold text-foreground font-['Space_Grotesk']">Cast Your Vote</h3>
                </div>
                <div className="p-5">
                  {!isEnded ? (
                    <>
                      <div className="mb-4 rounded-xl bg-secondary/30 border border-border/50 px-4 py-3.5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1.5">
                            <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-[11px] font-medium text-muted-foreground">Confidence</span>
                          </div>
                          <span className={`text-[11px] font-semibold ${confInfo.color}`}>
                            {confInfo.label} ({confidence}/5)
                          </span>
                        </div>
                        <Slider value={[confidence]} onValueChange={(val) => setConfidence(val[0])} min={1} max={5} step={1} className="w-full" />
                        <div className="flex justify-between mt-1.5 px-0.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <span key={n} className={`text-[9px] ${confidence === n ? "text-foreground font-semibold" : "text-muted-foreground/50"}`}>{n}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <button
                          onClick={() => handleVote("yes")}
                          className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all duration-200 ${
                            forecast.user_vote === "yes"
                              ? "bg-primary text-primary-foreground"
                              : "bg-primary/10 text-primary hover:bg-primary/20"
                          }`}
                        >
                          {forecast.user_vote === "yes" ? `Voted ${yesLabel} ✓` : yesLabel}
                        </button>
                        <button
                          onClick={() => handleVote("no")}
                          className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all duration-200 ${
                            forecast.user_vote === "no"
                              ? "bg-destructive text-destructive-foreground"
                              : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                          }`}
                        >
                          {forecast.user_vote === "no" ? `Voted ${noLabel} ✓` : noLabel}
                        </button>
                      </div>
                      {forecast.user_vote && (
                        <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                          className="text-[10px] text-muted-foreground text-center mt-3">
                          You voted <span className={`font-semibold ${forecast.user_vote === "yes" ? "text-primary" : "text-destructive"}`}>{forecast.user_vote === "yes" ? yesLabel : noLabel}</span> · Vote again to change
                        </motion.p>
                      )}
                    </>
                  ) : (
                    <div className="rounded-xl bg-muted/50 border border-border px-4 py-3.5 text-center">
                      <span className="text-xs font-medium text-muted-foreground">
                        Voting has ended · Final: <span className="text-foreground font-semibold">{yesPct >= 50 ? yesLabel : noLabel}</span> ({yesPct.toFixed(0)}%)
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Forecast Analysis */}
            <ForecastAnalysis forecastId={forecast.id} isEnded={isEnded} totalVotesYes={forecast.total_votes_yes} totalVotesNo={forecast.total_votes_no} predictionTarget={forecast.prediction_target} predictionDirection={forecast.prediction_direction} startPrice={forecast.start_price} forecastDimension={forecastDimension} projectAId={forecast.project_a_id} projectBId={forecast.project_b_id} projectAName={forecast.project_a?.name} projectBName={forecast.project_b?.name} isCreator={!!user && user.id === forecast.creator_user_id} />

            {/* Vote Trend chart now embedded in hero section */}

            {/* Related Forecasts removed */}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ForecastDetail;

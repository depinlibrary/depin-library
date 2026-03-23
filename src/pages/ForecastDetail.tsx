import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Clock, CalendarDays, Timer, Users, ExternalLink, Copy, ArrowUpRight, ArrowDownRight, ThumbsUp, ThumbsDown, Gauge, Target, Zap } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VoteHistoryChart from "@/components/forecast/VoteHistoryChart";
import PriceChart from "@/components/forecast/PriceChart";
import DiscussionSection from "@/components/forecast/DiscussionSection";
import RelatedForecastsList from "@/components/forecast/RelatedForecasts";
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
  useRelatedForecasts,
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
              <p className="text-xs font-bold font-['Space_Grotesk'] tabular-nums text-foreground">
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
  const { data: relatedForecasts = [] } = useRelatedForecasts(id, forecast?.project_a_id, forecast?.project_b_id);
  const voteForecast = useVoteForecast();
  const addComment = useAddForecastComment();
  const deleteComment = useDeleteForecastComment();
  const editComment = useEditForecastComment();
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
    const yesPct = totalVotes > 0 ? ((forecast.total_votes_yes / totalVotes) * 100).toFixed(0) : "50";
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
    const yesPct = totalVotes > 0 ? ((forecast.total_votes_yes / totalVotes) * 100).toFixed(0) : "50";
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
        <div className="container mx-auto px-4 pt-24 pb-16 max-w-7xl">
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
  const yesPct = totalVotes > 0 ? (forecast.total_votes_yes / totalVotes) * 100 : 50;
  const noPct = 100 - yesPct;
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

      <main className="container mx-auto px-4 pt-24 pb-16 max-w-7xl">
        {/* Breadcrumb */}
        <Link to="/forecasts" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-5">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Forecasts
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ═══════ LEFT COLUMN (2/3): Hero Card + Tabs ═══════ */}
          <div className="lg:col-span-2 space-y-4">
            {/* Hero Card — matches Forecasts page hero style */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-card overflow-hidden"
            >
              <div className="p-6 sm:p-8">
                {/* Header with project logos + live/ended indicator */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center -space-x-2">
                      {forecast.project_a?.logo_url ? (
                        <img src={forecast.project_a.logo_url} alt={forecast.project_a.name} className="w-10 h-10 rounded-xl object-contain border-2 border-card bg-secondary relative z-10" />
                      ) : (
                        <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border-2 border-card bg-secondary relative z-10">{forecast.project_a?.logo_emoji || "⬡"}</span>
                      )}
                      {forecast.project_b && (
                        forecast.project_b.logo_url ? (
                          <img src={forecast.project_b.logo_url} alt={forecast.project_b.name} className="w-10 h-10 rounded-xl object-contain border-2 border-card bg-secondary" />
                        ) : (
                          <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border-2 border-card bg-secondary">{forecast.project_b?.logo_emoji || "⬡"}</span>
                        )
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        <Link to={`/project/${forecast.project_a?.slug}`} className="hover:text-foreground transition-colors">
                          {forecast.project_a?.name}
                        </Link>
                        {forecast.project_b && (
                          <>
                            {" · "}
                            <Link to={`/project/${forecast.project_b?.slug}`} className="hover:text-foreground transition-colors">
                              {forecast.project_b?.name}
                            </Link>
                          </>
                        )}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          {!isEnded && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-green-500" />
                          )}
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${isEnded ? 'bg-destructive animate-pulse' : 'bg-green-500'}`} />
                        </span>
                        <span className={`text-[10px] font-semibold ${isEnded ? 'text-destructive' : 'text-green-500'}`}>
                          {isEnded ? 'Ended' : `Live · ${timeLeft}`}
                        </span>
                      </span>
                    </div>
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

                {/* Title */}
                <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight mb-3 font-['Space_Grotesk'] tracking-tight">
                  {forecast.title}
                </h1>

                {/* Target Hit Banner — only for auto-resolved price/mcap forecasts */}
                {forecast.status === "resolved" && isPriceMarket && forecast.prediction_target != null && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="mb-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 flex items-center gap-3 glow-primary-sm relative overflow-hidden"
                  >
                    {/* Shimmer overlay */}
                    <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{
                      background: 'linear-gradient(105deg, transparent 40%, hsl(var(--primary)) 50%, transparent 60%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 3s ease-in-out infinite',
                    }} />
                    <motion.div
                      className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/15 shrink-0"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Target className="h-4 w-4 text-primary" />
                    </motion.div>
                    <div className="flex-1 min-w-0 relative">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-bold text-primary">Target Hit</span>
                        <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}>
                          <Zap className="h-3 w-3 text-primary" />
                        </motion.div>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        Auto-resolved early — {forecastDimension === "market_cap" ? "market cap" : "token price"}{" "}
                        reached the {forecast.prediction_direction === "long" ? "long" : "short"} target of{" "}
                        <span className="font-semibold text-foreground">
                          ${Number(forecast.prediction_target).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                        </span>
                      </p>
                    </div>
                    <Badge variant="outline" className="border-primary/40 text-primary text-[10px] shrink-0 relative">
                      Early Close
                    </Badge>
                  </motion.div>
                )}

                {/* Vote outcomes — Polymarket style */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/10 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">{yesLabel}</span>
                      <span className="text-[10px] text-muted-foreground">{forecast.total_votes_yes} votes</span>
                      {forecast.avg_confidence_yes != null && (
                        <span className="text-[10px] text-primary/60 flex items-center gap-0.5">
                          <Gauge className="h-3 w-3" /> {forecast.avg_confidence_yes.toFixed(1)}/5
                        </span>
                      )}
                    </div>
                    <span className="text-xl font-bold text-foreground font-['Space_Grotesk']">{yesPct.toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-destructive/5 border border-destructive/10 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <ArrowDownRight className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-semibold text-foreground">{noLabel}</span>
                      <span className="text-[10px] text-muted-foreground">{forecast.total_votes_no} votes</span>
                      {forecast.avg_confidence_no != null && (
                        <span className="text-[10px] text-destructive/60 flex items-center gap-0.5">
                          <Gauge className="h-3 w-3" /> {forecast.avg_confidence_no.toFixed(1)}/5
                        </span>
                      )}
                    </div>
                    <span className="text-xl font-bold text-foreground font-['Space_Grotesk']">{noPct.toFixed(0)}%</span>
                  </div>
                </div>

                {/* Final result badge + Your Prediction if ended */}
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
                    <div className="space-y-2">
                      <div className="flex items-center justify-end">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-semibold ${outcomeIsLong ? "bg-primary/10 text-primary border-primary/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}
                        >
                          Result: {outcomeLabel} {isPriceMarket ? (outcomeIsLong ? "📈" : "📉") : `(${outcomeIsLong ? yesPct.toFixed(0) : noPct.toFixed(0)}%)`}
                        </Badge>
                      </div>
                      {userVote && (
                        <div className={`flex items-center justify-between rounded-lg px-4 py-2.5 text-xs font-semibold ${
                          userCorrect
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "bg-destructive/10 text-destructive border border-destructive/20"
                        }`}>
                          <span>Your Prediction: {userVoteLabel}</span>
                          <span>{userCorrect ? "Correct 🎯" : "Incorrect"}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Market Stats row */}
                <div className="mt-4 pt-4 border-t border-border grid grid-cols-4 gap-3">
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Total Votes</p>
                    <p className="text-sm font-bold text-foreground font-['Space_Grotesk']">{totalVotes.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground mb-0.5">{yesLabel} Votes</p>
                    <p className="text-sm font-bold text-primary font-['Space_Grotesk']">{forecast.total_votes_yes}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground mb-0.5">{noLabel} Votes</p>
                    <p className="text-sm font-bold text-destructive font-['Space_Grotesk']">{forecast.total_votes_no}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Comments</p>
                    <p className="text-sm font-bold text-foreground font-['Space_Grotesk']">{comments.length}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Vote History Chart — for community sentiment, show here in left column */}
            {forecastDimension !== "token_price" && forecastDimension !== "market_cap" && (
              <VoteHistoryChart voteHistory={voteHistory} />
            )}

            {/* Price / Market Cap Chart for token_price or market_cap forecasts */}
            {(forecastDimension === "token_price" || forecastDimension === "market_cap") && forecast.project_a_id && (
              <PriceChart
                projects={[
                  { projectId: forecast.project_a_id, projectName: forecast.project_a?.name || "Project A" },
                  ...(forecast.project_b_id ? [{ projectId: forecast.project_b_id, projectName: forecast.project_b?.name || "Project B" }] : []),
                ]}
                dimension={forecastDimension as "token_price" | "market_cap"}
              />
            )}

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

          {/* ═══════ RIGHT COLUMN (1/3): Creator + Vote + Analysis + Related ═══════ */}
          <div className="space-y-4">
            {/* Creator Card — compact with countdown */}
            <CreatorCardWithCountdown forecast={forecast} isEnded={isEnded} timeLeft={timeLeft} />

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
            <ForecastAnalysis forecastId={forecast.id} isEnded={isEnded} totalVotesYes={forecast.total_votes_yes} totalVotesNo={forecast.total_votes_no} predictionTarget={forecast.prediction_target} predictionDirection={forecast.prediction_direction} startPrice={forecast.start_price} forecastDimension={forecastDimension} projectAId={forecast.project_a_id} projectBId={forecast.project_b_id} projectAName={forecast.project_a?.name} projectBName={forecast.project_b?.name} />

            {/* Vote Trend — for token_price/market_cap, show in right column below analysis */}
            {(forecastDimension === "token_price" || forecastDimension === "market_cap") && (
              <VoteHistoryChart voteHistory={voteHistory} />
            )}

            {/* Related Forecasts — column layout */}
            {relatedForecasts.length > 0 && (
              <RelatedForecastsList forecasts={relatedForecasts} />
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ForecastDetail;

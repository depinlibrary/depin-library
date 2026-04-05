import { useState, useEffect, useMemo } from "react";
import { getWeightedChance } from "@/lib/predictionUtils";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Clock, CalendarDays, Timer, Users, ExternalLink, Copy, ArrowUpRight, ArrowDownRight, ThumbsUp, ThumbsDown, Gauge, Target, Zap, CheckCircle2, XCircle, TrendingUp, TrendingDown, Minus, Trophy, DollarSign, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import DiscussionSection from "@/components/prediction/DiscussionSection";
import PredictionAnalysis from "@/components/prediction/PredictionAnalysis";
import UserAvatar from "@/components/UserAvatar";
import UserStatsHoverCard from "@/components/UserStatsHoverCard";
import { useAuth } from "@/contexts/AuthContext";
import { useVotePrediction } from "@/hooks/usePredictions";
import {
  usePredictionDetail,
  usePredictionComments,
  useAddPredictionComment,
  useDeletePredictionComment,
  useEditPredictionComment,
} from "@/hooks/usePredictionDetail";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PriceChart from "@/components/prediction/PriceChart";
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

function CreatorCardWithCountdown({ prediction, isEnded, timeLeft }: { prediction: any; isEnded: boolean; timeLeft: string }) {
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (isEnded) {
      setCountdown("Ended");
      return;
    }
    const tick = () => {
      const now = Date.now();
      const end = new Date(prediction.end_date).getTime();
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
  }, [prediction.end_date, isEnded]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <UserStatsHoverCard userId={prediction.creator_user_id} displayName={prediction.creator_name} avatarUrl={prediction.creator_avatar_url}>
            <div className="flex items-center gap-3 cursor-pointer group">
              <UserAvatar avatarUrl={prediction.creator_avatar_url} displayName={prediction.creator_name} size="md" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{prediction.creator_name}</span>
                <span className="text-[10px] text-muted-foreground">Prediction Creator</span>
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
            <p className="text-[11px] font-medium text-foreground">{format(new Date(prediction.created_at), "MMM d, yyyy")}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">{isEnded ? "Ended" : "Ends"}</p>
            <p className="text-[11px] font-medium text-foreground">{format(new Date(prediction.end_date), "MMM d, yyyy")}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const PredictionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: prediction, isLoading } = usePredictionDetail(id);
  const { data: comments = [], isLoading: commentsLoading } = usePredictionComments(id);
  const votePrediction = useVotePrediction();
  const addComment = useAddPredictionComment();
  const deleteComment = useDeletePredictionComment();
  const editComment = useEditPredictionComment();
  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [confidence, setConfidence] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(`prediction-confidence-${id}`);
      return saved ? parseInt(saved, 10) : 3;
    }
    return 3;
  });

  // Persist confidence to sessionStorage when it changes
  useEffect(() => {
    if (id) sessionStorage.setItem(`prediction-confidence-${id}`, String(confidence));
  }, [confidence, id]);

  // Fetch prediction dimension (token_price, market_cap, community_sentiment, etc.)
  const { data: predictionDimension } = useQuery({
    queryKey: ["prediction-dimension", id],
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

  const { data: voteStats } = useQuery({
    queryKey: ["prediction-vote-stats", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_forecast_vote_stats", { p_forecast_id: id! });
      if (error) throw error;
      return data?.[0] || null;
    },
  });

  // Dynamic OG meta tags
  useEffect(() => {
    if (!prediction) return;
    const totalVotes = prediction.total_votes_yes + prediction.total_votes_no;
    const { yesPct: yesPctNum } = getWeightedChance(prediction);
    const yesPct = yesPctNum.toFixed(0);
    const projectNames = [prediction.project_a?.name, prediction.project_b?.name].filter(Boolean).join(" vs ");
    const title = `${prediction.title} — DePIN Prediction`;
    const description = `${yesPct}% Yes · ${totalVotes} votes · ${projectNames} — ${prediction.description?.slice(0, 120) || "Community prediction on DePIN projects"}`;
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
  }, [prediction]);

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
    if (!prediction?.user_vote) { fireConfetti(); toast.success("🎉 Vote cast! Nice prediction."); }
    votePrediction.mutate({ predictionId: id, vote, confidenceLevel: confidence });
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    if (!user) { toast.error("Sign in to comment"); return; }
    if (!id) return;
    try {
      await addComment.mutateAsync({ predictionId: id, commentText: commentText.trim() });
      setCommentText("");
    } catch { toast.error("Failed to post comment"); }
  };

  const handleShareX = () => {
    if (!prediction) return;
    const totalVotes = prediction.total_votes_yes + prediction.total_votes_no;
    const { yesPct: yesPctNum } = getWeightedChance(prediction);
    const yesPct = yesPctNum.toFixed(0);
    const ogUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-prediction?id=${prediction.id}&site=${encodeURIComponent(window.location.origin)}`;
    const text = `${prediction.title} — ${yesPct}% Yes | ${totalVotes} votes`;
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(ogUrl)}`, "_blank", "noopener,noreferrer,width=550,height=420");
  };

  const handleCopyLink = () => {
    if (!prediction) return;
    const ogUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-prediction?id=${prediction.id}&site=${encodeURIComponent(window.location.origin)}`;
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

  if (!prediction) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="container mx-auto px-4 pt-28 pb-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Prediction not found</h1>
          <Link to="/forecasts" className="text-primary hover:underline text-sm">← Back to Predictions</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const totalVotes = prediction.total_votes_yes + prediction.total_votes_no;
  const { yesPct, noPct } = getWeightedChance(prediction);
  const isEnded = new Date(prediction.end_date) <= new Date();
  const timeLeft = getTimeRemaining(prediction.end_date);
  const confInfo = confidenceLabels[confidence] || confidenceLabels[3];
  const isPriceMarket = predictionDimension === "token_price" || predictionDimension === "market_cap";
  const yesLabel = isPriceMarket ? "Long" : "Yes";
  const noLabel = isPriceMarket ? "Short" : "No";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="container mx-auto px-4 pt-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* ═══════ LEFT COLUMN (2/3): Hero Card + Tabs ═══════ */}
          <div className="lg:col-span-2 lg:pt-4 lg:pb-16">
            {/* Breadcrumb */}
            <Link to="/forecasts" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-5">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Predictions
            </Link>
            <div className="space-y-4">
            {/* Hero Card — compact header with project + title + odds */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-card overflow-hidden"
            >
              <div className="p-6 sm:p-8">
                {/* Top row: project context + share */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex items-center -space-x-1.5 shrink-0">
                      {prediction.project_a?.logo_url ? (
                        <img src={prediction.project_a.logo_url} alt={prediction.project_a.name} className="w-8 h-8 rounded-lg object-contain bg-secondary border border-card relative z-10" />
                      ) : (
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-secondary border border-card relative z-10">{prediction.project_a?.logo_emoji || "⬡"}</span>
                      )}
                      {prediction.project_b && (
                        prediction.project_b.logo_url ? (
                          <img src={prediction.project_b.logo_url} alt={prediction.project_b.name} className="w-8 h-8 rounded-lg object-contain bg-secondary border border-card relative z-0" />
                        ) : (
                          <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-secondary border border-card relative z-0">{prediction.project_b?.logo_emoji || "⬡"}</span>
                        )
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Link to={`/project/${prediction.project_a?.slug}`} className="font-medium hover:text-foreground transition-colors">{prediction.project_a?.name}</Link>
                        {prediction.project_b && (
                          <>
                            <span className="text-muted-foreground/40">vs</span>
                            <Link to={`/project/${prediction.project_b?.slug}`} className="font-medium hover:text-foreground transition-colors">{prediction.project_b?.name}</Link>
                          </>
                        )}
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          isEnded ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isEnded ? "bg-destructive" : "bg-primary"}`} />
                          {isEnded ? "Ended" : "Live"}
                        </span>
                        {!isEnded && <span className="text-[11px] text-muted-foreground">{timeLeft}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={handleShareX} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Share on X">
                      <ExternalLink className="h-4 w-4" />
                    </button>
                    <button onClick={handleCopyLink} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Copy link">
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight mb-6 font-['Space_Grotesk'] tracking-tight">
                  {prediction.title}
                </h1>

                {/* Odds pills — stacked */}
                <div className="flex flex-col gap-3">
                  <div className="flex w-full items-center justify-between rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm font-bold text-foreground">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      {yesLabel}
                    </span>
                    <span className="font-['Space_Grotesk'] text-base tabular-nums text-primary">{yesPct.toFixed(0)}%</span>
                  </div>
                  <div className="flex w-full items-center justify-between rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm font-bold text-foreground">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-destructive" />
                      {noLabel}
                    </span>
                    <span className="font-['Space_Grotesk'] text-base tabular-nums text-destructive">{noPct.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
              </motion.div>

              {isPriceMarket && (
                <PriceChart
                  projects={[
                    {
                      projectId: prediction.project_a_id,
                      projectName: prediction.project_a?.name || "Project A",
                    },
                    ...(prediction.project_b && prediction.project_b_id
                      ? [{ projectId: prediction.project_b_id, projectName: prediction.project_b?.name || "Project B" }]
                      : []),
                  ]}
                  dimension={predictionDimension as "token_price" | "market_cap"}
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
                  <h3 className="text-sm font-bold text-foreground mb-3 font-['Space_Grotesk']">About This Prediction</h3>
                  {prediction.description ? (
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{prediction.description}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground/60 italic">No description provided.</p>
                  )}

                  {/* Project info */}
                  <div className="mt-6 pt-4 border-t border-border">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Projects</h4>
                    <div className="space-y-2">
                      <Link to={`/project/${prediction.project_a?.slug}`} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-secondary/50 transition-colors">
                        {prediction.project_a?.logo_url ? (
                          <img src={prediction.project_a.logo_url} alt={prediction.project_a.name} className="w-8 h-8 rounded-lg object-contain bg-secondary" />
                        ) : (
                          <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-secondary">{prediction.project_a?.logo_emoji || "⬡"}</span>
                        )}
                        <div>
                          <p className="text-xs font-semibold text-foreground">{prediction.project_a?.name}</p>
                          {prediction.project_a?.tagline && <p className="text-[10px] text-muted-foreground line-clamp-1">{prediction.project_a.tagline}</p>}
                        </div>
                      </Link>
                      {prediction.project_b && (
                        <Link to={`/project/${prediction.project_b?.slug}`} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-secondary/50 transition-colors">
                          {prediction.project_b?.logo_url ? (
                            <img src={prediction.project_b.logo_url} alt={prediction.project_b.name} className="w-8 h-8 rounded-lg object-contain bg-secondary" />
                          ) : (
                            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-secondary">{prediction.project_b?.logo_emoji || "⬡"}</span>
                          )}
                          <div>
                            <p className="text-xs font-semibold text-foreground">{prediction.project_b?.name}</p>
                            {prediction.project_b?.tagline && <p className="text-[10px] text-muted-foreground line-clamp-1">{prediction.project_b.tagline}</p>}
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
                        <span className="font-medium text-foreground">{format(new Date(prediction.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1.5"><Timer className="h-3 w-3" /> {isEnded ? "Ended" : "Ends"}</span>
                        <span className="font-medium text-foreground">{format(new Date(prediction.end_date), "MMM d, yyyy 'at' h:mm a")}</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Comments Tab */}
                <TabsContent value="comments" className="mt-0">
                  <div className="p-6">
                    <DiscussionSection
                      predictionId={prediction.id}
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
                      onEditComment={(commentId, predictionId, text) => editComment.mutate({ commentId, predictionId, commentText: text })}
                      editCommentPending={editComment.isPending}
                      onDeleteComment={(commentId, predictionId) => deleteComment.mutate({ commentId, predictionId })}
                    />
                  </div>
                </TabsContent>

                {/* Votes Tab */}
                <TabsContent value="votes" className="mt-0">
                  <div className="p-6">
                    {!voteStats || (Number(voteStats.total_yes) === 0 && Number(voteStats.total_no) === 0) ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No votes yet. Be the first to vote!</p>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-secondary/30">
                          <div className="flex items-center gap-2">
                            <ThumbsUp className="h-4 w-4 text-primary" />
                            <span className="text-sm font-semibold text-foreground">{yesLabel}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">{Number(voteStats.total_yes)} votes</span>
                            {voteStats.avg_confidence_yes && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Gauge className="h-2.5 w-2.5" /> Avg {Number(voteStats.avg_confidence_yes).toFixed(1)}/5
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-secondary/30">
                          <div className="flex items-center gap-2">
                            <ThumbsDown className="h-4 w-4 text-destructive" />
                            <span className="text-sm font-semibold text-foreground">{noLabel}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">{Number(voteStats.total_no)} votes</span>
                            {voteStats.avg_confidence_no && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Gauge className="h-2.5 w-2.5" /> Avg {Number(voteStats.avg_confidence_no).toFixed(1)}/5
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center">Individual votes are kept private to prevent bias</p>
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
            <CreatorCardWithCountdown prediction={prediction} isEnded={isEnded} timeLeft={timeLeft} />

            {isEnded && (() => {
              const outcomeResult = prediction.outcome
                ? prediction.outcome
                : (yesPct >= 50 ? "yes" : "no");
              const outcomeLabel = outcomeResult === "yes" ? yesLabel : noLabel;
              const outcomeIsLong = outcomeResult === "yes";
              const userVote = prediction.user_vote;
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
                    <h3 className="text-sm font-bold text-foreground font-['Space_Grotesk']">Prediction Results</h3>
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
                    {prediction.status === "resolved" && isPriceMarket && prediction.prediction_target != null && (
                      <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/15 shrink-0">
                          <Target className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold text-primary block">Target Hit</span>
                          <p className="text-[10px] text-muted-foreground leading-snug">
                            {prediction.project_b_id
                              ? `Outperformance reached ${prediction.prediction_direction === "long" ? "+" : "-"}${Number(prediction.prediction_target).toFixed(1)}%`
                              : `${predictionDimension === "market_cap" ? "Market cap" : "Price"} reached $${Number(prediction.prediction_target).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`}
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
                        You did not vote on this prediction
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
                            prediction.user_vote === "yes"
                              ? "bg-primary text-primary-foreground"
                              : "bg-primary/10 text-primary hover:bg-primary/20"
                          }`}
                        >
                          {prediction.user_vote === "yes" ? `Voted ${yesLabel} ✓` : yesLabel}
                        </button>
                        <button
                          onClick={() => handleVote("no")}
                          className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all duration-200 ${
                            prediction.user_vote === "no"
                              ? "bg-destructive text-destructive-foreground"
                              : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                          }`}
                        >
                          {prediction.user_vote === "no" ? `Voted ${noLabel} ✓` : noLabel}
                        </button>
                      </div>
                      {prediction.user_vote && (
                        <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                          className="text-[10px] text-muted-foreground text-center mt-3">
                          You voted <span className={`font-semibold ${prediction.user_vote === "yes" ? "text-primary" : "text-destructive"}`}>{prediction.user_vote === "yes" ? yesLabel : noLabel}</span> · Note you can't change vote
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

            {/* Prediction Analysis */}
            <PredictionAnalysis predictionId={prediction.id} isEnded={isEnded} totalVotesYes={prediction.total_votes_yes} totalVotesNo={prediction.total_votes_no} predictionTarget={prediction.prediction_target} predictionDirection={prediction.prediction_direction} startPrice={prediction.start_price} predictionDimension={predictionDimension} projectAId={prediction.project_a_id} projectBId={prediction.project_b_id} projectAName={prediction.project_a?.name} projectBName={prediction.project_b?.name} isCreator={!!user && user.id === prediction.creator_user_id} />

            {/* Vote Trend chart now embedded in hero section */}

            {/* Related Predictions removed */}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PredictionDetail;

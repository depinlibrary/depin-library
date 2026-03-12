import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Clock, CalendarDays, Timer, Users, ExternalLink, Copy, ArrowUpRight, ArrowDownRight, ThumbsUp, ThumbsDown, Gauge, BarChart3, Flame, Eye, ChevronRight as ChevronRightIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import VoteHistoryChart from "@/components/forecast/VoteHistoryChart";
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
  const [confidence, setConfidence] = useState(3);

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

  // Chart data for vote sentiment
  const chartData = useMemo(() => {
    if (!forecast) return [];
    const t = forecast.total_votes_yes + forecast.total_votes_no;
    if (t === 0) return [
      { name: "Yes", value: 50, fill: "hsl(var(--primary))" },
      { name: "No", value: 50, fill: "hsl(var(--destructive))" },
    ];
    return [
      { name: "Yes", value: forecast.total_votes_yes, fill: "hsl(var(--primary))" },
      { name: "No", value: forecast.total_votes_no, fill: "hsl(var(--destructive))" },
    ];
  }, [forecast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-16 max-w-6xl">
          <Skeleton className="h-5 w-32 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-[520px] w-full rounded-2xl" />
              <Skeleton className="h-[250px] w-full rounded-2xl" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-[200px] w-full rounded-2xl" />
              <Skeleton className="h-[180px] w-full rounded-2xl" />
              <Skeleton className="h-[200px] w-full rounded-2xl" />
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="container mx-auto px-4 pt-24 pb-16 max-w-6xl">
        {/* Breadcrumb */}
        <Link to="/forecasts" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-5">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Forecasts
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ═══════ LEFT COLUMN: Hero-style card + Chart + Comments ═══════ */}
          <div className="lg:col-span-2 space-y-4">
            {/* Hero Card — mirrors Forecasts page hero style */}
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
                      {/* Blinking live/ended indicator */}
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
                <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight mb-5 font-['Space_Grotesk'] tracking-tight">
                  {forecast.title}
                </h1>

                {/* Vote outcomes — Polymarket style */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/10 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">Yes</span>
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
                      <span className="text-sm font-semibold text-foreground">No</span>
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

                {/* Vote bar */}
                <div className="h-2.5 rounded-full bg-secondary/80 overflow-hidden flex shadow-inner mb-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${yesPct}%` }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-l-full bg-gradient-to-r from-primary to-primary/80"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${noPct}%` }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-r-full bg-gradient-to-r from-destructive/60 to-destructive/80"
                  />
                </div>

                {/* Total votes */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{totalVotes.toLocaleString()} total votes</span>
                  </div>
                  {isEnded && (
                    <Badge variant="secondary" className="text-[10px] font-semibold">
                      Final: {yesPct >= 50 ? "Yes" : "No"} ({yesPct >= 50 ? yesPct.toFixed(0) : noPct.toFixed(0)}%)
                    </Badge>
                  )}
                </div>

                {/* Sentiment chart — matches Forecasts hero style */}
                <div className="mt-5 pt-5 border-t border-border">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sentiment · {forecast.project_a?.name}</h3>
                  </div>
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="detailYesGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="detailNoGrad" x1="0" y1="0" x2="0" y2="1">
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
                        <Area type="monotone" dataKey="value" name="Votes" stroke="hsl(var(--primary))" fill="url(#detailYesGrad)" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--primary))", stroke: "hsl(var(--card))", strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Vote History Chart */}
            <VoteHistoryChart voteHistory={voteHistory} />

            {/* Discussion */}
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

          {/* ═══════ RIGHT COLUMN: Creator + Voting + Analysis ═══════ */}
          <div className="space-y-4">
            {/* Creator Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-2xl border border-border bg-card overflow-hidden"
            >
              <div className="px-5 py-3.5 border-b border-border">
                <h3 className="text-sm font-bold text-foreground font-['Space_Grotesk']">Creator</h3>
              </div>
              <div className="p-5">
                <UserStatsHoverCard userId={forecast.creator_user_id} displayName={forecast.creator_name} avatarUrl={forecast.creator_avatar_url}>
                  <div className="flex items-center gap-3 cursor-pointer group">
                    <UserAvatar avatarUrl={forecast.creator_avatar_url} displayName={forecast.creator_name} size="md" />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{forecast.creator_name}</span>
                      <span className="text-[10px] text-muted-foreground">Forecast Creator</span>
                    </div>
                  </div>
                </UserStatsHoverCard>
                <div className="mt-4 pt-4 border-t border-border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <CalendarDays className="h-3 w-3" /> Created
                    </span>
                    <span className="text-[11px] font-medium text-foreground">{format(new Date(forecast.created_at), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <Timer className="h-3 w-3" /> Ends
                    </span>
                    <span className="text-[11px] font-medium text-foreground">{format(new Date(forecast.end_date), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3 w-3" /> Status
                    </span>
                    <Badge variant={isEnded ? "secondary" : "default"} className={`text-[10px] ${!isEnded ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/10" : ""}`}>
                      {isEnded ? "Ended" : timeLeft}
                    </Badge>
                  </div>
                </div>
                {forecast.description && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{forecast.description}</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Vote Controls */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-border bg-card overflow-hidden"
            >
              <div className="px-5 py-3.5 border-b border-border">
                <h3 className="text-sm font-bold text-foreground font-['Space_Grotesk']">Cast Your Vote</h3>
              </div>
              <div className="p-5">
                {!isEnded ? (
                  <>
                    {/* Confidence slider */}
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

                    {/* Vote buttons */}
                    <div className="flex gap-2.5">
                      <Button
                        onClick={() => handleVote("yes")}
                        variant={forecast.user_vote === "yes" ? "default" : "outline"}
                        className={`flex-1 gap-2 h-11 text-sm font-semibold transition-all rounded-xl ${
                          forecast.user_vote === "yes" ? "shadow-md shadow-primary/20" : ""
                        }`}
                      >
                        <ThumbsUp className="h-4 w-4" />
                        {forecast.user_vote === "yes" ? "Voted Yes ✓" : "Yes"}
                      </Button>
                      <Button
                        onClick={() => handleVote("no")}
                        variant={forecast.user_vote === "no" ? "destructive" : "outline"}
                        className={`flex-1 gap-2 h-11 text-sm font-semibold transition-all rounded-xl ${
                          forecast.user_vote === "no" ? "shadow-md shadow-destructive/20" : ""
                        }`}
                      >
                        <ThumbsDown className="h-4 w-4" />
                        {forecast.user_vote === "no" ? "Voted No ✓" : "No"}
                      </Button>
                    </div>
                    {forecast.user_vote && (
                      <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                        className="text-[10px] text-muted-foreground text-center mt-3">
                        You voted <span className={`font-semibold ${forecast.user_vote === "yes" ? "text-primary" : "text-destructive"}`}>{forecast.user_vote === "yes" ? "Yes" : "No"}</span> · Vote again to change
                      </motion.p>
                    )}
                  </>
                ) : (
                  <div className="rounded-xl bg-muted/50 border border-border px-4 py-3.5 text-center">
                    <span className="text-xs font-medium text-muted-foreground">
                      Voting has ended · Final: <span className="text-foreground font-semibold">{yesPct >= 50 ? "Yes" : "No"}</span> ({yesPct.toFixed(0)}%)
                    </span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Market Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl border border-border bg-card overflow-hidden"
            >
              <div className="px-5 py-3.5 border-b border-border">
                <h3 className="text-sm font-bold text-foreground font-['Space_Grotesk']">Market Stats</h3>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total Votes</span>
                  <span className="text-sm font-bold text-foreground font-['Space_Grotesk']">{totalVotes.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Yes Votes</span>
                  <span className="text-sm font-bold text-primary font-['Space_Grotesk']">{forecast.total_votes_yes}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">No Votes</span>
                  <span className="text-sm font-bold text-destructive font-['Space_Grotesk']">{forecast.total_votes_no}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Comments</span>
                  <span className="text-sm font-bold text-foreground font-['Space_Grotesk']">{comments.length}</span>
                </div>
              </div>
            </motion.div>

            {/* Forecast Analysis */}
            <ForecastAnalysis forecastId={forecast.id} isEnded={isEnded} />

            {/* Related Forecasts */}
            <RelatedForecastsList forecasts={relatedForecasts} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ForecastDetail;

import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, ThumbsUp, ThumbsDown, Users, Timer, MessageSquare,
  Send, Trash2, CalendarDays, User as UserIcon, ArrowRight, Pencil, Check, X, Share2, Copy, ExternalLink
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import { format, formatDistanceToNow } from "date-fns";

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

  const handleVote = (vote: "yes" | "no") => {
    if (!user) { toast.error("Sign in to vote"); return; }
    if (!id) return;
    voteForecast.mutate({ forecastId: id, vote });
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    if (!user) { toast.error("Sign in to comment"); return; }
    if (!id) return;
    try {
      await addComment.mutateAsync({ forecastId: id, commentText: commentText.trim() });
      setCommentText("");
    } catch {
      toast.error("Failed to post comment");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="container mx-auto px-4 pt-28 pb-16 max-w-3xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-12 w-full mb-4" />
          <Skeleton className="h-24 w-full mb-6" />
          <Skeleton className="h-64 w-full mb-6" />
          <Skeleton className="h-48 w-full" />
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="container mx-auto px-4 pt-28 pb-16 max-w-3xl">
        {/* Back link */}
        <Link to="/forecasts" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Forecasts
        </Link>

        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card overflow-hidden mb-6"
        >
          <div className="p-6">
            {/* Project badges */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center -space-x-2">
                {forecast.project_a?.logo_url ? (
                  <img src={forecast.project_a.logo_url} alt={forecast.project_a.name} className="w-9 h-9 rounded-[7px] object-contain border-2 border-card bg-secondary relative z-10" />
                ) : (
                  <span className="w-9 h-9 rounded-[7px] flex items-center justify-center text-base border-2 border-card bg-secondary relative z-10">{forecast.project_a?.logo_emoji || "⬡"}</span>
                )}
                {forecast.project_b && (
                  forecast.project_b.logo_url ? (
                    <img src={forecast.project_b.logo_url} alt={forecast.project_b.name} className="w-9 h-9 rounded-[7px] object-contain border-2 border-card bg-secondary" />
                  ) : (
                    <span className="w-9 h-9 rounded-[7px] flex items-center justify-center text-base border-2 border-card bg-secondary">{forecast.project_b?.logo_emoji || "⬡"}</span>
                  )
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link to={`/project/${forecast.project_a?.slug}`} className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                  {forecast.project_a?.name}
                </Link>
                {forecast.project_b && (
                  <>
                    <span className="text-muted-foreground/40 text-xs">vs</span>
                    <Link to={`/project/${forecast.project_b?.slug}`} className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                      {forecast.project_b?.name}
                    </Link>
                  </>
                )}
              </div>
              <span className={`ml-auto shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold tracking-wide ${
                isEnded ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
              }`}>
                {timeLeft}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight mb-3 font-['Space_Grotesk']">
              {forecast.title}
            </h1>

            {/* Description */}
            {forecast.description && (
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 whitespace-pre-wrap">
                {forecast.description}
              </p>
            )}

            {/* Meta row */}
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground/70">
              <span className="flex items-center gap-1"><UserIcon className="h-3 w-3" /> {forecast.creator_name}</span>
              <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {format(new Date(forecast.created_at), "MMM d, yyyy")}</span>
              <span className="flex items-center gap-1"><Timer className="h-3 w-3" /> Ends {format(new Date(forecast.end_date), "MMM d, yyyy")}</span>
            </div>
          </div>

          {/* Vote bar + buttons */}
          <div className="border-t border-border px-6 py-5">
            <div className="flex items-end justify-between mb-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-foreground font-['Space_Grotesk']">{yesPct.toFixed(0)}%</span>
                <span className="text-[11px] font-medium text-primary/70 uppercase tracking-wider">Yes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground/50" />
                <span className="text-xs text-muted-foreground">{totalVotes.toLocaleString()} votes</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[11px] font-medium text-destructive/70 uppercase tracking-wider">No</span>
                <span className="text-2xl font-bold text-foreground font-['Space_Grotesk']">{noPct.toFixed(0)}%</span>
              </div>
            </div>
            <div className="h-3 rounded-full bg-secondary overflow-hidden flex mb-4">
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

            {!isEnded && (
              <div className="flex gap-3">
                <Button
                  onClick={() => handleVote("yes")}
                  variant={forecast.user_vote === "yes" ? "default" : "outline"}
                  className="flex-1 gap-2"
                >
                  <ThumbsUp className="h-4 w-4" /> Vote Yes
                </Button>
                <Button
                  onClick={() => handleVote("no")}
                  variant={forecast.user_vote === "no" ? "destructive" : "outline"}
                  className="flex-1 gap-2"
                >
                  <ThumbsDown className="h-4 w-4" /> Vote No
                </Button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Vote History Chart */}
        {voteHistory.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-border bg-card p-6 mb-6"
          >
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Timer className="h-4 w-4 text-primary" /> Vote History
            </h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={voteHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="yesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="noGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Area type="monotone" dataKey="yes_count" name="Yes" stroke="hsl(var(--primary))" fill="url(#yesGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="no_count" name="No" stroke="hsl(var(--destructive))" fill="url(#noGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Comments Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-border bg-card overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Discussion
              <span className="text-muted-foreground font-normal">({comments.length})</span>
            </h2>
          </div>

          {/* Comment input */}
          {user ? (
            <div className="px-6 py-4 border-b border-border bg-secondary/30">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <UserIcon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 space-y-2">
                  <Textarea
                    placeholder="Share your thoughts on this forecast..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="min-h-[80px] text-sm bg-background resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddComment();
                    }}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">⌘ + Enter to submit</span>
                    <Button
                      size="sm"
                      onClick={handleAddComment}
                      disabled={!commentText.trim() || addComment.isPending}
                      className="gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" /> Post
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-6 py-4 border-b border-border text-center">
              <Link to="/auth" className="text-sm text-primary hover:underline">Sign in to join the discussion</Link>
            </div>
          )}

          {/* Comments list */}
          <div className="divide-y divide-border">
            {commentsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-6 py-4">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))
            ) : comments.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No comments yet. Be the first to share your thoughts!</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="px-6 py-4 group/comment">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                      <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-foreground">{comment.display_name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                        {user?.id === comment.user_id && editingCommentId !== comment.id && (
                          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setEditingCommentId(comment.id); setEditingText(comment.comment_text); }}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => deleteComment.mutate({ commentId: comment.id, forecastId: forecast.id })}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                      {editingCommentId === comment.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="min-h-[60px] text-sm bg-background resize-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && editingText.trim()) {
                                editComment.mutate({ commentId: comment.id, forecastId: forecast.id, commentText: editingText.trim() });
                                setEditingCommentId(null);
                              }
                              if (e.key === "Escape") setEditingCommentId(null);
                            }}
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={() => setEditingCommentId(null)}
                            >
                              <X className="h-3 w-3" /> Cancel
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 text-xs gap-1"
                              disabled={!editingText.trim() || editComment.isPending}
                              onClick={() => {
                                editComment.mutate({ commentId: comment.id, forecastId: forecast.id, commentText: editingText.trim() });
                                setEditingCommentId(null);
                              }}
                            >
                              <Check className="h-3 w-3" /> Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{comment.comment_text}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Related Forecasts */}
        {relatedForecasts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6"
          >
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-primary" /> Related Forecasts
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {relatedForecasts.map((rf: any) => {
                const total = rf.total_votes_yes + rf.total_votes_no;
                const yesPct = total > 0 ? (rf.total_votes_yes / total) * 100 : 50;
                const isEnded = new Date(rf.end_date) <= new Date();
                return (
                  <Link
                    key={rf.id}
                    to={`/forecasts/${rf.id}`}
                    className="rounded-xl border border-border bg-card p-4 hover:border-primary/20 hover:shadow-md hover:shadow-primary/5 transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center -space-x-1.5">
                        {rf.project_a_logo_url ? (
                          <img src={rf.project_a_logo_url} alt={rf.project_a_name} className="w-6 h-6 rounded-[6px] object-contain border-2 border-card bg-secondary relative z-10" />
                        ) : (
                          <span className="w-6 h-6 rounded-[6px] flex items-center justify-center text-xs border-2 border-card bg-secondary relative z-10">{rf.project_a_logo_emoji}</span>
                        )}
                        {rf.project_b_name && (
                          rf.project_b_logo_url ? (
                            <img src={rf.project_b_logo_url} alt={rf.project_b_name} className="w-6 h-6 rounded-[6px] object-contain border-2 border-card bg-secondary" />
                          ) : (
                            <span className="w-6 h-6 rounded-[6px] flex items-center justify-center text-xs border-2 border-card bg-secondary">{rf.project_b_logo_emoji}</span>
                          )
                        )}
                      </div>
                      <span className={`ml-auto text-[10px] font-semibold rounded-md px-2 py-0.5 ${
                        isEnded ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                      }`}>
                        {isEnded ? "Ended" : getTimeRemaining(rf.end_date)}
                      </span>
                    </div>
                    <h3 className="text-xs font-semibold text-foreground leading-snug line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                      {rf.title}
                    </h3>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{yesPct.toFixed(0)}% Yes</span>
                      <span>{total} vote{total !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden flex mt-1.5">
                      <div className="h-full rounded-l-full" style={{ width: `${yesPct}%`, background: "hsl(var(--primary))" }} />
                      <div className="h-full rounded-r-full bg-destructive/60" style={{ width: `${100 - yesPct}%` }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default ForecastDetail;

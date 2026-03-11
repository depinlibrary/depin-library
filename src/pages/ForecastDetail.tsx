import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import ForecastHeader from "@/components/forecast/ForecastHeader";
import VoteSection from "@/components/forecast/VoteSection";
import VoteHistoryChart from "@/components/forecast/VoteHistoryChart";
import DiscussionSection from "@/components/forecast/DiscussionSection";
import RelatedForecastsList from "@/components/forecast/RelatedForecasts";
import ForecastMetrics from "@/components/forecast/ForecastMetrics";
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

function getCountdown(endDate: string) {
  const now = new Date();
  const end = new Date(endDate);
  const diff = Math.max(0, end.getTime() - now.getTime());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds, ended: diff <= 0 };
}

const CountdownTimer = ({ endDate }: { endDate: string }) => {
  const [countdown, setCountdown] = useState(getCountdown(endDate));

  useEffect(() => {
    const interval = setInterval(() => setCountdown(getCountdown(endDate)), 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  if (countdown.ended) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Market Resolved</span>
      </div>
    );
  }

  const units = [
    { label: "D", value: countdown.days },
    { label: "H", value: countdown.hours },
    { label: "M", value: countdown.minutes },
    { label: "S", value: countdown.seconds },
  ];

  return (
    <div className="flex items-center gap-1">
      {units.map(({ label, value }, i) => (
        <div key={label} className="flex items-center gap-1">
          <div className="flex flex-col items-center rounded-lg bg-secondary px-2.5 py-1.5 min-w-[2.5rem]">
            <span className="text-lg font-black font-['Space_Grotesk'] text-foreground leading-none">{String(value).padStart(2, "0")}</span>
            <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{label}</span>
          </div>
          {i < units.length - 1 && <span className="text-muted-foreground/40 font-bold">:</span>}
        </div>
      ))}
    </div>
  );
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

  // Dynamic OG meta tags
  useEffect(() => {
    if (!forecast) return;
    const totalVotes = forecast.total_votes_yes + forecast.total_votes_no;
    const yesPct = totalVotes > 0 ? ((forecast.total_votes_yes / totalVotes) * 100).toFixed(0) : "50";
    const projectNames = [forecast.project_a?.name, forecast.project_b?.name].filter(Boolean).join(" vs ");
    const title = `${forecast.title} — DePIN Forecast`;
    const description = `${yesPct}% Yes · ${totalVotes} votes · ${projectNames} — ${forecast.description?.slice(0, 120) || "Community prediction on DePIN projects"}`;
    const url = window.location.href;
    document.title = title;
    const setMeta = (property: string, content: string, isName = false) => {
      const attr = isName ? "name" : "property";
      let el = document.querySelector(`meta[${attr}="${property}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, property); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    setMeta("og:title", title);
    setMeta("og:description", description);
    setMeta("og:type", "article");
    setMeta("og:url", url);
    setMeta("twitter:card", "summary", true);
    setMeta("twitter:title", title, true);
    setMeta("twitter:description", description, true);
    setMeta("description", description, true);
    return () => {
      document.title = "DePIN Library — Discover Decentralized Infrastructure";
      setMeta("og:title", "DePIN Library — Discover the DePIN Ecosystem");
      setMeta("og:description", "Explore, compare, and understand Decentralized Physical Infrastructure Networks — all in one place.");
      setMeta("og:type", "website");
      setMeta("description", "The central hub to explore, compare, and understand Decentralized Physical Infrastructure Networks (DePIN).", true);
    };
  }, [forecast]);

  const handleVote = (vote: "yes" | "no", confidenceLevel: number) => {
    if (!user) { toast.error("Sign in to vote"); return; }
    if (!id) return;
    voteForecast.mutate({ forecastId: id, vote, confidenceLevel });
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-16 max-w-4xl">
          <Skeleton className="h-5 w-32 mb-6" />
          <Skeleton className="h-[320px] w-full rounded-2xl mb-4" />
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <Skeleton className="h-[240px] w-full rounded-2xl" />
              <Skeleton className="h-[200px] w-full rounded-2xl" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-[160px] w-full rounded-2xl" />
              <Skeleton className="h-[160px] w-full rounded-2xl" />
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
          <h1 className="text-2xl font-black text-foreground mb-4 font-['Space_Grotesk']">Market not found</h1>
          <Link to="/forecasts" className="text-primary hover:underline text-sm font-medium">← Back to Markets</Link>
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

      <main className="container mx-auto px-4 pt-24 pb-16 max-w-4xl">
        {/* Back + New Question */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/forecasts" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Markets
          </Link>
          <div className="flex items-center gap-2">
            <CountdownTimer endDate={forecast.end_date} />
          </div>
        </div>

        {/* Polymarket-style two-column layout */}
        <div className="space-y-6">
          {/* Header card */}
          <ForecastHeader
            forecast={forecast}
            yesPct={yesPct}
            totalVotes={totalVotes}
            isEnded={isEnded}
            timeLeft={timeLeft}
          />

          {/* Main content + sidebar */}
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            {/* Left column: vote, chart, discussion */}
            <div className="space-y-4">
              <VoteSection
                forecast={forecast}
                yesPct={yesPct}
                noPct={noPct}
                totalVotes={totalVotes}
                isEnded={isEnded}
                onVote={handleVote}
              />

              <VoteHistoryChart voteHistory={voteHistory} />

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

            {/* Right column: metrics + related */}
            <div className="space-y-4">
              <ForecastMetrics
                isEnded={isEnded}
                projectAName={forecast.project_a?.name || "Project"}
                projectBName={forecast.project_b?.name}
              />

              <RelatedForecastsList forecasts={relatedForecasts} />

              {/* New Question CTA */}
              {user && (
                <Link
                  to="/forecasts?create=true"
                  className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border p-5 text-sm font-bold text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
                >
                  <Plus className="h-4 w-4" /> New Question
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ForecastDetail;

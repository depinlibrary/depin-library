import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import ForecastHeader from "@/components/forecast/ForecastHeader";
import VoteSection from "@/components/forecast/VoteSection";
import VoteHistoryChart from "@/components/forecast/VoteHistoryChart";
import DiscussionSection from "@/components/forecast/DiscussionSection";
import RelatedForecastsList from "@/components/forecast/RelatedForecasts";
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
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, property);
        document.head.appendChild(el);
      }
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
          <Skeleton className="h-5 w-32 mb-6" />
          <Skeleton className="h-[280px] w-full rounded-xl mb-4" />
          <Skeleton className="h-[200px] w-full rounded-xl mb-4" />
          <Skeleton className="h-[240px] w-full rounded-xl" />
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

        {/* Stacked sections with consistent spacing */}
        <div className="space-y-4">
          <ForecastHeader
            forecast={forecast}
            yesPct={yesPct}
            totalVotes={totalVotes}
            isEnded={isEnded}
            timeLeft={timeLeft}
          />

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

          <RelatedForecastsList forecasts={relatedForecasts} />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ForecastDetail;

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, ThumbsUp, MessageSquare, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useReviews, useCreateReview, useDeleteReview, type Review } from "@/hooks/useReviews";
import {
  useReviewLikes,
  useToggleReviewLike,
  useReviewReplies,
  useCreateReviewReply,
  useDeleteReviewReply,
  type ReviewReply,
} from "@/hooks/useReviewInteractions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface ReviewSectionProps {
  projectId: string;
  projectName: string;
}

const StarRating = ({ rating, onRate, interactive = false }: { rating: number; onRate?: (r: number) => void; interactive?: boolean }) => {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          className={interactive ? "cursor-pointer" : "cursor-default"}
        >
          <Star
            className={`h-4 w-4 transition-colors ${
              star <= (hover || rating)
                ? "fill-primary text-primary"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
};

/* ── Reply list for a single review ── */
const ReplyThread = ({ reviewId, showInput = false }: { reviewId: string; showInput?: boolean }) => {
  const { user } = useAuth();
  const { data: replies = [], isLoading } = useReviewReplies(reviewId);
  const createReply = useCreateReviewReply();
  const deleteReply = useDeleteReviewReply();
  const [replyText, setReplyText] = useState("");

  const handleSubmit = async () => {
    if (!replyText.trim()) return;
    try {
      await createReply.mutateAsync({ reviewId, replyText: replyText.trim() });
      setReplyText("");
      toast.success("Reply posted");
    } catch {
      toast.error("Failed to post reply");
    }
  };

  const handleDelete = async (reply: ReviewReply) => {
    try {
      await deleteReply.mutateAsync({ replyId: reply.id, reviewId });
      toast.success("Reply deleted");
    } catch {
      toast.error("Failed to delete reply");
    }
  };

  const hasReplies = replies.length > 0;

  if (!hasReplies && !showInput) return null;

  return (
    <div className="mt-3 space-y-2 border-l-2 border-border pl-4">
      {isLoading && <p className="text-xs text-muted-foreground">Loading replies…</p>}

      <AnimatePresence>
        {replies.map((reply) => (
          <motion.div
            key={reply.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-start gap-2"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">
              {(reply.display_name || "A")[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">{reply.display_name}</span>
                <span className="text-[10px] text-text-dim">{new Date(reply.created_at).toLocaleDateString()}</span>
                {user?.id === reply.user_id && (
                  <button onClick={() => handleDelete(reply)} className="ml-auto text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{reply.reply_text}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {showInput && (
        user ? (
          <div className="flex items-center gap-2 pt-1">
            <Input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply…"
              className="h-8 text-xs"
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
            />
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 shrink-0" onClick={handleSubmit} disabled={createReply.isPending || !replyText.trim()}>
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <p className="pt-1 text-xs text-muted-foreground">
            <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to reply
          </p>
        )
      )}
    </div>
  );
};

/* ── Main ReviewSection ── */
const ReviewSection = ({ projectId, projectName }: ReviewSectionProps) => {
  const { user } = useAuth();
  const { data: reviews = [], isLoading } = useReviews(projectId);
  const createReview = useCreateReview();
  const deleteReview = useDeleteReview();
  const [reviewText, setReviewText] = useState("");

  const reviewIds = reviews.map((r) => r.id);
  const { data: likesData = {} } = useReviewLikes(reviewIds);
  const toggleLike = useToggleReviewLike();

  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  const toggleReplies = (id: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const userHasReview = reviews.some((r) => r.user_id === user?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewText.trim()) {
      toast.error("Please write a comment");
      return;
    }
    try {
      await createReview.mutateAsync({ projectId, rating: 0, reviewText });
      toast.success("Review submitted!");
      setRating(0);
      setReviewText("");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    }
  };

  const handleDelete = async (review: Review) => {
    try {
      await deleteReview.mutateAsync({ reviewId: review.id, projectId });
      toast.success("Review deleted");
    } catch {
      toast.error("Failed to delete review");
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">
        Comments {reviews.length > 0 && `(${reviews.length})`}
      </h2>

      {/* Write review */}
      {user ? (
        !userHasReview ? (
          <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm font-medium text-foreground">Comment on {projectName}</p>
            <Textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your thoughts…"
              className="min-h-[80px] resize-none"
            />
            <Button type="submit" size="sm" disabled={createReview.isPending}>
              {createReview.isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">You've already reviewed this project.</p>
        )
      ) : (
        <div className="rounded-xl border border-border bg-card p-5 text-center">
          <p className="text-sm text-muted-foreground">
            <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to leave a review
          </p>
        </div>
      )}

      {/* Review list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews yet. Be the first!</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review, i) => {
            const likeInfo = likesData[review.id] || { count: 0, userLiked: false };
            const repliesOpen = expandedReplies.has(review.id);

            return (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                      {(review.display_name || "A")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{review.display_name}</p>
                    </div>
                  </div>
                  {user?.id === review.user_id && (
                    <button
                      onClick={() => handleDelete(review)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {review.review_text && (
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">{review.review_text}</p>
                )}

                {/* Like + Reply actions */}
                <div className="flex items-center gap-4 pt-1 border-t border-border mt-2">
                  <button
                    onClick={() => {
                      if (!user) { toast.error("Sign in to like"); return; }
                      toggleLike.mutate({ reviewId: review.id, isLiked: likeInfo.userLiked });
                    }}
                    className={`flex items-center gap-1.5 text-xs transition-colors ${
                      likeInfo.userLiked
                        ? "text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <ThumbsUp className={`h-3.5 w-3.5 ${likeInfo.userLiked ? "fill-primary" : ""}`} />
                    {likeInfo.count > 0 ? likeInfo.count : "Like"}
                  </button>

                  <button
                    onClick={() => toggleReplies(review.id)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Reply
                  </button>

                  <span className="ml-auto text-[10px] text-text-dim">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Replies always visible */}
                <ReplyThread reviewId={review.id} showInput={repliesOpen} />

                {/* Toggle reply input */}
                <AnimatePresence>
                  {repliesOpen && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReviewSection;

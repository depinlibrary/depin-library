import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useReviews, useCreateReview, useDeleteReview, type Review } from "@/hooks/useReviews";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

const ReviewSection = ({ projectId, projectName }: ReviewSectionProps) => {
  const { user } = useAuth();
  const { data: reviews = [], isLoading } = useReviews(projectId);
  const createReview = useCreateReview();
  const deleteReview = useDeleteReview();
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  const userHasReview = reviews.some((r) => r.user_id === user?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    try {
      await createReview.mutateAsync({ projectId, rating, reviewText });
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
        Reviews {reviews.length > 0 && `(${reviews.length})`}
      </h2>

      {/* Write review */}
      {user ? (
        !userHasReview ? (
          <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm font-medium text-foreground">Rate {projectName}</p>
            <StarRating rating={rating} onRate={setRating} interactive />
            <Textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Write your review (optional)..."
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
          {reviews.map((review, i) => (
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
                    <StarRating rating={review.rating} />
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
                <p className="text-sm text-muted-foreground leading-relaxed">{review.review_text}</p>
              )}
              <p className="mt-2 text-xs text-text-dim">
                {new Date(review.created_at).toLocaleDateString()}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewSection;

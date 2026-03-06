import { useState } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProjectRatings, useUserRating, useUpsertRating } from "@/hooks/useProjectRatings";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface ProjectRatingsProps {
  projectId: string;
  projectName: string;
}

const CATEGORIES = [
  { key: "utility", label: "Utility" },
  { key: "tokenomics", label: "Tokenomics" },
  { key: "adoption", label: "Adoption" },
  { key: "hardware", label: "Hardware Accessibility" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

const StarInput = ({
  value,
  onChange,
  interactive = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  interactive?: boolean;
}) => {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          className={interactive ? "cursor-pointer" : "cursor-default"}
        >
          <Star
            className={`h-4 w-4 transition-colors ${
              star <= (hover || value)
                ? "fill-primary text-primary"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
};

const RatingBar = ({ label, value, maxValue = 5 }: { label: string; value: number; maxValue?: number }) => {
  const pct = (value / maxValue) * 100;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold text-foreground">{value.toFixed(1)}</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full bg-primary"
        />
      </div>
    </div>
  );
};

const ProjectRatings = ({ projectId, projectName }: ProjectRatingsProps) => {
  const { user } = useAuth();
  const { data: ratingsData, isLoading } = useProjectRatings(projectId);
  const { data: userRating } = useUserRating(projectId);
  const upsertRating = useUpsertRating();

  const [ratings, setRatings] = useState<Record<CategoryKey, number>>({
    utility: 0,
    tokenomics: 0,
    adoption: 0,
    hardware: 0,
  });
  const [isEditing, setIsEditing] = useState(false);

  const startEditing = () => {
    if (userRating) {
      setRatings({
        utility: userRating.utility_rating,
        tokenomics: userRating.tokenomics_rating,
        adoption: userRating.adoption_rating,
        hardware: userRating.hardware_rating,
      });
    } else {
      setRatings({ utility: 0, tokenomics: 0, adoption: 0, hardware: 0 });
    }
    setIsEditing(true);
  };

  const handleSubmit = async () => {
    const allRated = Object.values(ratings).every((r) => r > 0);
    if (!allRated) {
      toast.error("Please rate all categories");
      return;
    }
    try {
      await upsertRating.mutateAsync({
        projectId,
        utility: ratings.utility,
        tokenomics: ratings.tokenomics,
        adoption: ratings.adoption,
        hardware: ratings.hardware,
      });
      toast.success(userRating ? "Rating updated!" : "Rating submitted!");
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit rating");
    }
  };

  const averages = ratingsData?.averages;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          {projectName} Ratings
          {averages && averages.count > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({averages.count} rating{averages.count !== 1 ? "s" : ""})
            </span>
          )}
        </h2>
        {user && !isEditing && (
          <Button variant="outline" size="sm" onClick={startEditing}>
            {userRating ? "Update Rating" : "Rate Project"}
          </Button>
        )}
      </div>

      {/* Average ratings display */}
      {averages && averages.count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card p-5 space-y-3"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Star className="h-5 w-5 fill-primary text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{averages.overall.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Overall Rating</p>
            </div>
          </div>
          {CATEGORIES.map(({ key, label }) => (
            <RatingBar key={key} label={label} value={averages[key]} />
          ))}
        </motion.div>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Loading ratings...</p>}

      {!isLoading && averages && averages.count === 0 && !isEditing && (
        <p className="text-sm text-muted-foreground">No ratings yet. Be the first!</p>
      )}

      {/* Rating form */}
      {isEditing && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card p-5 space-y-4"
        >
          <p className="text-sm font-medium text-foreground">
            Rate {projectName} across categories
          </p>
          {CATEGORIES.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{label}</span>
              <StarInput
                value={ratings[key]}
                onChange={(v) => setRatings((prev) => ({ ...prev, [key]: v }))}
                interactive
              />
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={handleSubmit} disabled={upsertRating.isPending}>
              {upsertRating.isPending ? "Saving..." : userRating ? "Update" : "Submit"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>
        </motion.div>
      )}

      {/* Sign in prompt */}
      {!user && !isLoading && (
        <div className="rounded-xl border border-border bg-card p-5 text-center">
          <p className="text-sm text-muted-foreground">
            <Link to="/auth" className="text-primary hover:underline">
              Sign in
            </Link>{" "}
            to rate this project
          </p>
        </div>
      )}
    </div>
  );
};

export default ProjectRatings;

import { useState } from "react";
import { motion } from "framer-motion";
import { ThumbsUp, ThumbsDown, Users, TrendingUp, TrendingDown, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface VoteSectionProps {
  forecast: any;
  yesPct: number;
  noPct: number;
  totalVotes: number;
  isEnded: boolean;
  onVote: (vote: "yes" | "no", confidenceLevel: number) => void;
}

const confidenceLabels: Record<number, { label: string; color: string }> = {
  1: { label: "Low", color: "text-muted-foreground" },
  2: { label: "Moderate", color: "text-yellow-500" },
  3: { label: "High", color: "text-primary" },
  4: { label: "Very High", color: "text-primary" },
  5: { label: "Maximum", color: "text-accent" },
};

export default function VoteSection({ forecast, yesPct, noPct, totalVotes, isEnded, onVote }: VoteSectionProps) {
  const { user } = useAuth();
  const [confidence, setConfidence] = useState(3);

  const hadVoteBefore = !!forecast.user_vote;

  const fireConfetti = () => {
    const duration = 1500;
    const end = Date.now() + duration;
    const colors = ["hsl(175, 80%, 50%)", "hsl(265, 70%, 60%)", "#FFD700", "#FF6B6B"];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  };

  const handleVote = (vote: "yes" | "no") => {
    if (!user) { toast.error("Sign in to vote"); return; }
    if (!hadVoteBefore) {
      fireConfetti();
      toast.success("🎉 Vote cast! Nice prediction.");
    }
    onVote(vote, confidence);
  };

  const confInfo = confidenceLabels[confidence] || confidenceLabels[3];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      {/* Stats summary row */}
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        <div className="px-4 py-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Yes</span>
          </div>
          <span className="text-xl font-bold text-foreground font-['Space_Grotesk']">{forecast.total_votes_yes}</span>
          {forecast.avg_confidence_yes != null && (
            <div className="flex items-center justify-center gap-1 mt-1">
              <Gauge className="h-3 w-3 text-primary/60" />
              <span className="text-[10px] text-primary/70 font-medium">{forecast.avg_confidence_yes.toFixed(1)}/5</span>
            </div>
          )}
        </div>
        <div className="px-4 py-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total</span>
          </div>
          <span className="text-xl font-bold text-foreground font-['Space_Grotesk']">{totalVotes}</span>
        </div>
        <div className="px-4 py-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <TrendingDown className="h-3.5 w-3.5 text-destructive" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">No</span>
          </div>
          <span className="text-xl font-bold text-foreground font-['Space_Grotesk']">{forecast.total_votes_no}</span>
          {forecast.avg_confidence_no != null && (
            <div className="flex items-center justify-center gap-1 mt-1">
              <Gauge className="h-3 w-3 text-destructive/60" />
              <span className="text-[10px] text-destructive/70 font-medium">{forecast.avg_confidence_no.toFixed(1)}/5</span>
            </div>
          )}
        </div>
      </div>

      {/* Vote bar */}
      <div className="px-6 py-5">
        <div className="flex items-end justify-between mb-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-foreground font-['Space_Grotesk'] tracking-tight">{yesPct.toFixed(0)}%</span>
            <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">Yes</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[11px] font-semibold text-destructive uppercase tracking-wider">No</span>
            <span className="text-3xl font-bold text-foreground font-['Space_Grotesk'] tracking-tight">{noPct.toFixed(0)}%</span>
          </div>
        </div>

        {/* Animated vote bar */}
        <div className="h-4 rounded-full bg-secondary overflow-hidden flex mb-5 relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${yesPct}%` }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="h-full rounded-l-full relative"
            style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))" }}
          >
            {yesPct > 15 && (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                {yesPct.toFixed(0)}%
              </span>
            )}
          </motion.div>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${noPct}%` }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="h-full rounded-r-full bg-destructive/60 relative"
          >
            {noPct > 15 && (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-destructive-foreground">
                {noPct.toFixed(0)}%
              </span>
            )}
          </motion.div>
        </div>

        {/* Confidence slider */}
        {!isEnded && (
          <div className="mb-5 rounded-lg bg-secondary/30 border border-border/50 px-4 py-3.5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] font-medium text-muted-foreground">Confidence Level</span>
              </div>
              <span className={`text-[11px] font-semibold ${confInfo.color}`}>
                {confInfo.label} ({confidence}/5)
              </span>
            </div>
            <Slider
              value={[confidence]}
              onValueChange={(val) => setConfidence(val[0])}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between mt-1.5 px-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={`text-[9px] ${confidence === n ? "text-foreground font-semibold" : "text-muted-foreground/50"}`}>
                  {n}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Vote buttons */}
        {!isEnded ? (
          <div className="flex gap-3">
            <Button
              onClick={() => handleVote("yes")}
              variant={forecast.user_vote === "yes" ? "default" : "outline"}
              className={`flex-1 gap-2 h-11 text-sm font-semibold transition-all ${
                forecast.user_vote === "yes" ? "shadow-md shadow-primary/20" : ""
              }`}
            >
              <ThumbsUp className="h-4 w-4" />
              {forecast.user_vote === "yes" ? "Voted Yes ✓" : "Vote Yes"}
            </Button>
            <Button
              onClick={() => handleVote("no")}
              variant={forecast.user_vote === "no" ? "destructive" : "outline"}
              className={`flex-1 gap-2 h-11 text-sm font-semibold transition-all ${
                forecast.user_vote === "no" ? "shadow-md shadow-destructive/20" : ""
              }`}
            >
              <ThumbsDown className="h-4 w-4" />
              {forecast.user_vote === "no" ? "Voted No ✓" : "Vote No"}
            </Button>
          </div>
        ) : (
          <div className="rounded-lg bg-muted/50 border border-border px-4 py-3 text-center">
            <span className="text-xs font-medium text-muted-foreground">
              Voting has ended · Final result: <span className="text-foreground font-semibold">{yesPct >= 50 ? "Yes" : "No"}</span> ({yesPct.toFixed(0)}%)
            </span>
          </div>
        )}

        {/* User's vote indicator */}
        {forecast.user_vote && !isEnded && (
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[11px] text-muted-foreground text-center mt-3"
          >
            You voted <span className={`font-semibold ${forecast.user_vote === "yes" ? "text-primary" : "text-destructive"}`}>{forecast.user_vote === "yes" ? "Yes" : "No"}</span> · Vote again to change
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}

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
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  };

  const handleVote = (vote: "yes" | "no") => {
    if (!user) { toast.error("Sign in to vote"); return; }
    if (!hadVoteBefore) { fireConfetti(); toast.success("🎉 Vote cast! Nice prediction."); }
    onVote(vote, confidence);
  };

  const confInfo = confidenceLabels[confidence] || confidenceLabels[3];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      {/* Stats summary row */}
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        <div className="px-4 py-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Yes</span>
          </div>
          <span className="text-xl font-black text-foreground font-['Space_Grotesk']">{forecast.total_votes_yes}</span>
          {forecast.avg_confidence_yes != null && (
            <div className="flex items-center justify-center gap-1 mt-1">
              <Gauge className="h-3 w-3 text-primary/60" />
              <span className="text-[10px] text-primary/70 font-bold">{forecast.avg_confidence_yes.toFixed(1)}/5</span>
            </div>
          )}
        </div>
        <div className="px-4 py-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total</span>
          </div>
          <span className="text-xl font-black text-foreground font-['Space_Grotesk']">{totalVotes}</span>
        </div>
        <div className="px-4 py-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <TrendingDown className="h-3.5 w-3.5 text-destructive" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">No</span>
          </div>
          <span className="text-xl font-black text-foreground font-['Space_Grotesk']">{forecast.total_votes_no}</span>
          {forecast.avg_confidence_no != null && (
            <div className="flex items-center justify-center gap-1 mt-1">
              <Gauge className="h-3 w-3 text-destructive/60" />
              <span className="text-[10px] text-destructive/70 font-bold">{forecast.avg_confidence_no.toFixed(1)}/5</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-5">
        {/* Confidence slider */}
        {!isEnded && (
          <div className="mb-5 rounded-xl bg-secondary/30 border border-border/50 px-4 py-3.5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] font-bold text-muted-foreground">Confidence Level</span>
              </div>
              <span className={`text-[11px] font-bold ${confInfo.color}`}>
                {confInfo.label} ({confidence}/5)
              </span>
            </div>
            <Slider value={[confidence]} onValueChange={(val) => setConfidence(val[0])} min={1} max={5} step={1} className="w-full" />
            <div className="flex justify-between mt-1.5 px-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={`text-[9px] ${confidence === n ? "text-foreground font-bold" : "text-muted-foreground/50"}`}>{n}</span>
              ))}
            </div>
          </div>
        )}

        {/* Buy Yes / Buy No — Polymarket style */}
        {!isEnded ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleVote("yes")}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl py-4 text-sm font-black transition-all ${
                forecast.user_vote === "yes"
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
              }`}
            >
              <ThumbsUp className="h-5 w-5" />
              {forecast.user_vote === "yes" ? "Voted Yes ✓" : "Buy Yes"}
              <span className="text-xs font-bold opacity-70">{yesPct.toFixed(0)}¢</span>
            </button>
            <button
              onClick={() => handleVote("no")}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl py-4 text-sm font-black transition-all ${
                forecast.user_vote === "no"
                  ? "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20"
                  : "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20"
              }`}
            >
              <ThumbsDown className="h-5 w-5" />
              {forecast.user_vote === "no" ? "Voted No ✓" : "Buy No"}
              <span className="text-xs font-bold opacity-70">{noPct.toFixed(0)}¢</span>
            </button>
          </div>
        ) : (
          <div className="rounded-xl bg-muted/50 border border-border px-4 py-3 text-center">
            <span className="text-xs font-bold text-muted-foreground">
              Market Resolved · Final: <span className="text-foreground">{yesPct >= 50 ? "Yes" : "No"}</span> ({yesPct.toFixed(0)}%)
            </span>
          </div>
        )}

        {forecast.user_vote && !isEnded && (
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[11px] text-muted-foreground text-center mt-3"
          >
            You voted <span className={`font-bold ${forecast.user_vote === "yes" ? "text-primary" : "text-destructive"}`}>{forecast.user_vote === "yes" ? "Yes" : "No"}</span> · Vote again to change
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}

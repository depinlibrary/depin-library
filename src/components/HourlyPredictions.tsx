import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Timer, TrendingUp, TrendingDown, ChevronRight, Minus, Clock, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActiveHourlyRounds, useVoteHourlyRound, useRealtimeHourlyRounds, useHourlyRoundHistory, type HourlyRound } from "@/hooks/useHourlyForecasts";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

function useCountdown(targetDate: string | null) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    if (!targetDate) { setTimeLeft(""); return; }
    const update = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("00:00"); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [targetDate]);
  return timeLeft;
}

function RoundCard({ round }: { round: HourlyRound }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const voteHourly = useVoteHourlyRound();
  const isActive = round.status === "active" && new Date(round.end_time) > new Date();
  const isInCooldown = round.status === "resolved" && round.cooldown_end && new Date(round.cooldown_end) > new Date();
  const countdown = useCountdown(isActive ? round.end_time : isInCooldown ? round.cooldown_end : null);
  const totalVotes = round.total_votes_up + round.total_votes_down;
  const upPct = totalVotes > 0 ? (round.total_votes_up / totalVotes) * 100 : 50;

  const [showHistory, setShowHistory] = useState(false);
  const { data: history = [] } = useHourlyRoundHistory(showHistory ? round.project_id : undefined);

  const handleVote = (vote: "up" | "down") => {
    if (!user) {
      toast("Please log in to vote", { action: { label: "Log in", onClick: () => navigate("/auth?redirect=/forecasts") } });
      return;
    }
    if (round.user_vote) {
      toast.info("You already voted on this round.");
      return;
    }
    if (!isActive) {
      toast.info("This round has ended.");
      return;
    }
    voteHourly.mutate({ roundId: round.id, vote }, {
      onError: (e: any) => toast.error(e.message),
      onSuccess: () => toast.success(`Voted ${vote === "up" ? "Up" : "Down"}!`),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden flex flex-col"
    >
      <div className="p-4 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <Link to={`/project/${round.project_slug}`} className="flex items-center gap-2 group">
            {round.project_logo_url ? (
              <img src={round.project_logo_url} alt={round.project_name} className="w-7 h-7 rounded-lg object-contain border border-card bg-secondary" />
            ) : (
              <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs border border-card bg-secondary">{round.project_logo_emoji}</span>
            )}
            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">{round.project_name}</span>
          </Link>
          <div className="flex items-center gap-1.5">
            {isActive && (
              <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                LIVE
              </span>
            )}
            {isInCooldown && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="h-3 w-3 inline mr-0.5" />
                Cooldown
              </span>
            )}
            {!isActive && !isInCooldown && round.status === "resolved" && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                Resolved
              </span>
            )}
          </div>
        </div>

        {/* Question */}
        <Link to={`/forecasts/hourly/${round.id}`} className="block">
          <h3 className="text-[13px] font-semibold text-foreground leading-snug mb-1 group-hover:underline">
            {round.project_name} up or down in 1 hour
          </h3>
        </Link>
        <p className="text-[10px] text-muted-foreground mb-3">
          Round #{round.round_number} · {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
        </p>

        {/* Countdown */}
        <div className="flex items-center gap-2 mb-3">
          <Timer className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-mono font-bold text-foreground tabular-nums">
            {isActive ? countdown : isInCooldown ? `Next in ${countdown}` : "—"}
          </span>
        </div>

        {/* Vote bar */}
        <div className="relative h-2 rounded-full bg-secondary overflow-hidden mb-2">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-primary"
            initial={{ width: "50%" }}
            animate={{ width: `${upPct}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mb-auto">
          <span className="text-primary font-semibold">{upPct.toFixed(0)}% Up</span>
          <span className="text-destructive font-semibold">{(100 - upPct).toFixed(0)}% Down</span>
        </div>

        {/* Result for resolved */}
        {round.status === "resolved" && round.outcome && !isInCooldown && (
          <div className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${
            round.outcome === "up" ? "text-primary" : round.outcome === "down" ? "text-destructive" : "text-muted-foreground"
          }`}>
            {round.outcome === "up" ? <TrendingUp className="h-3.5 w-3.5" /> : round.outcome === "down" ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
            Price went {round.outcome === "up" ? "UP" : round.outcome === "down" ? "DOWN" : "FLAT"}
            {round.start_price != null && round.end_price != null && (
              <span className="text-muted-foreground font-normal ml-1">
                (${round.start_price.toFixed(4)} → ${round.end_price.toFixed(4)})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Vote buttons */}
      <div className="px-4 pb-3">
        {isActive ? (
          round.user_vote ? (
            <div className="text-center text-[10px] text-muted-foreground py-2">
              You voted <span className={`font-semibold ${round.user_vote === "up" ? "text-primary" : "text-destructive"}`}>{round.user_vote === "up" ? "Up" : "Down"}</span> · Note you can't change vote
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => handleVote("up")}
                disabled={voteHourly.isPending}
                className="flex-1 rounded-lg py-2 text-xs font-bold text-center bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <TrendingUp className="h-3.5 w-3.5 inline mr-1" />Up
              </button>
              <button
                onClick={() => handleVote("down")}
                disabled={voteHourly.isPending}
                className="flex-1 rounded-lg py-2 text-xs font-bold text-center bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
              >
                <TrendingDown className="h-3.5 w-3.5 inline mr-1" />Down
              </button>
            </div>
          )
        ) : (
          <div className="flex gap-2">
            <span className="flex-1 rounded-lg py-2 text-xs font-bold text-center bg-secondary text-muted-foreground opacity-60">Up</span>
            <span className="flex-1 rounded-lg py-2 text-xs font-bold text-center bg-secondary text-muted-foreground opacity-60">Down</span>
          </div>
        )}
      </div>

      {/* History toggle */}
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
      >
        <History className="h-3 w-3" />
        {showHistory ? "Hide" : "Show"} Past Rounds
      </button>

      {/* History */}
      <AnimatePresence>
        {showHistory && history.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="max-h-48 overflow-y-auto">
              {history.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-2 text-[10px] border-b border-border/50 last:border-b-0">
                  <span className="text-muted-foreground">Round #{r.round_number}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{r.total_votes_up + r.total_votes_down} votes</span>
                    <span className={`font-semibold ${r.outcome === "up" ? "text-primary" : r.outcome === "down" ? "text-destructive" : "text-muted-foreground"}`}>
                      {r.outcome === "up" ? "↑ Up" : r.outcome === "down" ? "↓ Down" : "— Flat"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function HourlyPredictions() {
  useRealtimeHourlyRounds();
  const { data: rounds = [], isLoading } = useActiveHourlyRounds();

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2].map(i => (
          <div key={i} className="h-56 rounded-xl bg-secondary/30 animate-pulse" />
        ))}
      </div>
    );
  }

  if (rounds.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Live Hourly Predictions</h2>
        </div>
        <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">Auto-recurring</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rounds.map((round) => (
          <RoundCard key={round.id} round={round} />
        ))}
      </div>
    </section>
  );
}

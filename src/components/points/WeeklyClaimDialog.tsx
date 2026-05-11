import { Button } from "@/components/ui/button";
import { Gift, Sparkles, Loader2, Zap, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { POINTS_PER_WEEK, COST_PER_PROMPT, usePoints, useWeeklyClaimDialogState } from "@/hooks/usePoints";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import BrandModal from "./BrandModal";

const WeeklyClaimDialog = () => {
  const { user } = useAuth();
  const { open, setOpen } = useWeeklyClaimDialogState();
  const { claimWeekly } = usePoints();

  if (!user) return null;

  const handleClaim = async () => {
    try {
      const res = await claimWeekly.mutateAsync();
      if (res.success) {
        toast.success(`+${res.claimed ?? POINTS_PER_WEEK} points claimed!`, {
          description: `New balance: ${res.balance} points`,
        });
        setOpen(false);
      } else {
        toast.error("Already claimed this week");
        setOpen(false);
      }
    } catch {
      toast.error("Could not claim points. Try again.");
    }
  };

  return (
    <BrandModal open={open} onClose={() => setOpen(false)}>
      {/* Animated icon */}
      <div className="flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.6, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.1 }}
          className="relative mb-5"
        >
          <div className="absolute inset-0 rounded-3xl bg-primary/30 blur-2xl" />
          <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/70 flex items-center justify-center shadow-[0_10px_40px_-5px_hsl(var(--primary)/0.6)]">
            <Gift className="h-10 w-10 sm:h-12 sm:w-12 text-primary-foreground" strokeWidth={2} />
          </div>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                top: `${[10, 60, 20][i]}%`,
                left: `${[-15, 100, 95][i]}%`,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1, 0.7], opacity: [0, 1, 0.8] }}
              transition={{ delay: 0.3 + i * 0.15, duration: 1.2, repeat: Infinity, repeatDelay: 1.5 }}
            >
              <Sparkles className="h-4 w-4 text-primary" />
            </motion.div>
          ))}
        </motion.div>

        <h2 className="text-2xl sm:text-[26px] font-bold tracking-tight">
          Welcome back!
        </h2>
        <p className="mt-2 text-sm sm:text-[15px] text-muted-foreground max-w-[320px]">
          Your weekly points are ready. Claim them to keep using AI Analysis & Compare.
        </p>

        {/* Points pill */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-5 py-2.5"
        >
          <Zap className="h-4 w-4 text-primary fill-primary/40" />
          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            +{POINTS_PER_WEEK}
          </span>
          <span className="text-sm font-medium text-foreground/80">points</span>
        </motion.div>
      </div>

      {/* Info rows */}
      <div className="mt-6 space-y-2">
        <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/30 p-3.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 shrink-0">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="text-xs sm:text-[13px] leading-relaxed text-muted-foreground">
            Each AI prompt costs <span className="font-semibold text-foreground">{COST_PER_PROMPT} points</span>.
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/30 p-3.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 shrink-0">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <div className="text-xs sm:text-[13px] leading-relaxed text-muted-foreground">
            Come back <span className="font-semibold text-foreground">next week</span> to claim a fresh balance.
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
        <Button
          variant="ghost"
          onClick={() => setOpen(false)}
          className="w-full sm:w-auto sm:flex-1 h-11"
        >
          Later
        </Button>
        <Button
          onClick={handleClaim}
          disabled={claimWeekly.isPending}
          className="w-full sm:flex-[2] h-11 bg-gradient-to-r from-primary to-primary/85 hover:opacity-95 shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.7)]"
        >
          {claimWeekly.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Gift className="h-4 w-4 mr-2" />
          )}
          Claim {POINTS_PER_WEEK} Points
        </Button>
      </div>
    </BrandModal>
  );
};

export default WeeklyClaimDialog;

import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Gift, Loader2, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { usePoints, COST_PER_PROMPT, POINTS_PER_WEEK } from "@/hooks/usePoints";
import { formatDistanceToNow } from "date-fns";
import BrandModal from "./BrandModal";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const OutOfPointsDialog = ({ open, onOpenChange }: Props) => {
  const { balance, nextClaimAt, canClaim, claimWeekly } = usePoints();

  const handleClaim = async () => {
    try {
      await claimWeekly.mutateAsync();
      onOpenChange(false);
    } catch {
      /* no-op */
    }
  };

  return (
    <BrandModal open={open} onClose={() => onOpenChange(false)}>
      <div className="flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.6 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 14, stiffness: 220 }}
          className="relative mb-5"
        >
          <div className="absolute inset-0 rounded-3xl bg-destructive/30 blur-2xl" />
          <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-3xl bg-gradient-to-br from-destructive via-destructive to-destructive/70 flex items-center justify-center shadow-[0_10px_40px_-5px_hsl(var(--destructive)/0.55)]">
            <AlertTriangle className="h-10 w-10 sm:h-12 sm:w-12 text-destructive-foreground" strokeWidth={2} />
          </div>
        </motion.div>

        <h2 className="text-2xl sm:text-[26px] font-bold tracking-tight">
          Out of points
        </h2>
        <p className="mt-2 text-sm sm:text-[15px] text-muted-foreground max-w-[320px]">
          You don't have enough points to run another AI prompt.
        </p>

        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-5 py-2.5">
          <Zap className="h-4 w-4 text-muted-foreground" />
          <span className="text-2xl font-bold text-foreground">{balance}</span>
          <span className="text-sm font-medium text-muted-foreground">/ {COST_PER_PROMPT} needed</span>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border/60 bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 shrink-0">
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <div className="text-xs sm:text-[13px] leading-relaxed text-muted-foreground pt-1">
            {canClaim ? (
              <>You can claim your weekly <span className="font-semibold text-foreground">{POINTS_PER_WEEK} points</span> right now.</>
            ) : nextClaimAt ? (
              <>Come back in <span className="font-semibold text-foreground">{formatDistanceToNow(nextClaimAt)}</span> to claim {POINTS_PER_WEEK} new points.</>
            ) : (
              <>Come back next week to claim {POINTS_PER_WEEK} new points.</>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
        <Button
          variant="ghost"
          onClick={() => onOpenChange(false)}
          className="w-full sm:w-auto sm:flex-1 h-11"
        >
          Got it
        </Button>
        {canClaim && (
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
        )}
      </div>
    </BrandModal>
  );
};

export default OutOfPointsDialog;

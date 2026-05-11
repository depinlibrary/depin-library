import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gift, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { POINTS_PER_WEEK, usePoints, useWeeklyClaimDialogState } from "@/hooks/usePoints";
import { Button } from "@/components/ui/button";

/**
 * Custom branded floating reminder card. Slides in from the bottom-right
 * (bottom on mobile) when the weekly popup was dismissed but a claim is
 * still available.
 */
const WeeklyClaimReminder = () => {
  const { user } = useAuth();
  const { canClaim, isLoading, claimWeekly } = usePoints();
  const { open: dialogOpen, setOpen } = useWeeklyClaimDialogState();
  const [show, setShow] = useState(false);
  const shownRef = useRef(false);

  useEffect(() => {
    if (!user || isLoading) return;
    if (!canClaim) {
      shownRef.current = false;
      setShow(false);
      return;
    }
    if (dialogOpen) return;
    if (shownRef.current) return;
    const t = setTimeout(() => {
      if (!canClaim || dialogOpen) return;
      shownRef.current = true;
      setShow(true);
    }, 1400);
    return () => clearTimeout(t);
  }, [user, canClaim, isLoading, dialogOpen]);

  const handleClaim = async () => {
    try {
      const res = await claimWeekly.mutateAsync();
      if (res.success) {
        toast.success(`+${res.claimed ?? POINTS_PER_WEEK} points claimed!`);
        setShow(false);
      } else {
        setShow(false);
        setOpen(true);
      }
    } catch {
      setShow(false);
      setOpen(true);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", damping: 22, stiffness: 260 }}
          className="fixed z-[90] bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[340px]"
        >
          <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-card to-card/90 backdrop-blur-xl p-4 shadow-[0_20px_50px_-15px_hsl(var(--primary)/0.45)]">
            <div className="pointer-events-none absolute -top-16 -right-10 h-32 w-32 rounded-full bg-primary/25 blur-3xl" />
            <button
              onClick={() => setShow(false)}
              aria-label="Dismiss"
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="relative flex items-start gap-3 pr-6">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-[0_6px_18px_-4px_hsl(var(--primary)/0.6)]">
                <Gift className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground">
                  {POINTS_PER_WEEK} weekly points ready
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Claim now to keep using AI features.
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleClaim}
                    disabled={claimWeekly.isPending}
                    className="h-8 flex-1 bg-gradient-to-r from-primary to-primary/85 hover:opacity-95"
                  >
                    {claimWeekly.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Claim"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShow(false)}
                    className="h-8"
                  >
                    Later
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WeeklyClaimReminder;

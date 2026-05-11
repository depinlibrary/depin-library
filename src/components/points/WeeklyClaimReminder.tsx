import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Gift } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { POINTS_PER_WEEK, usePoints, useWeeklyClaimDialogState } from "@/hooks/usePoints";

/**
 * Lightweight reminder toast. Shown once per session when the user is
 * eligible to claim but the weekly popup isn't currently open (e.g. they
 * dismissed it earlier on this or another device).
 */
const WeeklyClaimReminder = () => {
  const { user } = useAuth();
  const { canClaim, isLoading, claimWeekly } = usePoints();
  const { open, setOpen } = useWeeklyClaimDialogState();
  const shownRef = useRef(false);

  useEffect(() => {
    if (!user || isLoading) return;
    if (!canClaim) {
      shownRef.current = false;
      return;
    }
    if (open) return;
    if (shownRef.current) return;

    // Wait a beat so we don't race with the main popup
    const t = setTimeout(() => {
      if (!canClaim || open) return;
      shownRef.current = true;
      toast(`${POINTS_PER_WEEK} weekly points ready to claim`, {
        icon: <Gift className="h-4 w-4 text-primary" />,
        duration: 8000,
        action: {
          label: "Claim",
          onClick: async () => {
            try {
              const res = await claimWeekly.mutateAsync();
              if (res.success) {
                toast.success(`+${res.claimed ?? POINTS_PER_WEEK} points claimed!`);
              }
            } catch {
              setOpen(true);
            }
          },
        },
      });
    }, 1200);

    return () => clearTimeout(t);
  }, [user, canClaim, isLoading, open, claimWeekly, setOpen]);

  return null;
};

export default WeeklyClaimReminder;

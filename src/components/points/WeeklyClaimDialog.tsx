import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gift, Sparkles, Loader2 } from "lucide-react";
import { POINTS_PER_WEEK, usePoints, useWeeklyClaimDialogState } from "@/hooks/usePoints";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 border border-primary/30">
            <Gift className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">
            Welcome back!
          </DialogTitle>
          <DialogDescription className="text-center">
            Claim your <span className="font-semibold text-foreground">{POINTS_PER_WEEK} weekly points</span> to use AI Analysis and Compare.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-border bg-secondary/30 p-4 my-2">
          <div className="flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <div className="text-xs text-muted-foreground">
              Each AI prompt costs <span className="font-semibold text-foreground">25 points</span>. Points reset weekly — come back next week to claim more.
            </div>
          </div>
        </div>
        <DialogFooter className="sm:justify-center">
          <Button
            onClick={handleClaim}
            disabled={claimWeekly.isPending}
            className="w-full sm:w-auto min-w-[160px]"
          >
            {claimWeekly.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Gift className="h-4 w-4 mr-2" />
            )}
            Claim {POINTS_PER_WEEK} Points
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WeeklyClaimDialog;
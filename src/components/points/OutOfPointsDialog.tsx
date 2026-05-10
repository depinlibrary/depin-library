import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock } from "lucide-react";
import { usePoints } from "@/hooks/usePoints";
import { formatDistanceToNow } from "date-fns";

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/15 border border-destructive/30">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <DialogTitle className="text-center text-xl">
            You're out of points
          </DialogTitle>
          <DialogDescription className="text-center">
            Your point balance is <span className="font-semibold text-foreground">{balance}</span>. Each AI prompt requires 25 points.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-border bg-secondary/30 p-4 my-2">
          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground">
              {canClaim ? (
                <>You can claim your weekly 300 points now.</>
              ) : nextClaimAt ? (
                <>Come back in <span className="font-semibold text-foreground">{formatDistanceToNow(nextClaimAt)}</span> to claim 300 new points for the week.</>
              ) : (
                <>Come back next week to claim 300 new points.</>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="sm:justify-center gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Got it
          </Button>
          {canClaim && (
            <Button onClick={handleClaim} disabled={claimWeekly.isPending}>
              Claim 300 Points
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OutOfPointsDialog;
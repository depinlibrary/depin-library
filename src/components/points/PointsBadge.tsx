import { Sparkles } from "lucide-react";
import { usePoints } from "@/hooks/usePoints";
import { useAuth } from "@/contexts/AuthContext";

/** Compact points balance pill, hidden when not signed in. */
const PointsBadge = ({ className = "" }: { className?: string }) => {
  const { user } = useAuth();
  const { balance, isLoading } = usePoints();
  if (!user) return null;
  return (
    <div
      className={`hidden sm:flex h-8 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 text-xs font-semibold text-primary ${className}`}
      title={`${balance} prompt points`}
    >
      <Sparkles className="h-3.5 w-3.5" />
      {isLoading ? "—" : balance}
    </div>
  );
};

export default PointsBadge;
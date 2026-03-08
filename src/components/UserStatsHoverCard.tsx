import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Target, CheckCircle, XCircle, Clock, BarChart3 } from "lucide-react";
import { useUserForecastStats } from "@/hooks/useUserForecastStats";
import { Skeleton } from "@/components/ui/skeleton";
import UserAvatar from "@/components/UserAvatar";

interface UserStatsHoverCardProps {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  children: React.ReactNode;
}

const UserStatsHoverCard = ({ userId, displayName, children }: UserStatsHoverCardProps) => {
  const { data: stats, isLoading } = useUserForecastStats(userId);

  const accuracyColor = (stats?.accuracy ?? 0) >= 60
    ? "text-green-500"
    : (stats?.accuracy ?? 0) >= 40
      ? "text-yellow-500"
      : "text-destructive";

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="w-64 p-4" side="top" align="start">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-sm">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{displayName}</p>
              <p className="text-[10px] text-muted-foreground">Forecaster Stats</p>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : stats?.totalVotes === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">No forecast votes yet</p>
          ) : (
            <>
              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-secondary/50 rounded-lg p-2 text-center">
                  <BarChart3 className="h-3.5 w-3.5 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-bold text-foreground">{stats?.totalVotes}</p>
                  <p className="text-[9px] text-muted-foreground">Total Votes</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-2 text-center">
                  <Target className={`h-3.5 w-3.5 mx-auto mb-1 ${accuracyColor}`} />
                  <p className={`text-lg font-bold ${accuracyColor}`}>{stats?.accuracy}%</p>
                  <p className="text-[9px] text-muted-foreground">Accuracy</p>
                </div>
              </div>

              {/* Breakdown */}
              <div className="flex items-center justify-between text-[10px]">
                <span className="flex items-center gap-1 text-green-500">
                  <CheckCircle className="h-3 w-3" /> {stats?.correctVotes} correct
                </span>
                <span className="flex items-center gap-1 text-destructive">
                  <XCircle className="h-3 w-3" /> {stats?.incorrectVotes} wrong
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" /> {stats?.pendingVotes} pending
                </span>
              </div>

              {/* Accuracy bar */}
              {(stats?.correctVotes ?? 0) + (stats?.incorrectVotes ?? 0) > 0 && (
                <div className="relative h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-green-500 rounded-full transition-all"
                    style={{ width: `${stats?.accuracy}%` }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export default UserStatsHoverCard;

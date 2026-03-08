import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarDays, Timer, User as UserIcon, ExternalLink, Copy, Share2, Clock } from "lucide-react";
import UserStatsHoverCard from "@/components/UserStatsHoverCard";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";

interface ForecastHeaderProps {
  forecast: any;
  yesPct: number;
  totalVotes: number;
  isEnded: boolean;
  timeLeft: string;
}

export default function ForecastHeader({ forecast, yesPct, totalVotes, isEnded, timeLeft }: ForecastHeaderProps) {
  const handleShareX = () => {
    const ogUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-forecast?id=${forecast.id}&site=${encodeURIComponent(window.location.origin)}`;
    const text = `${forecast.title} — ${yesPct.toFixed(0)}% Yes | ${totalVotes} votes`;
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(ogUrl)}`, "_blank", "noopener,noreferrer,width=550,height=420");
  };

  const handleCopyLink = () => {
    const ogUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-forecast?id=${forecast.id}&site=${encodeURIComponent(window.location.origin)}`;
    navigator.clipboard.writeText(ogUrl);
    toast.success("Link copied!");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      {/* Status strip */}
      <div className={`h-1 w-full ${isEnded ? "bg-muted-foreground/30" : "bg-gradient-to-r from-primary via-primary/80 to-accent"}`} />

      <div className="p-6 sm:p-8">
        {/* Project badges + status */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex items-center -space-x-2">
            {forecast.project_a?.logo_url ? (
              <img src={forecast.project_a.logo_url} alt={forecast.project_a.name} className="w-10 h-10 rounded-[7px] object-contain border-2 border-card bg-secondary relative z-10" />
            ) : (
              <span className="w-10 h-10 rounded-[7px] flex items-center justify-center text-lg border-2 border-card bg-secondary relative z-10">{forecast.project_a?.logo_emoji || "⬡"}</span>
            )}
            {forecast.project_b && (
              forecast.project_b.logo_url ? (
                <img src={forecast.project_b.logo_url} alt={forecast.project_b.name} className="w-10 h-10 rounded-[7px] object-contain border-2 border-card bg-secondary" />
              ) : (
                <span className="w-10 h-10 rounded-[7px] flex items-center justify-center text-lg border-2 border-card bg-secondary">{forecast.project_b?.logo_emoji || "⬡"}</span>
              )
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/project/${forecast.project_a?.slug}`} className="text-xs font-semibold text-foreground/80 hover:text-primary transition-colors">
              {forecast.project_a?.name}
            </Link>
            {forecast.project_b && (
              <>
                <span className="text-muted-foreground/40 text-[10px] font-medium uppercase tracking-widest">vs</span>
                <Link to={`/project/${forecast.project_b?.slug}`} className="text-xs font-semibold text-foreground/80 hover:text-primary transition-colors">
                  {forecast.project_b?.name}
                </Link>
              </>
            )}
          </div>
          <Badge
            variant={isEnded ? "secondary" : "default"}
            className={`ml-auto shrink-0 text-[11px] font-semibold gap-1 ${
              isEnded ? "" : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/10"
            }`}
          >
            <Clock className="h-3 w-3" />
            {timeLeft}
          </Badge>
        </div>

        {/* Title */}
        <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight mb-3 font-['Space_Grotesk'] tracking-tight">
          {forecast.title}
        </h1>

        {/* Description */}
        {forecast.description && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-5 whitespace-pre-wrap max-w-prose">
            {forecast.description}
          </p>
        )}

        {/* Meta row + share */}
        <div className="flex items-center justify-between gap-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <UserStatsHoverCard userId={forecast.creator_user_id} displayName={forecast.creator_name} avatarUrl={forecast.creator_avatar_url}>
              <span className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors">
                <UserAvatar avatarUrl={forecast.creator_avatar_url} displayName={forecast.creator_name} size="sm" />
                {forecast.creator_name}
              </span>
            </UserStatsHoverCard>
            <span className="hidden sm:flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {format(new Date(forecast.created_at), "MMM d, yyyy")}</span>
            <span className="flex items-center gap-1"><Timer className="h-3 w-3" /> Ends {format(new Date(forecast.end_date), "MMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleShareX}
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Share on X"
            >
              <ExternalLink className="h-3 w-3" /> X
            </button>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Copy link"
            >
              <Copy className="h-3 w-3" /> Copy
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

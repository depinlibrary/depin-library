import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarDays, Timer, ExternalLink, Copy, Clock, TrendingUp, Users } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import UserStatsHoverCard from "@/components/UserStatsHoverCard";
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
  const noPct = 100 - yesPct;

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
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      {/* Top accent */}
      <div className={`h-1 w-full ${isEnded ? "bg-muted-foreground/30" : "bg-gradient-to-r from-primary via-accent to-primary"}`} />

      <div className="p-6 sm:p-8">
        {/* Project logos + status */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex items-center -space-x-2">
            {forecast.project_a?.logo_url ? (
              <img src={forecast.project_a.logo_url} alt={forecast.project_a.name} className="w-12 h-12 rounded-2xl object-contain border-2 border-card bg-secondary relative z-10" />
            ) : (
              <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl border-2 border-card bg-secondary relative z-10">{forecast.project_a?.logo_emoji || "⬡"}</span>
            )}
            {forecast.project_b && (
              forecast.project_b.logo_url ? (
                <img src={forecast.project_b.logo_url} alt={forecast.project_b.name} className="w-12 h-12 rounded-2xl object-contain border-2 border-card bg-secondary" />
              ) : (
                <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl border-2 border-card bg-secondary">{forecast.project_b?.logo_emoji || "⬡"}</span>
              )
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link to={`/project/${forecast.project_a?.slug}`} className="text-sm font-bold text-foreground hover:text-primary transition-colors">
                {forecast.project_a?.name}
              </Link>
              {forecast.project_b && (
                <>
                  <span className="text-muted-foreground/40 text-xs font-bold uppercase tracking-widest">vs</span>
                  <Link to={`/project/${forecast.project_b?.slug}`} className="text-sm font-bold text-foreground hover:text-primary transition-colors">
                    {forecast.project_b?.name}
                  </Link>
                </>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                isEnded ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary border border-primary/20"
              }`}>
                <Clock className="h-3 w-3" /> {timeLeft}
              </span>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" /> {totalVotes} votes
              </span>
            </div>
          </div>
        </div>

        {/* Title — large Polymarket style */}
        <h1 className="text-xl sm:text-2xl font-black text-foreground leading-tight mb-3 font-['Space_Grotesk'] tracking-tight">
          {forecast.title}
        </h1>

        {forecast.description && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-5 whitespace-pre-wrap max-w-prose">
            {forecast.description}
          </p>
        )}

        {/* Large vote display — Polymarket hero numbers */}
        <div className="flex items-end justify-between mb-3 pt-4 border-t border-border/50">
          <div>
            <span className="text-4xl sm:text-5xl font-black font-['Space_Grotesk'] text-primary tracking-tighter">{yesPct.toFixed(0)}%</span>
            <span className="ml-2 text-xs font-bold text-primary/60 uppercase tracking-wider">Yes</span>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-destructive/60 uppercase tracking-wider">No</span>
            <span className="ml-2 text-4xl sm:text-5xl font-black font-['Space_Grotesk'] text-destructive/70 tracking-tighter">{noPct.toFixed(0)}%</span>
          </div>
        </div>

        {/* Vote bar */}
        <div className="h-3 rounded-full bg-secondary overflow-hidden flex mb-5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${yesPct}%` }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="h-full rounded-l-full"
            style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))" }}
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${noPct}%` }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="h-full rounded-r-full bg-destructive/50"
          />
        </div>

        {/* Meta row + share */}
        <div className="flex items-center justify-between gap-4">
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
            <button onClick={handleShareX} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Share on X">
              <ExternalLink className="h-3 w-3" /> X
            </button>
            <button onClick={handleCopyLink} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Copy link">
              <Copy className="h-3 w-3" /> Copy
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

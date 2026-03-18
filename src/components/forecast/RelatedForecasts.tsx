import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";

function getTimeRemaining(endDate: string): string {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 30) return `${Math.floor(days / 30)}mo left`;
  if (days > 0) return `${days}d left`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  return `${hours}h left`;
}

interface RelatedForecastsProps {
  forecasts: any[];
}

export default function RelatedForecastsList({ forecasts }: RelatedForecastsProps) {
  if (forecasts.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground font-['Space_Grotesk']">Related Forecasts</h3>
      </div>
      <div className="divide-y divide-border">
        {forecasts.map((rf: any) => {
          const total = rf.total_votes_yes + rf.total_votes_no;
          const yesPct = total > 0 ? (rf.total_votes_yes / total) * 100 : 50;
          const isEnded = new Date(rf.end_date) <= new Date();
          return (
            <Link
              key={rf.id}
              to={`/forecasts/${rf.id}`}
              className="block px-5 py-3.5 hover:bg-secondary/30 transition-colors group"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center -space-x-1.5">
                  {rf.project_a_logo_url ? (
                    <img src={rf.project_a_logo_url} alt={rf.project_a_name} className="w-5 h-5 rounded-md object-contain border border-card bg-secondary relative z-10" />
                  ) : (
                    <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] border border-card bg-secondary relative z-10">{rf.project_a_logo_emoji}</span>
                  )}
                  {rf.project_b_name && (
                    rf.project_b_logo_url ? (
                      <img src={rf.project_b_logo_url} alt={rf.project_b_name} className="w-5 h-5 rounded-md object-contain border border-card bg-secondary" />
                    ) : (
                      <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] border border-card bg-secondary">{rf.project_b_logo_emoji}</span>
                    )
                  )}
                </div>
                <span className={`ml-auto text-[9px] font-semibold rounded-md px-1.5 py-0.5 ${
                  isEnded ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                }`}>
                  {isEnded ? "Ended" : getTimeRemaining(rf.end_date)}
                </span>
              </div>
              <h4 className="text-xs font-semibold text-foreground leading-snug line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                {rf.title}
              </h4>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
                <span>{yesPct.toFixed(0)}% Yes</span>
                <span>{total} vote{total !== 1 ? "s" : ""}</span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden flex">
                <div className="h-full rounded-l-full" style={{ width: `${yesPct}%`, background: "hsl(var(--primary))" }} />
                <div className="h-full rounded-r-full bg-destructive/60" style={{ width: `${100 - yesPct}%` }} />
              </div>
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useProjectSentiment } from "@/hooks/useSentiment";

interface SentimentBadgeProps {
  projectId: string;
  projectName?: string;
  compact?: boolean;
}

const SentimentBadge = ({ projectId, projectName, compact = false }: SentimentBadgeProps) => {
  const { data: sentiment } = useProjectSentiment(projectId);

  if (!sentiment || sentiment.total_votes === 0) return null;

  const bullPct = sentiment.bullish_percentage;
  const bearPct = 100 - bullPct;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${bullPct >= 50 ? "text-green-400" : "text-red-400"}`}>
        {bullPct >= 50 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {bullPct.toFixed(0)}% {bullPct >= 50 ? "Bullish" : "Bearish"}
      </span>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-5"
    >
      <h3 className="text-sm font-semibold text-foreground mb-3">
        {projectName ? `${projectName} ` : ""}Community Sentiment
      </h3>

      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-green-400 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Bullish {bullPct.toFixed(0)}%
            </span>
            <span className="text-xs font-medium text-red-400 flex items-center gap-1">
              Bearish {bearPct.toFixed(0)}% <TrendingDown className="h-3 w-3" />
            </span>
          </div>
          <div className="h-3 rounded-full bg-secondary overflow-hidden flex">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${bullPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-green-500 rounded-l-full"
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${bearPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
              className="h-full bg-red-500 rounded-r-full"
            />
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Based on {sentiment.total_votes.toLocaleString()} community forecast vote{sentiment.total_votes !== 1 ? "s" : ""}
      </p>
    </motion.div>
  );
};

export default SentimentBadge;

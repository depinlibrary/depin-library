import { motion } from "framer-motion";
import { Twitter, Users, Eye, ThumbsUp } from "lucide-react";
import type { CoinDetailSocial } from "@/hooks/useCoinDetail";

interface Props {
  social: CoinDetailSocial | null | undefined;
  sentimentUp: number | null | undefined;
  watchlistUsers: number | null | undefined;
  projectName: string;
}

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function ProjectSocial({ social, sentimentUp, watchlistUsers, projectName }: Props) {
  const hasAnyData = social?.twitter_followers || social?.reddit_subscribers || social?.telegram_members || watchlistUsers;

  if (!hasAnyData) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">No social data available for {projectName}.</p>
      </div>
    );
  }

  const cards = [
    {
      label: "X Followers",
      value: formatNumber(social?.twitter_followers),
      icon: Twitter,
      show: !!social?.twitter_followers,
    },
    {
      label: "Reddit Subscribers",
      value: formatNumber(social?.reddit_subscribers),
      icon: Users,
      show: !!social?.reddit_subscribers,
    },
    {
      label: "Telegram Members",
      value: formatNumber(social?.telegram_members),
      icon: Users,
      show: !!social?.telegram_members,
    },
    {
      label: "Watchlist Users",
      value: formatNumber(watchlistUsers),
      icon: Eye,
      show: !!watchlistUsers,
    },
    {
      label: "Sentiment (Bullish)",
      value: sentimentUp != null ? `${sentimentUp.toFixed(1)}%` : "—",
      icon: ThumbsUp,
      show: sentimentUp != null,
    },
  ].filter((c) => c.show);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-border bg-card p-5 flex flex-col gap-1"
          >
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <card.icon className="h-4 w-4" />
              <span className="text-sm">{card.label}</span>
            </div>
            <span className="text-2xl font-bold text-foreground">{card.value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

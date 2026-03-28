import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { TrendingUp, TrendingDown, MessageSquare, Vote, PlusCircle, Zap } from "lucide-react";
import ProjectLogo from "@/components/ProjectLogo";

interface ActivityItem {
  id: string;
  type: "vote" | "new_forecast" | "comment" | "result";
  title: string;
  detail: string;
  timestamp: string;
  link: string;
  logoUrl?: string | null;
  logoEmoji?: string;
  projectName?: string;
  sentiment?: "bullish" | "bearish" | "neutral";
}

const typeConfig: Record<string, { icon: typeof Zap; color: string; label: string }> = {
  vote: { icon: Vote, color: "text-primary", label: "Vote" },
  new_forecast: { icon: PlusCircle, color: "text-green-500", label: "New Market" },
  comment: { icon: MessageSquare, color: "text-accent-foreground", label: "Comment" },
  result: { icon: Zap, color: "text-yellow-500", label: "Result" },
};

export default function ActivityFeed() {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["forecast-activity-feed"],
    queryFn: async () => {
      const items: ActivityItem[] = [];

      // Fetch recent votes (last 24h)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [votesRes, forecastsRes, commentsRes] = await Promise.all([
        supabase
          .from("forecast_votes")
          .select("id, vote, created_at, forecast_id")
          .gte("created_at", oneDayAgo)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("forecasts")
          .select("id, title, created_at, project_a_id, total_votes_yes, total_votes_no, status, outcome")
          .gte("created_at", oneDayAgo)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("forecast_comments")
          .select("id, comment_text, created_at, forecast_id")
          .gte("created_at", oneDayAgo)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      // Get forecast details for votes
      const voteForecasts = votesRes.data || [];
      const forecastIds = [...new Set(voteForecasts.map(v => v.forecast_id))];
      
      let forecastMap: Record<string, any> = {};
      if (forecastIds.length > 0) {
        const { data: fData } = await supabase
          .from("forecasts")
          .select("id, title, project_a_id")
          .in("id", forecastIds);
        (fData || []).forEach(f => { forecastMap[f.id] = f; });
      }

      // Get project details
      const projectIds = [
        ...new Set([
          ...Object.values(forecastMap).map((f: any) => f.project_a_id),
          ...(forecastsRes.data || []).map(f => f.project_a_id),
        ]),
      ];

      let projectMap: Record<string, any> = {};
      if (projectIds.length > 0) {
        const { data: pData } = await supabase
          .from("projects")
          .select("id, name, logo_url, logo_emoji, slug")
          .in("id", projectIds);
        (pData || []).forEach(p => { projectMap[p.id] = p; });
      }

      // Get comment forecast details
      const commentForecasts = commentsRes.data || [];
      const commentFIds = [...new Set(commentForecasts.map(c => c.forecast_id))];
      if (commentFIds.length > 0) {
        const { data: cfData } = await supabase
          .from("forecasts")
          .select("id, title")
          .in("id", commentFIds);
        (cfData || []).forEach(f => { if (!forecastMap[f.id]) forecastMap[f.id] = f; });
      }

      // Aggregate votes by forecast (group)
      const voteGroups: Record<string, { yes: number; no: number; latest: string }> = {};
      voteForecasts.forEach(v => {
        if (!voteGroups[v.forecast_id]) voteGroups[v.forecast_id] = { yes: 0, no: 0, latest: v.created_at };
        if (v.vote === "yes") voteGroups[v.forecast_id].yes++;
        else voteGroups[v.forecast_id].no++;
        if (v.created_at > voteGroups[v.forecast_id].latest) voteGroups[v.forecast_id].latest = v.created_at;
      });

      Object.entries(voteGroups).forEach(([fid, g]) => {
        const f = forecastMap[fid];
        if (!f) return;
        const p = projectMap[f.project_a_id];
        const totalNew = g.yes + g.no;
        const dominant = g.yes >= g.no ? "Yes" : "No";
        items.push({
          id: `vote-${fid}`,
          type: "vote",
          title: f.title,
          detail: `${totalNew} new vote${totalNew !== 1 ? "s" : ""} · ${dominant} leading`,
          timestamp: g.latest,
          link: `/forecasts/${fid}`,
          logoUrl: p?.logo_url,
          logoEmoji: p?.logo_emoji,
          projectName: p?.name,
          sentiment: g.yes > g.no ? "bullish" : g.no > g.yes ? "bearish" : "neutral",
        });
      });

      // New forecasts
      (forecastsRes.data || []).forEach(f => {
        const p = projectMap[f.project_a_id];
        items.push({
          id: `new-${f.id}`,
          type: f.status === "resolved" ? "result" : "new_forecast",
          title: f.title,
          detail: f.status === "resolved"
            ? `Resolved: ${f.outcome === "yes" ? "Yes ✓" : "No ✗"}`
            : "New market opened",
          timestamp: f.created_at,
          link: `/forecasts/${f.id}`,
          logoUrl: p?.logo_url,
          logoEmoji: p?.logo_emoji,
          projectName: p?.name,
          sentiment: "neutral",
        });
      });

      // Comments
      commentForecasts.forEach(c => {
        const f = forecastMap[c.forecast_id];
        items.push({
          id: `comment-${c.id}`,
          type: "comment",
          title: f?.title || "Forecast",
          detail: c.comment_text.length > 60 ? c.comment_text.slice(0, 60) + "…" : c.comment_text,
          timestamp: c.created_at,
          link: `/forecasts/${c.forecast_id}`,
          sentiment: "neutral",
        });
      });

      // Sort by timestamp desc
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return items.slice(0, 8);
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  if (isLoading || activities.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground font-['Space_Grotesk'] uppercase tracking-wide">
          Recent Activity
        </h3>
        <div className="h-px flex-1 bg-border/40" />
        <span className="text-[10px] text-muted-foreground font-medium">Last 24h</span>
      </div>

      <div className="grid gap-1.5">
        {activities.map((item, i) => {
          const config = typeConfig[item.type] || typeConfig.vote;
          const Icon = config.icon;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
            >
              <Link
                to={item.link}
                className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all hover:bg-secondary/40"
              >
                {/* Icon */}
                <div className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-md bg-secondary ${config.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>

                {/* Project logo */}
                {(item.logoUrl || item.logoEmoji) && (
                  <ProjectLogo
                    logoUrl={item.logoUrl}
                    logoEmoji={item.logoEmoji || "⬡"}
                    name={item.projectName || ""}
                    size="xs"
                  />
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{item.detail}</p>
                </div>

                {/* Sentiment indicator */}
                {item.sentiment === "bullish" && (
                  <TrendingUp className="h-3.5 w-3.5 text-green-500 shrink-0" />
                )}
                {item.sentiment === "bearish" && (
                  <TrendingDown className="h-3.5 w-3.5 text-destructive shrink-0" />
                )}

                {/* Timestamp */}
                <span className="text-[10px] text-muted-foreground/60 shrink-0 tabular-nums">
                  {formatDistanceToNow(new Date(item.timestamp), { addSuffix: false })}
                </span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

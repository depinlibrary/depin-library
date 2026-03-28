import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle } from "lucide-react";

function getTimeLeft(endDate: string) {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 30) return `${Math.floor(days / 30)}mo left`;
  if (days > 0) return `${days}d left`;
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (hours > 0) return `${hours}h left`;
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${minutes}m`;
}

interface ProjectForecastsProps {
  projectId: string;
  projectName: string;
}

const ProjectForecasts = ({ projectId, projectName }: ProjectForecastsProps) => {
  const { data: forecasts = [], isLoading } = useQuery({
    queryKey: ["project-forecasts", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forecasts")
        .select(`
          id, title, description, status, end_date,
          total_votes_yes, total_votes_no, weighted_votes_yes, weighted_votes_no, outcome, created_at,
          project_a:projects!forecasts_project_a_id_fkey(id, name, slug, logo_url, logo_emoji),
          project_b:projects!forecasts_project_b_id_fkey(id, name, slug, logo_url, logo_emoji)
        `)
        .or(`project_a_id.eq.${projectId},project_b_id.eq.${projectId}`)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const forecastIds = forecasts.map((f: any) => f.id);
  const { data: dimensionsMap = {} } = useQuery({
    queryKey: ["project-forecast-dimensions", projectId, forecastIds],
    enabled: forecastIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forecast_targets")
        .select("forecast_id, dimension")
        .in("forecast_id", forecastIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((d: any) => { map[d.forecast_id] = d.dimension; });
      return map;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-secondary/30 animate-pulse" />
        ))}
      </div>
    );
  }

  if (forecasts.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">No forecasts have been made about {projectName} yet.</p>
        <Link to="/forecasts?create=true" className="mt-3 inline-block text-sm font-medium text-primary hover:text-primary/80 transition-colors">
          Create the first forecast →
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {forecasts.map((forecast: any) => {
        const dimension = (dimensionsMap as Record<string, string>)[forecast.id];
        const isPriceMarket = dimension === "token_price" || dimension === "market_cap";
        const isSentimentDual = dimension === "community_sentiment" && !!forecast.project_b;
        const yesLabel = isPriceMarket ? "Long" : isSentimentDual ? forecast.project_a?.name : "Yes";
        const noLabel = isPriceMarket ? "Short" : isSentimentDual ? forecast.project_b?.name : "No";
        const totalVotes = forecast.total_votes_yes + forecast.total_votes_no;
        const yesPct = (() => { const wy = Number(forecast.weighted_votes_yes) || 0; const wn = Number(forecast.weighted_votes_no) || 0; const wt = wy + wn; return wt > 0 ? (wy / wt) * 100 : totalVotes > 0 ? (forecast.total_votes_yes / totalVotes) * 100 : 50; })();
        const isEnded = forecast.status === "ended" || new Date(forecast.end_date) <= new Date();
        const timeLeft = getTimeLeft(forecast.end_date);
        const projectA = forecast.project_a;
        const projectB = forecast.project_b;

        return (
          <Link
            key={forecast.id}
            to={`/forecasts/${forecast.id}`}
            className="group relative flex flex-col rounded-xl border border-border bg-card overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 h-full"
          >
            <div className="p-4 flex-1 flex flex-col">
              {/* Header: logos + time */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center -space-x-1.5">
                    {projectA?.logo_url ? (
                      <img src={projectA.logo_url} alt={projectA.name} className="w-7 h-7 rounded-lg object-contain border border-card bg-secondary relative z-10" />
                    ) : (
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs border border-card bg-secondary relative z-10">{projectA?.logo_emoji || "⬡"}</span>
                    )}
                    {projectB && (
                      projectB.logo_url ? (
                        <img src={projectB.logo_url} alt={projectB.name} className="w-7 h-7 rounded-lg object-contain border border-card bg-secondary relative z-0" />
                      ) : (
                        <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs border border-card bg-secondary relative z-0">{projectB?.logo_emoji || "⬡"}</span>
                      )
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-medium text-muted-foreground">{projectA?.name}</span>
                    {projectB && (
                      <>
                        <span className="text-muted-foreground/40 text-[9px]">vs</span>
                        <span className="text-[11px] font-medium text-muted-foreground">{projectB.name}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isEnded ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600 dark:text-green-400'}`}>
                  {timeLeft}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2 group-hover:underline transition-all duration-200 mb-auto">
                {forecast.title}
              </h3>

              {/* Percentage + votes */}
              <div className="mt-4 flex items-end justify-between">
                <span className="text-lg font-bold text-foreground tabular-nums">{yesPct.toFixed(0)}%<span className="text-xs font-normal text-muted-foreground ml-1">chance</span></span>
                <span className="text-[10px] text-muted-foreground">{totalVotes.toLocaleString()} vote{totalVotes !== 1 ? "s" : ""}</span>
              </div>
            </div>

            {/* Vote buttons */}
            <div className="px-4 pb-4">
              <div className="flex gap-2">
                <span className={`flex-1 rounded-lg py-2 text-xs font-bold text-center ${
                  isEnded ? "bg-secondary text-muted-foreground opacity-60" : "bg-primary/10 text-primary"
                }`}>{yesLabel}</span>
                <span className={`flex-1 rounded-lg py-2 text-xs font-bold text-center ${
                  isEnded ? "bg-secondary text-muted-foreground opacity-60" : "bg-destructive/10 text-destructive"
                }`}>{noLabel}</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default ProjectForecasts;

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

interface ProjectPredictionsProps {
  projectId: string;
  projectName: string;
}

const ProjectPredictions = ({ projectId, projectName }: ProjectPredictionsProps) => {
  const { data: predictions = [], isLoading } = useQuery({
    queryKey: ["project-predictions", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forecasts")
        .select(`
          id, title, description, status, end_date,
          total_votes_yes, total_votes_no, weighted_votes_yes, weighted_votes_no, outcome, created_at,
          project_a:projects!predictions_project_a_id_fkey(id, name, slug, logo_url, logo_emoji),
          project_b:projects!predictions_project_b_id_fkey(id, name, slug, logo_url, logo_emoji)
        `)
        .or(`project_a_id.eq.${projectId},project_b_id.eq.${projectId}`)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const predictionIds = predictions.map((f: any) => f.id);
  const { data: dimensionsMap = {} } = useQuery({
    queryKey: ["project-prediction-dimensions", projectId, predictionIds],
    enabled: predictionIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forecast_targets")
        .select("forecast_id, dimension")
        .in("forecast_id", predictionIds);
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

  if (predictions.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">No predictions have been made about {projectName} yet.</p>
        <Link to="/predictions?create=true" className="mt-3 inline-block text-sm font-medium text-primary hover:text-primary/80 transition-colors">
          Create the first prediction →
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {predictions.map((prediction: any) => {
        const dimension = (dimensionsMap as Record<string, string>)[prediction.id];
        const isPriceMarket = dimension === "token_price" || dimension === "market_cap";
        const yesLabel = isPriceMarket ? "Long" : "Yes";
        const noLabel = isPriceMarket ? "Short" : "No";
        const totalVotes = prediction.total_votes_yes + prediction.total_votes_no;
        const yesPct = (() => { const wy = Number(prediction.weighted_votes_yes) || 0; const wn = Number(prediction.weighted_votes_no) || 0; const wt = wy + wn; return wt > 0 ? (wy / wt) * 100 : totalVotes > 0 ? (prediction.total_votes_yes / totalVotes) * 100 : 50; })();
        const isEnded = prediction.status === "ended" || new Date(prediction.end_date) <= new Date();
        const timeLeft = getTimeLeft(prediction.end_date);
        const projectA = prediction.project_a;
        const projectB = prediction.project_b;

        return (
          <Link
            key={prediction.id}
            to={`/predictions/${prediction.id}`}
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
                {prediction.title}
              </h3>

              {/* Percentage as cents + votes */}
              <div className="mt-4 flex items-end justify-between">
                <span className="text-lg font-bold text-foreground tabular-nums font-['Space_Grotesk']">{Math.round(yesPct)}¢<span className="text-xs font-normal text-muted-foreground ml-1">{yesLabel}</span></span>
                <span className="text-[10px] text-muted-foreground">{totalVotes.toLocaleString()} vote{totalVotes !== 1 ? "s" : ""}</span>
              </div>
            </div>

            {/* Polymarket cent-based buttons */}
            <div className="px-4 pb-4">
              <div className="flex gap-2">
                <span className={`flex-1 rounded-lg py-2 text-center ${
                  isEnded ? "bg-secondary text-muted-foreground opacity-60" : "bg-primary/10 text-primary"
                }`}>
                  <span className="text-[10px] font-medium block">{yesLabel}</span>
                  <span className="text-sm font-bold font-['Space_Grotesk'] tabular-nums">{Math.round(yesPct)}¢</span>
                </span>
                <span className={`flex-1 rounded-lg py-2 text-center ${
                  isEnded ? "bg-secondary text-muted-foreground opacity-60" : "bg-destructive/10 text-destructive"
                }`}>
                  <span className="text-[10px] font-medium block">{noLabel}</span>
                  <span className="text-sm font-bold font-['Space_Grotesk'] tabular-nums">{Math.round(noPct)}¢</span>
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default ProjectPredictions;

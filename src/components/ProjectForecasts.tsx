import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ProjectLogo from "@/components/ProjectLogo";
import { Clock, Users } from "lucide-react";

function getTimeLeft(endDate: string) {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
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
      // Get forecasts where this project is project_a or project_b
      const { data, error } = await supabase
        .from("forecasts")
        .select(`
          id, title, description, status, end_date,
          total_votes_yes, total_votes_no, created_at,
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
        const totalVotes = forecast.total_votes_yes + forecast.total_votes_no;
        const yesPct = totalVotes > 0 ? (forecast.total_votes_yes / totalVotes) * 100 : 50;
        const noPct = 100 - yesPct;
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
            <div className="p-5 flex-1 flex flex-col">
              {/* Header: logos + status */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1.5">
                  {projectA && (
                    <ProjectLogo logoUrl={projectA.logo_url} logoEmoji={projectA.logo_emoji || "⬡"} name={projectA.name} size="xs" />
                  )}
                  {projectB && (
                    <>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">vs</span>
                      <ProjectLogo logoUrl={projectB.logo_url} logoEmoji={projectB.logo_emoji || "⬡"} name={projectB.name} size="xs" />
                    </>
                  )}
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${isEnded ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600 dark:text-green-400'}`}>
                  {isEnded ? "Ended" : (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Live {timeLeft && `· ${timeLeft}`}
                    </span>
                  )}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:underline transition-all duration-200 mb-auto">
                {forecast.title}
              </h3>

              {/* Percentage + bar */}
              <div className="mt-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-foreground">{yesPct.toFixed(0)}% chance</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${yesPct}%` }} />
                </div>
              </div>
            </div>

            {/* Vote footer + total votes */}
            {!isEnded ? (
              <div className="px-5 pb-5 pt-1 space-y-2">
                <div className="flex gap-2.5">
                  <span className="flex-1 rounded-lg py-2.5 text-sm font-bold text-center bg-primary/10 text-primary">Yes</span>
                  <span className="flex-1 rounded-lg py-2.5 text-sm font-bold text-center bg-destructive/10 text-destructive">No</span>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">{totalVotes.toLocaleString()} vote{totalVotes !== 1 ? "s" : ""}</p>
              </div>
            ) : (
              <div className="px-5 pb-5 pt-1 space-y-2">
                <div className={`flex items-center justify-center rounded-lg py-2.5 ${yesPct >= 50 ? "bg-primary/5" : "bg-destructive/5"}`}>
                  <span className={`text-xs font-bold ${yesPct >= 50 ? "text-primary" : "text-destructive"}`}>
                    Resolved: {yesPct >= 50 ? "Yes" : "No"}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">{totalVotes.toLocaleString()} vote{totalVotes !== 1 ? "s" : ""}</p>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
};

export default ProjectForecasts;

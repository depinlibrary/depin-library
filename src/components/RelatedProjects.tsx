import { Link } from "react-router-dom";
import { useProjects } from "@/hooks/useProjects";
import ProjectLogo from "@/components/ProjectLogo";
import { Star } from "lucide-react";

interface RelatedProjectsProps {
  currentProjectId: string;
  category: string;
  blockchain: string;
}

const RelatedProjects = ({ currentProjectId, category, blockchain }: RelatedProjectsProps) => {
  const { data: projects = [] } = useProjects();

  const related = projects
    .filter((p) => p.id !== currentProjectId && p.category === category)
    .slice(0, 4);

  if (related.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Related Projects</h3>
      <div className="space-y-2">
        {related.map((p) => (
          <Link
            key={p.id}
            to={`/project/${p.slug}`}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/30"
          >
            <ProjectLogo logoUrl={p.logo_url} logoEmoji={p.logo_emoji} name={p.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
              <p className="truncate text-xs text-muted-foreground">{p.category}</p>
            </div>
            {p.avg_rating && p.avg_rating > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <Star className="h-3 w-3 fill-primary text-primary" />
                {p.avg_rating.toFixed(1)}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RelatedProjects;

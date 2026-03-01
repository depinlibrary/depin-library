import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, Star, MessageSquare } from "lucide-react";
import type { Project } from "@/hooks/useProjects";
import { useReviewActivity } from "@/hooks/useReviewActivity";
import ProjectLogo from "@/components/ProjectLogo";
import Sparkline from "@/components/Sparkline";

interface TrendingSectionProps {
  projects: Project[];
}

const TrendingSection = ({ projects = [] }: TrendingSectionProps) => {
  const trending = useMemo(() => {
    return [...projects]
      .filter((p) => (p.review_count || 0) > 0 || (p.avg_rating || 0) > 0)
      .sort((a, b) => {
        const scoreA = (a.review_count || 0) * 2 + (a.avg_rating || 0);
        const scoreB = (b.review_count || 0) * 2 + (b.avg_rating || 0);
        return scoreB - scoreA;
      })
      .slice(0, 5);
  }, [projects]);

  const trendingIds = useMemo(() => trending.map((p) => p.id), [trending]);
  const { data: activity } = useReviewActivity(trendingIds, 30);

  if (trending.length === 0) return null;

  return (
    <section className="container mx-auto px-4 pb-10">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Trending</h2>
          <span className="text-xs text-muted-foreground">Most reviewed & highest rated</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {trending.map((project, i) => (
            <Link
              key={project.id}
              to={`/project/${project.slug}`}
              className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5 transition-all hover:border-primary/30 hover:bg-card/80"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ProjectLogo
                    logoUrl={project.logo_url}
                    logoEmoji={project.logo_emoji}
                    name={project.name}
                    size="sm"
                  />
                  <span className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {project.name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {project.avg_rating && (
                      <span className="flex items-center gap-0.5 text-primary">
                        <Star className="h-3 w-3 fill-primary" />
                        {project.avg_rating.toFixed(1)}
                      </span>
                    )}
                    {(project.review_count || 0) > 0 && (
                      <span className="flex items-center gap-0.5">
                        <MessageSquare className="h-3 w-3" />
                        {project.review_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {activity?.[project.id] && (
                <div className="mt-auto">
                  <Sparkline data={activity[project.id]} width={120} height={20} className="w-full" />
                  <p className="mt-0.5 text-[9px] text-muted-foreground">30-day activity</p>
                </div>
              )}
            </Link>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default TrendingSection;

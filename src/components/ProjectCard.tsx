import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Star, Bookmark } from "lucide-react";
import type { Project } from "@/hooks/useProjects";
import { useAuth } from "@/contexts/AuthContext";
import { useBookmarks, useToggleBookmark } from "@/hooks/useBookmarks";
import ProjectLogo from "@/components/ProjectLogo";
import TokenPriceBadge from "@/components/TokenPriceBadge";
import type { TokenMarketData } from "@/hooks/useTokenMarketData";

interface ProjectCardProps {
  project: Project;
  index: number;
  marketData?: TokenMarketData | null;
}

const statusColors: Record<string, string> = {
  live: "bg-neon-green/15 text-neon-green border-neon-green/30",
  testnet: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  development: "bg-muted text-muted-foreground border-border",
};

const ProjectCard = ({ project, index, marketData }: ProjectCardProps) => {
  const { user } = useAuth();
  const { data: bookmarks = [] } = useBookmarks();
  const toggleBookmark = useToggleBookmark();
  const isBookmarked = bookmarks.includes(project.id);

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    toggleBookmark.mutate({ projectId: project.id, isBookmarked });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link
        to={`/project/${project.slug}`}
        className="group relative flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/30 hover:bg-card/80 depth-sm card-hover"
      >
        {/* Bookmark button */}
        {user && (
          <button
            onClick={handleBookmark}
            className="absolute top-3 right-3 rounded-md p-1.5 transition-colors hover:bg-secondary"
          >
            <Bookmark
              className={`h-4 w-4 transition-colors ${
                isBookmarked ? "fill-primary text-primary" : "text-text-dim hover:text-muted-foreground"
              }`}
            />
          </button>
        )}

        <div className="mb-4 flex items-start justify-between pr-8">
          <div className="flex items-center gap-3">
            <ProjectLogo logoUrl={project.logo_url} logoEmoji={project.logo_emoji} name={project.name} size="sm" />
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-foreground transition-colors">
                {project.name}
              </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{project.token}</span>
                  {project.avg_rating && (
                    <span className="flex items-center gap-0.5 text-xs text-primary">
                      <Star className="h-3 w-3 fill-primary" />
                      {project.avg_rating.toFixed(1)}
                    </span>
                  )}
                </div>
                {marketData && <TokenPriceBadge data={marketData} compact />}
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-text-dim opacity-0 transition-all group-hover:opacity-100 group-hover:text-primary" />
        </div>

        <p className="mb-4 flex-1 text-sm leading-relaxed text-muted-foreground">
          {project.tagline}
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
            {project.category}
          </span>
          <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
            {project.blockchain}
          </span>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProjectCard;

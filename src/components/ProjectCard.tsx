import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { DePINProject } from "@/data/projects";

interface ProjectCardProps {
  project: DePINProject;
  index: number;
}

const statusColors = {
  live: "bg-neon-green/15 text-neon-green border-neon-green/30",
  testnet: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  development: "bg-muted text-muted-foreground border-border",
};

const ProjectCard = ({ project, index }: ProjectCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link
        to={`/project/${project.slug}`}
        className="group relative flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/30 hover:bg-card/80 hover:glow-primary-sm"
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary text-xl">
              {project.logo}
            </div>
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {project.name}
              </h3>
              <p className="text-xs text-muted-foreground">{project.token}</p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-text-dim opacity-0 transition-all group-hover:opacity-100 group-hover:text-primary" />
        </div>

        {/* Tagline */}
        <p className="mb-4 flex-1 text-sm leading-relaxed text-muted-foreground">
          {project.tagline}
        </p>

        {/* Footer */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
            {project.category}
          </span>
          <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
            {project.blockchain}
          </span>
          <span
            className={`ml-auto rounded-md border px-2 py-0.5 text-xs font-medium ${statusColors[project.status]}`}
          >
            {project.status}
          </span>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProjectCard;

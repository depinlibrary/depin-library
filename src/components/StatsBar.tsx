import { motion } from "framer-motion";
import { CATEGORIES } from "@/data/projects";
import type { Project } from "@/hooks/useProjects";

interface StatsBarProps {
  projects: Project[];
}

const StatsBar = ({ projects }: StatsBarProps) => {
  const liveCount = projects.filter((p) => p.status === "live").length;
  const blockchains = new Set(projects.map((p) => p.blockchain)).size;
  const categories = new Set(projects.map((p) => p.category)).size;

  const stats = [
    { label: "Total Projects", value: projects.length },
    { label: "Live Networks", value: liveCount },
    { label: "Categories", value: categories },
    { label: "Blockchains", value: blockchains },
  ];

  return (
    <section className="container mx-auto px-4 pb-12">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="rounded-xl border border-border bg-card p-4 text-center"
          >
            <p className="text-2xl font-bold text-primary">{stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default StatsBar;

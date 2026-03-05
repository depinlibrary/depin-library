import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Layers,
  BarChart3,
  GitCompare,
  Briefcase,
  Wifi,
  HardDrive,
  Cpu,
  Thermometer,
  Map,
  Brain,
  Car,
  Globe,
  Shield,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProjectLogo from "@/components/ProjectLogo";
import { useProjects } from "@/hooks/useProjects";
import { CATEGORIES } from "@/data/projects";
import type { Category } from "@/data/projects";

const categoryIcons: Record<Category, React.ElementType> = {
  Wireless: Wifi,
  Storage: HardDrive,
  Compute: Cpu,
  Sensors: Thermometer,
  Energy: Shield,
  Mapping: Map,
  AI: Brain,
  Mobility: Car,
  CDN: Globe,
  VPN: Shield,
};

const Overview = () => {
  const { data: projects = [] } = useProjects();

  const quickLinks = [
    {
      title: "Explore Projects",
      description: "Browse, search, and filter the full DePIN project directory.",
      icon: Layers,
      to: "/explore",
    },
    {
      title: "Market Overview",
      description: "Track token prices, market caps, and 24h trends across the ecosystem.",
      icon: BarChart3,
      to: "/market",
    },
    {
      title: "Compare Projects",
      description: "Side-by-side AI-powered comparison of any two DePIN projects.",
      icon: GitCompare,
      to: "/compare",
    },
    {
      title: "Portfolio",
      description: "Track your DePIN holdings, allocation, and performance over time.",
      icon: Briefcase,
      to: "/portfolio",
    },
  ];

  // Top 6 categories — swap Energy for AI
  const topCategoryNames: Category[] = ["Wireless", "Storage", "Compute", "Sensors", "AI", "Mapping"];
  const topCategories = topCategoryNames.map((name) => ({
    name,
    count: projects.filter((p) => p.category === name).length,
    Icon: categoryIcons[name],
  }));

  // Recently added projects (newest 6)
  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="gradient-radial-top absolute inset-0" />

        <div className="container relative mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5">
              <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-primary" />
              <span className="text-xs font-medium text-muted-foreground">
                DePIN Indexed
              </span>
            </div>

            <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl">
              The{" "}
              <span className="text-glow text-primary">DePIN</span>{" "}
              Ecosystem at a Glance
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Your central hub to explore, compare, and understand Decentralized
              Physical Infrastructure Networks — all in one place.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-8"
            >
              <Link
                to="/explore"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Explore Projects
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="container mx-auto px-4 pb-16">
        <h2 className="mb-6 text-xl font-semibold text-foreground">Quick Access</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link, i) => (
            <motion.div
              key={link.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.08 }}
            >
              <Link
                to={link.to}
                className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-all hover:border-border hover:shadow-lg hover:shadow-background/10"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors group-hover:bg-secondary/80">
                  <link.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{link.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {link.description}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Top Categories */}
      <section className="container mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Top Categories</h2>
          <Link
            to="/explore"
            className="text-xs font-medium text-primary hover:underline"
          >
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {topCategories.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.05 }}
            >
              <Link
                to={`/explore?category=${cat.name}`}
                className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition-all hover:border-primary/40 hover:shadow-md hover:shadow-primary/5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                  <cat.Icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-foreground">{cat.name}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Recently Added Projects */}
      <section className="container mx-auto px-4 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Recently Added</h2>
          <Link
            to="/explore?sort=newest"
            className="text-xs font-medium text-primary hover:underline"
          >
            View all →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recentProjects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.06 }}
            >
              <Link
                to={`/project/${project.slug}`}
                className="group flex items-start gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-border hover:shadow-md hover:shadow-background/10"
              >
                <ProjectLogo logoUrl={project.logo_url} logoEmoji={project.logo_emoji} name={project.name} size="sm" />
                <div className="min-w-0">
                  <h3 className="font-medium text-foreground group-hover:text-foreground transition-colors truncate">
                    {project.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {project.tagline}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {project.category}
                    </span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {project.blockchain}
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Overview;

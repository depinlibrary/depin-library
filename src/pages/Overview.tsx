import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Layers,
  BarChart3,
  GitCompare,
  Briefcase,
  TrendingUp,
  Wifi,
  HardDrive,
  Cpu,
  Thermometer,
  Map,
  Brain,
  Car,
  Globe,
  Shield,
  Users,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProjectLogo from "@/components/ProjectLogo";
import BillboardHero from "@/components/BillboardHero";
import { useProjects } from "@/hooks/useProjects";
import { useAllTokenMarketData } from "@/hooks/useTokenMarketData";
import { useTopSentiments, useTrendingProjects } from "@/hooks/useSentiment";
import { CATEGORIES } from "@/data/projects";
import type { Category } from "@/data/projects";
import { useEffect, useState } from "react";

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

// Animated counter
const AnimatedCounter = ({ target, duration = 1.5 }: { target: number; duration?: number }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = target;
    if (end === 0) return;
    const stepTime = Math.max(Math.floor((duration * 1000) / end), 16);
    const timer = setInterval(() => {
      start += Math.ceil(end / (duration * 60));
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [target, duration]);
  return <>{count}</>;
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const Overview = () => {
  const { data: projects = [] } = useProjects();
  const { data: marketData = {} } = useAllTokenMarketData();
  const { data: topSentiments = [] } = useTopSentiments(6);
  const { data: trendingProjects = [] } = useTrendingProjects(5);

  const quickLinks = [
    { title: "Explore", description: "Browse the full DePIN project directory.", icon: Layers, to: "/explore", accent: "primary" },
    { title: "Market", description: "Track token prices and market trends.", icon: BarChart3, to: "/market", accent: "primary" },
    { title: "Compare", description: "AI-powered side-by-side comparison.", icon: GitCompare, to: "/compare", accent: "accent" },
    { title: "Forecasts", description: "Community predictions and voting.", icon: TrendingUp, to: "/forecasts", accent: "accent" },
    { title: "Portfolio", description: "Track your DePIN holdings.", icon: Briefcase, to: "/portfolio", accent: "primary" },
  ];

  const topCategoryNames: Category[] = ["Wireless", "Storage", "Compute", "Sensors", "AI", "Mapping"];
  const topCategories = topCategoryNames.map((name) => ({
    name,
    count: projects.filter((p) => p.category === name).length,
    Icon: categoryIcons[name],
  }));

  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  const totalCategories = new Set(projects.map((p) => p.category)).size;
  const totalBlockchains = new Set(projects.map((p) => p.blockchain)).size;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Billboard Hero */}
      <BillboardHero
        projects={projects}
        marketData={marketData}
        topSentiments={topSentiments}
        trendingProjects={trendingProjects}
        totalCategories={totalCategories}
        totalBlockchains={totalBlockchains}
      />

      {/* Quick Links */}
      <section className="container mx-auto px-4 pb-16">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={stagger}>
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-semibold text-foreground font-['Space_Grotesk']">Quick Access</h2>
            <div className="h-px flex-1 bg-border/50" />
          </motion.div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {quickLinks.map((link, i) => (
              <motion.div key={link.title} variants={fadeUp}>
                <Link
                  to={link.to}
                  className="group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-all hover:bg-card/80 hover:shadow-lg hover:shadow-background/10 overflow-hidden"
                >
                  {/* Subtle corner accent */}
                  <div className="absolute top-0 right-0 w-16 h-16 bg-primary/[0.03] rounded-bl-[40px] transition-all group-hover:w-20 group-hover:h-20" />
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-all group-hover:bg-primary/15 group-hover:scale-105">
                    <link.icon className="h-5 w-5" />
                  </div>
                  <div className="relative">
                    <h3 className="font-semibold text-foreground text-sm">{link.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{link.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:text-primary group-hover:translate-x-1" />
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Community Sentiment */}
      {topSentiments.length > 0 && (
        <section className="container mx-auto px-4 pb-16">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={stagger}>
            <motion.div variants={fadeUp} className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-foreground font-['Space_Grotesk']">Community Sentiment</h2>
                <div className="h-px flex-1 bg-border/50 hidden sm:block" />
              </div>
              <Link to="/forecasts" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                View forecasts <ArrowRight className="h-3 w-3" />
              </Link>
            </motion.div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topSentiments.map((s, i) => {
                const bearPct = 100 - s.bullish_percentage;
                const isBullish = s.bullish_percentage >= 50;
                return (
                  <motion.div key={s.project_id} variants={fadeUp}>
                    <Link
                      to={`/project/${s.project_slug}`}
                      className="group block rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md hover:bg-card/80"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-foreground">{s.project_name}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          isBullish
                            ? "bg-neon-green/10 text-neon-green"
                            : "bg-destructive/10 text-destructive"
                        }`}>
                          {s.bullish_percentage.toFixed(0)}% {isBullish ? "Bullish" : "Bearish"}
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-secondary overflow-hidden flex">
                        <motion.div
                          className="h-full bg-neon-green rounded-l-full"
                          initial={{ width: 0 }}
                          whileInView={{ width: `${s.bullish_percentage}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                        />
                        <motion.div
                          className="h-full bg-destructive rounded-r-full"
                          initial={{ width: 0 }}
                          whileInView={{ width: `${bearPct}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-[10px] text-muted-foreground">{s.total_votes} votes</p>
                        <Users className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </section>
      )}

      {/* Trending Projects */}
      {trendingProjects.length > 0 && (
        <section className="container mx-auto px-4 pb-16">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={stagger}>
            <motion.div variants={fadeUp} className="flex items-center gap-3 mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground font-['Space_Grotesk']">Trending Projects</h2>
              <div className="h-px flex-1 bg-border/50" />
            </motion.div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {trendingProjects.map((project: any, i: number) => (
                <motion.div key={project.id} variants={fadeUp}>
                  <Link
                    to={`/project/${project.slug}`}
                    className="group relative flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md hover:bg-card/80 overflow-hidden"
                  >
                    {/* Rank badge */}
                    <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-muted-foreground">
                      {i + 1}
                    </div>
                    <ProjectLogo logoUrl={project.logo_url} logoEmoji={project.logo_emoji} name={project.name} size="sm" />
                    <div className="min-w-0 pr-4">
                      <h3 className="font-semibold text-foreground truncate text-sm">{project.name}</h3>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{project.tagline}</p>
                      <span className="mt-1.5 inline-block rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {project.category}
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>
      )}

      {/* Top Categories */}
      <section className="container mx-auto px-4 pb-16">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={stagger}>
          <motion.div variants={fadeUp} className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground font-['Space_Grotesk']">Top Categories</h2>
            <Link to="/explore" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </motion.div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {topCategories.map((cat, i) => (
              <motion.div key={cat.name} variants={fadeUp}>
                <Link
                  to={`/explore?category=${cat.name}`}
                  className="group flex flex-col items-center gap-2.5 rounded-xl border border-border bg-card p-5 text-center transition-all hover:shadow-md hover:bg-card/80"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all group-hover:bg-primary/15 group-hover:scale-110">
                    <cat.Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-foreground">{cat.name}</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{cat.count} projects</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Recently Added */}
      <section className="container mx-auto px-4 pb-20">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={stagger}>
          <motion.div variants={fadeUp} className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground font-['Space_Grotesk']">Recently Added</h2>
            <Link to="/explore?sort=newest" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </motion.div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentProjects.map((project, i) => (
              <motion.div key={project.id} variants={fadeUp}>
                <Link
                  to={`/project/${project.slug}`}
                  className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md hover:bg-card/80"
                >
                  <ProjectLogo logoUrl={project.logo_url} logoEmoji={project.logo_emoji} name={project.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground text-sm group-hover:text-foreground transition-colors truncate">
                      {project.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">{project.tagline}</p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {project.category}
                      </span>
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {project.blockchain}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default Overview;

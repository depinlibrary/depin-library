import { Link } from "react-router-dom";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
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
  Zap,
  Users,
  Activity,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProjectLogo from "@/components/ProjectLogo";
import { useProjects } from "@/hooks/useProjects";
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

      {/* Hero */}
      <section className="relative overflow-hidden pt-28 pb-24 sm:pt-36 sm:pb-28">
        {/* Ambient glow blobs */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="gradient-radial-top absolute inset-0" />

        <div className="container relative mx-auto px-4 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 backdrop-blur-sm px-4 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <span className="text-xs font-medium text-muted-foreground tracking-wide">DePIN Intelligence Hub</span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="mx-auto max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl md:text-6xl font-['Space_Grotesk']">
              The{" "}
              <span className="relative">
                <span className="text-primary">DePIN</span>
                <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 120 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <motion.path
                    d="M2 6C30 2 90 2 118 6"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.5 }}
                    transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
                  />
                </svg>
              </span>{" "}
              Ecosystem<br className="hidden sm:block" /> at a Glance
            </motion.h1>

            <motion.p variants={fadeUp} className="mx-auto mt-5 max-w-lg text-base text-muted-foreground sm:text-lg leading-relaxed">
              Explore, compare, and understand Decentralized Physical Infrastructure Networks — all in one place.
            </motion.p>

            {/* Hero stats */}
            <motion.div variants={fadeUp} className="mx-auto mt-10 flex flex-wrap items-center justify-center gap-8 sm:gap-12">
              {[
                { value: projects.length, label: "Projects", icon: Layers },
                { value: totalCategories, label: "Categories", icon: Activity },
                { value: totalBlockchains, label: "Blockchains", icon: Zap },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/10">
                    <stat.icon className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-foreground font-['Space_Grotesk'] tabular-nums">
                      <AnimatedCounter target={stat.value} />
                    </p>
                    <p className="text-[11px] text-muted-foreground font-medium">{stat.label}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* CTA buttons */}
            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/explore"
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
              >
                Explore Projects
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/market"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 backdrop-blur-sm px-6 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-card hover:border-border"
              >
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                View Market
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

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

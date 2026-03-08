import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Layers,
  BarChart3,
  GitCompare,
  Briefcase,
  TrendingUp,
  Clock,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProjectLogo from "@/components/ProjectLogo";
import BillboardHero from "@/components/BillboardHero";
import { useProjects } from "@/hooks/useProjects";
import { useAllTokenMarketData } from "@/hooks/useTokenMarketData";
import { useTrendingProjects } from "@/hooks/useSentiment";
import { useForecasts } from "@/hooks/useForecasts";


const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

function getTimeLeft(endDate: string) {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const CountdownBadge = ({ endDate }: { endDate: string }) => {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(endDate));
  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getTimeLeft(endDate)), 60_000);
    return () => clearInterval(timer);
  }, [endDate]);
  if (!timeLeft) return <span className="text-[10px] font-bold text-destructive">Ended</span>;
  const isUrgent = new Date(endDate).getTime() - Date.now() < 24 * 60 * 60 * 1000;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold tabular-nums ${isUrgent ? "text-destructive" : "text-primary"}`}>
      <Clock className="h-3 w-3" />
      {timeLeft}
    </span>
  );
};

const Overview = () => {
  const { data: projects = [] } = useProjects();
  const { data: marketData = {}, isRefetching } = useAllTokenMarketData(30 * 1000);
  const { data: forecastData } = useForecasts("votes", 1, 4);
  const { data: endingSoonData } = useForecasts("ending_soon", 1, 4, undefined, undefined, "active");
  const topForecasts = (forecastData?.forecasts || []).map(f => ({
    id: f.id,
    title: f.title,
    total_votes_yes: f.total_votes_yes,
    total_votes_no: f.total_votes_no,
    status: f.status || "active",
    project_a_logo_url: f.project_a_logo_url,
    project_a_logo_emoji: f.project_a_logo_emoji,
    project_a_name: f.project_a_name,
    project_b_logo_url: f.project_b_logo_url,
    project_b_logo_emoji: f.project_b_logo_emoji,
    project_b_name: f.project_b_name,
  }));
  const endingSoon = endingSoonData?.forecasts || [];
  const { data: trendingProjects = [] } = useTrendingProjects(5);

  const quickLinks = [
    { title: "Explore", description: "Browse the full DePIN project directory.", icon: Layers, to: "/explore", accent: "primary" },
    { title: "Market", description: "Track token prices and market trends.", icon: BarChart3, to: "/market", accent: "primary" },
    { title: "Compare", description: "AI-powered side-by-side comparison.", icon: GitCompare, to: "/compare", accent: "accent" },
    { title: "Forecasts", description: "Community predictions and voting.", icon: TrendingUp, to: "/forecasts", accent: "accent" },
    { title: "Portfolio", description: "Track your DePIN holdings.", icon: Briefcase, to: "/portfolio", accent: "primary" },
  ];

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
        isRefetching={isRefetching}
        marketData={marketData}
        topForecasts={topForecasts}
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
              <motion.div key={link.title} variants={fadeUp} className="h-full">
                <Link
                  to={link.to}
                  className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 transition-all hover:bg-card/80 hover:shadow-lg hover:shadow-background/10 overflow-hidden h-full"
                >
                  <div className="absolute top-0 right-0 w-16 h-16 bg-primary/[0.03] rounded-bl-[40px] transition-all group-hover:w-20 group-hover:h-20" />
                  <div>
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-all group-hover:bg-primary/15 group-hover:scale-105 mb-3">
                      <link.icon className="h-5 w-5" />
                    </div>
                    <div className="relative">
                      <h3 className="font-semibold text-foreground text-sm">{link.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{link.description}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:text-primary group-hover:translate-x-1 mt-3" />
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Forecasts Ending Soon */}
      {endingSoon.length > 0 && (
        <section className="container mx-auto px-4 pb-16">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp} className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-foreground font-['Space_Grotesk']">Ending Soon</h2>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
                </span>
              </div>
              <Link to="/forecasts" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                All forecasts <ArrowRight className="h-3 w-3" />
              </Link>
            </motion.div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {endingSoon.map((forecast) => {
                const totalVotes = forecast.total_votes_yes + forecast.total_votes_no;
                const yesPct = totalVotes > 0 ? (forecast.total_votes_yes / totalVotes) * 100 : 50;
                return (
                  <motion.div key={forecast.id} variants={fadeUp} className="h-full">
                    <Link
                      to={`/forecasts/${forecast.id}`}
                      className="group flex flex-col justify-between rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md hover:bg-card/80 hover:border-primary/20 h-full"
                    >
                      {/* Top section - flexible height */}
                      <div className="flex flex-col gap-3">
                        {/* Header: logos + countdown */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <ProjectLogo
                              logoUrl={forecast.project_a_logo_url}
                              logoEmoji={forecast.project_a_logo_emoji || "⬡"}
                              name={forecast.project_a_name || ""}
                              size="xs"
                            />
                            {forecast.project_b_name && (
                              <>
                                <span className="text-[8px] font-bold text-muted-foreground uppercase">vs</span>
                                <ProjectLogo
                                  logoUrl={forecast.project_b_logo_url}
                                  logoEmoji={forecast.project_b_logo_emoji || "⬡"}
                                  name={forecast.project_b_name}
                                  size="xs"
                                />
                              </>
                            )}
                          </div>
                          <CountdownBadge endDate={forecast.end_date} />
                        </div>

                        {/* Title */}
                        <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
                          {forecast.title}
                        </h3>
                      </div>

                      {/* Bottom section - always aligned */}
                      <div className="flex flex-col gap-2 mt-3">
                        {/* Vote bar + stats */}
                        <div className="flex items-center gap-3">
                          <div className="relative flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                            <div
                              className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all"
                              style={{ width: `${yesPct}%` }}
                            />
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] font-bold text-muted-foreground tabular-nums">{totalVotes}</span>
                          </div>
                        </div>

                        {/* Yes/No labels */}
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-primary">Yes {yesPct.toFixed(0)}%</span>
                          <span className="font-semibold text-muted-foreground">No {(100 - yesPct).toFixed(0)}%</span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </section>
      )}

      {/* Recently Added */}
      <section className="container mx-auto px-4 pb-20">
        <motion.div initial="hidden" animate="visible" variants={stagger}>
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
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-foreground text-sm group-hover:text-foreground transition-colors truncate">
                        {project.name}
                      </h3>
                      {marketData[project.id]?.price_usd && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs font-semibold text-foreground tabular-nums">
                            {marketData[project.id].price_usd! >= 1
                              ? `$${marketData[project.id].price_usd!.toFixed(2)}`
                              : marketData[project.id].price_usd! >= 0.01
                                ? `$${marketData[project.id].price_usd!.toFixed(4)}`
                                : `$${marketData[project.id].price_usd!.toFixed(6)}`}
                          </span>
                          {marketData[project.id]?.price_change_24h !== null && (
                            <span className={`text-[10px] font-bold tabular-nums ${(marketData[project.id]?.price_change_24h || 0) >= 0 ? "text-neon-green" : "text-destructive"}`}>
                              {(marketData[project.id]?.price_change_24h || 0) >= 0 ? "+" : ""}
                              {(marketData[project.id]?.price_change_24h || 0).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
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

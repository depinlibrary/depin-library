import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight,
  Layers,
  BarChart3,
  GitCompare,
  Briefcase,
  TrendingUp,
  Clock,
  Users } from
"lucide-react";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProjectLogo from "@/components/ProjectLogo";
import BillboardHero from "@/components/BillboardHero";
import { useProjects } from "@/hooks/useProjects";
import { useAllTokenMarketData } from "@/hooks/useTokenMarketData";
import { useTrendingProjects } from "@/hooks/useSentiment";
import { useForecasts } from "@/hooks/useForecasts";
import { useSpotlightProjects } from "@/hooks/useSpotlightProjects";


const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } }
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } }
};

function getTimeLeft(endDate: string) {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff % (1000 * 60 * 60 * 24) / (1000 * 60 * 60));
  const minutes = Math.floor(diff % (1000 * 60 * 60) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const Overview = () => {
  const { data: projects = [] } = useProjects();
  const { data: marketData = {}, isRefetching } = useAllTokenMarketData(30 * 1000);
  const { data: forecastData } = useForecasts("votes", 1, 4);
  const { data: endingSoonData } = useForecasts("ending_soon", 1, 4, undefined, undefined, "active");
  const topForecasts = (forecastData?.forecasts || []).map((f) => ({
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
    project_b_name: f.project_b_name
  }));
  const endingSoon = endingSoonData?.forecasts || [];
  const { data: trendingProjects = [] } = useTrendingProjects(5);
  const { data: spotlightEntries = [] } = useSpotlightProjects();

  const spotlightProjects = spotlightEntries.
  map((entry) => projects.find((p) => p.id === entry.project_id)).
  filter(Boolean);

  const quickLinks = [
  { title: "Explore", description: "Browse the full DePIN project directory.", icon: Layers, to: "/explore", accent: "primary" },
  { title: "Market", description: "Track token prices and market trends.", icon: BarChart3, to: "/market", accent: "primary" },
  { title: "Compare", description: "AI-powered side-by-side comparison.", icon: GitCompare, to: "/compare", accent: "accent" },
  { title: "Forecasts", description: "Community predictions and voting.", icon: TrendingUp, to: "/forecasts", accent: "accent" },
  { title: "Portfolio", description: "Track your DePIN holdings.", icon: Briefcase, to: "/portfolio", accent: "primary" }];


  const recentProjects = [...projects].
  sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).
  slice(0, 6);

  const totalCategories = new Set(projects.map((p) => p.category)).size;

  const { data: totalBlockchains = 0 } = useQuery({
    queryKey: ["blockchains-count"],
    queryFn: async () => {
      const { count, error } = await supabase.
      from("blockchains").
      select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    }
  });

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
        totalBlockchains={totalBlockchains} />
      

      {/* Quick Links */}
      <section className="container mx-auto px-4 pb-16">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={stagger}>
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-semibold text-foreground font-['Space_Grotesk']">Quick Access</h2>
            <div className="h-px flex-1 bg-border/50" />
          </motion.div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {quickLinks.map((link, i) =>
            <motion.div key={link.title} variants={fadeUp} className="h-full">
                <Link
                to={link.to}
                className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 transition-all hover:bg-card/80 hover:shadow-lg hover:shadow-background/10 overflow-hidden h-full">
                
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
            )}
          </div>
        </motion.div>
      </section>

      {/* ✦ Spotlight Projects */}
      {spotlightProjects.length > 0 &&
      <section className="container mx-auto px-4 pb-16">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={stagger}>
            {/* Header */}
            <motion.div variants={fadeUp} className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-foreground font-['Space_Grotesk']">Spotlight</h2>
                <div className="h-px flex-1 bg-border/50" />
              </div>
            </motion.div>

            {/* Cards — horizontal scroll on mobile, grid on desktop */}
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible sm:pb-0">
              {spotlightProjects.map((project, i) => {
              if (!project) return null;
              const m = marketData[project.id];
              const change = m?.price_change_24h || 0;
              return (
                <motion.div
                  key={project.id}
                  variants={fadeUp}
                  className="snap-start shrink-0 w-[280px] sm:w-auto h-full">
                  
                    <Link
                    to={`/project/${project.slug}`}
                    className="group relative flex flex-col rounded-xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 h-full">
                    
                      {/* Subtle top accent */}
                      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

                      <div className="p-4 flex flex-col flex-1 gap-3">
                        {/* Logo row */}
                        <div className="flex items-center gap-3">
                          <ProjectLogo logoUrl={project.logo_url} logoEmoji={project.logo_emoji} name={project.name} size="sm" />
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{project.name}</h3>
                            <p className="text-[10px] text-muted-foreground">{project.category} · {project.blockchain}</p>
                          </div>
                          {m?.price_usd &&
                        <div className="text-right shrink-0">
                              <p className="text-xs font-semibold text-foreground tabular-nums">
                                ${m.price_usd >= 1 ? m.price_usd.toFixed(2) : m.price_usd.toFixed(4)}
                              </p>
                              <p className={`text-[10px] font-bold tabular-nums ${change >= 0 ? "text-neon-green" : "text-destructive"}`}>
                                {change >= 0 ? "+" : ""}{change.toFixed(1)}%
                              </p>
                            </div>
                        }
                        </div>

                        {/* Tagline */}
                        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 flex-1">{project.tagline}</p>

                        {/* Bottom CTA hint */}
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground/60 group-hover:text-primary transition-colors">
                          <span>View project</span>
                          <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>);

            })}
            </div>
          </motion.div>
        </section>
      }

      {endingSoon.length > 0 &&
      <section className="container mx-auto px-4 pb-16">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp} className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-foreground font-['Space_Grotesk']">Forecasts Ending Soon</h2>
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
              {endingSoon.map((forecast, i) => {
              const totalVotes = forecast.total_votes_yes + forecast.total_votes_no;
              const yesPct = totalVotes > 0 ? forecast.total_votes_yes / totalVotes * 100 : 50;
              const noPct = 100 - yesPct;
              const isEnded = new Date(forecast.end_date) <= new Date();
              const timeLeft = getTimeLeft(forecast.end_date);
              return (
                <motion.div key={forecast.id} variants={fadeUp} className="h-full">
                  <Link
                    to={`/forecasts/${forecast.id}`}
                    className="group relative flex flex-col rounded-xl border border-border bg-card overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 h-full">
                    
                    <div className="p-5 flex-1 flex flex-col">
                      {/* Header: logos + time */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex items-center -space-x-2">
                            <ProjectLogo
                              logoUrl={forecast.project_a_logo_url}
                              logoEmoji={forecast.project_a_logo_emoji || "⬡"}
                              name={forecast.project_a_name || ""}
                              size="xs" />
                            {forecast.project_b_name && (
                              <ProjectLogo
                                logoUrl={forecast.project_b_logo_url}
                                logoEmoji={forecast.project_b_logo_emoji || "⬡"}
                                name={forecast.project_b_name}
                                size="xs" />
                            )}
                          </div>
                          {forecast.project_b_name && (
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">vs</span>
                          )}
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${!timeLeft ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600 dark:text-green-400'}`}>
                          {timeLeft ? (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {timeLeft}
                            </span>
                          ) : "Ended"}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-200 mb-auto">
                        {forecast.title}
                      </h3>

                      {/* Percentage + bar */}
                      <div className="mt-5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xl font-bold text-foreground">{yesPct.toFixed(0)}% chance</span>
                          <span className="text-xs text-muted-foreground">{totalVotes.toLocaleString()} vote{totalVotes !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="h-2 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${yesPct}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Vote-style footer */}
                    <div className="px-5 pb-5 pt-1 flex gap-2.5">
                      <span className="flex-1 rounded-lg py-2.5 text-sm font-bold text-center bg-primary/10 text-primary">
                        Yes {yesPct.toFixed(0)}¢
                      </span>
                      <span className="flex-1 rounded-lg py-2.5 text-sm font-bold text-center bg-destructive/10 text-destructive">
                        No {noPct.toFixed(0)}¢
                      </span>
                    </div>
                  </Link>
                </motion.div>);
            })}
            </div>
          </motion.div>
        </section>
      }

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
            {recentProjects.map((project, i) =>
            <motion.div key={project.id} variants={fadeUp}>
                <Link
                to={`/project/${project.slug}`}
                className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md hover:bg-card/80">
                
                  <ProjectLogo logoUrl={project.logo_url} logoEmoji={project.logo_emoji} name={project.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-foreground text-sm group-hover:text-foreground transition-colors truncate">
                        {project.name}
                      </h3>
                      {marketData[project.id]?.price_usd &&
                    <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs font-semibold text-foreground tabular-nums">
                            {marketData[project.id].price_usd! >= 1 ?
                        `$${marketData[project.id].price_usd!.toFixed(2)}` :
                        marketData[project.id].price_usd! >= 0.01 ?
                        `$${marketData[project.id].price_usd!.toFixed(4)}` :
                        `$${marketData[project.id].price_usd!.toFixed(6)}`}
                          </span>
                          {marketData[project.id]?.price_change_24h !== null &&
                      <span className={`text-[10px] font-bold tabular-nums ${(marketData[project.id]?.price_change_24h || 0) >= 0 ? "text-neon-green" : "text-destructive"}`}>
                              {(marketData[project.id]?.price_change_24h || 0) >= 0 ? "+" : ""}
                              {(marketData[project.id]?.price_change_24h || 0).toFixed(1)}%
                            </span>
                      }
                        </div>
                    }
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
            )}
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>);

};

export default Overview;
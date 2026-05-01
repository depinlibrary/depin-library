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
  Clock } from
"lucide-react";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProjectLogo from "@/components/ProjectLogo";
import BillboardHero from "@/components/BillboardHero";
import { useProjects } from "@/hooks/useProjects";
import { useAllTokenMarketData } from "@/hooks/useTokenMarketData";
import { useTrendingProjects } from "@/hooks/useSentiment";
import { usePredictions } from "@/hooks/usePredictions";
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
  const { data: predictionData } = usePredictions("votes", 1, 4);
  const { data: endingSoonData } = usePredictions("ending_soon", 1, 4, undefined, undefined, "active");
  const topPredictionsRaw = predictionData?.predictions || [];
  const endingSoon = endingSoonData?.predictions || [];
  const allPredictionIds = [...topPredictionsRaw, ...endingSoon].map((f) => f.id);
  const { data: trendingProjects = [] } = useTrendingProjects(5);

  // Fetch dimensions for all predictions (top + ending soon)
  const { data: predictionDimensionsMap = {} } = useQuery({
    queryKey: ["prediction-dimensions-overview", allPredictionIds],
    enabled: allPredictionIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forecast_targets")
        .select("forecast_id, dimension")
        .in("forecast_id", allPredictionIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((d: any) => { map[d.forecast_id] = d.dimension; });
      return map;
    },
  });

  const topPredictions = topPredictionsRaw.map((f) => ({
    id: f.id,
    title: f.title,
    total_votes_yes: f.total_votes_yes,
    total_votes_no: f.total_votes_no,
    status: f.status || "active",
    end_date: f.end_date,
    project_a_logo_url: f.project_a_logo_url,
    project_a_logo_emoji: f.project_a_logo_emoji,
    project_a_name: f.project_a_name,
    project_b_logo_url: f.project_b_logo_url,
    project_b_logo_emoji: f.project_b_logo_emoji,
    project_b_name: f.project_b_name,
    dimension: (predictionDimensionsMap as Record<string, string>)[f.id] || undefined,
  }));
  const endingSoonIds = endingSoon.map((f) => f.id);
  const { data: spotlightEntries = [] } = useSpotlightProjects();

  const spotlightProjects = spotlightEntries.
  map((entry) => projects.find((p) => p.id === entry.project_id)).
  filter(Boolean);

  const quickLinks = [
  { title: "Explore", description: "Browse the full DePIN project directory.", icon: Layers, to: "/explore", accent: "primary" },
  { title: "Market", description: "Track token prices and market trends.", icon: BarChart3, to: "/market", accent: "primary" },
  { title: "Compare", description: "AI-powered side-by-side comparison.", icon: GitCompare, to: "/compare", accent: "accent" },
  { title: "Predictions", description: "Community predictions and voting.", icon: TrendingUp, to: "/predictions", accent: "accent" },
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
        topPredictions={topPredictions}
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

      {/* ✦ Top Tokens Overview */}
      {(() => {
        const tokenList = [...projects]
          .filter((p) => marketData[p.id]?.price_usd && marketData[p.id]?.market_cap_usd)
          .sort((a, b) => (marketData[b.id]?.market_cap_usd || 0) - (marketData[a.id]?.market_cap_usd || 0))
          .slice(0, 10);
        if (tokenList.length === 0) return null;
        return (
          <section className="container mx-auto px-4 pb-16">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={stagger}>
              <motion.div variants={fadeUp} className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-foreground font-['Space_Grotesk']">Top Tokens</h2>
                  <div className="h-px flex-1 bg-border/50" />
                </div>
                <Link to="/market" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </motion.div>
              <motion.div variants={fadeUp} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Table header */}
                <div className="hidden sm:grid grid-cols-[2rem_1fr_6rem_7rem_6rem_6rem_5rem_5rem_5rem] gap-2 px-4 py-2.5 border-b border-border text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  <span>#</span>
                  <span>Name</span>
                  <span className="text-right">Price</span>
                  <span className="text-right">Mkt Cap</span>
                  <span className="text-right">Volume</span>
                  <span className="text-right">FDV</span>
                  <span className="text-right">Vol/MCap</span>
                  <span className="text-right">24h</span>
                  <span className="text-right">7d</span>
                </div>
                <div className="sm:hidden grid grid-cols-[2rem_1fr_5rem_5rem] gap-2 px-4 py-2.5 border-b border-border text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  <span>#</span>
                  <span>Name</span>
                  <span className="text-right">Price</span>
                  <span className="text-right">24h</span>
                </div>
                {tokenList.map((p, i) => {
                  const m = marketData[p.id];
                  const change = m?.price_change_24h || 0;
                  const sparkline = m?.sparkline_7d as number[] | null;
                  const vol = (m as any)?.volume_24h as number | null;
                  const fdv = (m as any)?.fully_diluted_valuation as number | null;
                  const volMcapRatio = vol && m?.market_cap_usd ? (vol / m.market_cap_usd) * 100 : null;
                  const fmt = (n: number | null) => {
                    if (!n) return "—";
                    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
                    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
                    return `$${(n / 1e3).toFixed(0)}K`;
                  };
                  return (
                    <Link
                      key={p.id}
                      to={`/project/${p.slug}`}
                      className="border-b border-border/40 last:border-b-0 transition-colors hover:bg-secondary/40"
                    >
                      {/* Desktop row */}
                      <div className="hidden sm:grid grid-cols-[2rem_1fr_6rem_7rem_6rem_6rem_5rem_5rem_5rem] gap-2 px-4 py-2.5 items-center">
                        <span className="text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                        <div className="flex items-center gap-2 min-w-0">
                          <ProjectLogo logoUrl={p.logo_url} logoEmoji={p.logo_emoji} name={p.name} size="xs" />
                          <span className="text-xs font-semibold text-foreground truncate">{p.name}</span>
                          <span className="text-[10px] text-muted-foreground">{p.token}</span>
                        </div>
                        <span className="text-xs font-medium text-foreground tabular-nums text-right">
                          {m?.price_usd ? (m.price_usd >= 1 ? `$${m.price_usd.toFixed(2)}` : `$${m.price_usd.toFixed(4)}`) : "—"}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums text-right">{fmt(m?.market_cap_usd ?? null)}</span>
                        <span className="text-xs text-muted-foreground tabular-nums text-right">{fmt(vol)}</span>
                        <span className="text-xs text-muted-foreground tabular-nums text-right">{fmt(fdv)}</span>
                        <span className={`text-xs tabular-nums text-right ${volMcapRatio !== null && volMcapRatio >= 10 ? "text-green-400 font-semibold" : volMcapRatio !== null && volMcapRatio >= 3 ? "text-foreground" : "text-muted-foreground"}`}>
                          {volMcapRatio !== null ? `${volMcapRatio >= 1 ? volMcapRatio.toFixed(1) : volMcapRatio.toFixed(2)}%` : "—"}
                        </span>
                        <span className={`text-xs font-semibold tabular-nums text-right ${change >= 0 ? "text-neon-green" : "text-destructive"}`}>
                          {change >= 0 ? "+" : ""}{change.toFixed(1)}%
                        </span>
                        <div className="flex justify-end">
                          {sparkline && sparkline.length >= 2 ? (() => {
                            const min = Math.min(...sparkline);
                            const max = Math.max(...sparkline);
                            const range = max - min || 1;
                            const h = 20; const w = 48;
                            const pts = sparkline.map((v, idx) => `${idx / (sparkline.length - 1) * w},${h - (v - min) / range * h}`).join(" ");
                            const positive = sparkline[sparkline.length - 1] >= sparkline[0];
                            return (
                              <svg width={w} height={h}>
                                <polyline points={pts} fill="none" stroke={positive ? "hsl(var(--neon-green))" : "hsl(var(--destructive))"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            );
                          })() : <span className="text-[10px] text-muted-foreground">—</span>}
                        </div>
                      </div>
                      {/* Mobile row */}
                      <div className="sm:hidden grid grid-cols-[2rem_1fr_5rem_5rem] gap-2 px-4 py-2.5 items-center">
                        <span className="text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                        <div className="flex items-center gap-2 min-w-0">
                          <ProjectLogo logoUrl={p.logo_url} logoEmoji={p.logo_emoji} name={p.name} size="xs" />
                          <span className="text-xs font-semibold text-foreground truncate">{p.name}</span>
                        </div>
                        <span className="text-xs font-medium text-foreground tabular-nums text-right">
                          {m?.price_usd ? (m.price_usd >= 1 ? `$${m.price_usd.toFixed(2)}` : `$${m.price_usd.toFixed(4)}`) : "—"}
                        </span>
                        <span className={`text-xs font-semibold tabular-nums text-right ${change >= 0 ? "text-neon-green" : "text-destructive"}`}>
                          {change >= 0 ? "+" : ""}{change.toFixed(1)}%
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </motion.div>
            </motion.div>
          </section>
        );
      })()}

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
                  className="snap-start shrink-0 w-[320px] sm:w-auto h-full">
                  
                    <Link
                    to={`/project/${project.slug}`}
                    className="group relative flex flex-col rounded-xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 h-full">
                    
                      <div className="p-5 flex flex-col flex-1 gap-4">
                        {/* Logo + name + price row */}
                        <div className="flex items-start gap-3">
                          <ProjectLogo logoUrl={project.logo_url} logoEmoji={project.logo_emoji} name={project.name} size="md" />
                          <div className="min-w-0 flex-1">
                            <h3 className="text-base font-semibold text-foreground truncate group-hover:underline transition-all">{project.name}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">{project.category} · {project.blockchain}</p>
                          </div>
                          {project.status === "active" && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400 shrink-0">Active</span>
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 flex-1">{project.description || project.tagline}</p>

                        {/* Market data row */}
                        {m?.price_usd && (
                          <div className="flex items-center gap-4 pt-2 border-t border-border/50">
                            <div>
                              <p className="text-[10px] text-muted-foreground mb-0.5">Price</p>
                              <p className="text-sm font-bold text-foreground tabular-nums">
                                ${m.price_usd >= 1 ? m.price_usd.toFixed(2) : m.price_usd.toFixed(4)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground mb-0.5">24h</p>
                              <p className={`text-sm font-bold tabular-nums ${change >= 0 ? "text-neon-green" : "text-destructive"}`}>
                                {change >= 0 ? "+" : ""}{change.toFixed(1)}%
                              </p>
                            </div>
                            {m.market_cap_usd && (
                              <div>
                                <p className="text-[10px] text-muted-foreground mb-0.5">Market Cap</p>
                                <p className="text-sm font-bold text-foreground tabular-nums">
                                  {m.market_cap_usd >= 1e9 ? `$${(m.market_cap_usd / 1e9).toFixed(1)}B` : m.market_cap_usd >= 1e6 ? `$${(m.market_cap_usd / 1e6).toFixed(1)}M` : `$${(m.market_cap_usd / 1e3).toFixed(0)}K`}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* CTA */}
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground/60 group-hover:text-primary transition-colors">
                          <span>View project</span>
                          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
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
                <h2 className="text-xl font-semibold text-foreground font-['Space_Grotesk']">Predictions Ending Soon</h2>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
                </span>
              </div>
              <Link to="/predictions" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                All predictions <ArrowRight className="h-3 w-3" />
              </Link>
            </motion.div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {endingSoon.map((prediction, i) => {
              const dimension = (predictionDimensionsMap as Record<string, string>)[prediction.id];
              const isPriceMarket = dimension === "token_price" || dimension === "market_cap";
              const isSentimentDual = dimension === "community_sentiment" && !!prediction.project_b_name;
              const yesLabel = isPriceMarket ? "Long" : isSentimentDual ? (prediction.project_a_name || "Yes") : "Yes";
              const noLabel = isPriceMarket ? "Short" : isSentimentDual ? (prediction.project_b_name || "No") : "No";
              const totalVotes = prediction.total_votes_yes + prediction.total_votes_no;
              const yesPct = (() => { const wy = Number((prediction as any).weighted_votes_yes) || 0; const wn = Number((prediction as any).weighted_votes_no) || 0; const wt = wy + wn; return wt > 0 ? (wy / wt) * 100 : totalVotes > 0 ? (prediction.total_votes_yes / totalVotes) * 100 : 50; })();
              const isEnded = new Date(prediction.end_date) <= new Date();
              const timeLeft = getTimeLeft(prediction.end_date);
              return (
                <motion.div key={prediction.id} variants={fadeUp} className="h-full">
                  <Link
                    to={`/predictions/${prediction.id}`}
                    className="group relative flex flex-col rounded-xl border border-border bg-card overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 h-full">
                    <div className="p-4 flex-1 flex flex-col">
                      {/* Header: logos + status */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center -space-x-1.5">
                            {prediction.project_a_logo_url ? (
                              <img src={prediction.project_a_logo_url} alt={prediction.project_a_name} className="w-7 h-7 rounded-lg object-contain border border-card bg-secondary relative z-10" />
                            ) : (
                              <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs border border-card bg-secondary relative z-10">{prediction.project_a_logo_emoji || "⬡"}</span>
                            )}
                            {prediction.project_b_name && (
                              prediction.project_b_logo_url ? (
                                <img src={prediction.project_b_logo_url} alt={prediction.project_b_name} className="w-7 h-7 rounded-lg object-contain border border-card bg-secondary relative z-0" />
                              ) : (
                                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs border border-card bg-secondary relative z-0">{prediction.project_b_logo_emoji || "⬡"}</span>
                              )
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] font-medium text-muted-foreground">{prediction.project_a_name}</span>
                            {prediction.project_b_name && (
                              <>
                                <span className="text-muted-foreground/40 text-[9px]">vs</span>
                                <span className="text-[11px] font-medium text-muted-foreground">{prediction.project_b_name}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isEnded ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600 dark:text-green-400'}`}>
                          {isEnded ? "Ended" : timeLeft ? `${timeLeft}` : "Live"}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2 group-hover:underline transition-all duration-200 mb-auto">
                        {prediction.title}
                      </h3>

                      {/* Percentage as cents + votes */}
                      <div className="mt-4 flex items-end justify-between">
                        <span className="text-lg font-bold text-foreground tabular-nums font-['Space_Grotesk']">{Math.round(yesPct)}¢<span className="text-xs font-normal text-muted-foreground ml-1">{yesLabel}</span></span>
                        <span className="text-[10px] text-muted-foreground">{totalVotes.toLocaleString()} vote{totalVotes !== 1 ? "s" : ""}</span>
                      </div>
                    </div>

                    {/* Polymarket cent-based buttons */}
                    <div className="px-4 pb-4">
                      <div className="flex gap-2">
                        <span className={`flex-1 rounded-lg py-2 text-center ${isEnded ? "bg-secondary text-muted-foreground opacity-60" : "bg-primary/10 text-primary"}`}>
                          <span className="text-sm font-bold block py-1">{yesLabel}</span>
                        </span>
                        <span className={`flex-1 rounded-lg py-2 text-center ${isEnded ? "bg-secondary text-muted-foreground opacity-60" : "bg-destructive/10 text-destructive"}`}>
                          <span className="text-sm font-bold block py-1">{noLabel}</span>
                        </span>
                      </div>
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
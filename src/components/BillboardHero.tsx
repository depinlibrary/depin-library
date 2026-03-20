import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  BarChart3,
  Layers,
  Zap,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Crown,
  Flame,
  RefreshCw,
  Search,
  Link as LinkIcon } from
"lucide-react";
import ProjectLogo from "@/components/ProjectLogo";
import { Badge } from "@/components/ui/badge";
import type { Project } from "@/hooks/useProjects";
import type { TokenMarketData } from "@/hooks/useTokenMarketData";
import { useEffect, useState, useRef } from "react";

interface TopForecast {
  id: string;
  title: string;
  total_votes_yes: number;
  total_votes_no: number;
  status: string;
  project_a_logo_url?: string | null;
  project_a_logo_emoji?: string;
  project_a_name?: string;
  project_b_logo_url?: string | null;
  project_b_logo_emoji?: string;
  project_b_name?: string | null;
}

interface BillboardHeroProps {
  projects: Project[];
  marketData: Record<string, TokenMarketData>;
  topForecasts: TopForecast[];
  trendingProjects: any[];
  totalCategories: number;
  totalBlockchains: number;
  isRefetching?: boolean;
}

const AnimatedNumber = ({ target, suffix = "" }: {target: number;suffix?: string;}) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    let start = 0;
    const duration = 1200;
    const step = Math.max(Math.floor(duration / target), 16);
    const increment = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, step);
    return () => clearInterval(timer);
  }, [target]);
  return <>{count.toLocaleString()}{suffix}</>;
};

function formatCompact(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function formatPrice(price: number | null): string {
  if (!price) return "—";
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } }
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } }
};

const MiniSparkline = ({ data, positive }: {data: number[] | null;positive: boolean;}) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = 20;
  const w = 50;
  const points = data.map((v, i) => `${i / (data.length - 1) * w},${h - (v - min) / range * h}`).join(" ");
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? "hsl(var(--neon-green))" : "hsl(var(--destructive))"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round" />
      
    </svg>);

};


const BillboardHero = ({
  projects,
  marketData,
  topForecasts,
  trendingProjects,
  totalCategories,
  totalBlockchains,
  isRefetching = false
}: BillboardHeroProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const filteredProjects = searchQuery.trim().length >= 1 ?
  projects.filter((p) =>
  p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
  p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
  p.blockchain.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 6) :
  [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setSearchFocused(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Compute top market cap projects
  const topMarketCap = [...projects].
  filter((p) => marketData[p.id]?.market_cap_usd).
  sort((a, b) => (marketData[b.id]?.market_cap_usd || 0) - (marketData[a.id]?.market_cap_usd || 0)).
  slice(0, 5);

  const topGainers = [...projects].
  filter((p) => marketData[p.id]?.price_change_24h && (marketData[p.id]?.price_change_24h || 0) > 0).
  sort((a, b) => (marketData[b.id]?.price_change_24h || 0) - (marketData[a.id]?.price_change_24h || 0)).
  slice(0, 5);

  const topLosers = [...projects].
  filter((p) => marketData[p.id]?.price_change_24h && (marketData[p.id]?.price_change_24h || 0) < 0).
  sort((a, b) => (marketData[a.id]?.price_change_24h || 0) - (marketData[b.id]?.price_change_24h || 0)).
  slice(0, 5);

  const totalMarketCap = Object.values(marketData).reduce((sum, d) => sum + (d.market_cap_usd || 0), 0);
  const changes = Object.values(marketData).filter((d) => d.price_change_24h !== null);
  const avgChange = changes.length > 0 ? changes.reduce((s, d) => s + (d.price_change_24h || 0), 0) / changes.length : 0;

  return (
    <section className="relative overflow-hidden pt-20 pb-0 sm:pt-24">
      <div className="absolute inset-0 bg-grid opacity-15 pointer-events-none" />
      <div className="gradient-radial-top absolute inset-0 pointer-events-none" />

      <div className="container relative mx-auto px-3 sm:px-4 pb-4 sm:pb-6">
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          {/* Title row + Search + CTA */}
          <motion.div variants={fadeUp} className="mb-4 sm:mb-5">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
              <div>
                <div className="mb-1.5 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 backdrop-blur-sm px-3 py-0.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                  </span>
                  <span className="text-[9px] font-medium text-muted-foreground tracking-wide uppercase">Live DePIN Intelligence</span>
                  {isRefetching &&
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="ml-1 flex items-center">
                    
                      <RefreshCw className="h-2.5 w-2.5 text-primary/70" />
                    </motion.div>
                  }
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground font-['Space_Grotesk'] tracking-tight">
                  DePIN Ecosystem <span className="text-primary">Billboard</span>
                </h1>
                <p className="mt-1 text-[11px] sm:text-xs text-muted-foreground max-w-md">
                  Track, compare & forecast the top DePIN projects — all in one place.
                </p>
              </div>

              {/* Search + CTA — row on desktop, stacked on mobile */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:shrink-0">
                <div ref={searchRef} className="relative flex-1 sm:flex-initial sm:w-[380px]">
                  <form onSubmit={handleSearch}>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground z-10" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setSearchFocused(true)}
                      placeholder="Search projects..."
                      className="w-full h-11 rounded-lg border border-border bg-card/60 backdrop-blur-sm pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-border focus:border-border transition-all" />
                    
                  </form>

                  {/* Search results dropdown */}
                  <AnimatePresence>
                    {searchFocused && searchQuery.trim().length >= 1 &&
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-lg border border-border bg-card shadow-xl shadow-background/40 overflow-hidden">
                      
                        {filteredProjects.length > 0 ?
                      <div className="py-1 max-h-[280px] overflow-y-auto">
                            {filteredProjects.map((p) =>
                        <Link
                          key={p.id}
                          to={`/project/${p.slug}`}
                          onClick={() => {setSearchQuery("");setSearchFocused(false);}}
                          className="flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-secondary/50">
                          
                                <ProjectLogo logoUrl={p.logo_url} logoEmoji={p.logo_emoji} name={p.name} size="xs" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-[11px] font-semibold text-foreground truncate">{p.name}</p>
                                  <p className="text-[9px] text-muted-foreground">{p.category} · {p.blockchain}</p>
                                </div>
                                {marketData[p.id]?.price_usd &&
                          <span className="text-[10px] font-medium text-muted-foreground tabular-nums shrink-0">
                                    {formatPrice(marketData[p.id].price_usd)}
                                  </span>
                          }
                              </Link>
                        )}
                          </div> :

                      <div className="px-3 py-4 text-center">
                            <p className="text-[11px] text-muted-foreground">No projects found for "{searchQuery}"</p>
                          </div>
                      }
                        <div className="border-t border-border/50 px-3 py-2 bg-secondary/20">
                          <button
                          type="button"
                          onClick={() => {navigate(`/explore?search=${encodeURIComponent(searchQuery.trim())}`);setSearchQuery("");setSearchFocused(false);}}
                          className="text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                          
                            Search all for "{searchQuery}" →
                          </button>
                        </div>
                      </motion.div>
                    }
                  </AnimatePresence>
                </div>

                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    to="/explore"
                    className="relative inline-flex items-center justify-center gap-1.5 h-11 w-full sm:w-auto rounded-lg px-4 text-xs font-semibold text-primary-foreground overflow-hidden transition-shadow hover:shadow-lg hover:shadow-primary/30"
                    style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))" }}>
                    
                    <motion.span
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: "linear-gradient(105deg, transparent 40%, hsl(0 0% 100% / 0.2) 50%, transparent 60%)",
                        backgroundSize: "200% 100%"
                      }}
                      animate={{ backgroundPosition: ["200% 0%", "-200% 0%"] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }} />
                    
                    <span className="relative">Explore Projects</span>
                    <ArrowRight className="relative h-3.5 w-3.5" />
                  </Link>
                </motion.div>
              </div>
            </div>
          </motion.div>

           {/* Compact Stats Row with animated glow */}
           <motion.div variants={fadeUp} className="mb-4">
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
               <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card/40 backdrop-blur-md px-3 py-3">
                 <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 shrink-0">
                   <Layers className="h-4 w-4 text-primary" />
                 </div>
                 <div className="min-w-0">
                   <p className="text-xl font-bold text-foreground font-['Space_Grotesk'] tabular-nums leading-tight">
                     <AnimatedNumber target={projects.length} />
                   </p>
                   <p className="text-xs text-muted-foreground font-medium">Projects</p>
                 </div>
               </div>

               <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card/40 backdrop-blur-md px-3 py-3">
                 <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 shrink-0">
                   <BarChart3 className="h-4 w-4 text-primary" />
                 </div>
                 <div className="min-w-0">
                   <p className="text-xl font-bold text-foreground font-['Space_Grotesk'] tabular-nums leading-tight">
                     {formatCompact(totalMarketCap)}
                   </p>
                   <p className="text-xs text-muted-foreground font-medium">Market Cap</p>
                 </div>
               </div>

               <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card/40 backdrop-blur-md px-3 py-3">
                 <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 shrink-0">
                   <TrendingUp className="h-4 w-4 text-primary" />
                 </div>
                 <div className="min-w-0">
                   <p className={`text-xl font-bold font-['Space_Grotesk'] tabular-nums leading-tight ${avgChange >= 0 ? "text-neon-green" : "text-destructive"}`}>
                     {avgChange >= 0 ? "+" : ""}{avgChange.toFixed(1)}%
                   </p>
                   <p className="text-xs text-muted-foreground font-medium">Avg 24h</p>
                 </div>
               </div>

               <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card/40 backdrop-blur-md px-3 py-3">
                 <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 shrink-0">
                   <LinkIcon className="h-4 w-4 text-primary" />
                 </div>
                 <div className="min-w-0">
                   <p className="text-xl font-bold text-foreground font-['Space_Grotesk'] tabular-nums leading-tight">
                     <AnimatedNumber target={totalBlockchains} />
                   </p>
                   <p className="text-xs text-muted-foreground font-medium">Chains</p>
                 </div>
               </div>
             </div>
           </motion.div>

           {/* Bento Grid - all 4 sections in one row */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 auto-rows-min relative"
            animate={{ opacity: isRefetching ? [1, 0.7, 1] : 1 }}
            transition={{ duration: 0.8, repeat: isRefetching ? Infinity : 0 }}>
            
             {/* ── Top Market Cap ── */}
             <motion.div variants={fadeUp} className="col-span-1 rounded-lg border border-border bg-card/40 backdrop-blur-md p-4">
               <div className="flex items-center gap-2 mb-3">
                 <Crown className="h-4 w-4 text-primary" />
                 <span className="text-sm font-semibold text-foreground">Top Market Cap</span>
                 <Link to="/market" className="ml-auto text-xs text-muted-foreground hover:text-primary transition-colors">
                   View all →
                 </Link>
               </div>
               <div className="space-y-2">
                 {topMarketCap.map((p, i) => {
                  const m = marketData[p.id];
                  return (
                    <Link
                      key={p.id}
                      to={`/project/${p.slug}`}
                      className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-secondary/50">
                      
                       <span className="text-xs font-bold text-muted-foreground w-4 text-center">{i + 1}</span>
                       <ProjectLogo logoUrl={p.logo_url} logoEmoji={p.logo_emoji} name={p.name} size="sm" />
                       <div className="min-w-0 flex-1">
                         <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                       </div>
                       
                       <div className="text-right shrink-0">
                         <p className="text-xs font-medium text-muted-foreground tabular-nums">{formatCompact(m?.market_cap_usd || 0)}</p>
                         <p className={`text-xs font-bold tabular-nums ${(m?.price_change_24h || 0) >= 0 ? "text-neon-green" : "text-destructive"}`}>
                           {(m?.price_change_24h || 0) >= 0 ? "+" : ""}{(m?.price_change_24h || 0).toFixed(1)}%
                         </p>
                       </div>
                     </Link>);

                })}
               </div>
             </motion.div>

             {/* ── Trending Projects ── */}
             <motion.div variants={fadeUp} className="col-span-1 rounded-lg border border-border bg-card/40 backdrop-blur-md p-4">
               <div className="flex items-center gap-2 mb-3">
                 <Flame className="h-4 w-4 text-primary" />
                 <span className="text-sm font-semibold text-foreground">Trending Now</span>
                 <Link to="/explore" className="ml-auto text-xs text-muted-foreground hover:text-primary transition-colors">
                   View all →
                 </Link>
               </div>
               <div className="space-y-2">
                 {trendingProjects.slice(0, 5).map((p: any, i: number) => {
                  const m = marketData[p.id];
                  return (
                    <Link
                      key={p.id}
                      to={`/project/${p.slug}`}
                      className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-secondary/50">
                      
                       <span className="text-xs font-bold text-muted-foreground w-4 text-center">{i + 1}</span>
                       <ProjectLogo logoUrl={p.logo_url} logoEmoji={p.logo_emoji} name={p.name} size="sm" />
                       <div className="min-w-0 flex-1">
                         <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                         <p className="text-xs text-muted-foreground truncate">{p.category}</p>
                       </div>
                       {m?.price_usd &&
                      <span className="text-sm font-medium text-muted-foreground tabular-nums">{formatPrice(m.price_usd)}</span>
                      }
                     </Link>);

                })}
               </div>
             </motion.div>

             {/* ── Top Gainers (spans 1 col on 6-grid) ── */}
             <motion.div variants={fadeUp} className="col-span-1 rounded-lg border border-border bg-card/40 backdrop-blur-md p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowUpRight className="h-4 w-4 text-neon-green" />
                  <span className="text-sm font-semibold text-foreground">Top Gainers</span>
                  <Link to="/market" className="ml-auto text-xs text-muted-foreground hover:text-primary transition-colors">
                    View all →
                  </Link>
                </div>
                <div className="space-y-1.5">
                  {topGainers.map((p, i) => {
                  const m = marketData[p.id];
                  const change = m?.price_change_24h || 0;
                  return (
                    <Link
                      key={p.id}
                      to={`/project/${p.slug}`}
                      className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-secondary/50">
                       <span className="text-xs font-bold text-muted-foreground w-4 text-center">{i + 1}</span>
                       <ProjectLogo logoUrl={p.logo_url} logoEmoji={p.logo_emoji} name={p.name} size="sm" />
                       <div className="min-w-0 flex-1">
                         <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                       </div>
                       <div className="text-right shrink-0">
                         <p className="text-xs font-medium text-muted-foreground tabular-nums">{formatPrice(m?.price_usd || null)}</p>
                         <p className="text-xs font-bold text-neon-green tabular-nums">+{change.toFixed(1)}%</p>
                       </div>
                     </Link>);
                })}
                  {topGainers.length === 0 && <p className="text-xs text-muted-foreground">No data yet</p>}
                </div>
              </motion.div>

             {/* ── Top Losers ── */}
             <motion.div variants={fadeUp} className="col-span-1 rounded-lg border border-border bg-card/40 backdrop-blur-md p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowDownRight className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-semibold text-foreground">Top Losers</span>
                  <Link to="/market" className="ml-auto text-xs text-muted-foreground hover:text-primary transition-colors">
                    View all →
                  </Link>
                </div>
                <div className="space-y-1.5">
                  {topLosers.map((p, i) => {
                  const m = marketData[p.id];
                  const change = m?.price_change_24h || 0;
                  return (
                    <Link
                      key={p.id}
                      to={`/project/${p.slug}`}
                      className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-secondary/50">
                       <span className="text-xs font-bold text-muted-foreground w-4 text-center">{i + 1}</span>
                       <ProjectLogo logoUrl={p.logo_url} logoEmoji={p.logo_emoji} name={p.name} size="sm" />
                       <div className="min-w-0 flex-1">
                         <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                       </div>
                       <div className="text-right shrink-0">
                         <p className="text-xs font-medium text-muted-foreground tabular-nums">{formatPrice(m?.price_usd || null)}</p>
                         <p className="text-xs font-bold text-destructive tabular-nums">{change.toFixed(1)}%</p>
                       </div>
                     </Link>);
                })}
                  {topLosers.length === 0 && <p className="text-xs text-muted-foreground">No data yet</p>}
                </div>
              </motion.div>

             {/* ── Top Forecasts — Enhanced (spans full width) ── */}
             {topForecasts.length > 0 &&
            <motion.div variants={fadeUp} className="col-span-1 sm:col-span-2 lg:col-span-4 rounded-lg border border-border bg-card/40 backdrop-blur-md p-4 sm:p-5">
                 <div className="flex items-center gap-2 mb-4">
                   <span className="text-sm font-semibold text-foreground">Top Forecasts</span>
                   <Link to="/forecasts" className="ml-auto text-xs font-medium transition-colors flex items-center gap-1 text-muted-foreground">
                     View all <ArrowRight className="h-3.5 w-3.5" />
                   </Link>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                   {topForecasts.slice(0, 4).map((f) => {
                  const totalVotes = f.total_votes_yes + f.total_votes_no;
                  const yesPercent = totalVotes > 0 ? f.total_votes_yes / totalVotes * 100 : 50;
                  const noPercent = 100 - yesPercent;
                  const isEnded = f.status === "ended";
                  return (
                    <Link
                      key={f.id}
                      to={`/forecasts/${f.id}`}
                      className="group relative flex flex-col rounded-xl border border-border/50 bg-secondary/20 overflow-hidden transition-all hover:bg-secondary/40 hover:border-primary/20 hover:shadow-md hover:shadow-primary/5 h-full">
                      
                      <div className="p-4 flex-1 flex flex-col">
                        {/* Header: logos + status */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1.5">
                            <ProjectLogo logoUrl={f.project_a_logo_url || null} logoEmoji={f.project_a_logo_emoji || "⬡"} name={f.project_a_name || "Project"} size="xs" />
                            {f.project_b_name &&
                            <>
                                <span className="text-[9px] font-bold text-muted-foreground uppercase">vs</span>
                                <ProjectLogo logoUrl={f.project_b_logo_url || null} logoEmoji={f.project_b_logo_emoji || "⬡"} name={f.project_b_name} size="xs" />
                              </>
                            }
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${isEnded ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600 dark:text-green-400'}`}>
                            {isEnded ? "Ended" : "Live"}
                          </span>
                        </div>

                        {/* Title */}
                        <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors mb-auto">{f.title}</p>

                        {/* Percentage + bar */}
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-foreground">{yesPercent.toFixed(0)}% chance</span>
                          </div>
                          <div className="h-2 rounded-full bg-secondary overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-primary"
                              initial={{ width: 0 }}
                              whileInView={{ width: `${yesPercent}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }} />
                          </div>
                        </div>
                      </div>

                      {/* Vote-style footer + total votes */}
                      {!isEnded ?
                      <div className="px-4 pb-4 pt-1 space-y-2">
                          <div className="flex gap-2">
                            <span className="flex-1 rounded-lg py-2 text-xs font-bold text-center bg-primary/10 text-primary">
                              Yes
                            </span>
                            <span className="flex-1 rounded-lg py-2 text-xs font-bold text-center bg-destructive/10 text-destructive">
                              No
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground text-center">{totalVotes.toLocaleString()} vote{totalVotes !== 1 ? "s" : ""}</p>
                        </div> :

                      <div className="px-4 pb-4 pt-1 space-y-2">
                          <div className={`flex items-center justify-center rounded-lg py-2.5 ${yesPercent >= 50 ? "bg-primary/5" : "bg-destructive/5"}`}>
                            <span className={`text-xs font-bold ${yesPercent >= 50 ? "text-primary" : "text-destructive"}`}>
                              Resolved: {yesPercent >= 50 ? "Yes" : "No"}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground text-center">{totalVotes.toLocaleString()} vote{totalVotes !== 1 ? "s" : ""}</p>
                        </div>
                      }
                    </Link>);
                })}
                  </div>
               </motion.div>
            }
          </motion.div>
        </motion.div>
      </div>

    </section>);

};

export default BillboardHero;
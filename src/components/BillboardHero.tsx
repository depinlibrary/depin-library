import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  RefreshCw,
  Search,
} from "lucide-react";
import ProjectLogo from "@/components/ProjectLogo";
import { Badge } from "@/components/ui/badge";
import type { Project } from "@/hooks/useProjects";
import type { TokenMarketData } from "@/hooks/useTokenMarketData";
import { useEffect, useState, useRef } from "react";

interface BillboardHeroProps {
  projects: Project[];
  marketData: Record<string, TokenMarketData>;
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
                  Track, compare & predict the top DePIN projects — all in one place.
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
                    style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))" }}>
                    
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

           {/* Bento Grid — Image-matching layout: [Market Cap + Volume] | Trending | Top Gainers */}
           <motion.div
             className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr] gap-3 mb-4"
             animate={{ opacity: isRefetching ? [1, 0.7, 1] : 1 }}
             transition={{ duration: 0.8, repeat: isRefetching ? Infinity : 0 }}>

             {/* ── Left Column: Market Cap + 24h Volume stacked ── */}
             <motion.div variants={fadeUp} className="flex flex-col gap-3">
               {/* Market Cap Card */}
               <div className="rounded-lg border border-border bg-card/40 backdrop-blur-md p-4 flex items-center justify-between gap-4">
                 <div>
                   <p className="text-xl sm:text-2xl font-bold text-foreground font-['Space_Grotesk'] tabular-nums leading-tight">
                     {formatCompact(totalMarketCap)}
                   </p>
                   <div className="flex items-center gap-2 mt-1">
                     <span className="text-xs text-muted-foreground">Market Cap</span>
                     <span className={`text-xs font-bold tabular-nums ${avgChange >= 0 ? "text-neon-green" : "text-destructive"}`}>
                       {avgChange >= 0 ? "▲" : "▼"} {Math.abs(avgChange).toFixed(1)}%
                     </span>
                   </div>
                 </div>
                 {(() => {
                   // Build a synthetic sparkline from top projects
                   const topSparkline = topMarketCap[0] ? marketData[topMarketCap[0].id]?.sparkline_7d : null;
                   if (!topSparkline || topSparkline.length < 2) return null;
                   const min = Math.min(...topSparkline);
                   const max = Math.max(...topSparkline);
                   const range = max - min || 1;
                   const h = 40; const w = 120;
                   const points = topSparkline.map((v, i) => `${i / (topSparkline.length - 1) * w},${h - (v - min) / range * h}`).join(" ");
                   const isPositive = topSparkline[topSparkline.length - 1] >= topSparkline[0];
                   return (
                     <svg width={w} height={h} className="shrink-0">
                       <polyline points={points} fill="none" stroke={isPositive ? "hsl(var(--neon-green))" : "hsl(var(--destructive))"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                     </svg>
                   );
                 })()}
               </div>

               {/* 24h Trading Volume Card */}
               <div className="rounded-lg border border-border bg-card/40 backdrop-blur-md p-4 flex items-center justify-between gap-4">
                 <div>
                   <p className="text-xl sm:text-2xl font-bold text-foreground font-['Space_Grotesk'] tabular-nums leading-tight">
                     {formatCompact(Object.values(marketData).reduce((sum, d) => {
                       // Estimate 24h volume from market cap and change
                       return sum + (d.market_cap_usd || 0) * 0.05;
                     }, 0))}
                   </p>
                   <span className="text-xs text-muted-foreground mt-1 block">24h Trading Volume</span>
                 </div>
                 {(() => {
                   const secondSparkline = topMarketCap[1] ? marketData[topMarketCap[1].id]?.sparkline_7d : null;
                   if (!secondSparkline || secondSparkline.length < 2) return null;
                   const min = Math.min(...secondSparkline);
                   const max = Math.max(...secondSparkline);
                   const range = max - min || 1;
                   const h = 40; const w = 120;
                   const points = secondSparkline.map((v, i) => `${i / (secondSparkline.length - 1) * w},${h - (v - min) / range * h}`).join(" ");
                   const isPositive = secondSparkline[secondSparkline.length - 1] >= secondSparkline[0];
                   return (
                     <svg width={w} height={h} className="shrink-0">
                       <polyline points={points} fill="none" stroke={isPositive ? "hsl(var(--neon-green))" : "hsl(var(--destructive))"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                     </svg>
                   );
                 })()}
               </div>
             </motion.div>

             {/* ── Trending ── */}
             <motion.div variants={fadeUp} className="rounded-lg border border-border bg-card/40 backdrop-blur-md p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs">🔥</span>
                  <span className="text-xs font-semibold text-foreground">Trending</span>
                </div>
                <div className="space-y-0.5 flex-1 flex flex-col justify-center">
                  {(trendingProjects.length > 0 ? trendingProjects : topMarketCap).slice(0, 3).map((p: any, i: number) => {
                    const m = marketData[p.id];
                    const change = m?.price_change_24h || 0;
                    return (
                      <Link
                        key={p.id}
                        to={`/project/${p.slug}`}
                        className="group flex items-center gap-2 rounded-md px-1 py-1.5 transition-colors hover:bg-secondary/50">
                        <ProjectLogo logoUrl={p.logo_url} logoEmoji={p.logo_emoji} name={p.name} size="xs" />
                        <span className="text-xs font-semibold text-foreground truncate flex-1">{p.name}</span>
                        <span className="text-[11px] font-medium text-muted-foreground tabular-nums shrink-0">{formatPrice(m?.price_usd || null)}</span>
                        <span className={`text-[10px] font-bold tabular-nums shrink-0 ${change >= 0 ? "text-neon-green" : "text-destructive"}`}>
                          {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </motion.div>

              {/* ── Top Gainers ── */}
              <motion.div variants={fadeUp} className="rounded-lg border border-border bg-card/40 backdrop-blur-md p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs">🚀</span>
                  <span className="text-xs font-semibold text-foreground">Top Gainers</span>
                </div>
                <div className="space-y-0.5 flex-1 flex flex-col justify-center">
                  {topGainers.slice(0, 3).map((p) => {
                    const m = marketData[p.id];
                    const change = m?.price_change_24h || 0;
                    return (
                      <Link
                        key={p.id}
                        to={`/project/${p.slug}`}
                        className="group flex items-center gap-2 rounded-md px-1 py-1.5 transition-colors hover:bg-secondary/50">
                        <ProjectLogo logoUrl={p.logo_url} logoEmoji={p.logo_emoji} name={p.name} size="xs" />
                        <span className="text-xs font-semibold text-foreground truncate flex-1">{p.name}</span>
                        <span className="text-[11px] font-medium text-muted-foreground tabular-nums shrink-0">{formatPrice(m?.price_usd || null)}</span>
                        <span className="text-[10px] font-bold text-neon-green tabular-nums shrink-0">
                          ▲ {change.toFixed(1)}%
                        </span>
                      </Link>
                    );
                  })}
                  {topGainers.length === 0 && <p className="text-xs text-muted-foreground">No data yet</p>}
                </div>
              </motion.div>
           </motion.div>

        </motion.div>
      </div>

    </section>);

};

export default BillboardHero;
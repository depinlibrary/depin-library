import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
} from "lucide-react";
import ProjectLogo from "@/components/ProjectLogo";
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

const AnimatedNumber = ({ target, suffix = "" }: { target: number; suffix?: string }) => {
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
  visible: { transition: { staggerChildren: 0.04 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const MiniSparkline = ({ data, positive }: { data: number[] | null; positive: boolean }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = 20;
  const w = 50;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? "hsl(var(--neon-green))" : "hsl(var(--destructive))"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};


const BillboardHero = ({
  projects,
  marketData,
  topForecasts,
  trendingProjects,
  totalCategories,
  totalBlockchains,
  isRefetching = false,
}: BillboardHeroProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Compute top market cap projects
  const topMarketCap = [...projects]
    .filter((p) => marketData[p.id]?.market_cap_usd)
    .sort((a, b) => (marketData[b.id]?.market_cap_usd || 0) - (marketData[a.id]?.market_cap_usd || 0))
    .slice(0, 5);

  const topGainers = [...projects]
    .filter((p) => marketData[p.id]?.price_change_24h && (marketData[p.id]?.price_change_24h || 0) > 0)
    .sort((a, b) => (marketData[b.id]?.price_change_24h || 0) - (marketData[a.id]?.price_change_24h || 0))
    .slice(0, 3);

  const topLosers = [...projects]
    .filter((p) => marketData[p.id]?.price_change_24h && (marketData[p.id]?.price_change_24h || 0) < 0)
    .sort((a, b) => (marketData[a.id]?.price_change_24h || 0) - (marketData[b.id]?.price_change_24h || 0))
    .slice(0, 3);

  const totalMarketCap = Object.values(marketData).reduce((sum, d) => sum + (d.market_cap_usd || 0), 0);
  const changes = Object.values(marketData).filter((d) => d.price_change_24h !== null);
  const avgChange = changes.length > 0 ? changes.reduce((s, d) => s + (d.price_change_24h || 0), 0) / changes.length : 0;

  return (
    <section className="relative overflow-hidden pt-20 pb-0 sm:pt-24">
      <div className="absolute inset-0 bg-grid opacity-15" />

      <div className="container relative mx-auto px-4 pb-6">
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          {/* Title row + Search */}
          <motion.div variants={fadeUp} className="mb-5">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <div className="mb-1.5 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 backdrop-blur-sm px-3 py-0.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                  </span>
                  <span className="text-[9px] font-medium text-muted-foreground tracking-wide uppercase">Live DePIN Intelligence</span>
                  {isRefetching && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="ml-1 flex items-center"
                    >
                      <RefreshCw className="h-2.5 w-2.5 text-primary/70" />
                    </motion.div>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-['Space_Grotesk'] tracking-tight">
                  DePIN Ecosystem <span className="text-primary">Billboard</span>
                </h1>
                <p className="mt-1 text-xs text-muted-foreground max-w-md">
                  Track, compare & forecast the top DePIN projects — all in one place.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Search bar */}
                <form onSubmit={handleSearch} className="relative w-full sm:w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search projects..."
                    className="w-full h-9 rounded-lg border border-border bg-card/60 backdrop-blur-sm pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
                  />
                </form>

                {/* CTA Button */}
                <motion.div
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Link
                    to="/explore"
                    className="relative inline-flex items-center gap-1.5 h-9 rounded-lg px-4 text-xs font-semibold text-primary-foreground overflow-hidden transition-shadow hover:shadow-lg hover:shadow-primary/30"
                    style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))" }}
                  >
                    {/* Animated shine */}
                    <motion.span
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: "linear-gradient(105deg, transparent 40%, hsl(0 0% 100% / 0.2) 50%, transparent 60%)",
                        backgroundSize: "200% 100%",
                      }}
                      animate={{ backgroundPosition: ["200% 0%", "-200% 0%"] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }}
                    />
                    <span className="relative">Explore Projects</span>
                    <ArrowRight className="relative h-3.5 w-3.5" />
                  </Link>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Compact Stats Row with animated glow */}
          <motion.div variants={fadeUp} className="mb-4">
            <div className="grid grid-cols-4 gap-2">
              <Link to="/explore" className="group relative flex items-center gap-2.5 rounded-lg border border-border bg-card/40 backdrop-blur-md px-3 py-2.5 transition-all hover:bg-card/60 hover:shadow-lg hover:shadow-primary/20">
                {/* Animated glow background */}
                <motion.div
                  className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.05))",
                  }}
                  animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
                  transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
                />
                <div className="relative flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 shrink-0">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="relative min-w-0">
                  <p className="text-lg font-bold text-foreground font-['Space_Grotesk'] tabular-nums leading-tight">
                    <AnimatedNumber target={projects.length} />
                  </p>
                  <p className="text-[9px] text-muted-foreground font-medium">Projects</p>
                </div>
              </Link>

              <Link to="/market" className="group relative flex items-center gap-2.5 rounded-lg border border-border bg-card/40 backdrop-blur-md px-3 py-2.5 transition-all hover:bg-card/60 hover:shadow-lg hover:shadow-primary/20">
                {/* Animated glow background */}
                <motion.div
                  className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.05))",
                  }}
                  animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
                  transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
                />
                <div className="relative flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 shrink-0">
                  <BarChart3 className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="relative min-w-0">
                  <p className="text-lg font-bold text-foreground font-['Space_Grotesk'] tabular-nums leading-tight">
                    {formatCompact(totalMarketCap)}
                  </p>
                  <p className="text-[9px] text-muted-foreground font-medium">Market Cap</p>
                </div>
              </Link>

              <Link to="/market" className="group relative flex items-center gap-2.5 rounded-lg border border-border bg-card/40 backdrop-blur-md px-3 py-2.5 transition-all hover:bg-card/60 hover:shadow-lg hover:shadow-primary/20">
                {/* Animated glow background */}
                <motion.div
                  className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.05))",
                  }}
                  animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
                  transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
                />
                <div className="relative flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 shrink-0">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="relative min-w-0">
                  <p className={`text-lg font-bold font-['Space_Grotesk'] tabular-nums leading-tight ${avgChange >= 0 ? "text-neon-green" : "text-destructive"}`}>
                    {avgChange >= 0 ? "+" : ""}{avgChange.toFixed(1)}%
                  </p>
                  <p className="text-[9px] text-muted-foreground font-medium">Avg 24h</p>
                </div>
              </Link>

              <Link to="/explore" className="group relative flex items-center gap-2.5 rounded-lg border border-border bg-card/40 backdrop-blur-md px-3 py-2.5 transition-all hover:bg-card/60 hover:shadow-lg hover:shadow-primary/20">
                {/* Animated glow background */}
                <motion.div
                  className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.05))",
                  }}
                  animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
                  transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
                />
                <div className="relative flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 shrink-0">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="relative min-w-0">
                  <p className="text-lg font-bold text-foreground font-['Space_Grotesk'] tabular-nums leading-tight">
                    <AnimatedNumber target={totalCategories} />
                    <span className="text-xs text-muted-foreground font-normal ml-0.5">/</span>
                    <AnimatedNumber target={totalBlockchains} />
                  </p>
                  <p className="text-[9px] text-muted-foreground font-medium">Cat / Chains</p>
                </div>
              </Link>
            </div>
          </motion.div>

          {/* Bento Grid - denser */}
          <motion.div 
            className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 auto-rows-min relative"
            animate={{ opacity: isRefetching ? [1, 0.7, 1] : 1 }}
            transition={{ duration: 0.8, repeat: isRefetching ? Infinity : 0 }}
          >
            {/* ── Top Market Cap (spans 2 cols) ── */}
            <motion.div variants={fadeUp} className="col-span-2 rounded-lg border border-border bg-card/40 backdrop-blur-md p-3">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-3 w-3 text-primary" />
                <span className="text-[11px] font-semibold text-foreground">Top Market Cap</span>
                <Link to="/market" className="ml-auto text-[9px] text-muted-foreground hover:text-primary transition-colors">
                  View all →
                </Link>
              </div>
              <div className="space-y-1">
                {topMarketCap.map((p, i) => {
                  const m = marketData[p.id];
                  return (
                    <Link
                      key={p.id}
                      to={`/project/${p.slug}`}
                      className="group flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-secondary/50"
                    >
                      <span className="text-[9px] font-bold text-muted-foreground w-3 text-center">{i + 1}</span>
                      <ProjectLogo logoUrl={p.logo_url} logoEmoji={p.logo_emoji} name={p.name} size="xs" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-foreground truncate">{p.name}</p>
                      </div>
                      <MiniSparkline data={m?.sparkline_7d || null} positive={(m?.price_change_24h || 0) >= 0} />
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-medium text-muted-foreground tabular-nums">{formatCompact(m?.market_cap_usd || 0)}</p>
                        <p className={`text-[9px] font-bold tabular-nums ${(m?.price_change_24h || 0) >= 0 ? "text-neon-green" : "text-destructive"}`}>
                          {(m?.price_change_24h || 0) >= 0 ? "+" : ""}{(m?.price_change_24h || 0).toFixed(1)}%
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>

            {/* ── Trending Projects ── */}
            <motion.div variants={fadeUp} className="col-span-2 rounded-lg border border-border bg-card/40 backdrop-blur-md p-3">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="h-3 w-3 text-primary" />
                <span className="text-[11px] font-semibold text-foreground">Trending Now</span>
                <Link to="/explore" className="ml-auto text-[9px] text-muted-foreground hover:text-primary transition-colors">
                  View all →
                </Link>
              </div>
              <div className="space-y-1">
                {trendingProjects.slice(0, 5).map((p: any, i: number) => {
                  const m = marketData[p.id];
                  return (
                    <Link
                      key={p.id}
                      to={`/project/${p.slug}`}
                      className="group flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-secondary/50"
                    >
                      <span className="text-[9px] font-bold text-muted-foreground w-3 text-center">{i + 1}</span>
                      <ProjectLogo logoUrl={p.logo_url} logoEmoji={p.logo_emoji} name={p.name} size="xs" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-foreground truncate">{p.name}</p>
                        <p className="text-[9px] text-muted-foreground truncate">{p.category}</p>
                      </div>
                      {m?.price_usd && (
                        <span className="text-[10px] font-medium text-muted-foreground tabular-nums">{formatPrice(m.price_usd)}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </motion.div>

            {/* ── Gainers + Losers combined (spans 2 cols) ── */}
            <motion.div variants={fadeUp} className="col-span-2 grid grid-cols-2 gap-2">
              {/* Top Gainers */}
              <div className="rounded-lg border border-border bg-card/40 backdrop-blur-md p-3">
                <div className="flex items-center gap-1 mb-2">
                  <ArrowUpRight className="h-3 w-3 text-neon-green" />
                  <span className="text-[11px] font-semibold text-foreground">Gainers</span>
                </div>
                <div className="space-y-2">
                  {topGainers.map((p) => {
                    const m = marketData[p.id];
                    return (
                      <Link key={p.id} to={`/project/${p.slug}`} className="group flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                        <ProjectLogo logoUrl={p.logo_url} logoEmoji={p.logo_emoji} name={p.name} size="xs" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-semibold text-foreground truncate">{p.name}</p>
                          <p className="text-[9px] font-bold text-neon-green tabular-nums">
                            +{(m?.price_change_24h || 0).toFixed(1)}%
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                  {topGainers.length === 0 && <p className="text-[9px] text-muted-foreground">No data yet</p>}
                </div>
              </div>

              {/* Top Losers */}
              <div className="rounded-lg border border-border bg-card/40 backdrop-blur-md p-3">
                <div className="flex items-center gap-1 mb-2">
                  <ArrowDownRight className="h-3 w-3 text-destructive" />
                  <span className="text-[11px] font-semibold text-foreground">Losers</span>
                </div>
                <div className="space-y-2">
                  {topLosers.map((p) => {
                    const m = marketData[p.id];
                    return (
                      <Link key={p.id} to={`/project/${p.slug}`} className="group flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                        <ProjectLogo logoUrl={p.logo_url} logoEmoji={p.logo_emoji} name={p.name} size="xs" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-semibold text-foreground truncate">{p.name}</p>
                          <p className="text-[9px] font-bold text-destructive tabular-nums">
                            {(m?.price_change_24h || 0).toFixed(1)}%
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                  {topLosers.length === 0 && <p className="text-[9px] text-muted-foreground">No data yet</p>}
                </div>
              </div>
            </motion.div>

            {/* ── Top Forecasts (spans full width on large) ── */}
            {topForecasts.length > 0 && (
              <motion.div variants={fadeUp} className="col-span-2 sm:col-span-4 lg:col-span-6 rounded-lg border border-border bg-card/40 backdrop-blur-md p-3">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-3 w-3 text-primary" />
                  <span className="text-[11px] font-semibold text-foreground">Top Forecasts</span>
                  <Link to="/forecasts" className="ml-auto text-[9px] text-muted-foreground hover:text-primary transition-colors">
                    View all →
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {topForecasts.slice(0, 4).map((f) => {
                    const totalVotes = f.total_votes_yes + f.total_votes_no;
                    const yesPercent = totalVotes > 0 ? (f.total_votes_yes / totalVotes) * 100 : 50;
                    return (
                      <Link
                        key={f.id}
                        to={`/forecasts/${f.id}`}
                        className="group flex flex-col gap-2 rounded-md bg-secondary/30 px-2.5 py-2 transition-colors hover:bg-secondary/50"
                      >
                        <div className="flex items-center gap-1.5">
                          <ProjectLogo logoUrl={f.project_a_logo_url || null} logoEmoji={f.project_a_logo_emoji || "⬡"} name={f.project_a_name || "Project"} size="xs" />
                          {f.project_b_name && (
                            <>
                              <span className="text-[7px] font-bold text-muted-foreground uppercase">vs</span>
                              <ProjectLogo logoUrl={f.project_b_logo_url || null} logoEmoji={f.project_b_logo_emoji || "⬡"} name={f.project_b_name} size="xs" />
                            </>
                          )}
                        </div>
                        <p className="text-[10px] font-semibold text-foreground line-clamp-2 leading-snug">{f.title}</p>
                        <div className="mt-auto flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden flex">
                            <div className="h-full bg-neon-green rounded-l-full" style={{ width: `${yesPercent}%` }} />
                            <div className="h-full bg-destructive rounded-r-full" style={{ width: `${100 - yesPercent}%` }} />
                          </div>
                          <span className="text-[9px] font-bold tabular-nums text-muted-foreground">{totalVotes}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </div>

    </section>
  );
};

export default BillboardHero;

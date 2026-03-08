import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  TrendingUp,
  BarChart3,
  Layers,
  Zap,
  Activity,
  Users,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Crown,
  Flame,
  RefreshCw,
} from "lucide-react";
import ProjectLogo from "@/components/ProjectLogo";
import type { Project } from "@/hooks/useProjects";
import type { TokenMarketData } from "@/hooks/useTokenMarketData";
import { useEffect, useState } from "react";

interface BillboardHeroProps {
  projects: Project[];
  marketData: Record<string, TokenMarketData>;
  topSentiments: any[];
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
  visible: { transition: { staggerChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

const MiniSparkline = ({ data, positive }: { data: number[] | null; positive: boolean }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = 24;
  const w = 60;
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
  topSentiments,
  trendingProjects,
  totalCategories,
  totalBlockchains,
  isRefetching = false,
}: BillboardHeroProps) => {
  // Compute top market cap projects
  const topMarketCap = [...projects]
    .filter((p) => marketData[p.id]?.market_cap_usd)
    .sort((a, b) => (marketData[b.id]?.market_cap_usd || 0) - (marketData[a.id]?.market_cap_usd || 0))
    .slice(0, 5);

  // Top gainers
  const topGainers = [...projects]
    .filter((p) => marketData[p.id]?.price_change_24h && (marketData[p.id]?.price_change_24h || 0) > 0)
    .sort((a, b) => (marketData[b.id]?.price_change_24h || 0) - (marketData[a.id]?.price_change_24h || 0))
    .slice(0, 3);

  // Top losers
  const topLosers = [...projects]
    .filter((p) => marketData[p.id]?.price_change_24h && (marketData[p.id]?.price_change_24h || 0) < 0)
    .sort((a, b) => (marketData[a.id]?.price_change_24h || 0) - (marketData[b.id]?.price_change_24h || 0))
    .slice(0, 3);

  // Total market cap
  const totalMarketCap = Object.values(marketData).reduce((sum, d) => sum + (d.market_cap_usd || 0), 0);

  // Average 24h change
  const changes = Object.values(marketData).filter((d) => d.price_change_24h !== null);
  const avgChange = changes.length > 0 ? changes.reduce((s, d) => s + (d.price_change_24h || 0), 0) / changes.length : 0;

  // Active forecasts (sentiment as proxy for activity)
  const totalSentimentVotes = topSentiments.reduce((s: number, t: any) => s + (t.total_votes || 0), 0);

  return (
    <section className="relative overflow-hidden pt-24 pb-8 sm:pt-28 sm:pb-12">
      {/* BG effects */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="gradient-radial-top absolute inset-0" />

      <div className="container relative mx-auto px-4">
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          {/* Title row */}
           <motion.div variants={fadeUp} className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 backdrop-blur-sm px-3 py-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                <span className="text-[10px] font-medium text-muted-foreground tracking-wide uppercase">Live DePIN Intelligence</span>
                {isRefetching && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="ml-1 flex items-center"
                  >
                    <RefreshCw className="h-3 w-3 text-primary/70" />
                  </motion.div>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground font-['Space_Grotesk'] tracking-tight">
                DePIN Ecosystem <span className="text-primary">Billboard</span>
              </h1>
            </div>
            <Link
              to="/explore"
              className="group inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Explore all projects <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>

          {/* Bento Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 auto-rows-min">
            {/* ── Stat: Total Projects ── */}
            <motion.div variants={fadeUp}>
              <Link to="/explore" className="block rounded-xl border border-border bg-card/80 backdrop-blur-sm p-4 flex flex-col justify-between h-full transition-colors hover:border-primary/40 hover:bg-card">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 mb-3">
                  <Layers className="h-4 w-4 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground font-['Space_Grotesk'] tabular-nums">
                  <AnimatedNumber target={projects.length} />
                </p>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Projects Tracked</p>
              </Link>
            </motion.div>

            {/* ── Stat: Total Market Cap ── */}
            <motion.div variants={fadeUp}>
              <Link to="/market" className="block rounded-xl border border-border bg-card/80 backdrop-blur-sm p-4 flex flex-col justify-between h-full transition-colors hover:border-primary/40 hover:bg-card">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 mb-3">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground font-['Space_Grotesk'] tabular-nums">
                  {formatCompact(totalMarketCap)}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Total Market Cap</p>
              </Link>
            </motion.div>

            {/* ── Stat: Avg 24h Change ── */}
            <motion.div variants={fadeUp}>
              <Link to="/market" className="block rounded-xl border border-border bg-card/80 backdrop-blur-sm p-4 flex flex-col justify-between h-full transition-colors hover:border-primary/40 hover:bg-card">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg mb-3 ${avgChange >= 0 ? "bg-neon-green/10" : "bg-destructive/10"}`}>
                  {avgChange >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-neon-green" />
                  ) : (
                    <Activity className="h-4 w-4 text-destructive" />
                  )}
                </div>
                <p className={`text-2xl font-bold font-['Space_Grotesk'] tabular-nums ${avgChange >= 0 ? "text-neon-green" : "text-destructive"}`}>
                  {avgChange >= 0 ? "+" : ""}{avgChange.toFixed(1)}%
                </p>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Avg 24h Change</p>
              </Link>
            </motion.div>

            {/* ── Stat: Categories + Chains ── */}
            <motion.div variants={fadeUp}>
              <Link to="/explore" className="block rounded-xl border border-border bg-card/80 backdrop-blur-sm p-4 flex flex-col justify-between h-full transition-colors hover:border-primary/40 hover:bg-card">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 mb-3">
                  <Zap className="h-4 w-4 text-accent" />
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-foreground font-['Space_Grotesk'] tabular-nums">
                    <AnimatedNumber target={totalCategories} />
                  </p>
                  <span className="text-muted-foreground text-[10px]">categories</span>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <p className="text-lg font-bold text-foreground font-['Space_Grotesk'] tabular-nums">
                    <AnimatedNumber target={totalBlockchains} />
                  </p>
                  <span className="text-muted-foreground text-[10px]">blockchains</span>
                </div>
              </Link>
            </motion.div>

            {/* ── Top Market Cap (spans 2 cols) ── */}
            <motion.div variants={fadeUp} className="col-span-2 rounded-xl border border-border bg-card/80 backdrop-blur-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">Top Market Cap</span>
                <Link to="/market" className="ml-auto text-[10px] text-muted-foreground hover:text-primary transition-colors">
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
                      className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-secondary/50"
                    >
                      <span className="text-[10px] font-bold text-muted-foreground w-4 text-center">{i + 1}</span>
                      <ProjectLogo logoUrl={p.logo_url} logoEmoji={p.logo_emoji} name={p.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">{formatCompact(m?.market_cap_usd || 0)}</p>
                      </div>
                      <MiniSparkline data={m?.sparkline_7d || null} positive={(m?.price_change_24h || 0) >= 0} />
                      <span className={`text-[10px] font-semibold tabular-nums ${(m?.price_change_24h || 0) >= 0 ? "text-neon-green" : "text-destructive"}`}>
                        {(m?.price_change_24h || 0) >= 0 ? "+" : ""}{(m?.price_change_24h || 0).toFixed(1)}%
                      </span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>

            {/* ── Trending Projects ── */}
            <motion.div variants={fadeUp} className="col-span-2 sm:col-span-2 rounded-xl border border-border bg-card/80 backdrop-blur-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">Trending Now</span>
                <Link to="/explore" className="ml-auto text-[10px] text-muted-foreground hover:text-primary transition-colors">
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
                      className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-secondary/50"
                    >
                      <span className="text-[10px] font-bold text-muted-foreground w-4 text-center">{i + 1}</span>
                      <ProjectLogo logoUrl={p.logo_url} logoEmoji={p.logo_emoji} name={p.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{p.category}</p>
                      </div>
                      {m?.price_usd && (
                        <span className="text-[10px] font-medium text-muted-foreground tabular-nums">{formatPrice(m.price_usd)}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </motion.div>

            {/* ── Top Gainers ── */}
            <motion.div variants={fadeUp} className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <ArrowUpRight className="h-3.5 w-3.5 text-neon-green" />
                <span className="text-xs font-semibold text-foreground">Top Gainers</span>
              </div>
              <div className="space-y-2.5">
                {topGainers.map((p) => {
                  const m = marketData[p.id];
                  return (
                    <Link key={p.id} to={`/project/${p.slug}`} className="group flex items-center gap-2 hover:opacity-80 transition-opacity">
                      <ProjectLogo logoUrl={p.logo_url} logoEmoji={p.logo_emoji} name={p.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-foreground truncate">{p.name}</p>
                        <p className="text-[10px] font-bold text-neon-green tabular-nums">
                          +{(m?.price_change_24h || 0).toFixed(1)}%
                        </p>
                      </div>
                    </Link>
                  );
                })}
                {topGainers.length === 0 && <p className="text-[10px] text-muted-foreground">No data yet</p>}
              </div>
            </motion.div>

            {/* ── Top Losers ── */}
            <motion.div variants={fadeUp} className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
                <span className="text-xs font-semibold text-foreground">Top Losers</span>
              </div>
              <div className="space-y-2.5">
                {topLosers.map((p) => {
                  const m = marketData[p.id];
                  return (
                    <Link key={p.id} to={`/project/${p.slug}`} className="group flex items-center gap-2 hover:opacity-80 transition-opacity">
                      <ProjectLogo logoUrl={p.logo_url} logoEmoji={p.logo_emoji} name={p.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-foreground truncate">{p.name}</p>
                        <p className="text-[10px] font-bold text-destructive tabular-nums">
                          {(m?.price_change_24h || 0).toFixed(1)}%
                        </p>
                      </div>
                    </Link>
                  );
                })}
                {topLosers.length === 0 && <p className="text-[10px] text-muted-foreground">No data yet</p>}
              </div>
            </motion.div>

            {/* ── Community Sentiment (spans 2 cols) ── */}
            {topSentiments.length > 0 && (
              <motion.div variants={fadeUp} className="col-span-2 rounded-xl border border-border bg-card/80 backdrop-blur-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-3.5 w-3.5 text-accent" />
                  <span className="text-xs font-semibold text-foreground">Community Sentiment</span>
                  <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">{totalSentimentVotes} votes</span>
                </div>
                <div className="space-y-2">
                  {topSentiments.slice(0, 4).map((s: any) => {
                    const isBullish = s.bullish_percentage >= 50;
                    return (
                      <Link
                        key={s.project_id}
                        to={`/project/${s.project_slug}`}
                        className="group flex items-center gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-secondary/50"
                      >
                        <span className="text-xs font-semibold text-foreground w-24 truncate">{s.project_name}</span>
                        <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden flex">
                          <motion.div
                            className="h-full bg-neon-green rounded-l-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${s.bullish_percentage}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                          />
                          <motion.div
                            className="h-full bg-destructive rounded-r-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${100 - s.bullish_percentage}%` }}
                            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
                          />
                        </div>
                        <span className={`text-[10px] font-bold tabular-nums w-12 text-right ${isBullish ? "text-neon-green" : "text-destructive"}`}>
                          {s.bullish_percentage.toFixed(0)}%
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default BillboardHero;

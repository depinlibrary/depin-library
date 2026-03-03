import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Search, ChevronUp, ChevronDown, TrendingUp, TrendingDown,
  ArrowUpRight, Flame, X, Star, Zap, Activity, Globe2, LayoutGrid, List
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProjectLogo from "@/components/ProjectLogo";
import { useProjects, type Project } from "@/hooks/useProjects";
import { useAllTokenMarketData, type TokenMarketData } from "@/hooks/useTokenMarketData";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useBookmarks, useToggleBookmark } from "@/hooks/useBookmarks";

// ═══════════════════════════════════════════════════════════
// FORMATTERS
// ═══════════════════════════════════════════════════════════

function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return "—";
  if (price >= 1000) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

function formatMarketCap(cap: number | null): string {
  if (cap === null || cap === undefined) return "—";
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
  if (cap >= 1e3) return `$${(cap / 1e3).toFixed(1)}K`;
  return `$${cap.toFixed(0)}`;
}

function formatCompact(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toFixed(0);
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

const PriceChange = ({ change, showIcon = false }: { change: number | null; showIcon?: boolean }) => {
  if (change === null || change === undefined) return <span className="text-muted-foreground text-xs">—</span>;
  const positive = change > 0;
  const negative = change < 0;
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold text-xs ${
      positive ? "text-green-400" : negative ? "text-red-400" : "text-muted-foreground"
    }`}>
      {showIcon && (positive ? <TrendingUp className="h-3 w-3" /> : negative ? <TrendingDown className="h-3 w-3" /> : null)}
      {positive ? "+" : ""}{change.toFixed(2)}%
    </span>
  );
};

const ChangePill = ({ change }: { change: number | null }) => {
  if (change === null || change === undefined) return <span className="text-muted-foreground text-xs">—</span>;
  const positive = change > 0;
  const negative = change < 0;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-xs font-bold ${
      positive ? "bg-green-500/10 text-green-400" : negative ? "bg-red-500/10 text-red-400" : "bg-muted text-muted-foreground"
    }`}>
      {positive ? "▲" : negative ? "▼" : "–"} {Math.abs(change).toFixed(2)}%
    </span>
  );
};

// Sparkline with gradient fill
const Sparkline = ({ data, change, width = 120, height = 36 }: { data: number[] | null; change: number | null; width?: number; height?: number }) => {
  if (!data || data.length < 2) return <div style={{ width, height }} />;

  const step = Math.max(1, Math.floor(data.length / 28));
  const pts = data.filter((_, i) => i % step === 0 || i === data.length - 1);
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;

  const coords = pts.map((val, i) => ({
    x: (i / (pts.length - 1)) * width,
    y: height - ((val - min) / range) * (height - 4) - 2,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;
  const positive = change !== null ? change >= 0 : pts[pts.length - 1] >= pts[0];
  const color = positive ? "34,197,94" : "239,68,68";
  const id = `sp-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <svg width={width} height={height} className="block">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`rgb(${color})`} stopOpacity="0.15" />
          <stop offset="100%" stopColor={`rgb(${color})`} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${id})`} />
      <path d={linePath} fill="none" stroke={`rgb(${color})`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// Hero stat card
const StatCard = ({ icon: Icon, label, value, sub, accent = false }: {
  icon: React.ElementType; label: string; value: React.ReactNode; sub?: React.ReactNode; accent?: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className={`relative overflow-hidden rounded-2xl border p-5 ${
      accent
        ? "border-primary/20 bg-gradient-to-br from-primary/5 to-transparent"
        : "border-border bg-card/60 backdrop-blur-sm"
    }`}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="mt-1.5 text-2xl font-bold text-foreground font-mono tracking-tight">{value}</p>
        {sub && <div className="mt-1">{sub}</div>}
      </div>
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent ? "bg-primary/10" : "bg-secondary"}`}>
        <Icon className={`h-4.5 w-4.5 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      </div>
    </div>
    {accent && (
      <div className="absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-primary/5 blur-2xl" />
    )}
  </motion.div>
);

// Trending ticker item
const TickerItem = ({ project, market, rank, type }: { project: Project; market: TokenMarketData; rank: number; type: "gainer" | "loser" }) => {
  const change = market.price_change_24h;
  const positive = change !== null && change > 0;

  return (
    <Link
      to={`/project/${project.slug}`}
      className="group flex items-center gap-4 rounded-xl border border-border/50 bg-card/50 px-5 py-4 transition-all duration-200 hover:bg-card hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
    >
      <span className="text-xs font-bold text-muted-foreground/60 w-4 text-center shrink-0">
        {rank}
      </span>
      <div className="shrink-0">
        <ProjectLogo logoUrl={project.logo_url} logoEmoji={project.logo_emoji} name={project.name} size="sm" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
          {project.name}
        </p>
        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{project.token}</p>
      </div>
      <div className="text-right shrink-0 space-y-0.5">
        <p className="text-sm font-bold text-foreground font-mono">{formatPrice(market.price_usd)}</p>
        <ChangePill change={change} />
      </div>
    </Link>
  );
};

// Sortable column header
type SortKey = "market_cap" | "price" | "change_24h" | "name";

const ColHeader = ({ label, sortKey, active, asc, onSort, align = "right", className = "" }: {
  label: string; sortKey: SortKey; active: boolean; asc: boolean; onSort: (k: SortKey) => void; align?: string; className?: string;
}) => (
  <th
    className={`px-3 py-3 text-[11px] font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors whitespace-nowrap ${
      align === "left" ? "text-left" : align === "center" ? "text-center" : "text-right"
    } ${active ? "text-primary" : "text-muted-foreground/70 hover:text-muted-foreground"} ${className}`}
    onClick={() => onSort(sortKey)}
  >
    <span className={`inline-flex items-center gap-1 w-full ${align === "left" ? "justify-start" : align === "center" ? "justify-center" : "justify-end"}`}>
      {label}
      {active && (asc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
    </span>
  </th>
);

// ═══════════════════════════════════════════════════════════
// TABLE ROW
// ═══════════════════════════════════════════════════════════

const ProjectRow = ({ project, market, rank, isBookmarked, onBookmark, showBookmark }: {
  project: Project; market: TokenMarketData | undefined; rank: number;
  isBookmarked: boolean; onBookmark: () => void; showBookmark: boolean;
}) => {
  return (
    <tr className="group border-b border-border/20 transition-colors hover:bg-secondary/15">
      {/* Rank */}
      <td className="px-3 py-3 text-center">
        <div className="flex items-center justify-center gap-1">
          {showBookmark && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBookmark(); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity -ml-1"
            >
              <Star className={`h-3.5 w-3.5 transition-colors ${isBookmarked ? "fill-yellow-400 text-yellow-400 opacity-100" : "text-muted-foreground hover:text-yellow-400"}`} />
            </button>
          )}
          <span className="text-xs text-muted-foreground font-mono w-6 text-center">{rank}</span>
        </div>
      </td>

      {/* Project */}
      <td className="px-3 py-3.5">
        <Link to={`/project/${project.slug}`} className="flex items-center gap-4">
          <div className="h-9 w-9 shrink-0">
            <ProjectLogo logoUrl={project.logo_url} logoEmoji={project.logo_emoji} name={project.name} size="sm" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                {project.name}
              </span>
              <ArrowUpRight className="h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground font-mono">{project.token}</span>
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                project.status === "live" ? "bg-green-500" : project.status === "testnet" ? "bg-yellow-500" : "bg-muted-foreground"
              }`} />
            </div>
          </div>
        </Link>
      </td>

      {/* Price */}
      <td className="px-3 py-3 text-right">
        <span className="text-sm font-semibold text-foreground font-mono">
          {market ? formatPrice(market.price_usd) : <span className="text-muted-foreground/40">—</span>}
        </span>
      </td>

      {/* 24h */}
      <td className="px-3 py-3 text-right">
        <ChangePill change={market?.price_change_24h ?? null} />
      </td>

      {/* Market Cap */}
      <td className="px-3 py-3 text-right">
        <span className="text-sm text-foreground/80 font-mono">
          {market ? formatMarketCap(market.market_cap_usd) : <span className="text-muted-foreground/40">—</span>}
        </span>
      </td>

      {/* Sparkline */}
      <td className="px-3 py-2">
        <div className="flex justify-center">
          <Sparkline data={market?.sparkline_7d ?? null} change={market?.price_change_24h ?? null} width={110} height={32} />
        </div>
      </td>

      {/* Category & Chain */}
      <td className="px-3 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-foreground/70">{project.category}</span>
          <span className="text-[10px] text-muted-foreground">{project.blockchain}</span>
        </div>
      </td>
    </tr>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════

const ITEMS_PER_PAGE = 50;

const MarketOverview = () => {
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: marketDataMap = {}, isLoading: marketLoading } = useAllTokenMarketData();
  const { user } = useAuth();
  const { data: bookmarks = [] } = useBookmarks();
  const toggleBookmark = useToggleBookmark();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [chain, setChain] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("market_cap");
  const [sortAsc, setSortAsc] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const isLoading = projectsLoading || marketLoading;
  const categories = useMemo(() => [...new Set(projects.map(p => p.category))].sort(), [projects]);
  const chains = useMemo(() => [...new Set(projects.map(p => p.blockchain))].sort(), [projects]);
  const bookmarkedIds = useMemo(() => new Set(bookmarks.map((b: any) => b.project_id)), [bookmarks]);

  const handleSort = useCallback((key: SortKey) => {
    if (sortBy === key) setSortAsc(a => !a);
    else { setSortBy(key); setSortAsc(key === "name"); }
  }, [sortBy]);

  // ── Derived ─────────────────────────────────────────────
  const stats = useMemo(() => {
    const withData = projects
      .map(p => ({ project: p, market: marketDataMap[p.id] }))
      .filter(x => x.market?.price_usd != null);

    const totalMcap = withData.reduce((s, x) => s + (x.market.market_cap_usd || 0), 0);
    const withChange = withData.filter(x => x.market.price_change_24h != null);
    const avgChange = withChange.length ? withChange.reduce((s, x) => s + (x.market.price_change_24h || 0), 0) / withChange.length : 0;
    const sorted = [...withChange].sort((a, b) => (b.market.price_change_24h || 0) - (a.market.price_change_24h || 0));
    const gainers = sorted.filter(x => (x.market.price_change_24h || 0) > 0).slice(0, 3);
    const losers = sorted.filter(x => (x.market.price_change_24h || 0) < 0).reverse().slice(0, 3);
    const latest = withData.reduce((m, x) => Math.max(m, new Date(x.market.last_updated).getTime()), 0);

    return { totalMcap, tracked: withData.length, avgChange, gainers, losers, lastUpdated: latest ? new Date(latest) : null };
  }, [projects, marketDataMap]);

  const filtered = useMemo(() => {
    let r = projects;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(p => p.name.toLowerCase().includes(q) || p.token.toLowerCase().includes(q));
    }
    if (category) r = r.filter(p => p.category === category);
    if (chain) r = r.filter(p => p.blockchain === chain);

    const mapped = r.map(p => ({ project: p, market: marketDataMap[p.id] }));
    mapped.sort((a, b) => {
      switch (sortBy) {
        case "price": return (sortAsc ? 1 : -1) * ((a.market?.price_usd ?? -1) - (b.market?.price_usd ?? -1));
        case "change_24h": return (sortAsc ? 1 : -1) * ((a.market?.price_change_24h ?? -Infinity) - (b.market?.price_change_24h ?? -Infinity));
        case "name": return sortAsc ? a.project.name.localeCompare(b.project.name) : b.project.name.localeCompare(a.project.name);
        default: return (sortAsc ? 1 : -1) * ((a.market?.market_cap_usd ?? -1) - (b.market?.market_cap_usd ?? -1));
      }
    });
    return mapped;
  }, [projects, marketDataMap, search, category, chain, sortBy, sortAsc]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  useEffect(() => { setVisibleCount(ITEMS_PER_PAGE); }, [search, category, chain, sortBy, sortAsc]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasMore) setVisibleCount(c => c + ITEMS_PER_PAGE); },
      { rootMargin: "400px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore]);

  const activeFilters = (category ? 1 : 0) + (chain ? 1 : 0) + (search ? 1 : 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ═══ HERO ═══════════════════════════════════════════ */}
      <section className="relative pt-16 overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-grid opacity-15" />
        <div className="absolute inset-0 gradient-radial-top" />
        <div className="absolute bottom-0 left-0 right-0 h-32 gradient-fade-bottom" />

        <div className="container relative mx-auto max-w-7xl px-4 pt-10 pb-6">
          {/* Title row */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight leading-none">
                    DePIN Markets
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Real-time price data for decentralized infrastructure tokens
                  </p>
                </div>
              </div>
            </div>

            {stats.lastUpdated && (
              <div className="flex items-center gap-2 pb-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {stats.lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            )}
          </motion.div>

          {/* ── Stat Cards ──────────────────────────────── */}
          {!isLoading && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={Zap} label="Total Market Cap" value={formatMarketCap(stats.totalMcap)} accent />
              <StatCard icon={Globe2} label="Tracked Projects" value={stats.tracked} sub={<span className="text-xs text-muted-foreground">{projects.length} total</span>} />
              <StatCard icon={TrendingUp} label="Avg 24h Change" value={<PriceChange change={stats.avgChange} showIcon />} />
              <StatCard icon={LayoutGrid} label="Categories" value={categories.length} sub={<span className="text-xs text-muted-foreground">{chains.length} chains</span>} />
            </div>
          )}
        </div>
      </section>

      {/* ═══ TRENDING ═══════════════════════════════════════ */}
      {!isLoading && (stats.gainers.length > 0 || stats.losers.length > 0) && (
        <section className="container mx-auto max-w-7xl px-4 pt-2 pb-8">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Gainers */}
            {stats.gainers.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500/10 ring-1 ring-green-500/20">
                    <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground leading-none">Top Gainers</h2>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Best performing in 24h</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {stats.gainers.map(({ project, market }, i) => (
                    <TickerItem key={project.id} project={project} market={market} rank={i + 1} type="gainer" />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Losers */}
            {stats.losers.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 ring-1 ring-red-500/20">
                    <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground leading-none">Top Losers</h2>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Biggest drops in 24h</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {stats.losers.map(({ project, market }, i) => (
                    <TickerItem key={project.id} project={project} market={market} rank={i + 1} type="loser" />
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </section>
      )}

      {/* ═══ MAIN TABLE ═════════════════════════════════════ */}
      <section className="container mx-auto max-w-7xl px-4 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden shadow-xl shadow-background/50"
        >
          {/* ── Toolbar ──────────────────────────────────── */}
          <div className="relative z-20 bg-card/90 backdrop-blur-xl border-b border-border/50">
            <div className="flex items-center gap-2 px-4 py-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
                <Input
                  placeholder="Search name or token..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm bg-secondary/40 border-border/50 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/40"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <Select value={category ?? "all"} onValueChange={v => setCategory(v === "all" ? null : v)}>
                <SelectTrigger className="w-[140px] h-9 text-xs bg-secondary/40 border-border/50 focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent side="bottom" avoidCollisions={false}>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={chain ?? "all"} onValueChange={v => setChain(v === "all" ? null : v)}>
                <SelectTrigger className="w-[130px] h-9 text-xs bg-secondary/40 border-border/50 focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Chain" />
                </SelectTrigger>
                <SelectContent side="bottom" avoidCollisions={false}>
                  <SelectItem value="all">All Chains</SelectItem>
                  {chains.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>

              {activeFilters > 0 && (
                <button
                  onClick={() => { setSearch(""); setCategory(null); setChain(null); }}
                  className="flex items-center gap-1 h-9 px-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              )}

              <div className="ml-auto text-[11px] text-muted-foreground hidden sm:block font-mono">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          {/* ── Table ────────────────────────────────────── */}
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 w-16">#</th>
                    <ColHeader label="Name" sortKey="name" active={sortBy === "name"} asc={sortAsc} onSort={handleSort} align="left" className="text-left" />
                    <ColHeader label="Price" sortKey="price" active={sortBy === "price"} asc={sortAsc} onSort={handleSort} />
                    <ColHeader label="24h %" sortKey="change_24h" active={sortBy === "change_24h"} asc={sortAsc} onSort={handleSort} />
                    <ColHeader label="Market Cap" sortKey="market_cap" active={sortBy === "market_cap"} asc={sortAsc} onSort={handleSort} />
                    <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 whitespace-nowrap">Last 7 Days</th>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Info</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
                            <Search className="h-6 w-6 text-muted-foreground/30" />
                          </div>
                          <p className="text-sm text-muted-foreground">No projects found</p>
                          <button
                            onClick={() => { setSearch(""); setCategory(null); setChain(null); }}
                            className="text-xs text-primary hover:underline"
                          >
                            Reset filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    visible.map(({ project, market }, i) => (
                      <ProjectRow
                        key={project.id}
                        project={project}
                        market={market}
                        rank={i + 1}
                        isBookmarked={bookmarkedIds.has(project.id)}
                        onBookmark={() => toggleBookmark.mutate({ projectId: project.id, isBookmarked: bookmarkedIds.has(project.id) })}
                        showBookmark={!!user}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Infinite scroll sentinel ─────────────────── */}
          {hasMore && (
            <div ref={loadMoreRef} className="flex items-center justify-center py-8 border-t border-border/20">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/60 border-t-transparent" />
                <span className="font-mono">Loading more...</span>
              </div>
            </div>
          )}

          {!hasMore && filtered.length > ITEMS_PER_PAGE && (
            <div className="py-5 text-center border-t border-border/20">
              <span className="text-[11px] text-muted-foreground font-mono">
                All {filtered.length} projects loaded
              </span>
            </div>
          )}
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default MarketOverview;

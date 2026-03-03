import { useState, useMemo, useEffect, useRef } from "react";
import { Search, ChevronUp, ChevronDown, Star, TrendingUp, TrendingDown, Minus, ArrowUpRight, BarChart3, Flame, Layers, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProjectLogo from "@/components/ProjectLogo";
import { useProjects } from "@/hooks/useProjects";
import { useAllTokenMarketData, type TokenMarketData } from "@/hooks/useTokenMarketData";
import { Skeleton } from "@/components/ui/skeleton";

// ── Formatters ──────────────────────────────────────────────

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

function formatVolume(vol: number | null): string {
  if (vol === null || vol === undefined) return "—";
  if (vol >= 1e9) return `$${(vol / 1e9).toFixed(1)}B`;
  if (vol >= 1e6) return `$${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `$${(vol / 1e3).toFixed(0)}K`;
  return `$${vol.toFixed(0)}`;
}

// ── Change Badge ────────────────────────────────────────────

const ChangeBadge = ({ change, size = "sm" }: { change: number | null; size?: "sm" | "md" }) => {
  if (change === null || change === undefined) return <span className="text-muted-foreground text-xs">—</span>;
  const isPositive = change > 0;
  const isNegative = change < 0;
  const sizeClasses = size === "md" ? "text-sm px-2 py-1" : "text-xs px-1.5 py-0.5";
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-md font-semibold ${sizeClasses} ${
      isPositive ? "bg-green-500/10 text-green-500" : isNegative ? "bg-red-500/10 text-red-500" : "bg-muted text-muted-foreground"
    }`}>
      {isPositive ? "▲" : isNegative ? "▼" : ""}
      {Math.abs(change).toFixed(2)}%
    </span>
  );
};

// ── Sparkline ───────────────────────────────────────────────

const MiniSparkline = ({ data, change, width = 120, height = 40 }: { data: number[] | null; change: number | null; width?: number; height?: number }) => {
  if (!data || data.length < 2) return <div style={{ width, height }} className="flex items-center justify-center text-muted-foreground text-[10px]">—</div>;

  const step = Math.max(1, Math.floor(data.length / 30));
  const points = data.filter((_, i) => i % step === 0 || i === data.length - 1);
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const pathData = points
    .map((val, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  // Gradient area
  const areaPath = pathData + ` L${width},${height} L0,${height} Z`;
  const isPositive = change !== null ? change >= 0 : points[points.length - 1] >= points[0];
  const gradientId = `spark-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg width={width} height={height} className="inline-block">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isPositive ? "rgb(34,197,94)" : "rgb(239,68,68)"} stopOpacity="0.2" />
          <stop offset="100%" stopColor={isPositive ? "rgb(34,197,94)" : "rgb(239,68,68)"} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path d={pathData} fill="none" stroke={isPositive ? "rgb(34,197,94)" : "rgb(239,68,68)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ── Sortable Column Header ──────────────────────────────────

type SortKey = "market_cap" | "price" | "change_24h" | "name" | "rating";

const SortHeader = ({ label, sortKey, currentSort, currentAsc, onSort, align = "right" }: {
  label: string; sortKey: SortKey; currentSort: SortKey; currentAsc: boolean; onSort: (key: SortKey) => void; align?: "left" | "right" | "center";
}) => {
  const isActive = currentSort === sortKey;
  const alignClass = align === "left" ? "justify-start" : align === "center" ? "justify-center" : "justify-end";
  return (
    <th
      className={`px-4 py-3.5 text-xs font-medium cursor-pointer select-none transition-colors whitespace-nowrap ${
        isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
      onClick={() => onSort(sortKey)}
    >
      <span className={`flex items-center gap-1 ${alignClass}`}>
        {label}
        {isActive && (currentAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </span>
    </th>
  );
};

// ── Trending Card ───────────────────────────────────────────

const TrendingCard = ({ project, market, rank, type }: {
  project: any; market: any; rank: number; type: "gainer" | "loser";
}) => (
  <Link
    to={`/project/${project.slug}`}
    className="group flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-all hover:border-primary/30 hover:bg-secondary/30"
  >
    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary text-[10px] font-bold text-muted-foreground">
      {rank}
    </span>
    <ProjectLogo logoUrl={project.logo_url} logoEmoji={project.logo_emoji} name={project.name} size="sm" />
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{project.name}</p>
      <p className="text-[11px] text-muted-foreground font-mono">{project.token}</p>
    </div>
    <div className="text-right shrink-0">
      <p className="text-sm font-semibold text-foreground font-mono">{formatPrice(market.price_usd)}</p>
      <ChangeBadge change={market.price_change_24h} />
    </div>
  </Link>
);

// ── Skeleton Row ────────────────────────────────────────────

const TableRowSkeleton = () => (
  <tr className="border-b border-border/30">
    {Array.from({ length: 8 }).map((_, i) => (
      <td key={i} className="px-4 py-3.5"><Skeleton className="h-4 w-full" /></td>
    ))}
  </tr>
);

// ── Items per page ──────────────────────────────────────────
const ITEMS_PER_PAGE = 50;

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

const MarketOverview = () => {
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: marketDataMap = {}, isLoading: marketLoading } = useAllTokenMarketData();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBlockchain, setSelectedBlockchain] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("market_cap");
  const [sortAsc, setSortAsc] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [showFilters, setShowFilters] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const isLoading = projectsLoading || marketLoading;

  const categories = useMemo(() => [...new Set(projects.map((p) => p.category))].sort(), [projects]);
  const blockchains = useMemo(() => [...new Set(projects.map((p) => p.blockchain))].sort(), [projects]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortAsc(!sortAsc);
    else { setSortBy(key); setSortAsc(key === "name"); }
  };

  // ── Derived data ────────────────────────────────────────
  const { totalMarketCap, projectsWithData, avgChange24h, topGainers, topLosers, lastUpdated } = useMemo(() => {
    const withData = projects
      .map((p) => ({ project: p, market: marketDataMap[p.id] }))
      .filter((x) => x.market && x.market.price_usd !== null);

    const total = withData.reduce((sum, x) => sum + (x.market.market_cap_usd || 0), 0);

    const withChange = withData.filter((x) => x.market.price_change_24h !== null);
    const avgChange = withChange.length > 0
      ? withChange.reduce((sum, x) => sum + (x.market.price_change_24h || 0), 0) / withChange.length
      : 0;

    const sorted = [...withChange].sort((a, b) => (b.market.price_change_24h || 0) - (a.market.price_change_24h || 0));
    const gainers = sorted.filter(x => (x.market.price_change_24h || 0) > 0).slice(0, 3);
    const losers = sorted.filter(x => (x.market.price_change_24h || 0) < 0).slice(-3).reverse();

    const latest = withData.reduce((max, x) => {
      const t = new Date(x.market.last_updated).getTime();
      return t > max ? t : max;
    }, 0);

    return {
      totalMarketCap: total,
      projectsWithData: withData,
      avgChange24h: avgChange,
      topGainers: gainers,
      topLosers: losers,
      lastUpdated: latest ? new Date(latest) : null,
    };
  }, [projects, marketDataMap]);

  const allSorted = useMemo(() => {
    let filtered = projects;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(q) || p.token.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.blockchain.toLowerCase().includes(q)
      );
    }
    if (selectedCategory) filtered = filtered.filter((p) => p.category === selectedCategory);
    if (selectedBlockchain) filtered = filtered.filter((p) => p.blockchain === selectedBlockchain);

    const mapped = filtered.map((p) => ({ project: p, market: marketDataMap[p.id] }));
    mapped.sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortBy) {
        case "price":
          aVal = a.market?.price_usd ?? -1; bVal = b.market?.price_usd ?? -1; break;
        case "change_24h":
          aVal = a.market?.price_change_24h ?? -Infinity; bVal = b.market?.price_change_24h ?? -Infinity; break;
        case "rating":
          aVal = a.project.avg_rating ?? 0; bVal = b.project.avg_rating ?? 0; break;
        case "name":
          return sortAsc ? a.project.name.localeCompare(b.project.name) : b.project.name.localeCompare(a.project.name);
        case "market_cap":
        default:
          aVal = a.market?.market_cap_usd ?? -1; bVal = b.market?.market_cap_usd ?? -1; break;
      }
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
    return mapped;
  }, [projects, marketDataMap, searchQuery, selectedCategory, selectedBlockchain, sortBy, sortAsc]);

  const visibleProjects = useMemo(() => allSorted.slice(0, visibleCount), [allSorted, visibleCount]);
  const hasMore = visibleCount < allSorted.length;

  // Reset pagination on filter change
  useEffect(() => { setVisibleCount(ITEMS_PER_PAGE); }, [searchQuery, selectedCategory, selectedBlockchain, sortBy, sortAsc]);

  // Infinite scroll
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore) setVisibleCount((prev) => prev + ITEMS_PER_PAGE); },
      { rootMargin: "300px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore]);

  const activeFilters = (selectedCategory ? 1 : 0) + (selectedBlockchain ? 1 : 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Hero Stats Banner ──────────────────────────────── */}
      <div className="relative pt-20 pb-0">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="gradient-radial-top absolute inset-0" />

        <div className="container relative mx-auto max-w-7xl px-4">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="pt-6 pb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                  DePIN Market Overview
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Live prices and market data for decentralized physical infrastructure
                </p>
              </div>
              {lastUpdated && (
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Updated {lastUpdated.toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>

            {/* ── Stat Pills ──────────────────────────────── */}
            <div className="mt-5 flex flex-wrap gap-3">
              <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm px-5 py-3 min-w-[180px]">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Market Cap</p>
                <p className="text-xl font-bold text-foreground mt-0.5 font-mono">{formatMarketCap(totalMarketCap)}</p>
              </div>
              <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm px-5 py-3 min-w-[140px]">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Projects</p>
                <p className="text-xl font-bold text-foreground mt-0.5">{projectsWithData.length}</p>
              </div>
              <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm px-5 py-3 min-w-[160px]">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Avg 24h Change</p>
                <div className="mt-0.5">
                  <ChangeBadge change={avgChange24h} size="md" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Main Content ──────────────────────────────────── */}
      <div className="container relative mx-auto max-w-7xl px-4 pb-20">

        {isLoading ? (
          <div className="mt-6 space-y-4">
            <div className="flex gap-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 flex-1 rounded-xl" />)}
            </div>
            <Skeleton className="h-[500px] rounded-xl" />
          </div>
        ) : (
          <>
            {/* ── Trending Section ──────────────────────── */}
            {(topGainers.length > 0 || topLosers.length > 0) && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-6 grid gap-4 lg:grid-cols-2">
                {/* Gainers */}
                {topGainers.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Flame className="h-4 w-4 text-green-500" />
                      <h2 className="text-sm font-semibold text-foreground">Top Gainers</h2>
                      <span className="text-[10px] text-muted-foreground">24h</span>
                    </div>
                    <div className="space-y-2">
                      {topGainers.map(({ project, market }, i) => (
                        <TrendingCard key={project.id} project={project} market={market} rank={i + 1} type="gainer" />
                      ))}
                    </div>
                  </div>
                )}
                {/* Losers */}
                {topLosers.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      <h2 className="text-sm font-semibold text-foreground">Top Losers</h2>
                      <span className="text-[10px] text-muted-foreground">24h</span>
                    </div>
                    <div className="space-y-2">
                      {topLosers.map(({ project, market }, i) => (
                        <TrendingCard key={project.id} project={project} market={market} rank={i + 1} type="loser" />
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Table Section ─────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="mt-8 rounded-xl border border-border bg-card overflow-hidden">

              {/* ── Search & Filter Bar (sticky) ─────────── */}
              <div className="sticky top-16 z-20 bg-card/95 backdrop-blur-md border-b border-border">
                <div className="flex items-center gap-2 px-4 py-3">
                  {/* Search */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Search projects..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 text-sm bg-secondary/50 border-border focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Filter Toggle */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-1.5 h-9 px-3 rounded-md text-sm border transition-colors ${
                      showFilters || activeFilters > 0
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Filter className="h-3.5 w-3.5" />
                    Filters
                    {activeFilters > 0 && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {activeFilters}
                      </span>
                    )}
                  </button>

                  {/* Results count */}
                  <span className="hidden sm:inline text-xs text-muted-foreground whitespace-nowrap">
                    {allSorted.length} project{allSorted.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* ── Expandable Filter Row ──────────────── */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-t border-border/50"
                    >
                      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                        <Select value={selectedCategory ?? "all"} onValueChange={(v) => setSelectedCategory(v === "all" ? null : v)}>
                          <SelectTrigger className="w-[150px] h-8 text-xs bg-secondary/50 focus:ring-0 focus:ring-offset-0">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent side="bottom" avoidCollisions={false}>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                          </SelectContent>
                        </Select>

                        <Select value={selectedBlockchain ?? "all"} onValueChange={(v) => setSelectedBlockchain(v === "all" ? null : v)}>
                          <SelectTrigger className="w-[150px] h-8 text-xs bg-secondary/50 focus:ring-0 focus:ring-offset-0">
                            <SelectValue placeholder="Blockchain" />
                          </SelectTrigger>
                          <SelectContent side="bottom" avoidCollisions={false}>
                            <SelectItem value="all">All Chains</SelectItem>
                            {blockchains.map((chain) => <SelectItem key={chain} value={chain}>{chain}</SelectItem>)}
                          </SelectContent>
                        </Select>

                        {(selectedCategory || selectedBlockchain) && (
                          <button
                            onClick={() => { setSelectedCategory(null); setSelectedBlockchain(null); }}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                          >
                            <X className="h-3 w-3" /> Clear
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Data Table ───────────────────────────── */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/20">
                      <th className="px-4 py-3.5 text-left text-[11px] font-medium text-muted-foreground w-12">#</th>
                      <SortHeader label="Name" sortKey="name" currentSort={sortBy} currentAsc={sortAsc} onSort={handleSort} align="left" />
                      <SortHeader label="Price" sortKey="price" currentSort={sortBy} currentAsc={sortAsc} onSort={handleSort} />
                      <SortHeader label="24h %" sortKey="change_24h" currentSort={sortBy} currentAsc={sortAsc} onSort={handleSort} />
                      <SortHeader label="Market Cap" sortKey="market_cap" currentSort={sortBy} currentAsc={sortAsc} onSort={handleSort} />
                      <th className="px-4 py-3.5 text-center text-[11px] font-medium text-muted-foreground whitespace-nowrap">7d Chart</th>
                      <th className="px-4 py-3.5 text-left text-[11px] font-medium text-muted-foreground">Category</th>
                      <th className="px-4 py-3.5 text-left text-[11px] font-medium text-muted-foreground">Chain</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleProjects.length === 0 && !isLoading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-16 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Search className="h-8 w-8 text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground">No projects match your search</p>
                            <button onClick={() => { setSearchQuery(""); setSelectedCategory(null); setSelectedBlockchain(null); }}
                              className="text-xs text-primary hover:underline">Clear all filters</button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      visibleProjects.map(({ project, market }, i) => (
                        <tr key={project.id}
                          className="border-b border-border/30 transition-colors hover:bg-secondary/20 group"
                        >
                          {/* Rank */}
                          <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{i + 1}</td>

                          {/* Name */}
                          <td className="px-4 py-3">
                            <Link to={`/project/${project.slug}`} className="flex items-center gap-3">
                              <ProjectLogo logoUrl={project.logo_url} logoEmoji={project.logo_emoji} name={project.name} size="sm" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">{project.name}</span>
                                  <ArrowUpRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                </div>
                                <span className="text-[11px] text-muted-foreground font-mono">{project.token}</span>
                              </div>
                            </Link>
                          </td>

                          {/* Price */}
                          <td className="px-4 py-3 text-right text-sm font-semibold text-foreground font-mono whitespace-nowrap">
                            {market ? formatPrice(market.price_usd) : <span className="text-muted-foreground">—</span>}
                          </td>

                          {/* 24h Change */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end">
                              <ChangeBadge change={market?.price_change_24h ?? null} />
                            </div>
                          </td>

                          {/* Market Cap */}
                          <td className="px-4 py-3 text-right text-sm text-foreground font-mono whitespace-nowrap">
                            {market ? formatMarketCap(market.market_cap_usd) : <span className="text-muted-foreground">—</span>}
                          </td>

                          {/* Sparkline */}
                          <td className="px-4 py-2">
                            <div className="flex justify-center">
                              <MiniSparkline data={market?.sparkline_7d ?? null} change={market?.price_change_24h ?? null} width={100} height={32} />
                            </div>
                          </td>

                          {/* Category */}
                          <td className="px-4 py-3">
                            <span className="rounded-md bg-secondary/80 px-2 py-0.5 text-[11px] text-secondary-foreground whitespace-nowrap">
                              {project.category}
                            </span>
                          </td>

                          {/* Chain */}
                          <td className="px-4 py-3">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{project.blockchain}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* ── Load More Sentinel ────────────────────── */}
              {hasMore && (
                <div ref={loadMoreRef} className="flex items-center justify-center py-6 border-t border-border/30">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Loading more projects...
                  </div>
                </div>
              )}

              {!hasMore && allSorted.length > 0 && (
                <div className="py-4 text-center text-xs text-muted-foreground border-t border-border/30">
                  Showing all {allSorted.length} projects
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default MarketOverview;

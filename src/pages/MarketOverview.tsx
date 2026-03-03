import { useState, useMemo } from "react";
import { Search, ChevronUp, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, BarChart3 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProjectLogo from "@/components/ProjectLogo";
import { useProjects } from "@/hooks/useProjects";
import { useAllTokenMarketData, type TokenMarketData } from "@/hooks/useTokenMarketData";

function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return "—";
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

function formatMarketCap(cap: number | null): string {
  if (cap === null || cap === undefined) return "—";
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(1)}M`;
  if (cap >= 1e3) return `$${(cap / 1e3).toFixed(0)}K`;
  return `$${cap.toFixed(0)}`;
}

const ChangeIndicator = ({ change }: { change: number | null }) => {
  if (change === null || change === undefined) return <span className="text-muted-foreground">—</span>;
  const isPositive = change > 0;
  const isNegative = change < 0;
  return (
    <span className={`flex items-center gap-0.5 font-semibold ${isPositive ? "text-green-500" : isNegative ? "text-red-500" : "text-muted-foreground"}`}>
      {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : isNegative ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
      {Math.abs(change).toFixed(2)}%
    </span>
  );
};

const MiniSparkline = ({ data, change }: { data: number[] | null; change: number | null }) => {
  if (!data || data.length < 2) return <span className="text-muted-foreground text-xs">—</span>;

  // Downsample to ~24 points for a clean mini chart
  const step = Math.max(1, Math.floor(data.length / 24));
  const points = data.filter((_, i) => i % step === 0 || i === data.length - 1);

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 80;
  const h = 28;

  const pathData = points
    .map((val, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((val - min) / range) * (h - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const isPositive = change !== null ? change >= 0 : points[points.length - 1] >= points[0];
  const strokeColor = isPositive ? "rgb(34,197,94)" : "rgb(239,68,68)";

  return (
    <svg width={w} height={h} className="inline-block">
      <path d={pathData} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

type SortOption = "market_cap" | "price" | "change_24h" | "name";

const sortLabels: Record<SortOption, string> = {
  market_cap: "Market Cap",
  price: "Price",
  change_24h: "24h Change",
  name: "Name",
};

const MarketOverview = () => {
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: marketDataMap = {}, isLoading: marketLoading } = useAllTokenMarketData();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBlockchain, setSelectedBlockchain] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("market_cap");
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedGainers, setExpandedGainers] = useState(false);
  const [expandedLosers, setExpandedLosers] = useState(false);

  const isLoading = projectsLoading || marketLoading;

  const categories = useMemo(() => [...new Set(projects.map((p) => p.category))].sort(), [projects]);
  const blockchains = useMemo(() => [...new Set(projects.map((p) => p.blockchain))].sort(), [projects]);

  const { totalMarketCap, projectsWithData, topGainers, topLosers, lastUpdated } = useMemo(() => {
    const withData = projects
      .map((p) => ({ project: p, market: marketDataMap[p.id] }))
      .filter((x) => x.market && x.market.price_usd !== null);

    const total = withData.reduce((sum, x) => sum + (x.market.market_cap_usd || 0), 0);

    const withChange = withData.filter((x) => x.market.price_change_24h !== null);
    const sorted = [...withChange].sort((a, b) => (b.market.price_change_24h || 0) - (a.market.price_change_24h || 0));

    const gainers = sorted.slice(0, 5);
    const losers = sorted.slice(-5).reverse();

    const latest = withData.reduce((max, x) => {
      const t = new Date(x.market.last_updated).getTime();
      return t > max ? t : max;
    }, 0);

    return {
      totalMarketCap: total,
      projectsWithData: withData,
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

    const sorted = filtered
      .map((p) => ({ project: p, market: marketDataMap[p.id] }));

    sorted.sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortBy) {
        case "price":
          aVal = a.market?.price_usd ?? -1;
          bVal = b.market?.price_usd ?? -1;
          break;
        case "change_24h":
          aVal = a.market?.price_change_24h ?? -Infinity;
          bVal = b.market?.price_change_24h ?? -Infinity;
          break;
        case "name":
          return sortAsc
            ? a.project.name.localeCompare(b.project.name)
            : b.project.name.localeCompare(a.project.name);
        case "market_cap":
        default:
          aVal = a.market?.market_cap_usd ?? -1;
          bVal = b.market?.market_cap_usd ?? -1;
          break;
      }
      return sortAsc ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  }, [projects, marketDataMap, searchQuery, selectedCategory, selectedBlockchain, sortBy, sortAsc]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="relative pt-24 pb-20">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="gradient-radial-top absolute inset-0" />

        <div className="container relative mx-auto max-w-6xl px-4">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Market Overview</h1>
            </div>
            <p className="text-muted-foreground">
              Live token prices and market data for all listed DePIN projects
            </p>
            {lastUpdated && (
              <p className="mt-1 text-xs text-muted-foreground/60">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </motion.div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl border border-border bg-card" />
              ))}
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="mb-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-card p-5">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Total Market Cap</p>
                  <p className="text-2xl font-bold text-foreground">{formatMarketCap(totalMarketCap)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{projectsWithData.length} projects tracked</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-5">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Top Gainer (24h)</p>
                  {topGainers[0] ? (
                    <>
                      <div className="flex items-center gap-2">
                        <ProjectLogo logoUrl={topGainers[0].project.logo_url} logoEmoji={topGainers[0].project.logo_emoji} name={topGainers[0].project.name} size="sm" />
                        <div>
                          <p className="font-semibold text-foreground">{topGainers[0].project.name}</p>
                          <ChangeIndicator change={topGainers[0].market.price_change_24h} />
                        </div>
                      </div>
                    </>
                  ) : <p className="text-muted-foreground">—</p>}
                </div>
                <div className="rounded-xl border border-border bg-card p-5">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Top Loser (24h)</p>
                  {topLosers[0] ? (
                    <>
                      <div className="flex items-center gap-2">
                        <ProjectLogo logoUrl={topLosers[0].project.logo_url} logoEmoji={topLosers[0].project.logo_emoji} name={topLosers[0].project.name} size="sm" />
                        <div>
                          <p className="font-semibold text-foreground">{topLosers[0].project.name}</p>
                          <ChangeIndicator change={topLosers[0].market.price_change_24h} />
                        </div>
                      </div>
                    </>
                  ) : <p className="text-muted-foreground">—</p>}
                </div>
              </motion.div>

              {/* Top Gainers & Losers */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="mb-8 grid gap-4 md:grid-cols-2">
                {/* Gainers */}
                <div className="rounded-xl border border-border bg-card p-4">
                  <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
                    <TrendingUp className="h-3.5 w-3.5 text-green-500" /> Top Gainers (24h)
                  </h2>
                  <div className="space-y-1">
                    {(expandedGainers ? topGainers : topGainers.slice(0, 3)).map(({ project, market }, i) => (
                      <Link key={project.id} to={`/project/${project.slug}`}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-secondary/50">
                        <span className="w-5 text-xs font-medium text-muted-foreground">{i + 1}</span>
                        <ProjectLogo logoUrl={project.logo_url} logoEmoji={project.logo_emoji} name={project.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
                          <p className="text-xs text-muted-foreground">{project.token}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">{formatPrice(market.price_usd)}</p>
                          <ChangeIndicator change={market.price_change_24h} />
                        </div>
                      </Link>
                    ))}
                  </div>
                  {topGainers.length > 3 && (
                    <button
                      onClick={() => setExpandedGainers(!expandedGainers)}
                      className="mt-2 flex w-full items-center justify-center gap-1 rounded-md py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {expandedGainers ? "Show less" : `Show all ${topGainers.length}`}
                      {expandedGainers ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  )}
                </div>

                {/* Losers */}
                <div className="rounded-xl border border-border bg-card p-4">
                  <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
                    <TrendingDown className="h-3.5 w-3.5 text-red-500" /> Top Losers (24h)
                  </h2>
                  <div className="space-y-1">
                    {(expandedLosers ? topLosers : topLosers.slice(0, 3)).map(({ project, market }, i) => (
                      <Link key={project.id} to={`/project/${project.slug}`}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-secondary/50">
                        <span className="w-5 text-xs font-medium text-muted-foreground">{i + 1}</span>
                        <ProjectLogo logoUrl={project.logo_url} logoEmoji={project.logo_emoji} name={project.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
                          <p className="text-xs text-muted-foreground">{project.token}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">{formatPrice(market.price_usd)}</p>
                          <ChangeIndicator change={market.price_change_24h} />
                        </div>
                      </Link>
                    ))}
                  </div>
                  {topLosers.length > 3 && (
                    <button
                      onClick={() => setExpandedLosers(!expandedLosers)}
                      className="mt-2 flex w-full items-center justify-center gap-1 rounded-md py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {expandedLosers ? "Show less" : `Show all ${topLosers.length}`}
                      {expandedLosers ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  )}
                </div>
              </motion.div>

              {/* Full Project Table */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="p-5 border-b border-border space-y-3">
                   <div className="flex items-center justify-between flex-wrap gap-2">
                     <div>
                       <h2 className="text-sm font-semibold text-foreground">All Projects</h2>
                       <p className="text-xs text-muted-foreground mt-0.5">{allSorted.length} of {projects.length} projects</p>
                     </div>
                   </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, token, category..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-8 text-xs"
                      />
                    </div>
                    <Select value={selectedCategory ?? "all"} onValueChange={(v) => setSelectedCategory(v === "all" ? null : v)}>
                      <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedBlockchain ?? "all"} onValueChange={(v) => setSelectedBlockchain(v === "all" ? null : v)}>
                      <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue placeholder="Blockchain" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Chains</SelectItem>
                        {blockchains.map((chain) => (
                          <SelectItem key={chain} value={chain}>{chain}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={`${sortBy}-${sortAsc ? "asc" : "desc"}`} onValueChange={(v) => {
                      const [key, dir] = v.split("-") as [SortOption, string];
                      setSortBy(key);
                      setSortAsc(dir === "asc");
                    }}>
                      <SelectTrigger className="w-[180px] h-8 text-xs">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(sortLabels) as SortOption[]).flatMap((key) => [
                          <SelectItem key={`${key}-desc`} value={`${key}-desc`}>{sortLabels[key]} ↓</SelectItem>,
                          <SelectItem key={`${key}-asc`} value={`${key}-asc`}>{sortLabels[key]} ↑</SelectItem>,
                        ])}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30">
                         <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">#</th>
                         <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                           onClick={() => { if (sortBy === "name") setSortAsc(!sortAsc); else { setSortBy("name"); setSortAsc(true); } }}>
                           <span className="flex items-center gap-1">Project {sortBy === "name" && (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</span>
                         </th>
                         <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                           onClick={() => { if (sortBy === "price") setSortAsc(!sortAsc); else { setSortBy("price"); setSortAsc(false); } }}>
                           <span className="flex items-center justify-end gap-1">Price {sortBy === "price" && (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</span>
                         </th>
                         <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                           onClick={() => { if (sortBy === "change_24h") setSortAsc(!sortAsc); else { setSortBy("change_24h"); setSortAsc(false); } }}>
                           <span className="flex items-center justify-end gap-1">24h Change {sortBy === "change_24h" && (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</span>
                         </th>
                         <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                           onClick={() => { if (sortBy === "market_cap") setSortAsc(!sortAsc); else { setSortBy("market_cap"); setSortAsc(false); } }}>
                           <span className="flex items-center justify-end gap-1">Market Cap {sortBy === "market_cap" && (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</span>
                         </th>
                         <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">7d Trend</th>
                         <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Category</th>
                         <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                         <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Source</th>
                       </tr>
                    </thead>
                    <tbody>
                      {allSorted.map(({ project, market }, i) => (
                        <tr key={project.id} className="border-b border-border/50 transition-colors hover:bg-secondary/20">
                          <td className="px-4 py-3 text-xs text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-3">
                            <Link to={`/project/${project.slug}`} className="flex items-center gap-3 group">
                              <ProjectLogo logoUrl={project.logo_url} logoEmoji={project.logo_emoji} name={project.name} size="sm" />
                              <div>
                                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{project.name}</p>
                                <p className="text-xs text-muted-foreground">{project.token}</p>
                              </div>
                              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-foreground">
                            {market ? formatPrice(market.price_usd) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            {market ? <div className="flex justify-end"><ChangeIndicator change={market.price_change_24h} /></div> : "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-foreground">
                            {market ? formatMarketCap(market.market_cap_usd) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <MiniSparkline data={market?.sparkline_7d ?? null} change={market?.price_change_24h ?? null} />
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                              {project.category}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${
                              project.status === "live" ? "bg-green-500/10 text-green-500 border-green-500/30" :
                              project.status === "testnet" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" :
                              "bg-muted text-muted-foreground border-border"
                            }`}>
                              {project.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {market?.data_source ? (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                market.data_source === "coingecko" ? "bg-green-500/15 text-green-500" : "bg-yellow-500/15 text-yellow-400"
                              }`}>
                                {market.data_source === "coingecko" ? "Live" : "Cached"}
                              </span>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default MarketOverview;

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
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

const MarketOverview = () => {
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: marketDataMap = {}, isLoading: marketLoading } = useAllTokenMarketData();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBlockchain, setSelectedBlockchain] = useState<string | null>(null);

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

    return filtered
      .map((p) => ({ project: p, market: marketDataMap[p.id] }))
      .sort((a, b) => (b.market?.market_cap_usd || 0) - (a.market?.market_cap_usd || 0));
  }, [projects, marketDataMap, searchQuery, selectedCategory, selectedBlockchain]);

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
                <div className="rounded-xl border border-border bg-card p-5">
                  <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <TrendingUp className="h-4 w-4 text-green-500" /> Top Gainers (24h)
                  </h2>
                  <div className="space-y-3">
                    {topGainers.map(({ project, market }, i) => (
                      <Link key={project.id} to={`/project/${project.slug}`}
                        className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary/50">
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
                </div>

                {/* Losers */}
                <div className="rounded-xl border border-border bg-card p-5">
                  <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <TrendingDown className="h-4 w-4 text-red-500" /> Top Losers (24h)
                  </h2>
                  <div className="space-y-3">
                    {topLosers.map(({ project, market }, i) => (
                      <Link key={project.id} to={`/project/${project.slug}`}
                        className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary/50">
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
                </div>
              </motion.div>

              {/* Full Project Table */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="p-5 border-b border-border space-y-3">
                  <div className="flex items-center justify-between">
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
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                          !selectedCategory ? "border border-primary/50 bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        All Categories
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                            selectedCategory === cat ? "border border-primary/50 bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => setSelectedBlockchain(null)}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                          !selectedBlockchain ? "border border-primary/50 bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        All Chains
                      </button>
                      {blockchains.map((chain) => (
                        <button
                          key={chain}
                          onClick={() => setSelectedBlockchain(selectedBlockchain === chain ? null : chain)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                            selectedBlockchain === chain ? "border border-primary/50 bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {chain}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30">
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Project</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Price</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">24h Change</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Market Cap</th>
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

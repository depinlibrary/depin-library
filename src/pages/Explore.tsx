import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowDownAZ, ArrowUpDown, Star, Clock, Bookmark, SlidersHorizontal, X, LayoutGrid, List, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import ProjectCard from "@/components/ProjectCard";
import Footer from "@/components/Footer";
import ProjectLogo from "@/components/ProjectLogo";
import { useProjects, type Project } from "@/hooks/useProjects";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useAllTokenMarketData } from "@/hooks/useTokenMarketData";
import { useAuth } from "@/contexts/AuthContext";
import { useDynamicOptions } from "@/hooks/useDynamicOptions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router-dom";

type SortOption = "name" | "rating" | "newest" | "bookmarked";
type ViewMode = "grid" | "list";

const ITEMS_PER_PAGE = 12;

const sortLabels: Record<SortOption, { label: string; icon: typeof ArrowDownAZ }> = {
  name: { label: "A–Z", icon: ArrowDownAZ },
  rating: { label: "Top Rated", icon: Star },
  newest: { label: "Newest", icon: Clock },
  bookmarked: { label: "Bookmarked", icon: Bookmark },
};



const statusColors: Record<string, string> = {
  live: "bg-neon-green/15 text-neon-green border-neon-green/30",
  testnet: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  development: "bg-muted text-muted-foreground border-border",
};

const Explore = () => {
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get("category");
  const sortParam = searchParams.get("sort");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBlockchain, setSelectedBlockchain] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { categories: dbCategories, blockchains: dbBlockchains } = useDynamicOptions();

  useEffect(() => {
    if (categoryParam && dbCategories.includes(categoryParam)) {
      setSelectedCategory(categoryParam);
    }
    if (sortParam === "newest" || sortParam === "rating") {
      setSortBy(sortParam as SortOption);
    }
  }, [categoryParam, sortParam, dbCategories]);

  // Reset visible count when filters/sort change
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchQuery, selectedCategory, selectedBlockchain, sortBy]);

  const { data: projects = [], isLoading } = useProjects();
  const { user } = useAuth();
  const { data: bookmarks = [] } = useBookmarks();
  const { data: marketDataMap = {} } = useAllTokenMarketData();

  const filteredProjects = useMemo(() => {
    let results = projects;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.tagline.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.blockchain.toLowerCase().includes(q) ||
          p.token.toLowerCase().includes(q)
      );
    }
    if (selectedCategory) {
      results = results.filter((p) => p.category === selectedCategory);
    }
    if (selectedBlockchain) {
      results = results.filter((p) => p.blockchain === selectedBlockchain);
    }

    // Filter based on sort mode
    if (sortBy === "rating") {
      results = results.filter((p) => p.avg_rating && p.avg_rating > 0);
    }
    if (sortBy === "newest") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      results = results.filter((p) => new Date(p.created_at) >= thirtyDaysAgo);
    }
    if (sortBy === "bookmarked") {
      results = results.filter((p) => bookmarks.includes(p.id));
    }

    const sorted = [...results];
    switch (sortBy) {
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "rating":
        sorted.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
        break;
      case "newest":
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "bookmarked":
        sorted.sort((a, b) => {
          const aB = bookmarks.includes(a.id) ? 1 : 0;
          const bB = bookmarks.includes(b.id) ? 1 : 0;
          return bB - aB;
        });
        break;
    }
    return sorted;
  }, [projects, searchQuery, selectedCategory, selectedBlockchain, sortBy, bookmarks]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [projects]);

  const blockchainCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach((p) => {
      counts[p.blockchain] = (counts[p.blockchain] || 0) + 1;
    });
    return counts;
  }, [projects]);

  const visibleProjects = useMemo(
    () => filteredProjects.slice(0, visibleCount),
    [filteredProjects, visibleCount]
  );
  const hasMore = visibleCount < filteredProjects.length;

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore]);

  const availableSorts: SortOption[] = user
    ? ["name", "rating", "newest", "bookmarked"]
    : ["name", "rating", "newest"];

  const hasActiveFilters = selectedCategory || selectedBlockchain || searchQuery;

  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedBlockchain(null);
    setSearchQuery("");
    setSortBy("name");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Compact Hero with Search */}
      <section className="relative pt-28 pb-8">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="gradient-radial-top absolute inset-0" />
        <div className="container relative mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Explore <span className="text-glow text-primary">DePIN</span> Projects
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
              Browse {projects.length} projects across {new Set(projects.map(p => p.category)).size} categories and {new Set(projects.map(p => p.blockchain)).size} blockchains
            </p>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mx-auto mt-6 max-w-2xl"
          >
            <div className="group relative">
              <Search className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, token, blockchain..."
                className="h-12 w-full rounded-xl border border-border bg-card/80 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground backdrop-blur-sm transition-all focus:border-border focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Filters & Controls Bar */}
      <section className="sticky top-16 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 pb-0.5">
            {/* Filter icon */}
            <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
              <SlidersHorizontal className="h-4 w-4" />
              <span className="text-xs font-medium hidden sm:inline">Filters</span>
            </div>

            {/* Category Dropdown */}
            <Select
              value={selectedCategory || "all"}
              onValueChange={(v) => setSelectedCategory(v === "all" ? null : v)}
            >
              <SelectTrigger className="h-8 w-[120px] sm:w-[150px] text-xs border-border bg-card/60 focus:border-border focus:shadow-none [&]:focus-within:border-border [&]:focus-within:shadow-none shrink-0">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {dbCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat} ({categoryCounts[cat] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Blockchain Dropdown */}
            <Select
              value={selectedBlockchain || "all"}
              onValueChange={(v) => setSelectedBlockchain(v === "all" ? null : v)}
            >
              <SelectTrigger className="h-8 w-[120px] sm:w-[150px] text-xs border-border bg-card/60 focus:border-border focus:shadow-none [&]:focus-within:border-border [&]:focus-within:shadow-none shrink-0">
                <SelectValue placeholder="All Blockchains" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Blockchains</SelectItem>
                {dbBlockchains.map((blockchain) => (
                  <SelectItem key={blockchain} value={blockchain}>
                    {blockchain} ({blockchainCounts[blockchain] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Active filter chips */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-[11px] font-medium text-destructive transition-colors hover:bg-destructive/20 shrink-0"
              >
                <X className="h-3 w-3" />
                Clear all
              </button>
            )}

            {/* Spacer */}
            <div className="ml-auto flex items-center gap-2 shrink-0">
              {/* Sort controls - Mobile: dropdown */}
              <div className="sm:hidden">
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="h-8 w-[110px] text-xs border-border bg-card/60 shrink-0">
                    <ArrowUpDown className="h-3 w-3 mr-1 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" sideOffset={4}>
                    {availableSorts.map((option) => (
                      <SelectItem key={option} value={option}>
                        {sortLabels[option].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort controls - Desktop/Tablet: buttons */}
              <div className="hidden sm:flex items-center gap-1">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                {availableSorts.map((option) => {
                  const { label, icon: Icon } = sortLabels[option];
                  return (
                    <button
                      key={option}
                      onClick={() => setSortBy(option)}
                      className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all whitespace-nowrap ${
                         sortBy === option
                          ? "border border-border bg-secondary text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>

              {/* View toggle */}
              <div className="hidden sm:flex items-center rounded-lg border border-border bg-card/60 p-0.5">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`rounded-md p-1.5 transition-colors ${viewMode === "grid" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`rounded-md p-1.5 transition-colors ${viewMode === "list" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="container mx-auto px-4 py-8 pb-20">
        {/* Results count */}
        <div className="mb-5 flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{visibleProjects.length}</span> of <span className="font-semibold text-foreground">{filteredProjects.length}</span> project{filteredProjects.length !== 1 ? "s" : ""}
            {selectedCategory && (
              <span> in <span className="text-foreground">{selectedCategory}</span></span>
            )}
            {selectedBlockchain && (
              <span> on <span className="text-foreground">{selectedBlockchain}</span></span>
            )}
            {searchQuery && (
              <span> matching "<span className="text-foreground">{searchQuery}</span>"</span>
            )}
          </p>
        </div>

        {isLoading ? (
          <div className={`grid gap-4 ${viewMode === "grid" ? "sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className={`animate-pulse rounded-xl border border-border bg-card ${viewMode === "grid" ? "h-44" : "h-20"}`}
              />
            ))}
          </div>
        ) : filteredProjects.length > 0 ? (
          <>
            {viewMode === "grid" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {visibleProjects.map((project, i) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      index={i % ITEMS_PER_PAGE}
                      marketData={marketDataMap[project.id]}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <AnimatePresence mode="popLayout">
                  {visibleProjects.map((project, i) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.25, delay: (i % ITEMS_PER_PAGE) * 0.02 }}
                    >
                      <Link
                        to={`/project/${project.slug}`}
                        className="group flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-3.5 transition-all hover:border-border hover:bg-card/80"
                      >
                        <ProjectLogo
                          logoUrl={project.logo_url}
                          logoEmoji={project.logo_emoji}
                          name={project.name}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-foreground group-hover:text-foreground transition-colors truncate">
                              {project.name}
                            </h3>
                            <span className="text-xs text-muted-foreground">{project.token}</span>
                            {project.avg_rating && (
                              <span className="flex items-center gap-0.5 text-xs text-primary">
                                <Star className="h-3 w-3 fill-primary" />
                                {project.avg_rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground truncate">
                            {project.tagline}
                          </p>
                        </div>
                        <div className="hidden sm:flex items-center gap-2">
                          <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                            {project.category}
                          </span>
                          <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                            {project.blockchain}
                          </span>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Infinite scroll sentinel */}
            <div ref={loadMoreRef} className="flex justify-center py-8">
              {hasMore && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Loading more projects…
                </div>
              )}
            </div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center"
          >
            <Search className="h-10 w-10 text-muted-foreground/40 mb-4" />
            <p className="font-medium text-foreground">No projects found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your search or filters
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
              >
                Clear all filters
              </button>
            )}
          </motion.div>
        )}
      </section>

      <Footer />
    </div>
  );
};

export default Explore;

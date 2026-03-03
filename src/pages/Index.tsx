import { useState, useMemo } from "react";
import { ArrowDownAZ, ArrowUpDown, Star, Clock, Bookmark } from "lucide-react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import TrendingSection from "@/components/TrendingSection";
import CategoryFilter from "@/components/CategoryFilter";
import ProjectCard from "@/components/ProjectCard";
import Footer from "@/components/Footer";
import { useProjects, type Project } from "@/hooks/useProjects";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useAllTokenMarketData } from "@/hooks/useTokenMarketData";
import { useAuth } from "@/contexts/AuthContext";
import type { Category } from "@/data/projects";

type SortOption = "name" | "rating" | "newest" | "bookmarked";

const sortLabels: Record<SortOption, {label: string;icon: typeof ArrowDownAZ;}> = {
  name: { label: "A–Z", icon: ArrowDownAZ },
  rating: { label: "Top Rated", icon: Star },
  newest: { label: "Newest", icon: Clock },
  bookmarked: { label: "Bookmarked", icon: Bookmark }
};

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedBlockchain, setSelectedBlockchain] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("name");
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

    // Sort
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
    const base = searchQuery ?
    projects.filter((p) => {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.tagline.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.blockchain.toLowerCase().includes(q);
    }) :
    projects;
    const counts: Record<string, number> = {};
    base.forEach((p) => {counts[p.category] = (counts[p.category] || 0) + 1;});
    return counts;
  }, [projects, searchQuery]);

  const availableSorts: SortOption[] = user ?
  ["name", "rating", "newest", "bookmarked"] :
  ["name", "rating", "newest"];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalProjects={projects.length} />
      
      <TrendingSection projects={projects} />
      <CategoryFilter
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedBlockchain={selectedBlockchain}
        onSelectBlockchain={setSelectedBlockchain}
        categoryCounts={categoryCounts}
        projects={projects} />
      

      <section className="container mx-auto px-4 pb-20">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-muted-foreground">
            {filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""}
            {selectedCategory ? ` in ${selectedCategory}` : ""}
            {searchQuery ? ` matching "${searchQuery}"` : ""}
          </p>

          {/* Sort controls */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            {availableSorts.map((option) => {
              const { label, icon: Icon } = sortLabels[option];
              return (
                <button
                  key={option}
                  onClick={() => setSortBy(option)}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  sortBy === option ?
                  "border border-primary/50 bg-primary/10 text-primary" :
                  "text-muted-foreground hover:text-foreground"}`
                  }>
                  
                  <Icon className="h-3 w-3" />
                  {label}
                </button>);

            })}
          </div>
        </div>

        {isLoading ?
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) =>
          <div key={i} className="h-40 animate-pulse rounded-xl border border-border bg-card" />
          )}
          </div> :
        filteredProjects.length > 0 ?
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project, i) =>
          <ProjectCard key={project.id} project={project} index={i} marketData={marketDataMap[project.id]} />
          )}
          </div> :

        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center">
            
            <p className="font-medium text-foreground">No projects found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        }
      </section>

      <Footer />
    </div>);

};

export default Index;
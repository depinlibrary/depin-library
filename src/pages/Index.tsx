import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import StatsBar from "@/components/StatsBar";
import CategoryFilter from "@/components/CategoryFilter";
import ProjectCard from "@/components/ProjectCard";
import Footer from "@/components/Footer";
import { useProjects } from "@/hooks/useProjects";
import type { Category } from "@/data/projects";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const { data: projects = [], isLoading } = useProjects();

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
    return results;
  }, [projects, searchQuery, selectedCategory]);

  const categoryCounts = useMemo(() => {
    const base = searchQuery
      ? projects.filter((p) => {
          const q = searchQuery.toLowerCase();
          return p.name.toLowerCase().includes(q) || p.tagline.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.blockchain.toLowerCase().includes(q);
        })
      : projects;
    const counts: Record<string, number> = {};
    base.forEach((p) => { counts[p.category] = (counts[p.category] || 0) + 1; });
    return counts;
  }, [projects, searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalProjects={projects.length}
      />
      <StatsBar projects={projects} />
      <CategoryFilter
        selected={selectedCategory}
        onSelect={setSelectedCategory}
        categoryCounts={categoryCounts}
      />

      <section className="container mx-auto px-4 pb-20">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""}
            {selectedCategory ? ` in ${selectedCategory}` : ""}
            {searchQuery ? ` matching "${searchQuery}"` : ""}
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl border border-border bg-card" />
            ))}
          </div>
        ) : filteredProjects.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project, i) => (
              <ProjectCard key={project.id} project={project} index={i} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center">
            <span className="mb-3 text-4xl">🔍</span>
            <p className="font-medium text-foreground">No projects found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
};

export default Index;

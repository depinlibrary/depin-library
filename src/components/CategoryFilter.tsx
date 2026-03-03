import { CATEGORIES, BLOCKCHAINS, type Category } from "@/data/projects";
import type { Project } from "@/hooks/useProjects";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CategoryFilterProps {
  selectedCategory: Category | null;
  onSelectCategory: (category: Category | null) => void;
  selectedBlockchain: string | null;
  onSelectBlockchain: (blockchain: string | null) => void;
  categoryCounts: Record<string, number>;
  projects: Project[];
}

const CategoryFilter = ({
  selectedCategory,
  onSelectCategory,
  selectedBlockchain,
  onSelectBlockchain,
  categoryCounts,
  projects,
}: CategoryFilterProps) => {
  const blockchainCounts: Record<string, number> = {};
  projects.forEach((p) => {
    blockchainCounts[p.blockchain] = (blockchainCounts[p.blockchain] || 0) + 1;
  });

  return (
    <section id="categories" className="container mx-auto px-4 pb-8">
      <div className="flex flex-wrap justify-center gap-3">
        {/* Category Dropdown */}
        <Select
          value={selectedCategory ?? "all"}
          onValueChange={(v) => onSelectCategory(v === "all" ? null : (v as Category))}
        >
          <SelectTrigger className="w-[200px] border-border bg-card text-foreground">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.name} value={cat.name}>
                <span className="flex items-center gap-2">
                  <span>{cat.emoji}</span>
                  <span>{cat.name}</span>
                  {categoryCounts[cat.name] > 0 && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      ({categoryCounts[cat.name]})
                    </span>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Blockchain Dropdown */}
        <Select
          value={selectedBlockchain ?? "all"}
          onValueChange={(v) => onSelectBlockchain(v === "all" ? null : v)}
        >
          <SelectTrigger className="w-[200px] border-border bg-card text-foreground">
            <SelectValue placeholder="All Blockchains" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Blockchains</SelectItem>
            {BLOCKCHAINS.map((chain) => (
              <SelectItem key={chain} value={chain}>
                <span className="flex items-center gap-2">
                  <span>{chain}</span>
                  {blockchainCounts[chain] > 0 && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      ({blockchainCounts[chain]})
                    </span>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </section>
  );
};

export default CategoryFilter;

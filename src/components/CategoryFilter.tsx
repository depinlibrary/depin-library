import { motion } from "framer-motion";
import { CATEGORIES, type Category } from "@/data/projects";

interface CategoryFilterProps {
  selected: Category | null;
  onSelect: (category: Category | null) => void;
  categoryCounts: Record<string, number>;
}

const CategoryFilter = ({ selected, onSelect, categoryCounts }: CategoryFilterProps) => {
  return (
    <section id="categories" className="container mx-auto px-4 pb-8">
      <div className="flex flex-wrap justify-center gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(null)}
          className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
            selected === null
              ? "border-primary/50 bg-primary/10 text-primary glow-primary-sm"
              : "border-border bg-card text-muted-foreground hover:border-border hover:text-foreground"
          }`}
        >
          All
        </motion.button>

        {CATEGORIES.map((cat) => (
          <motion.button
            key={cat.name}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(cat.name)}
            className={`flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
              selected === cat.name
                ? "border-primary/50 bg-primary/10 text-primary glow-primary-sm"
                : "border-border bg-card text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            <span>{cat.emoji}</span>
            <span>{cat.name}</span>
            {categoryCounts[cat.name] > 0 && (
              <span className="ml-1 text-xs text-text-dim">
                {categoryCounts[cat.name]}
              </span>
            )}
          </motion.button>
        ))}
      </div>
    </section>
  );
};

export default CategoryFilter;

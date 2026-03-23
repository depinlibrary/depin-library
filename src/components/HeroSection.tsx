import { motion } from "framer-motion";
import { Search } from "lucide-react";

interface HeroSectionProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalProjects: number;
}

const HeroSection = ({ searchQuery, onSearchChange, totalProjects }: HeroSectionProps) => {
  return (
    <section className="relative overflow-hidden pt-32 pb-20">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="gradient-radial-top absolute inset-0" />
      
      <div className="container relative mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5">
            <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-primary" />
            <span className="text-xs font-medium text-muted-foreground">
              DePIN Indexed
            </span>
          </div>

          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Discover the{" "}
            <span className="text-glow text-primary">DePIN</span>{" "}
            Ecosystem
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            The central hub to explore, compare, and understand Decentralized Physical Infrastructure Networks — all in one place.
          </p>
        </motion.div>

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mx-auto mt-10 max-w-xl"
        >
          <div className="group relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search projects, blockchains, categories..."
              className="h-13 w-full rounded-xl border border-border bg-card/80 py-3.5 pl-12 pr-4 text-sm text-foreground placeholder:text-muted-foreground backdrop-blur-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 glass-3d"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Layers, BarChart3, GitCompare, Briefcase } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useProjects } from "@/hooks/useProjects";
import { CATEGORIES, BLOCKCHAINS } from "@/data/projects";

const Overview = () => {
  const { data: projects = [] } = useProjects();

  const liveCount = projects.filter((p) => p.status === "live").length;
  const blockchainCount = new Set(projects.map((p) => p.blockchain)).size;
  const categoryCount = new Set(projects.map((p) => p.category)).size;

  const stats = [
    { label: "Total Projects", value: projects.length },
    { label: "Live Networks", value: liveCount },
    { label: "Categories", value: categoryCount },
    { label: "Blockchains", value: blockchainCount },
  ];

  const quickLinks = [
    {
      title: "Explore Projects",
      description: "Browse, search, and filter the full DePIN project directory.",
      icon: Layers,
      to: "/explore",
    },
    {
      title: "Market Overview",
      description: "Track token prices, market caps, and 24h trends across the ecosystem.",
      icon: BarChart3,
      to: "/market",
    },
    {
      title: "Compare Projects",
      description: "Side-by-side AI-powered comparison of any two DePIN projects.",
      icon: GitCompare,
      to: "/compare",
    },
    {
      title: "Portfolio",
      description: "Track your DePIN holdings, allocation, and performance over time.",
      icon: Briefcase,
      to: "/portfolio",
    },
  ];

  const topCategories = CATEGORIES.slice(0, 6).map((cat) => ({
    ...cat,
    count: projects.filter((p) => p.category === cat.name).length,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="gradient-radial-top absolute inset-0" />

        <div className="container relative mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5">
              <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-primary" />
              <span className="text-xs font-medium text-muted-foreground">
                DePIN Indexed
              </span>
            </div>

            <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl">
              The{" "}
              <span className="text-glow text-primary">DePIN</span>{" "}
              Ecosystem at a Glance
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Your central hub to explore, compare, and understand Decentralized
              Physical Infrastructure Networks — all in one place.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-8"
            >
              <Link
                to="/explore"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Explore Projects
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="container mx-auto px-4 pb-16">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="rounded-xl border border-border bg-card p-5 text-center"
            >
              <p className="text-3xl font-bold text-primary">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <section className="container mx-auto px-4 pb-16">
        <h2 className="mb-6 text-xl font-semibold text-foreground">Quick Access</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link, i) => (
            <motion.div
              key={link.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.08 }}
            >
              <Link
                to={link.to}
                className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  <link.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{link.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {link.description}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Top Categories */}
      <section className="container mx-auto px-4 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Top Categories</h2>
          <Link
            to="/explore"
            className="text-xs font-medium text-primary hover:underline"
          >
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {topCategories.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.05 }}
            >
              <Link
                to={`/explore?category=${cat.name}`}
                className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition-all hover:border-primary/40 hover:shadow-md hover:shadow-primary/5"
              >
                <span className="text-2xl">{cat.emoji}</span>
                <span className="text-sm font-medium text-foreground">{cat.name}</span>
                <span className="text-xs text-muted-foreground">{cat.count} projects</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Overview;

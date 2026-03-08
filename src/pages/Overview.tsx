import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Layers,
  BarChart3,
  GitCompare,
  Briefcase,
  TrendingUp,
  Star,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProjectLogo from "@/components/ProjectLogo";
import TokenPriceBadge from "@/components/TokenPriceBadge";
import BillboardHero from "@/components/BillboardHero";
import { useProjects } from "@/hooks/useProjects";
import { useAllTokenMarketData } from "@/hooks/useTokenMarketData";
import { useTrendingProjects } from "@/hooks/useSentiment";
import { useForecasts } from "@/hooks/useForecasts";


const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const Overview = () => {
  const { data: projects = [] } = useProjects();
  const { data: marketData = {}, isRefetching } = useAllTokenMarketData(30 * 1000); // Refetch every 30 seconds for billboard
  const { data: forecastData } = useForecasts("votes", 1, 4);
  const topForecasts = (forecastData?.forecasts || []).map(f => ({
    id: f.id,
    title: f.title,
    total_votes_yes: f.total_votes_yes,
    total_votes_no: f.total_votes_no,
    status: f.status || "active",
    project_a_logo_url: f.project_a_logo_url,
    project_a_logo_emoji: f.project_a_logo_emoji,
    project_a_name: f.project_a_name,
    project_b_logo_url: f.project_b_logo_url,
    project_b_logo_emoji: f.project_b_logo_emoji,
    project_b_name: f.project_b_name,
  }));
  const { data: trendingProjects = [] } = useTrendingProjects(5);

  const quickLinks = [
    { title: "Explore", description: "Browse the full DePIN project directory.", icon: Layers, to: "/explore", accent: "primary" },
    { title: "Market", description: "Track token prices and market trends.", icon: BarChart3, to: "/market", accent: "primary" },
    { title: "Compare", description: "AI-powered side-by-side comparison.", icon: GitCompare, to: "/compare", accent: "accent" },
    { title: "Forecasts", description: "Community predictions and voting.", icon: TrendingUp, to: "/forecasts", accent: "accent" },
    { title: "Portfolio", description: "Track your DePIN holdings.", icon: Briefcase, to: "/portfolio", accent: "primary" },
  ];

  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  const totalCategories = new Set(projects.map((p) => p.category)).size;
  const totalBlockchains = new Set(projects.map((p) => p.blockchain)).size;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Billboard Hero */}
      <BillboardHero
        projects={projects}
        isRefetching={isRefetching}
        marketData={marketData}
        topForecasts={topForecasts}
        trendingProjects={trendingProjects}
        totalCategories={totalCategories}
        totalBlockchains={totalBlockchains}
      />

      {/* Quick Links */}
      <section className="container mx-auto px-4 pb-16">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={stagger}>
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-semibold text-foreground font-['Space_Grotesk']">Quick Access</h2>
            <div className="h-px flex-1 bg-border/50" />
          </motion.div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {quickLinks.map((link, i) => (
              <motion.div key={link.title} variants={fadeUp} className="h-full">
                <Link
                  to={link.to}
                  className="group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-all hover:bg-card/80 hover:shadow-lg hover:shadow-background/10 overflow-hidden h-full"
                >
                  {/* Subtle corner accent */}
                  <div className="absolute top-0 right-0 w-16 h-16 bg-primary/[0.03] rounded-bl-[40px] transition-all group-hover:w-20 group-hover:h-20" />
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-all group-hover:bg-primary/15 group-hover:scale-105">
                    <link.icon className="h-5 w-5" />
                  </div>
                  <div className="relative flex-1">
                    <h3 className="font-semibold text-foreground text-sm">{link.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{link.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:text-primary group-hover:translate-x-1 mt-auto" />
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>


      {/* Recently Added */}
      <section className="container mx-auto px-4 pb-20">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger}>
          <motion.div variants={fadeUp} className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-foreground font-['Space_Grotesk']">Recently Added</h2>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary tracking-wide uppercase">New</span>
            </div>
            <Link to="/explore?sort=newest" className="group/link text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3 transition-transform group-hover/link:translate-x-0.5" />
            </Link>
          </motion.div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentProjects.map((project) => (
              <motion.div key={project.id} variants={fadeUp}>
                <Link
                  to={`/project/${project.slug}`}
                  className="group relative flex flex-col rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 overflow-hidden h-full"
                >
                  {/* Hover accent glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <div className="relative flex items-center gap-3.5 mb-3">
                    <div className="shrink-0 ring-2 ring-border group-hover:ring-primary/20 rounded-xl transition-all duration-300">
                      <ProjectLogo logoUrl={project.logo_url} logoEmoji={project.logo_emoji} name={project.name} size="sm" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors truncate">
                        {project.name}
                      </h3>
                      {marketData[project.id] && <TokenPriceBadge data={marketData[project.id]} compact />}
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground/30 shrink-0 transition-all duration-300 group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </div>
                  
                  <p className="relative text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-4 flex-1">{project.tagline}</p>
                  
                  <div className="relative flex items-center gap-1.5 flex-wrap">
                    <span className="rounded-md border border-border bg-secondary/80 px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                      {project.category}
                    </span>
                    <span className="rounded-md border border-border bg-secondary/80 px-2 py-0.5 text-[10px] text-muted-foreground">
                      {project.blockchain}
                    </span>
                    {project.avg_rating && (
                      <span className="ml-auto flex items-center gap-0.5 text-[10px] font-medium text-primary">
                        <Star className="h-3 w-3 fill-primary" />
                        {project.avg_rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default Overview;

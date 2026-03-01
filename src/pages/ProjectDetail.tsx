import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, Globe, Layers, Coins, Calendar, Activity, Star, Bookmark, Twitter } from "lucide-react";
import { useProject } from "@/hooks/useProjects";
import { useAuth } from "@/contexts/AuthContext";
import { useBookmarks, useToggleBookmark } from "@/hooks/useBookmarks";
import ReviewSection from "@/components/ReviewSection";
import ProjectLogo from "@/components/ProjectLogo";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const statusColors: Record<string, string> = {
  live: "bg-neon-green/15 text-neon-green border-neon-green/30",
  testnet: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  development: "bg-muted text-muted-foreground border-border",
};

const ProjectDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: project, isLoading } = useProject(slug || "");
  const { user } = useAuth();
  const { data: bookmarks = [] } = useBookmarks();
  const toggleBookmark = useToggleBookmark();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex min-h-screen items-center justify-center pt-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="flex flex-1 flex-col items-center justify-center">
          <span className="mb-4 text-5xl">🚫</span>
          <h1 className="text-xl font-semibold text-foreground">Project not found</h1>
          <Link to="/" className="mt-4 text-sm text-primary hover:underline">← Back to library</Link>
        </div>
      </div>
    );
  }

  const isBookmarked = bookmarks.includes(project.id);

  const details = [
    { icon: Layers, label: "Category", value: project.category },
    { icon: Globe, label: "Blockchain", value: project.blockchain },
    { icon: Coins, label: "Token", value: project.token },
    { icon: Calendar, label: "Founded", value: project.year_founded ? String(project.year_founded) : "—" },
    { icon: Activity, label: "Status", value: project.status },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="relative pt-24 pb-20">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="gradient-radial-top absolute inset-0" />

        <div className="container relative mx-auto max-w-3xl px-4">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <Link to="/" className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back to library
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
            <div className="mb-4 flex items-center gap-4">
              <ProjectLogo logoUrl={project.logo_url} logoEmoji={project.logo_emoji} name={project.name} size="lg" />
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
                  {project.avg_rating && (
                    <span className="flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2 py-1 text-sm font-semibold text-primary">
                      <Star className="h-3.5 w-3.5 fill-primary" />
                      {project.avg_rating.toFixed(1)}
                      <span className="text-xs text-muted-foreground font-normal">({project.review_count})</span>
                    </span>
                  )}
                  {user && (
                    <button
                      onClick={() => toggleBookmark.mutate({ projectId: project.id, isBookmarked })}
                      className="ml-auto rounded-lg border border-border bg-card p-2 transition-colors hover:bg-secondary"
                    >
                      <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                    </button>
                  )}
                </div>
                <p className="text-base text-muted-foreground">{project.tagline}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={`rounded-md border px-3 py-1 text-xs font-medium ${statusColors[project.status] || statusColors.development}`}>
                ● {project.status}
              </span>
              {project.website && (
                <a href={project.website} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20">
                  <ExternalLink className="h-3 w-3" /> Visit Website
                </a>
              )}
              {project.twitter_url && (
                <a href={project.twitter_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary">
                  <Twitter className="h-3 w-3" /> Twitter / X
                </a>
              )}
              {project.discord_url && (
                <a href={project.discord_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                  Discord
                </a>
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {details.map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-xl border border-border bg-card p-4 text-center">
                <Icon className="mx-auto mb-2 h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-0.5 text-sm font-semibold text-foreground capitalize">{value}</p>
              </div>
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="mb-8 rounded-xl border border-border bg-card p-6">
            <h2 className="mb-3 text-lg font-semibold text-foreground">About {project.name}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{project.description}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <ReviewSection projectId={project.id} projectName={project.name} />
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ProjectDetail;

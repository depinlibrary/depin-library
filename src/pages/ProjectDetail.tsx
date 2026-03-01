import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, Globe, Layers, Coins, Calendar, Activity } from "lucide-react";
import { getProjectBySlug } from "@/data/projects";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const statusColors = {
  live: "bg-neon-green/15 text-neon-green border-neon-green/30",
  testnet: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  development: "bg-muted text-muted-foreground border-border",
};

const ProjectDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const project = getProjectBySlug(slug || "");

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="flex flex-1 flex-col items-center justify-center">
          <span className="mb-4 text-5xl">🚫</span>
          <h1 className="text-xl font-semibold text-foreground">Project not found</h1>
          <Link to="/" className="mt-4 text-sm text-primary hover:underline">
            ← Back to library
          </Link>
        </div>
      </div>
    );
  }

  const details = [
    { icon: Layers, label: "Category", value: project.category },
    { icon: Globe, label: "Blockchain", value: project.blockchain },
    { icon: Coins, label: "Token", value: project.token },
    { icon: Calendar, label: "Founded", value: String(project.yearFounded) },
    { icon: Activity, label: "Status", value: project.status },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="relative pt-24 pb-20">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="gradient-radial-top absolute inset-0" />

        <div className="container relative mx-auto max-w-3xl px-4">
          {/* Back link */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Link
              to="/"
              className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to library
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-3xl">
                {project.logo}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
                <p className="text-base text-muted-foreground">{project.tagline}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-md border px-3 py-1 text-xs font-medium ${statusColors[project.status]}`}
              >
                ● {project.status}
              </span>
              <a
                href={project.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
              >
                <ExternalLink className="h-3 w-3" />
                Visit Website
              </a>
            </div>
          </motion.div>

          {/* Details grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5"
          >
            {details.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="rounded-xl border border-border bg-card p-4 text-center"
              >
                <Icon className="mx-auto mb-2 h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-0.5 text-sm font-semibold text-foreground capitalize">{value}</p>
              </div>
            ))}
          </motion.div>

          {/* Description */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-border bg-card p-6"
          >
            <h2 className="mb-3 text-lg font-semibold text-foreground">About {project.name}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {project.description}
            </p>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ProjectDetail;

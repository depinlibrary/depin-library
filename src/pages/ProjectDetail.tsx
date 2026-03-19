import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, Globe, Layers, Coins, Calendar, Activity, Star, Twitter } from "lucide-react";
import CompareWithButton from "@/components/CompareWithButton";
import { useProject } from "@/hooks/useProjects";
import ProjectRatings from "@/components/ProjectRatings";
import ReviewSection from "@/components/ReviewSection";
import ProjectForecasts from "@/components/ProjectForecasts";
import SentimentBadge from "@/components/SentimentBadge";
import ProjectLogo from "@/components/ProjectLogo";
import TokenPriceBadge from "@/components/TokenPriceBadge";
import ShareButtons from "@/components/ShareButtons";
import RelatedProjects from "@/components/RelatedProjects";
import ProjectDetailSkeleton from "@/components/ProjectDetailSkeleton";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useTokenMarketData } from "@/hooks/useTokenMarketData";
import { useProjectRatings } from "@/hooks/useProjectRatings";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const statusColors: Record<string, string> = {
  live: "bg-neon-green/15 text-neon-green border-neon-green/30",
  testnet: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  development: "bg-muted text-muted-foreground border-border",
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

const ProjectDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: project, isLoading } = useProject(slug || "");
  const { data: marketData } = useTokenMarketData(project?.id);
  const { data: ratingsData } = useProjectRatings(project?.id || "");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <ProjectDetailSkeleton />
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

  const overallRating = ratingsData?.averages?.overall;
  const sparkline = marketData?.sparkline_7d;

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

        <div className="container relative mx-auto max-w-5xl px-4">
          {/* Back + Share row */}
          <motion.div {...fadeUp} className="mb-8 flex items-center justify-between">
            <Link to="/explore" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back to explore
            </Link>
            <div className="flex items-center gap-2">
              <CompareWithButton currentProjectId={project.id} currentProjectName={project.name} currentCategory={project.category} />
              <ShareButtons title={project.name} description={project.tagline} />
            </div>
          </motion.div>

          {/* Hero */}
          <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="mb-8">
            <div className="mb-4 flex items-start gap-4">
              <div className="shrink-0 mt-0.5">
                <ProjectLogo logoUrl={project.logo_url} logoEmoji={project.logo_emoji} name={project.name} size="lg" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">{project.name}</h1>
                   {ratingsData?.averages?.count > 0 && overallRating && (
                     <span className="flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2 py-1 text-sm font-semibold text-primary">
                       <Star className="h-3.5 w-3.5 fill-primary" />
                       {overallRating.toFixed(1)}
                       <span className="text-xs font-normal text-muted-foreground">({ratingsData?.averages?.count})</span>
                     </span>
                   )}
                </div>
                <p className="mt-1 text-sm sm:text-base text-muted-foreground">{project.tagline}</p>
                <div className="flex items-center gap-2 lg:justify-end mt-2">
                   <CompareWithButton currentProjectId={project.id} currentProjectName={project.name} currentCategory={project.category} />
                 </div>
              </div>
            </div>

            {/* Tags row */}
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

          {/* Two-column layout */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main column */}
            <div className="space-y-6 lg:col-span-2">
              {/* Token price banner */}
              {marketData && marketData.price_usd !== null && (
                <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
                  <TokenPriceBadge data={marketData} />
                </motion.div>
              )}

              {/* About */}
              <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="rounded-xl border border-border bg-card p-6">
                <h2 className="mb-3 text-lg font-semibold text-foreground">About {project.name}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{project.description}</p>
              </motion.div>

              {/* Tabbed content: Ratings & Reviews */}
              <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
                <Tabs defaultValue="ratings" className="w-full">
                  <TabsList className="mb-4 w-full justify-start bg-card border border-border">
                    <TabsTrigger value="ratings">Ratings</TabsTrigger>
                    <TabsTrigger value="reviews">Reviews</TabsTrigger>
                  </TabsList>
                  <TabsContent value="ratings">
                    <ProjectRatings projectId={project.id} projectName={project.name} />
                  </TabsContent>
                  <TabsContent value="reviews">
                    <ReviewSection projectId={project.id} projectName={project.name} projectSlug={project.slug} />
                  </TabsContent>
                </Tabs>
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick stats */}
              <motion.div {...fadeUp} transition={{ delay: 0.1 }}
                className="rounded-xl border border-border bg-card p-5">
                <h3 className="mb-4 text-sm font-semibold text-foreground">Project Details</h3>
                <div className="space-y-3">
                  {details.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" /> {label}
                      </span>
                      <span className="text-sm font-medium text-foreground capitalize">{value}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* 7d Sparkline */}
              {sparkline && Array.isArray(sparkline) && sparkline.length > 0 && (
                <motion.div {...fadeUp} transition={{ delay: 0.15 }}
                  className="rounded-xl border border-border bg-card p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">7d Price Trend</h3>
                    {marketData?.price_change_24h !== null && marketData?.price_change_24h !== undefined && (
                      <span className={`text-xs font-semibold ${(marketData.price_change_24h ?? 0) >= 0 ? "text-neon-green" : "text-destructive"}`}>
                        {(marketData.price_change_24h ?? 0) >= 0 ? "+" : ""}{marketData.price_change_24h?.toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={(sparkline as number[]).map((v, i) => ({ idx: i, price: v }))} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="priceGrad7d" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={(marketData?.price_change_24h ?? 0) >= 0 ? "hsl(var(--neon-green))" : "hsl(var(--destructive))"} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={(marketData?.price_change_24h ?? 0) >= 0 ? "hsl(var(--neon-green))" : "hsl(var(--destructive))"} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis dataKey="idx" hide />
                         <YAxis
                          domain={["dataMin", "dataMax"]}
                          tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v: number) => v < 0.01 ? v.toFixed(6) : v < 1 ? v.toFixed(4) : v.toFixed(2)}
                          width={60}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "11px",
                            padding: "6px 10px",
                          }}
                          labelFormatter={() => ""}
                          formatter={(value: number) => [`$${value < 1 ? value.toFixed(6) : value.toFixed(2)}`, "Price"]}
                        />
                        <Area
                          type="monotone"
                          dataKey="price"
                          stroke={(marketData?.price_change_24h ?? 0) >= 0 ? "hsl(var(--neon-green))" : "hsl(var(--destructive))"}
                          strokeWidth={2}
                          fill="url(#priceGrad7d)"
                          dot={false}
                          activeDot={{ r: 3, strokeWidth: 2, stroke: "hsl(var(--card))" }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  {(() => {
                    const arr = sparkline as number[];
                    const high = Math.max(...arr);
                    const low = Math.min(...arr);
                    const fmt = (n: number) => n < 0.01 ? n.toFixed(6) : n < 1 ? n.toFixed(4) : n.toFixed(2);
                    return (
                      <div className="mt-2 flex gap-3 rounded-lg bg-secondary/50 p-2">
                        <div className="flex-1 text-center">
                          <p className="text-[10px] text-muted-foreground">7d High</p>
                          <p className="text-xs font-semibold text-neon-green">${fmt(high)}</p>
                        </div>
                        <div className="h-auto w-px bg-border" />
                        <div className="flex-1 text-center">
                          <p className="text-[10px] text-muted-foreground">7d Low</p>
                          <p className="text-xs font-semibold text-destructive">${fmt(low)}</p>
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              )}

              {/* Sentiment */}
              <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
                <SentimentBadge projectId={project.id} projectName={project.name} />
              </motion.div>

              {/* Related */}
              <motion.div {...fadeUp} transition={{ delay: 0.25 }}>
                <RelatedProjects
                  currentProjectId={project.id}
                  category={project.category}
                  blockchain={project.blockchain}
                />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ProjectDetail;

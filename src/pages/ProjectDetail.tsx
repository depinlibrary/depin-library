import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import CompareWithButton from "@/components/CompareWithButton";
import { useProject } from "@/hooks/useProjects";
import ProjectRatings from "@/components/ProjectRatings";
import ReviewSection from "@/components/ReviewSection";
import ProjectPredictions from "@/components/ProjectPredictions";
import ShareButtons from "@/components/ShareButtons";
import RelatedProjects from "@/components/RelatedProjects";
import ProjectDetailSkeleton from "@/components/ProjectDetailSkeleton";
import { useTokenMarketData } from "@/hooks/useTokenMarketData";
import { useProjectRatings } from "@/hooks/useProjectRatings";
import { useCoinDetail } from "@/hooks/useCoinDetail";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProjectDetailSidebar from "@/components/project-detail/ProjectDetailSidebar";
import ProjectDetailChart from "@/components/project-detail/ProjectDetailChart";
import ProjectMarkets from "@/components/project-detail/ProjectMarkets";
import ProjectLearnMore from "@/components/project-detail/ProjectLearnMore";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

const ProjectDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: project, isLoading } = useProject(slug || "");
  const { data: marketData } = useTokenMarketData(project?.id);
  const { data: ratingsData } = useProjectRatings(project?.id || "");
  const { data: coinDetail } = useCoinDetail(project?.coingecko_id);

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="relative pt-24 pb-20">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="gradient-radial-top absolute inset-0" />

        <div className="container relative mx-auto px-4">
          {/* Back row */}
          <motion.div {...fadeUp} className="mb-6 flex items-center justify-between">
            <Link to="/explore" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> All Projects
            </Link>
            <div className="flex items-center gap-2">
              <CompareWithButton currentProjectId={project.id} currentProjectName={project.name} currentCategory={project.category} />
              <ShareButtons title={project.name} description={project.tagline} />
            </div>
          </motion.div>

          {/* Two-column layout */}
          <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
            {/* Left Sidebar */}
            <ProjectDetailSidebar
              project={project}
              marketData={marketData}
              ratingsData={ratingsData}
              coinDetail={coinDetail}
            />

            {/* Right Main Content */}
            <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
              <Tabs defaultValue="chart" className="w-full">
                <TabsList className="mb-4 w-full justify-start bg-card border border-border">
                  <TabsTrigger value="chart">Chart</TabsTrigger>
                  <TabsTrigger value="markets">Markets</TabsTrigger>
                  <TabsTrigger value="learn-more">Learn More</TabsTrigger>
                  <TabsTrigger value="ratings">Ratings</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                  <TabsTrigger value="predictions">Predictions</TabsTrigger>
                </TabsList>

                <TabsContent value="chart">
                  <ProjectDetailChart
                    marketData={marketData}
                    projectName={project.name}
                    token={project.token}
                  />
                </TabsContent>

                <TabsContent value="markets">
                  <ProjectMarkets
                    tickers={coinDetail?.tickers || []}
                    tokenName={project.token || project.name}
                  />
                </TabsContent>

                <TabsContent value="learn-more">
                  <ProjectLearnMore
                    coinDetail={coinDetail || { total_supply: null, circulating_supply: null, max_supply: null, fully_diluted_valuation: null, ath: null, ath_date: null, atl: null, atl_date: null, volume_24h: null, contracts: {}, tickers: [], description: null, categories: [], links: { homepage: null, whitepaper: null, repos: null } }}
                    projectName={project.name}
                    projectDescription={project.description}
                  />
                </TabsContent>

                <TabsContent value="ratings">
                  <ProjectRatings projectId={project.id} projectName={project.name} />
                </TabsContent>

                <TabsContent value="reviews">
                  <ReviewSection projectId={project.id} projectName={project.name} projectSlug={project.slug} />
                </TabsContent>

                <TabsContent value="predictions">
                  <ProjectPredictions projectId={project.id} projectName={project.name} />
                </TabsContent>
              </Tabs>

              {/* Related Projects below tabs */}
              <motion.div {...fadeUp} transition={{ delay: 0.25 }} className="mt-6">
                <RelatedProjects
                  currentProjectId={project.id}
                  category={project.category}
                  blockchain={project.blockchain}
                />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ProjectDetail;

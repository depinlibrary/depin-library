import { useRef, useState, useEffect } from "react";
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
import ProjectDetailSidebar from "@/components/project-detail/ProjectDetailSidebar";
import ProjectDetailChart from "@/components/project-detail/ProjectDetailChart";
import ProjectMarkets from "@/components/project-detail/ProjectMarkets";
import ProjectLearnMore from "@/components/project-detail/ProjectLearnMore";
import ProjectSocial from "@/components/project-detail/ProjectSocial";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

const SECTIONS = [
  { id: "social", label: "Social" },
  { id: "chart", label: "Chart" },
  { id: "markets", label: "Markets" },
  { id: "learn-more", label: "Learn More" },
  { id: "ratings", label: "Ratings" },
  { id: "reviews", label: "Reviews" },
  { id: "predictions", label: "Predictions" },
] as const;

const ProjectDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: project, isLoading } = useProject(slug || "");
  const { data: marketData } = useTokenMarketData(project?.id);
  const { data: ratingsData } = useProjectRatings(project?.id || "");
  const { data: coinDetail } = useCoinDetail(project?.coingecko_id);

  const [activeSection, setActiveSection] = useState<string>("social");
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const navRef = useRef<HTMLDivElement | null>(null);

  // Intersection observer to track active section
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const entries: Record<string, boolean> = {};

    SECTIONS.forEach(({ id }) => {
      const el = sectionRefs.current[id];
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          entries[id] = entry.isIntersecting;
          // Find first visible section
          const first = SECTIONS.find((s) => entries[s.id]);
          if (first) setActiveSection(first.id);
        },
        { rootMargin: "-100px 0px -60% 0px", threshold: 0 }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [project]);

  const scrollToSection = (id: string) => {
    const el = sectionRefs.current[id];
    if (el) {
      const navHeight = navRef.current?.offsetHeight || 48;
      const top = el.getBoundingClientRect().top + window.scrollY - navHeight - 80;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

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

            {/* Right Main Content - Single page scroll */}
            <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
              {/* Sticky section nav */}
              <div
                ref={navRef}
                className="sticky top-16 z-20 mb-6 rounded-xl border border-border bg-card/95 backdrop-blur-sm overflow-x-auto"
              >
                <div className="flex items-center gap-0.5 p-1 min-w-max">
                  {SECTIONS.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                        activeSection === section.id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      {section.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* All sections rendered on one scrollable page */}
              <div className="space-y-8">
                {/* Social */}
                <div ref={(el) => { sectionRefs.current["social"] = el; }} id="section-social">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Social</h2>
                  <ProjectSocial
                    social={coinDetail?.social}
                    sentimentUp={coinDetail?.sentiment_votes_up_percentage}
                    watchlistUsers={coinDetail?.watchlist_users}
                    projectName={project.name}
                  />
                </div>

                {/* Chart */}
                <div ref={(el) => { sectionRefs.current["chart"] = el; }} id="section-chart">
                  <ProjectDetailChart
                    marketData={marketData}
                    projectName={project.name}
                    token={project.token}
                  />
                </div>

                {/* Markets */}
                <div ref={(el) => { sectionRefs.current["markets"] = el; }} id="section-markets">
                  <ProjectMarkets
                    tickers={coinDetail?.tickers || []}
                    tokenName={project.token || project.name}
                  />
                </div>

                {/* Learn More */}
                <div ref={(el) => { sectionRefs.current["learn-more"] = el; }} id="section-learn-more">
                  <ProjectLearnMore
                    coinDetail={coinDetail || { total_supply: null, circulating_supply: null, max_supply: null, fully_diluted_valuation: null, ath: null, ath_date: null, atl: null, atl_date: null, volume_24h: null, market_cap: null, contracts: {}, tickers: [], description: null, categories: [], links: { homepage: null, whitepaper: null, repos: null }, social: { twitter_followers: null, reddit_subscribers: null, reddit_active_accounts: null, telegram_members: null, facebook_likes: null }, sentiment_votes_up_percentage: null, sentiment_votes_down_percentage: null, watchlist_users: null }}
                    projectName={project.name}
                    projectDescription={project.description}
                  />
                </div>

                {/* Ratings */}
                <div ref={(el) => { sectionRefs.current["ratings"] = el; }} id="section-ratings">
                  <ProjectRatings projectId={project.id} projectName={project.name} />
                </div>

                {/* Reviews */}
                <div ref={(el) => { sectionRefs.current["reviews"] = el; }} id="section-reviews">
                  <ReviewSection projectId={project.id} projectName={project.name} projectSlug={project.slug} />
                </div>

                {/* Predictions */}
                <div ref={(el) => { sectionRefs.current["predictions"] = el; }} id="section-predictions">
                  <ProjectPredictions projectId={project.id} projectName={project.name} />
                </div>
              </div>

              {/* Related Projects */}
              <motion.div {...fadeUp} transition={{ delay: 0.25 }} className="mt-8">
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

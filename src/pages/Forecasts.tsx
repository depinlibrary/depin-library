import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, ThumbsUp, ThumbsDown, Plus, TrendingUp, Clock, Flame, ChevronLeft, ChevronRight, LogIn, Users, BarChart3, Zap, X, Filter, Trophy, CheckCircle, Circle } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useForecasts, useCreateForecast, useVoteForecast, type ForecastSortOption, type ForecastStatusFilter, type Forecast } from "@/hooks/useForecasts";
import { useProjects } from "@/hooks/useProjects";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const PAGE_SIZE = 12;

const sortOptions: { value: ForecastSortOption; label: string; icon: typeof Flame }[] = [
  { value: "votes", label: "Most Votes", icon: Flame },
  { value: "newest", label: "Newest", icon: Clock },
  { value: "ending_soon", label: "Ending Soon", icon: Timer },
];

function getTimeRemaining(endDate: string): string {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 30) return `${Math.floor(days / 30)}mo left`;
  if (days > 0) return `${days}d left`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  return `${hours}h left`;
}

const ForecastCard = ({ forecast, onVote, isAuthenticated, index }: {
  forecast: Forecast;
  onVote: (id: string, vote: "yes" | "no") => void;
  isAuthenticated: boolean;
  index: number;
}) => {
  const totalVotes = forecast.total_votes_yes + forecast.total_votes_no;
  const yesPct = totalVotes > 0 ? (forecast.total_votes_yes / totalVotes) * 100 : 50;
  const noPct = 100 - yesPct;
  const isEnded = new Date(forecast.end_date) <= new Date();
  const timeLeft = getTimeRemaining(forecast.end_date);
  const finalResult = isEnded ? (yesPct >= 50 ? "yes" : "no") : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className="group relative rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 h-full flex flex-col"
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="p-5 flex-1 flex flex-col">
        {/* Header: Projects + time badge */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center -space-x-1.5">
            {forecast.project_a_logo_url ? (
              <img
                src={forecast.project_a_logo_url}
                alt={forecast.project_a_name}
                className="w-7 h-7 rounded-[7px] overflow-hidden object-contain border-2 border-card bg-secondary relative z-10"
              />
            ) : (
              <span className="w-7 h-7 rounded-[7px] overflow-hidden flex items-center justify-center text-sm border-2 border-card bg-secondary relative z-10">
                {forecast.project_a_logo_emoji || "⬡"}
              </span>
            )}
            {forecast.project_b_name && (
              forecast.project_b_logo_url ? (
                <img
                  src={forecast.project_b_logo_url}
                  alt={forecast.project_b_name}
                  className="w-7 h-7 rounded-[7px] overflow-hidden object-contain border-2 border-card bg-secondary relative z-0"
                />
              ) : (
                <span className="w-7 h-7 rounded-[7px] overflow-hidden flex items-center justify-center text-sm border-2 border-card bg-secondary relative z-0">
                  {forecast.project_b_logo_emoji || "⬡"}
                </span>
              )
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <Link
              to={`/project/${forecast.project_a_slug}`}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors truncate"
            >
              {forecast.project_a_name}
            </Link>
            {forecast.project_b_name && (
              <>
                <span className="text-muted-foreground/40 text-[10px]">vs</span>
                <Link
                  to={`/project/${forecast.project_b_slug}`}
                  className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors truncate"
                >
                  {forecast.project_b_name}
                </Link>
              </>
            )}
          </div>
          <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
            isEnded
              ? "bg-muted text-muted-foreground"
              : "bg-primary/10 text-primary"
          }`}>
            {timeLeft}
          </span>
        </div>

        {/* Title */}
        <Link to={`/forecasts/${forecast.id}`} className="block">
          <h3 className="text-[13px] font-semibold text-foreground leading-snug mb-2 line-clamp-2 hover:text-primary transition-colors">
            {forecast.title}
          </h3>
        </Link>

        {forecast.description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed min-h-[2.5rem]">{forecast.description}</p>
        )}
        {!forecast.description && <div className="mb-3 min-h-[2.5rem]" />}

        {/* Vote percentage display */}
        <div className="mb-4 mt-auto">
          <div className="flex items-end justify-between mb-2">
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-foreground">{yesPct.toFixed(0)}%</span>
              <span className="text-[10px] font-medium text-primary/70 uppercase tracking-wider">Yes</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-[10px] font-medium text-destructive/70 uppercase tracking-wider">No</span>
              <span className="text-lg font-bold text-foreground">{noPct.toFixed(0)}%</span>
            </div>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden flex">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${yesPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-l-full"
              style={{ background: "hsl(var(--primary))" }}
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${noPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-r-full bg-destructive/60"
            />
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <Users className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-[11px] text-muted-foreground">
              {totalVotes.toLocaleString()} vote{totalVotes !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Vote buttons — separated footer */}
      {!isEnded && (
        <div className="flex border-t border-border">
          <button
            onClick={() => isAuthenticated ? onVote(forecast.id, "yes") : toast.error("Sign in to vote")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all ${
              forecast.user_vote === "yes"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
            }`}
          >
            <ThumbsUp className="h-3.5 w-3.5" /> Yes
          </button>
          <div className="w-px bg-border" />
          <button
            onClick={() => isAuthenticated ? onVote(forecast.id, "no") : toast.error("Sign in to vote")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all ${
              forecast.user_vote === "no"
                ? "bg-destructive/10 text-destructive"
                : "text-muted-foreground hover:bg-destructive/5 hover:text-destructive"
            }`}
          >
            <ThumbsDown className="h-3.5 w-3.5" /> No
          </button>
        </div>
      )}

      {isEnded && (
        <div className={`flex items-center justify-between border-t border-border px-4 py-2.5 ${
          finalResult === "yes" ? "bg-primary/5" : "bg-destructive/5"
        }`}>
          <div className="flex items-center gap-2">
            <Trophy className={`h-3.5 w-3.5 ${finalResult === "yes" ? "text-primary" : "text-destructive"}`} />
            <span className={`text-[11px] font-semibold ${finalResult === "yes" ? "text-primary" : "text-destructive"}`}>
              Result: {finalResult === "yes" ? "Yes" : "No"} ({finalResult === "yes" ? yesPct.toFixed(0) : noPct.toFixed(0)}%)
            </span>
          </div>
          {forecast.user_vote && (
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
              forecast.user_vote === finalResult
                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
            }`}>
              {forecast.user_vote === finalResult ? "✓ You were right!" : "✗ Minority vote"}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
};

const Forecasts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: projects = [] } = useProjects();
  const [sort, setSort] = useState<ForecastSortOption>("newest");
  const [page, setPage] = useState(1);
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<ForecastStatusFilter>("all");
  const { data, isLoading } = useForecasts(sort, page, PAGE_SIZE, projectFilter || undefined, search || undefined, statusFilter);
  const createForecast = useCreateForecast();
  const voteForecast = useVoteForecast();
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectAId, setProjectAId] = useState("");
  const [projectBId, setProjectBId] = useState("");
  const [endDate, setEndDate] = useState("");

  // Auto-open create dialog from compare page
  useEffect(() => {
    if (searchParams.get("create") === "true" && user) {
      setShowCreate(true);
      const a = searchParams.get("a");
      const b = searchParams.get("b");
      if (a) setProjectAId(a);
      if (b) setProjectBId(b);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, user]);

  const forecasts = data?.forecasts || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Stats
  const stats = useMemo(() => {
    const totalVotes = forecasts.reduce((sum, f) => sum + f.total_votes_yes + f.total_votes_no, 0);
    const activeCount = forecasts.filter(f => new Date(f.end_date) > new Date()).length;
    return { total, totalVotes, activeCount };
  }, [forecasts, total]);

  const handleVote = (forecastId: string, vote: "yes" | "no") => {
    voteForecast.mutate({ forecastId, vote });
  };

  const handleCreate = async () => {
    if (!title.trim()) { toast.error("Title required"); return; }
    if (!projectAId) { toast.error("Select a project"); return; }
    if (!endDate) { toast.error("End date required"); return; }
    if (new Date(endDate) <= new Date()) { toast.error("End date must be in the future"); return; }

    try {
      await createForecast.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        projectAId,
        projectBId: projectBId && projectBId !== "none" ? projectBId : undefined,
        endDate: new Date(endDate).toISOString(),
      });
      toast.success("Forecast created!");
      setShowCreate(false);
      setTitle("");
      setDescription("");
      setProjectAId("");
      setProjectBId("");
      setEndDate("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create forecast");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-28 pb-12">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="gradient-radial-top absolute inset-0" />
        <div className="container relative mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-secondary/50 mb-4">
              <Zap className="w-3 h-3 text-primary" />
              <span className="text-[11px] font-medium text-muted-foreground">Prediction Market</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl font-['Space_Grotesk']">
              DePIN <span className="text-glow text-primary">Forecasts</span>
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground leading-relaxed">
              Community predictions about the future of DePIN. Vote on outcomes, shape sentiment, and track what the community believes.
            </p>
          </motion.div>

          {/* Hero Stats */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex items-center justify-center gap-6 sm:gap-10"
          >
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-foreground font-['Space_Grotesk']">{stats.total}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-0.5">Forecasts</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-foreground font-['Space_Grotesk']">{stats.activeCount}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-0.5">Active</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-primary font-['Space_Grotesk']">{stats.totalVotes.toLocaleString()}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-0.5">Votes Cast</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Controls */}
      <section className="sticky top-16 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Search bar - left side, stretched */}
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Search by title..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="h-8 w-full text-xs placeholder:text-muted-foreground/60 bg-secondary/50 border-border"
            />
          </div>

          {/* Filters - right side */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              {sortOptions.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => { setSort(value); setPage(1); }}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
                    sort === value
                      ? "border border-primary/30 bg-primary/10 text-primary"
                      : "border border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="h-3 w-3" /> {label}
                </button>
              ))}
            </div>
            <div className="w-px h-5 bg-border hidden sm:block" />
            {/* Status filter */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { setStatusFilter("all"); setPage(1); }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
                  statusFilter === "all"
                    ? "border border-primary/30 bg-primary/10 text-primary"
                    : "border border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                All
              </button>
              <button
                onClick={() => { setStatusFilter("active"); setPage(1); }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
                  statusFilter === "active"
                    ? "border border-primary/30 bg-primary/10 text-primary"
                    : "border border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <Circle className="h-3 w-3" /> Active
              </button>
              <button
                onClick={() => { setStatusFilter("ended"); setPage(1); }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
                  statusFilter === "ended"
                    ? "border border-primary/30 bg-primary/10 text-primary"
                    : "border border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <CheckCircle className="h-3 w-3" /> Ended
              </button>
            </div>
            <div className="w-px h-5 bg-border hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <Select value={projectFilter} onValueChange={(v) => { setProjectFilter(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="h-8 w-[180px] text-[11px] bg-secondary/50 border-border">
                  <Filter className="h-3 w-3 mr-1.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" sideOffset={4}>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        {p.logo_url ? (
                          <img src={p.logo_url} alt={p.name} className="w-4 h-4 rounded-[7px] overflow-hidden object-contain" />
                        ) : (
                          <span className="w-4 h-4 flex items-center justify-center text-xs">{p.logo_emoji}</span>
                        )}
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {projectFilter && (
                <button
                  onClick={() => { setProjectFilter(""); setPage(1); }}
                  className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/15 transition-colors"
                >
                  {projects.find(p => p.id === projectFilter)?.name}
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          {user ? (
            <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5 rounded-lg">
              <Plus className="h-3.5 w-3.5" /> Create Forecast
            </Button>
          ) : (
            <Link to="/auth" className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">
              <LogIn className="h-3 w-3" /> Sign in to create
            </Link>
          )}
        </div>
      </section>

      {/* Forecast Grid */}
      <section className="container mx-auto px-4 py-8 flex-1">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-border bg-card overflow-hidden">
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-[7px] bg-secondary" />
                    <div className="h-3 w-24 bg-secondary rounded" />
                  </div>
                  <div className="h-4 w-3/4 bg-secondary rounded" />
                  <div className="h-3 w-full bg-secondary rounded" />
                  <div className="h-2 w-full bg-secondary rounded-full mt-4" />
                </div>
                <div className="h-10 border-t border-border bg-secondary/30" />
              </div>
            ))}
          </div>
        ) : forecasts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">No forecasts yet</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
              Be the first to create a prediction and let the community vote on it.
            </p>
            {user ? (
              <Button onClick={() => setShowCreate(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Create First Forecast
              </Button>
            ) : (
              <Link to="/auth" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
                <LogIn className="h-3.5 w-3.5" /> Sign in to create
              </Link>
            )}
          </motion.div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {forecasts.map((forecast, i) => (
                  <ForecastCard
                    key={forecast.id}
                    forecast={forecast}
                    onVote={handleVote}
                    isAuthenticated={!!user}
                    index={i}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                          page === pageNum
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Create Forecast Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-['Space_Grotesk']">Create Forecast</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Title *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Will Hivemapper surpass Helium nodes by 2026?"
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional context about this prediction..."
                className="mt-1.5 min-h-[80px] resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Project A *</label>
                <Select value={projectAId} onValueChange={setProjectAId}>
                  <SelectTrigger className="mt-1.5 h-9">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false} className="max-h-60">
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-2">
                          {p.logo_url ? (
                            <img src={p.logo_url} alt={p.name} className="w-5 h-5 rounded-[7px] overflow-hidden object-contain" />
                          ) : (
                            <span className="w-5 h-5 flex items-center justify-center text-sm">{p.logo_emoji}</span>
                          )}
                          {p.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Project B <span className="normal-case text-muted-foreground/60">(optional)</span></label>
                <Select value={projectBId} onValueChange={setProjectBId}>
                  <SelectTrigger className="mt-1.5 h-9">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false} className="max-h-60">
                    <SelectItem value="none">None</SelectItem>
                    {projects.filter((p) => p.id !== projectAId).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-2">
                          {p.logo_url ? (
                            <img src={p.logo_url} alt={p.name} className="w-5 h-5 rounded-[7px] overflow-hidden object-contain" />
                          ) : (
                            <span className="w-5 h-5 flex items-center justify-center text-sm">{p.logo_emoji}</span>
                          )}
                          {p.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">End Date *</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createForecast.isPending}>
              {createForecast.isPending ? "Creating..." : "Create Forecast"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Forecasts;
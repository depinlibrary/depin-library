import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, ThumbsUp, ThumbsDown, Plus, TrendingUp, Clock, Flame, ChevronLeft, ChevronRight, LogIn, Users, BarChart3, Zap, X, Filter, Trophy, CheckCircle, Circle, RotateCcw, Activity, ArrowRight } from "lucide-react";
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
  if (hours > 0) return `${hours}h left`;
  const mins = Math.floor(diff / (1000 * 60));
  return `${mins}m left`;
}

// ── Polymarket-style Forecast Card ──
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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      className="group relative rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/25 transition-all h-full flex flex-col"
    >
      <div className="p-5 flex-1 flex flex-col">
        {/* Project logos + time */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center -space-x-2">
              {forecast.project_a_logo_url ? (
                <img src={forecast.project_a_logo_url} alt={forecast.project_a_name} className="w-8 h-8 rounded-xl object-contain border-2 border-card bg-secondary relative z-10" />
              ) : (
                <span className="w-8 h-8 rounded-xl flex items-center justify-center text-sm border-2 border-card bg-secondary relative z-10">{forecast.project_a_logo_emoji || "⬡"}</span>
              )}
              {forecast.project_b_name && (
                forecast.project_b_logo_url ? (
                  <img src={forecast.project_b_logo_url} alt={forecast.project_b_name} className="w-8 h-8 rounded-xl object-contain border-2 border-card bg-secondary" />
                ) : (
                  <span className="w-8 h-8 rounded-xl flex items-center justify-center text-sm border-2 border-card bg-secondary">{forecast.project_b_logo_emoji || "⬡"}</span>
                )
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <Link to={`/project/${forecast.project_a_slug}`} className="text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors truncate">
                {forecast.project_a_name}
              </Link>
              {forecast.project_b_name && (
                <Link to={`/project/${forecast.project_b_slug}`} className="text-[10px] text-muted-foreground/60 hover:text-primary transition-colors truncate">
                  vs {forecast.project_b_name}
                </Link>
              )}
            </div>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${
            isEnded ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary border border-primary/20"
          }`}>
            {timeLeft}
          </span>
        </div>

        {/* Title */}
        <Link to={`/forecasts/${forecast.id}`} className="block mb-3">
          <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {forecast.title}
          </h3>
        </Link>

        {forecast.description && (
          <p className="text-xs text-muted-foreground/80 mb-4 line-clamp-2 leading-relaxed">{forecast.description}</p>
        )}
        {!forecast.description && <div className="mb-4" />}

        {/* Large percentage — Polymarket style */}
        <div className="mt-auto mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-3xl font-black font-['Space_Grotesk'] tracking-tight ${yesPct >= 50 ? "text-primary" : "text-destructive"}`}>
              {yesPct.toFixed(0)}%
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">
              {totalVotes.toLocaleString()} vote{totalVotes !== 1 ? "s" : ""}
            </span>
          </div>
          {/* Thin progress bar */}
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden flex">
            <div className="h-full rounded-l-full transition-all duration-700" style={{ width: `${yesPct}%`, background: "hsl(var(--primary))" }} />
            <div className="h-full rounded-r-full bg-destructive/50 transition-all duration-700" style={{ width: `${noPct}%` }} />
          </div>
        </div>
      </div>

      {/* Vote buttons — Polymarket buy/sell style */}
      {!isEnded ? (
        <div className="grid grid-cols-2 gap-0">
          <button
            onClick={() => isAuthenticated ? onVote(forecast.id, "yes") : toast.error("Sign in to vote")}
            className={`flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-all border-t border-r border-border ${
              forecast.user_vote === "yes"
                ? "bg-primary/15 text-primary"
                : "text-primary/70 hover:bg-primary/5 hover:text-primary"
            }`}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            Yes {yesPct.toFixed(0)}¢
          </button>
          <button
            onClick={() => isAuthenticated ? onVote(forecast.id, "no") : toast.error("Sign in to vote")}
            className={`flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-all border-t border-border ${
              forecast.user_vote === "no"
                ? "bg-destructive/15 text-destructive"
                : "text-destructive/70 hover:bg-destructive/5 hover:text-destructive"
            }`}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
            No {noPct.toFixed(0)}¢
          </button>
        </div>
      ) : (
        <div className={`flex items-center justify-between border-t border-border px-5 py-3 ${
          finalResult === "yes" ? "bg-primary/5" : "bg-destructive/5"
        }`}>
          <div className="flex items-center gap-2">
            <Trophy className={`h-3.5 w-3.5 ${finalResult === "yes" ? "text-primary" : "text-destructive"}`} />
            <span className={`text-xs font-bold ${finalResult === "yes" ? "text-primary" : "text-destructive"}`}>
              Resolved: {finalResult === "yes" ? "Yes" : "No"}
            </span>
          </div>
          {forecast.user_vote && (
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
              forecast.user_vote === finalResult
                ? "bg-primary/10 text-primary"
                : "bg-destructive/10 text-destructive"
            }`}>
              {forecast.user_vote === finalResult ? "✓ Correct" : "✗ Wrong"}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
};

// ── Featured Forecast (hero card) ──
const FeaturedForecast = ({ forecast, onVote, isAuthenticated }: {
  forecast: Forecast;
  onVote: (id: string, vote: "yes" | "no") => void;
  isAuthenticated: boolean;
}) => {
  const totalVotes = forecast.total_votes_yes + forecast.total_votes_no;
  const yesPct = totalVotes > 0 ? (forecast.total_votes_yes / totalVotes) * 100 : 50;
  const noPct = 100 - yesPct;
  const isEnded = new Date(forecast.end_date) <= new Date();
  const timeLeft = getTimeRemaining(forecast.end_date);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative rounded-2xl border border-primary/20 bg-card overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center -space-x-2">
              {forecast.project_a_logo_url ? (
                <img src={forecast.project_a_logo_url} alt={forecast.project_a_name} className="w-12 h-12 rounded-2xl object-contain border-2 border-card bg-secondary relative z-10" />
              ) : (
                <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl border-2 border-card bg-secondary relative z-10">{forecast.project_a_logo_emoji || "⬡"}</span>
              )}
              {forecast.project_b_name && (
                forecast.project_b_logo_url ? (
                  <img src={forecast.project_b_logo_url} alt={forecast.project_b_name} className="w-12 h-12 rounded-2xl object-contain border-2 border-card bg-secondary" />
                ) : (
                  <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl border-2 border-card bg-secondary">{forecast.project_b_logo_emoji || "⬡"}</span>
                )
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Link to={`/project/${forecast.project_a_slug}`} className="hover:text-primary transition-colors font-medium">{forecast.project_a_name}</Link>
                {forecast.project_b_name && (
                  <>
                    <span className="text-muted-foreground/40">vs</span>
                    <Link to={`/project/${forecast.project_b_slug}`} className="hover:text-primary transition-colors font-medium">{forecast.project_b_name}</Link>
                  </>
                )}
              </div>
              <span className={`inline-flex items-center gap-1 mt-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                isEnded ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary border border-primary/20"
              }`}>
                <Clock className="h-3 w-3" /> {timeLeft}
              </span>
            </div>
          </div>
          <Link to={`/forecasts/${forecast.id}`} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors shrink-0">
            Details <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <Link to={`/forecasts/${forecast.id}`}>
          <h2 className="text-lg sm:text-xl font-black text-foreground leading-tight mb-4 font-['Space_Grotesk'] hover:text-primary transition-colors">
            {forecast.title}
          </h2>
        </Link>

        {/* Large vote display */}
        <div className="flex items-end justify-between mb-3">
          <div>
            <span className="text-4xl sm:text-5xl font-black font-['Space_Grotesk'] text-primary tracking-tighter">{yesPct.toFixed(0)}%</span>
            <span className="ml-2 text-sm font-semibold text-primary/60 uppercase tracking-wide">Yes</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-semibold text-destructive/60 uppercase tracking-wide">No</span>
            <span className="ml-2 text-4xl sm:text-5xl font-black font-['Space_Grotesk'] text-destructive/80 tracking-tighter">{noPct.toFixed(0)}%</span>
          </div>
        </div>

        {/* Vote bar */}
        <div className="h-3 rounded-full bg-secondary overflow-hidden flex mb-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${yesPct}%` }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="h-full rounded-l-full"
            style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))" }}
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${noPct}%` }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="h-full rounded-r-full bg-destructive/50"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{totalVotes.toLocaleString()} votes</span>
          {!isEnded && (
            <div className="flex gap-2">
              <button
                onClick={() => isAuthenticated ? onVote(forecast.id, "yes") : toast.error("Sign in to vote")}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                  forecast.user_vote === "yes"
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                }`}
              >
                Buy Yes
              </button>
              <button
                onClick={() => isAuthenticated ? onVote(forecast.id, "no") : toast.error("Sign in to vote")}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                  forecast.user_vote === "no"
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20"
                }`}
              >
                Buy No
              </button>
            </div>
          )}
        </div>
      </div>
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

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectAId, setProjectAId] = useState("");
  const [projectBId, setProjectBId] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (searchParams.get("create") === "true" && user) {
      setShowCreate(true);
      const a = searchParams.get("a");
      const b = searchParams.get("b");
      if (a) setProjectAId(a);
      if (b) setProjectBId(b);
      const prefill = sessionStorage.getItem('forecast_prefill');
      if (prefill) {
        try {
          const { title: prefillTitle, description: prefillDesc } = JSON.parse(prefill);
          if (prefillTitle) setTitle(prefillTitle);
          if (prefillDesc) setDescription(prefillDesc);
        } catch {}
        sessionStorage.removeItem('forecast_prefill');
      }
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, user]);

  const forecasts = data?.forecasts || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const stats = useMemo(() => {
    const totalVotes = forecasts.reduce((sum, f) => sum + f.total_votes_yes + f.total_votes_no, 0);
    const activeCount = forecasts.filter(f => new Date(f.end_date) > new Date()).length;
    return { total, totalVotes, activeCount };
  }, [forecasts, total]);

  // Featured forecast = most voted active forecast
  const featuredForecast = useMemo(() => {
    const active = forecasts.filter(f => new Date(f.end_date) > new Date());
    if (active.length === 0) return null;
    return active.reduce((best, f) => (f.total_votes_yes + f.total_votes_no) > (best.total_votes_yes + best.total_votes_no) ? f : best, active[0]);
  }, [forecasts]);

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
      setTitle(""); setDescription(""); setProjectAId(""); setProjectBId(""); setEndDate("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create forecast");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* ── Polymarket-style Hero ── */}
      <section className="relative overflow-hidden pt-24 pb-8">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="gradient-radial-top absolute inset-0" />
        <div className="container relative mx-auto px-4">
          {/* Top bar: Title + New Question CTA */}
          <div className="flex items-center justify-between mb-8">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground font-['Space_Grotesk']">
                Prediction <span className="text-glow text-primary">Markets</span>
              </h1>
              <p className="text-xs text-muted-foreground mt-1">Trade on DePIN outcomes</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
              {/* Stats pills */}
              <div className="hidden sm:flex items-center gap-1">
                <span className="rounded-full bg-secondary px-3 py-1.5 text-[11px] font-bold text-foreground">
                  {stats.total} <span className="text-muted-foreground font-medium">markets</span>
                </span>
                <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1.5 text-[11px] font-bold text-primary">
                  {stats.totalVotes.toLocaleString()} <span className="font-medium opacity-70">votes</span>
                </span>
              </div>
              {user ? (
                <Button onClick={() => setShowCreate(true)} className="gap-1.5 rounded-xl font-bold">
                  <Plus className="h-4 w-4" /> New Question
                </Button>
              ) : (
                <Link to="/auth" className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground">
                  <LogIn className="h-3.5 w-3.5" /> Sign in
                </Link>
              )}
            </motion.div>
          </div>

          {/* Featured forecast */}
          {featuredForecast && !isLoading && (
            <FeaturedForecast
              forecast={featuredForecast}
              onVote={handleVote}
              isAuthenticated={!!user}
            />
          )}
        </div>
      </section>

      {/* ── Controls ── */}
      <section className="sticky top-16 z-30 border-y border-border bg-background/90 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search markets..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="h-9 flex-1 max-w-xs text-xs bg-secondary/50 border-border rounded-xl"
            />

            {/* Sort pills */}
            <div className="hidden sm:flex items-center gap-1">
              {sortOptions.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => { setSort(value); setPage(1); }}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold transition-all whitespace-nowrap ${
                    sort === value
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="h-3 w-3" /> {label}
                </button>
              ))}
            </div>

            <div className="hidden sm:block w-px h-5 bg-border" />

            {/* Status pills */}
            <div className="hidden sm:flex items-center gap-1">
              {(["all", "active", "ended"] as ForecastStatusFilter[]).map((status) => (
                <button
                  key={status}
                  onClick={() => { setStatusFilter(status); setPage(1); }}
                  className={`rounded-xl px-3 py-1.5 text-[11px] font-bold capitalize transition-all ${
                    statusFilter === status
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Mobile dropdowns */}
            <div className="flex sm:hidden items-center gap-1.5">
              <Select value={sort} onValueChange={(v) => { setSort(v as ForecastSortOption); setPage(1); }}>
                <SelectTrigger className="h-8 w-auto text-[11px] bg-secondary/50 border-border rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{sortOptions.map(({ value, label }) => (<SelectItem key={value} value={value}>{label}</SelectItem>))}</SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as ForecastStatusFilter); setPage(1); }}>
                <SelectTrigger className="h-8 w-auto text-[11px] bg-secondary/50 border-border rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="ended">Ended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Project filter */}
            <Select value={projectFilter || "all"} onValueChange={(v) => { setProjectFilter(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="h-9 w-[140px] sm:w-[180px] text-[11px] bg-secondary/50 border-border rounded-xl shrink-0">
                <Filter className="h-3 w-3 mr-1 text-muted-foreground" />
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" sideOffset={4}>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      {p.logo_url ? (
                        <img src={p.logo_url} alt={p.name} className="w-4 h-4 rounded object-contain" />
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
              <button onClick={() => { setProjectFilter(""); setPage(1); }} className="flex items-center gap-1 rounded-xl bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/15 transition-colors whitespace-nowrap shrink-0">
                {projects.find(p => p.id === projectFilter)?.name} <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Grid ── */}
      <section className="container mx-auto px-4 py-8 flex-1">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-border bg-card overflow-hidden">
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-xl bg-secondary" /><div className="h-3 w-24 bg-secondary rounded" /></div>
                  <div className="h-4 w-3/4 bg-secondary rounded" />
                  <div className="h-8 w-20 bg-secondary rounded mt-4" />
                  <div className="h-1.5 w-full bg-secondary rounded-full" />
                </div>
                <div className="h-12 border-t border-border bg-secondary/20" />
              </div>
            ))}
          </div>
        ) : forecasts.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">No markets yet</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">Create the first prediction market for DePIN projects.</p>
            {user ? (
              <Button onClick={() => setShowCreate(true)} className="gap-1.5 rounded-xl font-bold"><Plus className="h-3.5 w-3.5" /> New Question</Button>
            ) : (
              <Link to="/auth" className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground"><LogIn className="h-3.5 w-3.5" /> Sign in</Link>
            )}
          </motion.div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {forecasts.map((forecast, i) => (
                  <ForecastCard key={forecast.id} forecast={forecast} onVote={handleVote} isAuthenticated={!!user} index={i} />
                ))}
              </AnimatePresence>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button key={pageNum} onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                          page === pageNum ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`}
                      >{pageNum}</button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="font-['Space_Grotesk'] font-black">New Question</DialogTitle>
            {(title || description) && (
              <Button variant="ghost" size="sm" onClick={() => { setTitle(""); setDescription(""); }} className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground -mt-1">
                <RotateCcw className="h-3 w-3" /> Reset
              </Button>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Question *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Will Hivemapper surpass Helium nodes by 2026?" className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Context</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Additional context about this prediction..." className="mt-1.5 min-h-[80px] resize-none rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Project A *</label>
                <Select value={projectAId} onValueChange={setProjectAId}>
                  <SelectTrigger className="mt-1.5 h-9 rounded-xl"><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false} className="max-h-60">
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-2">
                          {p.logo_url ? <img src={p.logo_url} alt={p.name} className="w-5 h-5 rounded object-contain" /> : <span className="w-5 h-5 flex items-center justify-center text-sm">{p.logo_emoji}</span>}
                          {p.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Project B <span className="normal-case text-muted-foreground/60">(optional)</span></label>
                <Select value={projectBId} onValueChange={setProjectBId}>
                  <SelectTrigger className="mt-1.5 h-9 rounded-xl"><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false} className="max-h-60">
                    <SelectItem value="none">None</SelectItem>
                    {projects.filter((p) => p.id !== projectAId).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-2">
                          {p.logo_url ? <img src={p.logo_url} alt={p.name} className="w-5 h-5 rounded object-contain" /> : <span className="w-5 h-5 flex items-center justify-center text-sm">{p.logo_emoji}</span>}
                          {p.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Resolution Date *</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={new Date().toISOString().split("T")[0]} className="mt-1.5 rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleCreate} disabled={createForecast.isPending} className="rounded-xl font-bold">
              {createForecast.isPending ? "Creating..." : "Create Market"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Forecasts;

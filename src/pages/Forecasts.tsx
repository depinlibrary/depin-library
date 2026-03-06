import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, ThumbsUp, ThumbsDown, Plus, TrendingUp, Clock, Flame, ChevronLeft, ChevronRight, LogIn } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useForecasts, useCreateForecast, useVoteForecast, type ForecastSortOption, type Forecast } from "@/hooks/useForecasts";
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

const ForecastCard = ({ forecast, onVote, isAuthenticated }: {
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
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-border hover:shadow-lg hover:shadow-background/10"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground leading-snug flex-1 pr-3">
          {forecast.title}
        </h3>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
          isEnded
            ? "bg-muted text-muted-foreground"
            : "bg-primary/10 text-primary"
        }`}>
          {timeLeft}
        </span>
      </div>

      {forecast.description && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{forecast.description}</p>
      )}

      {/* Projects */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <Link
          to={`/project/${forecast.project_a_slug}`}
          className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-foreground hover:bg-secondary/80 transition-colors"
        >
          {forecast.project_a_name}
        </Link>
        {forecast.project_b_name && (
          <Link
            to={`/project/${forecast.project_b_slug}`}
            className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-foreground hover:bg-secondary/80 transition-colors"
          >
            {forecast.project_b_name}
          </Link>
        )}
      </div>

      {/* Vote bars */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-green-400">YES {yesPct.toFixed(0)}%</span>
          <span className="font-semibold text-red-400">NO {noPct.toFixed(0)}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-secondary overflow-hidden flex">
          <div
            className="h-full bg-green-500 transition-all duration-500"
            style={{ width: `${yesPct}%` }}
          />
          <div
            className="h-full bg-red-500 transition-all duration-500"
            style={{ width: `${noPct}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground text-center">
          {totalVotes.toLocaleString()} vote{totalVotes !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Vote buttons */}
      {!isEnded && (
        <div className="flex gap-2">
          <button
            onClick={() => isAuthenticated ? onVote(forecast.id, "yes") : toast.error("Sign in to vote")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
              forecast.user_vote === "yes"
                ? "border-green-500/50 bg-green-500/15 text-green-400"
                : "border-border bg-card text-muted-foreground hover:border-green-500/30 hover:text-green-400"
            }`}
          >
            <ThumbsUp className="h-3.5 w-3.5" /> Yes
          </button>
          <button
            onClick={() => isAuthenticated ? onVote(forecast.id, "no") : toast.error("Sign in to vote")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
              forecast.user_vote === "no"
                ? "border-red-500/50 bg-red-500/15 text-red-400"
                : "border-border bg-card text-muted-foreground hover:border-red-500/30 hover:text-red-400"
            }`}
          >
            <ThumbsDown className="h-3.5 w-3.5" /> No
          </button>
        </div>
      )}
    </motion.div>
  );
};

const Forecasts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: projects = [] } = useProjects();
  const [sort, setSort] = useState<ForecastSortOption>("newest");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useForecasts(sort, page, PAGE_SIZE);
  const createForecast = useCreateForecast();
  const voteForecast = useVoteForecast();
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectAId, setProjectAId] = useState("");
  const [projectBId, setProjectBId] = useState("");
  const [endDate, setEndDate] = useState("");

  const forecasts = data?.forecasts || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

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
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-28 pb-8">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="gradient-radial-top absolute inset-0" />
        <div className="container relative mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              DePIN <span className="text-glow text-primary">Forecasts</span>
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
              Community predictions about the future of DePIN projects. Vote on outcomes and shape ecosystem sentiment.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Controls */}
      <section className="sticky top-16 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            {sortOptions.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => { setSort(value); setPage(1); }}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-all ${
                  sort === value
                    ? "border border-border bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3 w-3" /> {label}
              </button>
            ))}
          </div>
          {user ? (
            <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
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
      <section className="container mx-auto px-4 py-8 pb-20">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-border bg-card h-52" />
            ))}
          </div>
        ) : forecasts.length === 0 ? (
          <div className="text-center py-16">
            <TrendingUp className="mx-auto h-10 w-10 text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground">No forecasts yet. Be the first to create one!</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {forecasts.map((forecast) => (
                  <ForecastCard
                    key={forecast.id}
                    forecast={forecast}
                    onVote={handleVote}
                    isAuthenticated={!!user}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </button>
                <span className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
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
            <DialogTitle>Create Forecast</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Title *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Will Hivemapper surpass Helium nodes by 2026?"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional context about this prediction..."
                className="mt-1 min-h-[80px] resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">Project A *</label>
                <Select value={projectAId} onValueChange={setProjectAId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Project B (optional)</label>
                <Select value={projectBId} onValueChange={setProjectBId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {projects.filter((p) => p.id !== projectAId).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">End Date *</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="mt-1"
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

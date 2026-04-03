import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProjects } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Pencil, Trash2, Clock, AlertTriangle, CheckCircle, XCircle, BarChart3, Users, Trophy, Activity, TrendingUp, ArrowDownRight, CheckCircle2, Vote } from "lucide-react";

type UserForecast = {
  id: string;
  title: string;
  description: string;
  project_a_id: string;
  project_b_id: string | null;
  end_date: string;
  status: string;
  total_votes_yes: number;
  total_votes_no: number;
  created_at: string;
};

function isWithin24Hours(createdAt: string): boolean {
  const created = new Date(createdAt).getTime();
  return Date.now() - created < 24 * 60 * 60 * 1000;
}

function timeLeftToEdit(createdAt: string): string {
  const remaining = new Date(createdAt).getTime() + 24 * 60 * 60 * 1000 - Date.now();
  if (remaining <= 0) return "";
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const mins = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  return `${hours}h ${mins}m to edit`;
}

function getTimeRemaining(endDate: string): string {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 30) return `${Math.floor(days / 30)}mo left`;
  if (days > 0) return `${days}d left`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  return `${hours}h left`;
}

export default function MyForecasts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: projects = [] } = useProjects();
  const [editForecast, setEditForecast] = useState<UserForecast | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [deleteRequestForecast, setDeleteRequestForecast] = useState<UserForecast | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "ended">("all");
  const [sortBy, setSortBy] = useState<"newest" | "votes" | "ending">("newest");
  const [viewTab, setViewTab] = useState<"created" | "voted">("created");

  // Created forecasts
  const { data: forecasts = [], isLoading } = useQuery({
    queryKey: ["my-forecasts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("forecasts")
        .select("*")
        .eq("creator_user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as UserForecast[];
    },
    enabled: !!user,
  });

  // Voted-on forecasts
  const { data: votedForecasts = [], isLoading: votedLoading } = useQuery({
    queryKey: ["my-voted-forecasts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Get all user votes
      const { data: votes, error: votesError } = await supabase
        .from("forecast_votes")
        .select("forecast_id, vote, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (votesError) throw votesError;
      if (!votes || votes.length === 0) return [];

      const forecastIds = votes.map(v => v.forecast_id);
      const { data: fData, error: fError } = await supabase
        .from("forecasts")
        .select("*")
        .in("id", forecastIds);
      if (fError) throw fError;

      const voteMap: Record<string, { vote: string; created_at: string }> = {};
      votes.forEach(v => { voteMap[v.forecast_id] = { vote: v.vote, created_at: v.created_at }; });

      return (fData || []).map((f: any) => ({
        ...f,
        user_vote: voteMap[f.id]?.vote,
        voted_at: voteMap[f.id]?.created_at,
      })).sort((a: any, b: any) => new Date(b.voted_at).getTime() - new Date(a.voted_at).getTime());
    },
    enabled: !!user,
  });

  // Fetch dimensions for all user forecasts
  const allForecastIds = [...forecasts.map(f => f.id), ...votedForecasts.map((f: any) => f.id)];
  const { data: dimensionsMap = {} } = useQuery({
    queryKey: ["my-forecast-dimensions", allForecastIds],
    enabled: allForecastIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forecast_targets")
        .select("forecast_id, dimension")
        .in("forecast_id", allForecastIds);
      if (error) throw error;
      const map: Record<string, string[]> = {};
      (data || []).forEach((d: any) => {
        if (!map[d.forecast_id]) map[d.forecast_id] = [];
        map[d.forecast_id].push(d.dimension);
      });
      return map;
    },
  });

  const { data: deletionRequests = [] } = useQuery({
    queryKey: ["my-deletion-requests", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("forecast_deletion_requests")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, title, description }: { id: string; title: string; description: string }) => {
      const { error } = await supabase
        .from("forecasts")
        .update({ title, description })
        .eq("id", id)
        .eq("creator_user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prediction updated");
      queryClient.invalidateQueries({ queryKey: ["my-forecasts"] });
      queryClient.invalidateQueries({ queryKey: ["forecasts"] });
      setEditForecast(null);
    },
    onError: () => toast.error("Failed to update prediction"),
  });

  const deletionRequestMutation = useMutation({
    mutationFn: async ({ forecastId, reason }: { forecastId: string; reason: string }) => {
      const { error } = await supabase
        .from("forecast_deletion_requests")
        .insert({ forecast_id: forecastId, user_id: user!.id, reason });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deletion request submitted for admin review");
      queryClient.invalidateQueries({ queryKey: ["my-deletion-requests"] });
      setDeleteRequestForecast(null);
      setDeleteReason("");
    },
    onError: () => toast.error("Failed to submit deletion request"),
  });

  const projectMap = new Map((projects as any[]).map((p) => [p.id, p]));
  const getDeletionStatus = (forecastId: string) => deletionRequests.find((r: any) => r.forecast_id === forecastId);

  const filterAndSort = (list: any[]) => {
    return list
      .filter((f) => {
        if (statusFilter === "all") return true;
        const isEnded = new Date(f.end_date) <= new Date();
        return statusFilter === "ended" ? isEnded : !isEnded;
      })
      .sort((a, b) => {
        if (sortBy === "votes") return (b.total_votes_yes + b.total_votes_no) - (a.total_votes_yes + a.total_votes_no);
        if (sortBy === "ending") return new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  };

  const filteredCreated = filterAndSort(forecasts);
  const filteredVoted = filterAndSort(votedForecasts.filter((vf: any) => !forecasts.some(cf => cf.id === vf.id)));

  const activeCreated = forecasts.filter((f) => new Date(f.end_date) > new Date()).length;
  const votedCount = votedForecasts.filter((vf: any) => !forecasts.some(cf => cf.id === vf.id)).length;

  if (!user) return null;

  const renderForecastCard = (f: any, i: number, isVotedView: boolean) => {
    const projA = projectMap.get(f.project_a_id) as any;
    const projB = f.project_b_id ? (projectMap.get(f.project_b_id) as any) : null;
    const canEdit = !isVotedView && isWithin24Hours(f.created_at);
    const editTimeStr = timeLeftToEdit(f.created_at);
    const deletionReq = getDeletionStatus(f.id);
    const isEnded = new Date(f.end_date) <= new Date();
    const totalVotes = f.total_votes_yes + f.total_votes_no;
    const yesPct = (() => { const wy = Number(f.weighted_votes_yes) || 0; const wn = Number(f.weighted_votes_no) || 0; const wt = wy + wn; return wt > 0 ? (wy / wt) * 100 : totalVotes > 0 ? (f.total_votes_yes / totalVotes) * 100 : 50; })();
    const noPct = 100 - yesPct;
    const timeLeft = getTimeRemaining(f.end_date);
    const finalResult = isEnded ? (f.outcome || (yesPct >= 50 ? "yes" : "no")) : null;
    const dims = (dimensionsMap as Record<string, string[]>)[f.id] || [];
    const isPriceMarket = dims.some(d => d === "token_price" || d === "market_cap");
    const isSentimentDual = dims.some(d => d === "community_sentiment") && !!projB;
    const yesLabel = isPriceMarket ? "Long" : isSentimentDual ? (projA?.name || "Yes") : "Yes";
    const noLabel = isPriceMarket ? "Short" : isSentimentDual ? (projB?.name || "No") : "No";

    const userVote = isVotedView ? f.user_vote : null;
    const userCorrect = isVotedView && isEnded && finalResult ? finalResult === userVote : null;

    return (
      <motion.div
        key={f.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ delay: i * 0.05, duration: 0.4 }}
        className="group relative rounded-xl border border-border bg-card overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 h-full flex flex-col"
      >
        <div className="p-4 flex-1 flex flex-col">
          {/* Header: logos + time */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center -space-x-1.5">
                {projA?.logo_url ? (
                  <img src={projA.logo_url} alt={projA.name} className="w-7 h-7 rounded-lg object-contain border border-card bg-secondary relative z-10" />
                ) : (
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs border border-card bg-secondary relative z-10">{projA?.logo_emoji || "⬡"}</span>
                )}
                {projB && (
                  projB.logo_url ? (
                    <img src={projB.logo_url} alt={projB.name} className="w-7 h-7 rounded-lg object-contain border border-card bg-secondary relative z-0" />
                  ) : (
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs border border-card bg-secondary relative z-0">{projB?.logo_emoji || "⬡"}</span>
                  )
                )}
              </div>
              <div className="flex items-center gap-1">
                {projA && <span className="text-[11px] font-medium text-muted-foreground">{projA.name}</span>}
                {projB && (
                  <>
                    <span className="text-muted-foreground/40 text-[9px]">vs</span>
                    <span className="text-[11px] font-medium text-muted-foreground">{projB.name}</span>
                  </>
                )}
              </div>
            </div>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isEnded ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600 dark:text-green-400'}`}>
              {timeLeft}
            </span>
          </div>

          {/* Title */}
          <Link to={`/forecasts/${f.id}`} className="block mb-auto">
            <h3 className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2 group-hover:underline transition-all duration-200">
              {f.title}
            </h3>
          </Link>

          {/* Percentage + votes */}
          <div className="mt-4 flex items-end justify-between">
            <span className="text-lg font-bold text-foreground tabular-nums">{yesPct.toFixed(0)}%<span className="text-xs font-normal text-muted-foreground ml-1">chance</span></span>
            <span className="text-[10px] text-muted-foreground">{totalVotes.toLocaleString()} vote{totalVotes !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Bottom section */}
        <div className="px-4 pb-4">
          {/* Voted view: user vote result indicator */}
          {isVotedView && userVote && (
            <div className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-[10px] font-semibold mb-2 ${
              !isEnded
                ? "bg-secondary text-muted-foreground border border-border"
                : userCorrect
                  ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                  : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}>
              <span>You voted {userVote === "yes" ? yesLabel : noLabel}</span>
              {isEnded && (
                <span className="flex items-center gap-1">
                  {userCorrect ? (
                    <><CheckCircle2 className="h-3 w-3" /> Correct</>
                  ) : (
                    <><XCircle className="h-3 w-3" /> Incorrect</>
                  )}
                </span>
              )}
              {!isEnded && <span className="text-[9px]">Pending</span>}
            </div>
          )}

          {/* Ended result banner — created view */}
          {isEnded && !isVotedView && (
            <div className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-[10px] font-semibold mb-2 ${
              finalResult === "yes"
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}>
              <span className="flex items-center gap-1">
                <Trophy className="h-3 w-3" />
                Result: {finalResult === "yes" ? yesLabel : noLabel} ({finalResult === "yes" ? yesPct.toFixed(0) : noPct.toFixed(0)}%)
              </span>
            </div>
          )}

          {/* Vote buttons */}
          <div className="flex gap-2">
            <span className={`flex-1 rounded-lg py-2 text-xs font-bold text-center ${
              isEnded ? "bg-secondary text-muted-foreground opacity-60" : "bg-primary/10 text-primary"
            }`}>{yesLabel}</span>
            <span className={`flex-1 rounded-lg py-2 text-xs font-bold text-center ${
              isEnded ? "bg-secondary text-muted-foreground opacity-60" : "bg-destructive/10 text-destructive"
            }`}>{noLabel}</span>
          </div>

          {/* Edit/Delete actions — only for created view */}
          {!isVotedView && canEdit && editTimeStr && (
            <div className="flex items-center gap-1 text-[10px] text-amber-500 mt-2">
              <Clock className="h-3 w-3" />
              {editTimeStr}
            </div>
          )}
          {!isVotedView && deletionReq && (
            <div className={`flex items-center gap-1 text-[10px] mt-2 ${
              deletionReq.status === "pending" ? "text-amber-500" :
              deletionReq.status === "approved" ? "text-green-500" :
              "text-destructive"
            }`}>
              {deletionReq.status === "pending" && <><AlertTriangle className="h-3 w-3" /> Deletion pending</>}
              {deletionReq.status === "approved" && <><CheckCircle className="h-3 w-3" /> Deletion approved</>}
              {deletionReq.status === "denied" && <><XCircle className="h-3 w-3" /> Denied{deletionReq.admin_response ? `: ${deletionReq.admin_response}` : ""}</>}
            </div>
          )}
          {!isVotedView && !isEnded && (
            <div className="flex mt-2 border-t border-border pt-2">
              {canEdit ? (
                <button
                  onClick={() => {
                    setEditForecast(f);
                    setEditTitle(f.title);
                    setEditDescription(f.description);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-all"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
              ) : !deletionReq ? (
                <button
                  onClick={() => {
                    setDeleteRequestForecast(f);
                    setDeleteReason("");
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 className="h-3 w-3" /> Request Deletion
                </button>
              ) : (
                <div className="flex-1 flex items-center justify-center py-1.5 text-[10px] text-muted-foreground">
                  Pending review
                </div>
              )}
              <div className="w-px bg-border" />
              <Link
                to={`/forecasts/${f.id}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-all"
              >
                View Details
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const currentList = viewTab === "created" ? filteredCreated : filteredVoted;
  const currentLoading = viewTab === "created" ? isLoading : votedLoading;

  // Stats for voted tab
  const votedEnded = votedForecasts.filter((vf: any) => !forecasts.some(cf => cf.id === vf.id) && new Date(vf.end_date) <= new Date());
  const votedCorrect = votedEnded.filter((vf: any) => {
    const totalVotes = vf.total_votes_yes + vf.total_votes_no;
    const wy = Number(vf.weighted_votes_yes) || 0;
    const wn = Number(vf.weighted_votes_no) || 0;
    const wt = wy + wn;
    const yesPct = wt > 0 ? (wy / wt) * 100 : totalVotes > 0 ? (vf.total_votes_yes / totalVotes) * 100 : 50;
    const result = vf.outcome || (yesPct >= 50 ? "yes" : "no");
    return result === vf.user_vote;
  });
  const accuracy = votedEnded.length > 0 ? Math.round((votedCorrect.length / votedEnded.length) * 100) : 0;

  return (
    <div className="group relative rounded-xl border border-border bg-card overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-[60px] bg-primary/3 pointer-events-none" />

      {/* Header */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 md:p-5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Activity className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">My Forecasts</h2>
            <p className="text-[10px] text-muted-foreground">
              {forecasts.length} created · {votedCount} voted on
              {votedEnded.length > 0 && ` · ${accuracy}% accuracy`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Created / Voted tab */}
          <div className="flex items-center gap-0.5 rounded-lg bg-secondary/40 p-0.5">
            <button
              onClick={() => setViewTab("created")}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all flex items-center gap-1 ${
                viewTab === "created"
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 className="h-3 w-3" /> Created
            </button>
            <button
              onClick={() => setViewTab("voted")}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all flex items-center gap-1 ${
                viewTab === "voted"
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Vote className="h-3 w-3" /> Voted On
              {votedCount > 0 && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{votedCount}</span>}
            </button>
          </div>

          <div className="flex items-center gap-0.5 rounded-lg bg-secondary/40 p-0.5">
            {([
              { key: "all" as const, label: "All" },
              { key: "active" as const, label: "Active" },
              { key: "ended" as const, label: "Ended" },
            ]).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setStatusFilter(opt.key)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                  statusFilter === opt.key
                    ? "bg-card text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="h-8 w-[130px] text-[11px] focus:ring-0 focus:ring-offset-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="bottom" avoidCollisions={false}>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="votes">Most votes</SelectItem>
              <SelectItem value="ending">Ending soon</SelectItem>
            </SelectContent>
          </Select>
          <Link to="/forecasts?create=true">
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Forecast</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Voted tab stats summary */}
      {viewTab === "voted" && votedEnded.length > 0 && (
        <div className="mx-4 md:mx-5 mb-3 flex items-center gap-4 rounded-lg bg-secondary/30 p-3">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            <span className="text-xs font-semibold text-foreground">{votedCorrect.length} Correct</span>
          </div>
          <div className="flex items-center gap-1.5">
            <XCircle className="h-3.5 w-3.5 text-destructive" />
            <span className="text-xs font-semibold text-foreground">{votedEnded.length - votedCorrect.length} Incorrect</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <span className="text-xs text-muted-foreground">{accuracy}% accuracy from {votedEnded.length} resolved</span>
        </div>
      )}

      {/* Content */}
      {currentLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : currentList.length === 0 ? (
        <div className="p-8 md:p-12 text-center">
          <div className="mx-auto h-10 w-10 rounded-xl bg-secondary/50 flex items-center justify-center mb-3">
            {viewTab === "created" ? <BarChart3 className="h-5 w-5 text-muted-foreground/30" /> : <Vote className="h-5 w-5 text-muted-foreground/30" />}
          </div>
          <p className="text-sm font-medium text-foreground mb-1">
            {viewTab === "created" ? "No forecasts created" : "No voted forecasts"}
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            {viewTab === "created" ? "Create your first prediction to get started" : "Vote on forecasts to track your predictions here"}
          </p>
          <Link to="/forecasts">
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
              {viewTab === "created" ? "Create Forecast" : "Browse Forecasts"}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="px-4 pb-4 md:px-5 md:pb-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {currentList.map((f, i) => renderForecastCard(f, i, viewTab === "voted"))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editForecast} onOpenChange={(open) => !open && setEditForecast(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Forecast</DialogTitle>
            <DialogDescription>Update the title and description of your forecast.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Title</label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="mt-1" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditForecast(null)}>Cancel</Button>
            <Button
              onClick={() => editForecast && editMutation.mutate({ id: editForecast.id, title: editTitle, description: editDescription })}
              disabled={!editTitle.trim() || editMutation.isPending}
            >
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deletion Request Dialog */}
      <Dialog open={!!deleteRequestForecast} onOpenChange={(open) => !open && setDeleteRequestForecast(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Forecast Deletion</DialogTitle>
            <DialogDescription>
              This forecast is past the 24-hour edit window. Please provide a reason for deletion. An admin will review your request.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-sm font-medium text-foreground">Reason for deletion</label>
            <Textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Explain why this forecast should be deleted..."
              className="mt-1"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRequestForecast(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteRequestForecast && deletionRequestMutation.mutate({ forecastId: deleteRequestForecast.id, reason: deleteReason })}
              disabled={!deleteReason.trim() || deletionRequestMutation.isPending}
            >
              {deletionRequestMutation.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
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
import { Pencil, Trash2, Clock, AlertTriangle, CheckCircle, XCircle, BarChart3, Users, Trophy, Activity, TrendingUp, ArrowDownRight, CheckCircle2 } from "lucide-react";

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

  // Fetch dimensions for all user forecasts
  const forecastIds = forecasts.map((f) => f.id);
  const { data: dimensionsMap = {} } = useQuery({
    queryKey: ["my-forecast-dimensions", forecastIds],
    enabled: forecastIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forecast_targets")
        .select("forecast_id, dimension")
        .in("forecast_id", forecastIds);
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
      toast.success("Forecast updated");
      queryClient.invalidateQueries({ queryKey: ["my-forecasts"] });
      queryClient.invalidateQueries({ queryKey: ["forecasts"] });
      setEditForecast(null);
    },
    onError: () => toast.error("Failed to update forecast"),
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

  const filteredForecasts = forecasts
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

  const activeCount = forecasts.filter((f) => new Date(f.end_date) > new Date()).length;
  const endedCount = forecasts.length - activeCount;

  if (!user) return null;

  return (
    <div className="group relative rounded-xl border border-border bg-card overflow-hidden">
      {/* Decorative corner accent */}
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
              {forecasts.length} forecast{forecasts.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : forecasts.length === 0 ? (
        <div className="p-8 md:p-12 text-center">
          <div className="mx-auto h-10 w-10 rounded-xl bg-secondary/50 flex items-center justify-center mb-3">
            <BarChart3 className="h-5 w-5 text-muted-foreground/30" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">No forecasts yet</p>
          <p className="text-xs text-muted-foreground mb-3">Create your first prediction to get started</p>
          <Link to="/forecasts?create=true">
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">Create Forecast</Button>
          </Link>
        </div>
      ) : (
        <div className="px-4 pb-4 md:px-5 md:pb-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {filteredForecasts.map((f, i) => {
                const projA = projectMap.get(f.project_a_id) as any;
                const projB = f.project_b_id ? (projectMap.get(f.project_b_id) as any) : null;
                const canEdit = isWithin24Hours(f.created_at);
                const editTimeStr = timeLeftToEdit(f.created_at);
                const deletionReq = getDeletionStatus(f.id);
                const isEnded = new Date(f.end_date) <= new Date();
                const totalVotes = f.total_votes_yes + f.total_votes_no;
                const yesPct = totalVotes > 0 ? (f.total_votes_yes / totalVotes) * 100 : 50;
                const noPct = 100 - yesPct;
                const timeLeft = getTimeRemaining(f.end_date);
                const finalResult = isEnded ? (yesPct >= 50 ? "yes" : "no") : null;
                const dims = (dimensionsMap as Record<string, string[]>)[f.id] || [];
                const isPriceMarket = dims.some(d => d === "token_price" || d === "market_cap");
                const isSentimentDual = dims.some(d => d === "community_sentiment") && !!projB;
                const yesLabel = isPriceMarket ? "Long" : isSentimentDual ? (projA?.name || "Yes") : "Yes";
                const noLabel = isPriceMarket ? "Short" : isSentimentDual ? (projB?.name || "No") : "No";

                return (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.4 }}
                    className="group relative rounded-xl border border-border bg-card overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 h-full flex flex-col"
                  >
                    <div className="p-5 flex-1 flex flex-col">
                      {/* Header row: logos + time */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex items-center -space-x-2">
                            {projA?.logo_url ? (
                              <img src={projA.logo_url} alt={projA.name} className="w-9 h-9 rounded-lg object-contain border border-card bg-secondary relative z-10" />
                            ) : (
                              <span className="w-9 h-9 rounded-lg flex items-center justify-center text-sm border border-card bg-secondary relative z-10">{projA?.logo_emoji || "⬡"}</span>
                            )}
                            {projB && (
                              projB.logo_url ? (
                                <img src={projB.logo_url} alt={projB.name} className="w-9 h-9 rounded-lg object-contain border border-card bg-secondary relative z-0" />
                              ) : (
                                <span className="w-9 h-9 rounded-lg flex items-center justify-center text-sm border border-card bg-secondary relative z-0">{projB?.logo_emoji || "⬡"}</span>
                              )
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {projA && (
                              <Link to={`/project/${projA.slug}`} className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">{projA.name}</Link>
                            )}
                            {projB && (
                              <>
                                <span className="text-muted-foreground/40 text-[10px]">vs</span>
                                <Link to={`/project/${projB.slug}`} className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">{projB.name}</Link>
                              </>
                            )}
                          </div>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${isEnded ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600 dark:text-green-400'}`}>
                          {timeLeft}
                        </span>
                      </div>

                      {/* Title */}
                      <Link to={`/forecasts/${f.id}`} className="block mb-auto">
                        <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:underline transition-all duration-200">
                          {f.title}
                        </h3>
                      </Link>

                      {/* Percentage + bar */}
                      <div className="mt-5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xl font-bold text-foreground">{yesPct.toFixed(0)}% chance</span>
                          <span className="text-xs text-muted-foreground">{totalVotes.toLocaleString()} vote{totalVotes !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="h-2 rounded-full bg-secondary overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${yesPct}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="h-full rounded-full bg-primary"
                          />
                        </div>
                      </div>

                      {/* Status indicators */}
                      {canEdit && editTimeStr && (
                        <div className="flex items-center gap-1 text-[10px] text-amber-500 mt-2">
                          <Clock className="h-3 w-3" />
                          {editTimeStr}
                        </div>
                      )}
                      {deletionReq && (
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
                    </div>

                    {/* Bottom section */}
                    <div className="px-5 pb-5">
                      {/* Ended result banner */}
                      {isEnded && (
                        <div className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-[11px] font-semibold mb-2 ${
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

                      {/* Vote buttons — always shown, disabled when ended */}
                      <div className="flex gap-2.5">
                        <span className={`flex-1 rounded-lg py-2.5 text-sm font-bold text-center transition-all duration-200 ${
                          isEnded
                            ? "bg-secondary text-muted-foreground cursor-not-allowed opacity-60"
                            : "bg-primary/10 text-primary"
                        }`}>
                          {isPriceMarket && <TrendingUp className="h-3.5 w-3.5 inline mr-1" />}
                          {yesLabel}
                        </span>
                        <span className={`flex-1 rounded-lg py-2.5 text-sm font-bold text-center transition-all duration-200 ${
                          isEnded
                            ? "bg-secondary text-muted-foreground cursor-not-allowed opacity-60"
                            : "bg-destructive/10 text-destructive"
                        }`}>
                          {isPriceMarket && <ArrowDownRight className="h-3.5 w-3.5 inline mr-1" />}
                          {noLabel}
                        </span>
                      </div>

                      {/* Edit/Delete actions */}
                      {!isEnded && (
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
              })}
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

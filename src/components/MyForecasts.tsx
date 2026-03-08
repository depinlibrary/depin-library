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
import ProjectLogo from "@/components/ProjectLogo";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Pencil, Trash2, Clock, Eye, AlertTriangle, CheckCircle, XCircle, BarChart3 } from "lucide-react";
import { format } from "date-fns";

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
  const now = Date.now();
  return now - created < 24 * 60 * 60 * 1000;
}

function timeLeftToEdit(createdAt: string): string {
  const created = new Date(createdAt).getTime();
  const deadline = created + 24 * 60 * 60 * 1000;
  const remaining = deadline - Date.now();
  if (remaining <= 0) return "";
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const mins = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  return `${hours}h ${mins}m left to edit`;
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

  const getDeletionStatus = (forecastId: string) => {
    return deletionRequests.find((r: any) => r.forecast_id === forecastId);
  };

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl border border-border bg-card p-6"
    >
      <div className="mb-4 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">My Forecasts</h2>
        <span className="ml-auto text-xs text-muted-foreground">{forecasts.length} forecast{forecasts.length !== 1 ? "s" : ""}</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : forecasts.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          You haven't created any forecasts yet.{" "}
          <Link to="/forecasts?create=true" className="text-primary hover:underline">Create one</Link>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {forecasts.map((f, i) => {
              const projA = projectMap.get(f.project_a_id) as any;
              const projB = f.project_b_id ? (projectMap.get(f.project_b_id) as any) : null;
              const canEdit = isWithin24Hours(f.created_at);
              const editTimeLeft = timeLeftToEdit(f.created_at);
              const deletionReq = getDeletionStatus(f.id);
              const isEnded = new Date(f.end_date) < new Date();
              const totalVotes = f.total_votes_yes + f.total_votes_no;
              const yesPct = totalVotes > 0 ? Math.round((f.total_votes_yes / totalVotes) * 100) : 50;

              return (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {projA && (
                          <ProjectLogo
                            logoUrl={projA.logo_url}
                            logoEmoji={projA.logo_emoji}
                            name={projA.name}
                            size="sm"
                          />
                        )}
                        {projB && (
                          <>
                            <span className="text-xs text-muted-foreground">vs</span>
                            <ProjectLogo
                              logoUrl={projB.logo_url}
                              logoEmoji={projB.logo_emoji}
                              name={projB.name}
                              size="xs"
                            />
                          </>
                        )}
                        <span className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          isEnded ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                        }`}>
                          {isEnded ? "Ended" : "Active"}
                        </span>
                      </div>

                      <Link to={`/forecasts/${f.id}`} className="block">
                        <h3 className="text-sm font-medium text-foreground line-clamp-2 hover:text-primary transition-colors">
                          {f.title}
                        </h3>
                      </Link>

                      {f.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{f.description}</p>
                      )}

                      <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span>{format(new Date(f.created_at), "MMM d, yyyy")}</span>
                        <span>·</span>
                        <span>{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</span>
                        <span>·</span>
                        <span className="text-primary">{yesPct}% Yes</span>
                      </div>

                      {/* Vote progress bar */}
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${yesPct}%` }}
                        />
                      </div>

                      {/* Edit time remaining indicator */}
                      {canEdit && editTimeLeft && (
                        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-500">
                          <Clock className="h-3 w-3" />
                          {editTimeLeft}
                        </div>
                      )}

                      {/* Deletion request status */}
                      {deletionReq && (
                        <div className={`mt-1.5 flex items-center gap-1 text-[10px] ${
                          deletionReq.status === "pending" ? "text-amber-500" :
                          deletionReq.status === "approved" ? "text-green-500" :
                          "text-destructive"
                        }`}>
                          {deletionReq.status === "pending" && <><AlertTriangle className="h-3 w-3" /> Deletion pending review</>}
                          {deletionReq.status === "approved" && <><CheckCircle className="h-3 w-3" /> Deletion approved</>}
                          {deletionReq.status === "denied" && <><XCircle className="h-3 w-3" /> Deletion denied{deletionReq.admin_response ? `: ${deletionReq.admin_response}` : ""}</>}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <Link to={`/forecasts/${f.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditForecast(f);
                            setEditTitle(f.title);
                            setEditDescription(f.description);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {!canEdit && !deletionReq && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            setDeleteRequestForecast(f);
                            setDeleteReason("");
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
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
    </motion.div>
  );
}

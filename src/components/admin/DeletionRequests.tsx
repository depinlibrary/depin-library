import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { createNotification } from "@/hooks/useNotifications";
import { Check, X, Clock, Trash2 } from "lucide-react";
import { format } from "date-fns";
import UserAvatar from "@/components/UserAvatar";

type DeletionRequest = {
  id: string;
  forecast_id: string;
  user_id: string;
  reason: string;
  status: string;
  admin_response: string | null;
  created_at: string;
  forecast_title?: string;
  user_display_name?: string;
  user_avatar_url?: string | null;
};

export default function DeletionRequests() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "approved" | "denied">("pending");
  const [respondTo, setRespondTo] = useState<DeletionRequest | null>(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [action, setAction] = useState<"approved" | "denied">("approved");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin-deletion-requests", filter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forecast_deletion_requests")
        .select("*")
        .eq("status", filter)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Enrich with forecast titles and user names
      const forecastIds = [...new Set((data || []).map((r: any) => r.forecast_id))];
      const userIds = [...new Set((data || []).map((r: any) => r.user_id))];

      const [{ data: forecasts }, { data: profiles }] = await Promise.all([
        supabase.from("forecasts").select("id, title").in("id", forecastIds),
        supabase.from("profiles").select("user_id, display_name").in("user_id", userIds),
      ]);

      const forecastMap = new Map((forecasts || []).map((f: any) => [f.id, f.title]));
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.display_name]));

      return (data || []).map((r: any) => ({
        ...r,
        forecast_title: forecastMap.get(r.forecast_id) || "Unknown",
        user_display_name: profileMap.get(r.user_id) || "Unknown",
      })) as DeletionRequest[];
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, status, response, userId, forecastId, forecastTitle }: {
      id: string; status: "approved" | "denied"; response: string;
      userId: string; forecastId: string; forecastTitle: string;
    }) => {
      const { error } = await supabase
        .from("forecast_deletion_requests")
        .update({ status, admin_response: response || null, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;

      // If approved, delete the forecast
      if (status === "approved") {
        await supabase.from("forecasts").delete().eq("id", forecastId);
      }

      // Notify user
      await createNotification({
        userId,
        type: "forecast_deletion_response",
        title: status === "approved" ? "Forecast deletion approved" : "Forecast deletion denied",
        message: status === "approved"
          ? `Your request to delete "${forecastTitle.slice(0, 50)}" has been approved.`
          : `Your request to delete "${forecastTitle.slice(0, 50)}" was denied.${response ? ` Reason: ${response}` : ""}`,
        link: status === "approved" ? "/portfolio" : `/forecasts/${forecastId}`,
      });
    },
    onSuccess: () => {
      toast.success("Response submitted");
      queryClient.invalidateQueries({ queryKey: ["admin-deletion-requests"] });
      setRespondTo(null);
      setAdminResponse("");
    },
    onError: () => toast.error("Failed to respond"),
  });

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(["pending", "approved", "denied"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              filter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : requests.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No {filter} deletion requests.</p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-foreground line-clamp-1">{r.forecast_title}</h4>
                  <p className="mt-1 text-xs text-muted-foreground">Requested by {r.user_display_name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{format(new Date(r.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
                  <div className="mt-2 rounded-lg bg-muted/50 p-2">
                    <p className="text-xs text-foreground"><span className="font-medium">Reason:</span> {r.reason}</p>
                  </div>
                  {r.admin_response && (
                    <div className="mt-1 rounded-lg bg-primary/5 p-2">
                      <p className="text-xs text-foreground"><span className="font-medium">Admin response:</span> {r.admin_response}</p>
                    </div>
                  )}
                </div>
                {filter === "pending" && (
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-green-500 hover:text-green-600"
                      onClick={() => { setRespondTo(r); setAction("approved"); setAdminResponse(""); }}
                    >
                      <Check className="mr-1 h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-destructive hover:text-destructive"
                      onClick={() => { setRespondTo(r); setAction("denied"); setAdminResponse(""); }}
                    >
                      <X className="mr-1 h-3.5 w-3.5" /> Deny
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!respondTo} onOpenChange={(open) => !open && setRespondTo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action === "approved" ? "Approve" : "Deny"} Deletion Request</DialogTitle>
            <DialogDescription>
              {action === "approved"
                ? "This will permanently delete the forecast and notify the user."
                : "Provide a reason for denying this request."}
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-sm font-medium text-foreground">Response (optional)</label>
            <Textarea
              value={adminResponse}
              onChange={(e) => setAdminResponse(e.target.value)}
              placeholder={action === "denied" ? "Reason for denial..." : "Optional note to user..."}
              className="mt-1"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondTo(null)}>Cancel</Button>
            <Button
              variant={action === "approved" ? "default" : "destructive"}
              onClick={() => respondTo && respondMutation.mutate({
                id: respondTo.id,
                status: action,
                response: adminResponse,
                userId: respondTo.user_id,
                forecastId: respondTo.forecast_id,
                forecastTitle: respondTo.forecast_title || "Unknown",
              })}
              disabled={respondMutation.isPending}
            >
              {respondMutation.isPending ? "Processing..." : action === "approved" ? "Approve & Delete" : "Deny Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

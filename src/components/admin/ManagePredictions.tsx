import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Pencil, Trash2, Search, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Link } from "react-router-dom";

type Prediction = {
  id: string;
  title: string;
  description: string;
  end_date: string;
  status: string;
  total_votes_yes: number;
  total_votes_no: number;
  created_at: string;
  project_a: { name: string; slug: string } | null;
  project_b: { name: string; slug: string } | null;
};

export default function ManagePredictions() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingPrediction, setEditingPrediction] = useState<Prediction | null>(null);
  const [editForm, setEditForm] = useState<Partial<Prediction>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: forecasts = [], isLoading } = useQuery({
    queryKey: ["admin-forecasts", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("forecasts")
        .select(`
          *,
          project_a:projects!predictions_project_a_id_fkey(name, slug),
          project_b:projects!predictions_project_b_id_fkey(name, slug)
        `)
        .order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.ilike("title", `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Handle the case where project_a/project_b might be arrays (due to Supabase types/relationships)
      return (data as any[]).map(f => ({
        ...f,
        project_a: Array.isArray(f.project_a) ? f.project_a[0] : f.project_a,
        project_b: Array.isArray(f.project_b) ? f.project_b[0] : f.project_b,
      })) as Prediction[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updated: Partial<Prediction> & { id: string }) => {
      const { error } = await supabase
        .from("forecasts")
        .update({
          title: updated.title,
          description: updated.description,
          end_date: updated.end_date,
          status: updated.status,
        })
        .eq("id", updated.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prediction updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-forecasts"] });
      setEditingPrediction(null);
    },
    onError: (error) => {
      toast.error(`Failed to update prediction: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("forecasts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prediction deleted permanently");
      queryClient.invalidateQueries({ queryKey: ["admin-forecasts"] });
      setDeletingId(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete prediction: ${error.message}`);
      setDeletingId(null);
    },
  });

  const handleEditSave = () => {
    if (!editingPrediction) return;
    updateMutation.mutate({
      id: editingPrediction.id,
      ...editForm,
    });
  };

  return (
    <div>
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search forecasts by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : forecasts.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {searchQuery ? "No forecasts found matching your search." : "No forecasts have been created yet."}
        </p>
      ) : (
        <div className="space-y-4">
          {forecasts.map((prediction) => (
            <div key={prediction.id} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-foreground truncate">{prediction.title}</h4>
                  <Link to={`/predictions/${prediction.id}`} target="_blank" className="text-muted-foreground hover:text-primary shrink-0">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{prediction.description}</p>
                
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className={`px-2 py-0.5 rounded-full font-medium ${prediction.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                    {prediction.status === 'active' ? 'Active' : 'Ended'}
                  </span>
                  <span className="text-muted-foreground">
                    Ends: {format(new Date(prediction.end_date), "MMM d, yyyy")}
                  </span>
                  <span className="text-muted-foreground">
                    Votes: {prediction.total_votes_yes + prediction.total_votes_no} ({prediction.total_votes_yes} Y / {prediction.total_votes_no} N)
                  </span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    Projects: 
                    <span className="font-medium text-foreground">{prediction.project_a?.name || "Unknown"}</span>
                    {prediction.project_b && (
                      <> vs <span className="font-medium text-foreground">{prediction.project_b.name}</span></>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 sm:shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingPrediction(prediction);
                    setEditForm({
                      title: prediction.title,
                      description: prediction.description,
                      end_date: prediction.end_date.split('T')[0], // Extract just the date part for the input
                      status: prediction.status,
                    });
                  }}
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDeletingId(prediction.id)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingPrediction} onOpenChange={(open) => !open && setEditingPrediction(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Prediction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input 
                value={editForm.title || ""} 
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={editForm.description || ""} 
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input 
                  type="date"
                  value={editForm.end_date ? editForm.end_date.split('T')[0] : ""} 
                  onChange={(e) => setEditForm(prev => ({ ...prev, end_date: new Date(e.target.value).toISOString() }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={editForm.status || "active"} 
                  onValueChange={(v) => setEditForm(prev => ({ ...prev, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="ended">Ended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPrediction(null)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Prediction</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this prediction? This action cannot be undone and will remove all associated votes and comments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

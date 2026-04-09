import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type InfraItem = {
  id: string;
  project_id: string;
  label: string;
  value: string;
  icon_name: string | null;
  link_url: string | null;
  display_order: number;
};

type Project = { id: string; name: string };

const ICON_OPTIONS = [
  "Server", "Globe", "Wifi", "Radio", "HardDrive", "Database", "Cloud",
  "Cpu", "Monitor", "Smartphone", "Camera", "Map", "Activity", "Users",
  "Video", "Thermometer", "Car", "CloudRain",
];

export default function ManageInfrastructure() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [items, setItems] = useState<InfraItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<InfraItem>>({});
  const [adding, setAdding] = useState(false);
  const [newForm, setNewForm] = useState({ label: "", value: "", icon_name: "Server", link_url: "", display_order: 0 });

  useEffect(() => {
    supabase.from("projects").select("id, name").order("name").then(({ data }) => {
      if (data) setProjects(data);
    });
  }, []);

  useEffect(() => {
    if (!selectedProjectId) { setItems([]); return; }
    fetchItems();
  }, [selectedProjectId]);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("project_infrastructure")
      .select("*")
      .eq("project_id", selectedProjectId)
      .order("display_order");
    if (error) { toast.error(error.message); return; }
    setItems((data || []) as InfraItem[]);
  };

  const handleAdd = async () => {
    if (!newForm.label || !newForm.value) { toast.error("Label and value are required"); return; }
    const { error } = await supabase.from("project_infrastructure").insert({
      project_id: selectedProjectId,
      label: newForm.label,
      value: newForm.value,
      icon_name: newForm.icon_name || null,
      link_url: newForm.link_url || null,
      display_order: newForm.display_order,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Item added");
    setAdding(false);
    setNewForm({ label: "", value: "", icon_name: "Server", link_url: "", display_order: 0 });
    fetchItems();
  };

  const handleSave = async (id: string) => {
    const { error } = await supabase.from("project_infrastructure").update({
      label: editForm.label,
      value: editForm.value,
      icon_name: editForm.icon_name || null,
      link_url: editForm.link_url || null,
      display_order: editForm.display_order ?? 0,
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setEditingId(null);
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this infrastructure item?")) return;
    const { error } = await supabase.from("project_infrastructure").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <Label className="mb-1.5 block text-sm">Select Project</Label>
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger><SelectValue placeholder="Choose a project…" /></SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedProjectId && (
          <Button size="sm" onClick={() => setAdding(true)} disabled={adding}>
            <Plus className="h-4 w-4 mr-1" /> Add Item
          </Button>
        )}
      </div>

      {adding && (
        <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Label</Label>
              <Input value={newForm.label} onChange={(e) => setNewForm({ ...newForm, label: e.target.value })} placeholder="e.g. Active Nodes" />
            </div>
            <div>
              <Label className="text-xs">Value</Label>
              <Input value={newForm.value} onChange={(e) => setNewForm({ ...newForm, value: e.target.value })} placeholder="e.g. 10,000+" />
            </div>
            <div>
              <Label className="text-xs">Icon</Label>
              <Select value={newForm.icon_name} onValueChange={(v) => setNewForm({ ...newForm, icon_name: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Order</Label>
              <Input type="number" value={newForm.display_order} onChange={(e) => setNewForm({ ...newForm, display_order: Number(e.target.value) })} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Link URL (optional)</Label>
              <Input value={newForm.link_url} onChange={(e) => setNewForm({ ...newForm, link_url: e.target.value })} placeholder="https://..." />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd}><Save className="h-3 w-3 mr-1" /> Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}><X className="h-3 w-3 mr-1" /> Cancel</Button>
          </div>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-lg border border-border p-4">
            {editingId === item.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Label</Label>
                    <Input value={editForm.label ?? ""} onChange={(e) => setEditForm({ ...editForm, label: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Value</Label>
                    <Input value={editForm.value ?? ""} onChange={(e) => setEditForm({ ...editForm, value: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Icon</Label>
                    <Select value={editForm.icon_name ?? "Server"} onValueChange={(v) => setEditForm({ ...editForm, icon_name: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ICON_OPTIONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Order</Label>
                    <Input type="number" value={editForm.display_order ?? 0} onChange={(e) => setEditForm({ ...editForm, display_order: Number(e.target.value) })} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Link URL</Label>
                    <Input value={editForm.link_url ?? ""} onChange={(e) => setEditForm({ ...editForm, link_url: e.target.value })} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleSave(item.id)}><Save className="h-3 w-3 mr-1" /> Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-3 w-3 mr-1" /> Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground">{item.icon_name} · #{item.display_order}</span>
                  <p className="font-medium text-foreground">{item.label}: <span className="text-primary">{item.value}</span></p>
                  {item.link_url && <p className="text-xs text-muted-foreground truncate max-w-xs">{item.link_url}</p>}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditingId(item.id); setEditForm(item); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {selectedProjectId && items.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground text-center py-8">No infrastructure data for this project yet.</p>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Star, X, GripVertical, Plus } from "lucide-react";
import ProjectLogo from "@/components/ProjectLogo";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Project = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  logo_emoji: string;
  category: string;
};

type SpotlightEntry = {
  id: string;
  project_id: string;
  display_order: number;
  project?: Project;
};

const ManageSpotlight = () => {
  const [spotlight, setSpotlight] = useState<SpotlightEntry[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [spotlightRes, projectsRes] = await Promise.all([
      supabase
        .from("spotlight_projects")
        .select("id, project_id, display_order")
        .order("display_order", { ascending: true }),
      supabase
        .from("projects")
        .select("id, name, slug, logo_url, logo_emoji, category")
        .order("name"),
    ]);

    const projects = (projectsRes.data as Project[]) || [];
    const spotlightData = (spotlightRes.data || []).map((s: any) => ({
      ...s,
      project: projects.find((p) => p.id === s.project_id),
    }));

    setAllProjects(projects);
    setSpotlight(spotlightData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const MAX_SPOTLIGHT = 6;
  const atLimit = spotlight.length >= MAX_SPOTLIGHT;
  const spotlightProjectIds = new Set(spotlight.map((s) => s.project_id));
  const availableProjects = allProjects.filter((p) => !spotlightProjectIds.has(p.id));

  const handleAdd = async () => {
    if (!selectedProjectId) return;
    const maxOrder = spotlight.length > 0 ? Math.max(...spotlight.map((s) => s.display_order)) + 1 : 0;

    const { error } = await supabase.from("spotlight_projects").insert({
      project_id: selectedProjectId,
      display_order: maxOrder,
    });

    if (error) {
      toast.error("Failed to add spotlight project");
      return;
    }

    toast.success("Project added to spotlight");
    setSelectedProjectId("");
    fetchData();
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from("spotlight_projects").delete().eq("id", id);
    if (error) {
      toast.error("Failed to remove project");
      return;
    }
    toast.success("Project removed from spotlight");
    fetchData();
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground py-4">Loading spotlight projects...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Add project */}
      <div className="flex items-center gap-2">
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select a project to spotlight..." />
          </SelectTrigger>
          <SelectContent>
            {availableProjects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <span className="flex items-center gap-2">
                  <ProjectLogo logoUrl={p.logo_url} logoEmoji={p.logo_emoji} name={p.name} size="xs" />
                  {p.name}
                  <span className="text-muted-foreground text-[10px]">({p.category})</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleAdd} disabled={!selectedProjectId} size="sm" className="shrink-0">
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      {/* Current spotlight list */}
      {spotlight.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No projects spotlighted yet. Add projects above to feature them on the homepage.
        </div>
      ) : (
        <div className="space-y-2">
          {spotlight.map((entry, i) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card/50 px-3 py-2.5"
            >
              <span className="text-xs font-bold text-muted-foreground w-5 text-center">{i + 1}</span>
              {entry.project && (
                <>
                  <ProjectLogo
                    logoUrl={entry.project.logo_url}
                    logoEmoji={entry.project.logo_emoji}
                    name={entry.project.name}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{entry.project.name}</p>
                    <p className="text-[10px] text-muted-foreground">{entry.project.category}</p>
                  </div>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(entry.id)}
                className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Spotlighted projects appear in a dedicated section on the homepage. Max recommended: 6 projects.
      </p>
    </div>
  );
};

export default ManageSpotlight;

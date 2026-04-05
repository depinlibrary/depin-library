import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Clock, Zap } from "lucide-react";
import ProjectLogo from "@/components/ProjectLogo";

export default function ManageHourlyForecasts() {
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // Fetch all configs
  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["admin-hourly-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hourly_forecast_config")
        .select("*, project:projects!hourly_forecast_config_project_id_fkey(id, name, slug, logo_url, logo_emoji)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch available projects (that have market data and aren't already configured)
  const { data: availableProjects = [] } = useQuery({
    queryKey: ["admin-hourly-available-projects"],
    queryFn: async () => {
      const configProjectIds = configs.map((c: any) => c.project_id);
      const { data: projectsWithPrices } = await supabase
        .from("token_market_data")
        .select("project_id, project:projects!token_market_data_project_id_fkey(id, name, slug, logo_url, logo_emoji)")
        .not("price_usd", "is", null);

      return (projectsWithPrices || [])
        .filter((p: any) => !configProjectIds.includes(p.project_id) && p.project)
        .map((p: any) => p.project);
    },
  });

  const addConfig = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.from("hourly_forecast_config").insert({
        project_id: projectId,
        is_enabled: true,
        cooldown_minutes: 10,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-hourly"] });
      queryClient.invalidateQueries({ queryKey: ["hourly-rounds"] });
      setSelectedProjectId("");
      toast.success("Hourly prediction enabled");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleConfig = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("hourly_forecast_config")
        .update({ is_enabled: enabled })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-hourly"] });
      queryClient.invalidateQueries({ queryKey: ["hourly-rounds"] });
    },
  });


  const deleteConfig = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hourly_forecast_config").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-hourly"] });
      queryClient.invalidateQueries({ queryKey: ["hourly-rounds"] });
      toast.success("Hourly prediction removed");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Trigger edge function manually
  const triggerRun = useMutation({
    mutationFn: async () => {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/run-hourly-forecasts`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
      );
      if (!res.ok) throw new Error("Failed to trigger");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["hourly-rounds"] });
      toast.success(`Triggered: ${JSON.stringify(data.results?.length || 0)} configs processed`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Hourly Predictions</h3>
          <p className="text-sm text-muted-foreground">Auto-recurring 1-hour price predictions</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => triggerRun.mutate()} disabled={triggerRun.isPending}>
          <Zap className="h-3.5 w-3.5 mr-1" />
          {triggerRun.isPending ? "Running..." : "Run Now"}
        </Button>
      </div>

      {/* Add new project */}
      <div className="flex gap-2">
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select a project to enable..." />
          </SelectTrigger>
          <SelectContent>
            {availableProjects.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>
                <span className="flex items-center gap-2">
                  {p.logo_url ? (
                    <img src={p.logo_url} alt={p.name} className="w-4 h-4 rounded object-contain" />
                  ) : (
                    <span className="text-xs">{p.logo_emoji}</span>
                  )}
                  {p.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() => selectedProjectId && addConfig.mutate(selectedProjectId)}
          disabled={!selectedProjectId || addConfig.isPending}
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      {/* Config list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-16 rounded-lg bg-secondary/30 animate-pulse" />)}
        </div>
      ) : configs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No hourly predictions configured yet.</p>
      ) : (
        <div className="space-y-3">
          {configs.map((config: any) => (
            <div key={config.id} className="flex items-center gap-4 rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {config.project?.logo_url ? (
                  <img src={config.project.logo_url} alt={config.project?.name} className="w-8 h-8 rounded-lg object-contain" />
                ) : (
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-secondary text-sm">
                    {config.project?.logo_emoji || "⬡"}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{config.project?.name}</p>

              <Switch
                checked={config.is_enabled}
                onCheckedChange={(checked) => toggleConfig.mutate({ id: config.id, enabled: checked })}
              />

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => deleteConfig.mutate(config.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

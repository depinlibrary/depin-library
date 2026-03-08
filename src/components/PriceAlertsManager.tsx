import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, Trash2, Plus, TrendingUp, TrendingDown, ArrowUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import ProjectLogo from "@/components/ProjectLogo";
import { usePriceAlerts, useUpsertPriceAlert, useTogglePriceAlert, useDeletePriceAlert, type PriceAlert } from "@/hooks/usePriceAlerts";
import { toast } from "sonner";

type Project = {
  id: string;
  name: string;
  token: string;
  slug: string;
  logo_url: string | null;
  logo_emoji: string;
};

interface PriceAlertsManagerProps {
  projects: Project[];
  holdingProjectIds: string[];
}

export default function PriceAlertsManager({ projects, holdingProjectIds }: PriceAlertsManagerProps) {
  const { data: alerts = [], isLoading } = usePriceAlerts();
  const upsertAlert = useUpsertPriceAlert();
  const toggleAlert = useTogglePriceAlert();
  const deleteAlert = useDeletePriceAlert();

  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [threshold, setThreshold] = useState("5");
  const [direction, setDirection] = useState<"up" | "down" | "both">("both");

  const availableProjects = projects.filter(
    (p) => holdingProjectIds.includes(p.id) && !alerts.some((a) => a.project_id === p.id)
  );

  const handleAdd = () => {
    const pct = parseFloat(threshold);
    if (!selectedProjectId || isNaN(pct) || pct <= 0 || pct > 100) {
      toast.error("Select a project and enter a valid threshold (1-100%)");
      return;
    }
    upsertAlert.mutate(
      { projectId: selectedProjectId, thresholdPercent: pct, direction },
      {
        onSuccess: () => {
          toast.success("Price alert created");
          setSelectedProjectId("");
          setThreshold("5");
          setDirection("both");
          setShowAddForm(false);
        },
        onError: (err: any) => toast.error(err.message || "Failed to create alert"),
      }
    );
  };

  const getProject = (projectId: string) => projects.find((p) => p.id === projectId);

  const directionIcon = (dir: string) => {
    if (dir === "up") return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (dir === "down") return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />;
  };

  const directionLabel = (dir: string) => {
    if (dir === "up") return "Up only";
    if (dir === "down") return "Down only";
    return "Both";
  };

  return (
    <div className="group relative rounded-xl border border-border bg-card overflow-hidden">
      {/* Decorative corner accent */}
      <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-[60px] bg-primary/3 pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-center justify-between p-4 md:p-5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Bell className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Price Alerts</h3>
            <p className="text-[10px] text-muted-foreground">
              {alerts.filter((a) => a.is_enabled).length} active alert{alerts.filter((a) => a.is_enabled).length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          variant={showAddForm ? "secondary" : "outline"}
          size="sm"
          className="gap-1.5 h-8 text-xs"
        >
          {showAddForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showAddForm ? "Cancel" : "Add Alert"}
        </Button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 md:px-5 md:pb-5">
              <div className="rounded-lg border border-border bg-secondary/20 p-4">
                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                  <div className="flex-1 min-w-0">
                    <label className="text-[11px] text-muted-foreground mb-1 block">Asset</label>
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                      <SelectTrigger className="h-9 text-sm focus:ring-0 focus:ring-offset-0">
                        <SelectValue placeholder="Select holding" />
                      </SelectTrigger>
                      <SelectContent side="bottom" avoidCollisions={false}>
                        {availableProjects.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-muted-foreground">All holdings have alerts</div>
                        ) : (
                          availableProjects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              <span className="flex items-center gap-2">
                                {p.logo_url && <img src={p.logo_url} alt="" className="w-4 h-4 rounded-[7px] object-contain" />}
                                {p.name} ({p.token})
                              </span>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full sm:w-[110px]">
                    <label className="text-[11px] text-muted-foreground mb-1 block">Threshold %</label>
                    <Input
                      type="number"
                      min="0.1"
                      max="100"
                      step="0.1"
                      value={threshold}
                      onChange={(e) => setThreshold(e.target.value)}
                      className="h-9 text-sm"
                      placeholder="5"
                    />
                  </div>
                  <div className="w-full sm:w-[130px]">
                    <label className="text-[11px] text-muted-foreground mb-1 block">Direction</label>
                    <Select value={direction} onValueChange={(v) => setDirection(v as "up" | "down" | "both")}>
                      <SelectTrigger className="h-9 text-sm focus:ring-0 focus:ring-offset-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent side="bottom" avoidCollisions={false}>
                        <SelectItem value="both">↕ Both</SelectItem>
                        <SelectItem value="up">↑ Up only</SelectItem>
                        <SelectItem value="down">↓ Down only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAdd} disabled={upsertAlert.isPending} variant="outline" size="sm" className="h-9 gap-1.5 w-full sm:w-auto">
                    <Bell className="h-3.5 w-3.5" />
                    Create
                  </Button>
                </div>
                <p className="mt-2.5 text-[10px] text-muted-foreground">
                  You'll be notified when the price moves ±{threshold || "5"}% from the price at alert creation.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alerts list */}
      {isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div className="p-8 md:p-12 text-center">
          <div className="mx-auto h-10 w-10 rounded-xl bg-secondary/50 flex items-center justify-center mb-3">
            <BellOff className="h-5 w-5 text-muted-foreground/30" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">No price alerts</p>
          <p className="text-xs text-muted-foreground mb-3">Get notified when your holdings move significantly</p>
          <Button onClick={() => setShowAddForm(true)} variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Create your first alert
          </Button>
        </div>
      ) : (
        <div className="px-4 pb-4 md:px-5 md:pb-5">
          <div className="space-y-2">
            {alerts.map((alert, idx) => {
              const project = getProject(alert.project_id);
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`flex items-center justify-between rounded-lg border border-border p-3 md:p-3.5 transition-colors hover:bg-secondary/20 ${!alert.is_enabled ? "opacity-40" : ""}`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {project && (
                      <ProjectLogo
                        logoUrl={project.logo_url}
                        logoEmoji={project.logo_emoji}
                        name={project.name}
                        size="sm"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {project?.name || "Unknown"}{" "}
                        <span className="text-muted-foreground font-normal">({project?.token})</span>
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                          {directionIcon(alert.direction)}
                          {directionLabel(alert.direction)}
                        </span>
                        <span className="text-[11px] font-semibold text-foreground tabular-nums">
                          ±{Number(alert.threshold_percent)}%
                        </span>
                        {alert.last_triggered_at && (
                          <span className="text-[10px] text-muted-foreground">
                            Last: {new Date(alert.last_triggered_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <Switch
                      checked={alert.is_enabled}
                      onCheckedChange={(checked) =>
                        toggleAlert.mutate(
                          { alertId: alert.id, isEnabled: checked },
                          { onError: () => toast.error("Failed to toggle alert") }
                        )
                      }
                      className="scale-90"
                    />
                    <button
                      onClick={() =>
                        deleteAlert.mutate(alert.id, {
                          onSuccess: () => toast.success("Alert deleted"),
                          onError: () => toast.error("Failed to delete alert"),
                        })
                      }
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

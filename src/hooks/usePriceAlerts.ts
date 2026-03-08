import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PriceAlert = {
  id: string;
  user_id: string;
  project_id: string;
  threshold_percent: number;
  direction: "up" | "down" | "both";
  is_enabled: boolean;
  last_triggered_at: string | null;
  last_known_price: number | null;
  created_at: string;
  updated_at: string;
};

export function usePriceAlerts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["price_alerts", user?.id],
    queryFn: async (): Promise<PriceAlert[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("price_alerts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as PriceAlert[];
    },
    enabled: !!user,
  });
}

export function useUpsertPriceAlert() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      thresholdPercent,
      direction,
    }: {
      projectId: string;
      thresholdPercent: number;
      direction: "up" | "down" | "both";
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("price_alerts")
        .upsert(
          {
            user_id: user.id,
            project_id: projectId,
            threshold_percent: thresholdPercent,
            direction,
            is_enabled: true,
          },
          { onConflict: "user_id,project_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price_alerts", user?.id] });
    },
  });
}

export function useTogglePriceAlert() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alertId, isEnabled }: { alertId: string; isEnabled: boolean }) => {
      const { error } = await supabase
        .from("price_alerts")
        .update({ is_enabled: isEnabled })
        .eq("id", alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price_alerts", user?.id] });
    },
  });
}

export function useDeletePriceAlert() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("price_alerts")
        .delete()
        .eq("id", alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price_alerts", user?.id] });
    },
  });
}

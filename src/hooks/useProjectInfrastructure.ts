import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InfrastructureItem {
  id: string;
  label: string;
  value: string;
  icon_name: string | null;
  link_url: string | null;
  display_order: number;
}

export function useProjectInfrastructure(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-infrastructure", projectId],
    queryFn: async (): Promise<InfrastructureItem[]> => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_infrastructure")
        .select("id, label, value, icon_name, link_url, display_order")
        .eq("project_id", projectId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data || []) as InfrastructureItem[];
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

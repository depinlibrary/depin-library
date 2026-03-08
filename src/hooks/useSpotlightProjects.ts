import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useSpotlightProjects = () => {
  return useQuery({
    queryKey: ["spotlight-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spotlight_projects")
        .select("project_id, display_order")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
};

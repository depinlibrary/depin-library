import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTrendingProjects(limit = 5) {
  return useQuery({
    queryKey: ["trending-projects", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_trending_scores")
        .select("*")
        .order("score", { ascending: false })
        .limit(limit);

      if (error) throw error;
      if (!data?.length) return [];

      const ids = data.map((d: any) => d.project_id);
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name, slug, logo_url, logo_emoji, tagline, category")
        .in("id", ids);

      const projectMap: Record<string, any> = {};
      (projects || []).forEach((p: any) => {
        projectMap[p.id] = p;
      });

      return data
        .filter((d: any) => projectMap[d.project_id])
        .map((d: any) => ({
          ...projectMap[d.project_id],
          trending_score: d.score,
        }));
    },
  });
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProjectSentiment = {
  project_id: string;
  bullish_votes: number;
  bearish_votes: number;
  bullish_percentage: number;
  total_votes: number;
};

export function useProjectSentiment(projectId: string) {
  return useQuery({
    queryKey: ["sentiment", projectId],
    queryFn: async (): Promise<ProjectSentiment | null> => {
      const { data, error } = await supabase
        .from("project_sentiment")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function useTopSentiments(limit = 6) {
  return useQuery({
    queryKey: ["top-sentiments", limit],
    queryFn: async (): Promise<(ProjectSentiment & { project_name: string; project_slug: string })[]> => {
      const { data: sentiments, error } = await supabase
        .from("project_sentiment")
        .select("*")
        .gt("total_votes", 0)
        .order("total_votes", { ascending: false })
        .limit(limit);

      if (error) throw error;
      if (!sentiments?.length) return [];

      const ids = sentiments.map((s: any) => s.project_id);
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name, slug")
        .in("id", ids);

      const projectMap: Record<string, { name: string; slug: string }> = {};
      (projects || []).forEach((p: any) => {
        projectMap[p.id] = { name: p.name, slug: p.slug };
      });

      return sentiments.map((s: any) => ({
        ...s,
        project_name: projectMap[s.project_id]?.name || "Unknown",
        project_slug: projectMap[s.project_id]?.slug || "",
      }));
    },
  });
}

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

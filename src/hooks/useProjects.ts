import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Project = {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  category: string;
  blockchain: string;
  token: string;
  website: string;
  status: string;
  year_founded: number | null;
  logo_emoji: string;
  logo_url: string | null;
  created_at: string;
  avg_rating?: number;
  review_count?: number;
};

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async (): Promise<Project[]> => {
      const { data: projects, error } = await supabase
        .from("projects")
        .select("*")
        .order("name");
      
      if (error) throw error;

      // Fetch review stats
      const { data: reviews } = await supabase
        .from("reviews")
        .select("project_id, rating");

      const statsMap: Record<string, { total: number; count: number }> = {};
      (reviews || []).forEach((r: any) => {
        if (!statsMap[r.project_id]) statsMap[r.project_id] = { total: 0, count: 0 };
        statsMap[r.project_id].total += r.rating;
        statsMap[r.project_id].count += 1;
      });

      return (projects || []).map((p: any) => ({
        ...p,
        avg_rating: statsMap[p.id] ? statsMap[p.id].total / statsMap[p.id].count : undefined,
        review_count: statsMap[p.id]?.count || 0,
      }));
    },
  });
}

export function useProject(slug: string) {
  return useQuery({
    queryKey: ["project", slug],
    queryFn: async (): Promise<Project | null> => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;

      const { data: reviews } = await supabase
        .from("reviews")
        .select("rating")
        .eq("project_id", data.id);

      const count = reviews?.length || 0;
      const total = (reviews || []).reduce((sum: number, r: any) => sum + r.rating, 0);

      return {
        ...data,
        avg_rating: count > 0 ? total / count : undefined,
        review_count: count,
      } as Project;
    },
    enabled: !!slug,
  });
}

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
  twitter_url: string;
  discord_url: string;
  coingecko_id: string | null;
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

      // Fetch structured rating stats
      const { data: ratings } = await supabase
        .from("project_ratings")
        .select("project_id, utility_rating, tokenomics_rating, adoption_rating, hardware_rating");

      const statsMap: Record<string, { total: number; count: number }> = {};
      (ratings || []).forEach((r: any) => {
        if (!statsMap[r.project_id]) statsMap[r.project_id] = { total: 0, count: 0 };
        const avg = (r.utility_rating + r.tokenomics_rating + r.adoption_rating + r.hardware_rating) / 4;
        statsMap[r.project_id].total += avg;
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

      const { data: ratings } = await supabase
        .from("project_ratings")
        .select("utility_rating, tokenomics_rating, adoption_rating, hardware_rating")
        .eq("project_id", data.id);

      const count = ratings?.length || 0;
      let avgRating: number | undefined;
      if (count > 0) {
        const total = ratings!.reduce((sum: number, r: any) => {
          return sum + (r.utility_rating + r.tokenomics_rating + r.adoption_rating + r.hardware_rating) / 4;
        }, 0);
        avgRating = total / count;
      }

      return {
        ...data,
        avg_rating: avgRating,
        review_count: count,
      } as Project;
    },
    enabled: !!slug,
  });
}

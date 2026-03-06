import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type Forecast = {
  id: string;
  title: string;
  description: string;
  project_a_id: string;
  project_b_id: string | null;
  creator_user_id: string;
  end_date: string;
  status: string;
  total_votes_yes: number;
  total_votes_no: number;
  created_at: string;
  project_a_name?: string;
  project_b_name?: string;
  project_a_slug?: string;
  project_b_slug?: string;
  user_vote?: string | null;
};

export type ForecastSortOption = "votes" | "newest" | "ending_soon";

export function useForecasts(sort: ForecastSortOption = "newest", page = 1, pageSize = 12) {
  return useQuery({
    queryKey: ["forecasts", sort, page],
    queryFn: async (): Promise<{ forecasts: Forecast[]; total: number }> => {
      // Get total count
      const { count } = await supabase
        .from("forecasts")
        .select("*", { count: "exact", head: true });

      let query = supabase
        .from("forecasts")
        .select("*")
        .range((page - 1) * pageSize, page * pageSize - 1);

      switch (sort) {
        case "votes":
          query = query.order("total_votes_yes", { ascending: false });
          break;
        case "ending_soon":
          query = query.eq("status", "active").order("end_date", { ascending: true });
          break;
        default:
          query = query.order("created_at", { ascending: false });
      }

      const { data: forecasts, error } = await query;
      if (error) throw error;

      // Fetch project names
      const projectIds = new Set<string>();
      (forecasts || []).forEach((f: any) => {
        projectIds.add(f.project_a_id);
        if (f.project_b_id) projectIds.add(f.project_b_id);
      });

      const { data: projects } = await supabase
        .from("projects")
        .select("id, name, slug")
        .in("id", [...projectIds]);

      const projectMap: Record<string, { name: string; slug: string }> = {};
      (projects || []).forEach((p: any) => {
        projectMap[p.id] = { name: p.name, slug: p.slug };
      });

      // Get current user's votes
      const { data: { session } } = await supabase.auth.getSession();
      let userVotes: Record<string, string> = {};
      if (session?.user) {
        const forecastIds = (forecasts || []).map((f: any) => f.id);
        if (forecastIds.length > 0) {
          const { data: votes } = await supabase
            .from("forecast_votes")
            .select("forecast_id, vote")
            .eq("user_id", session.user.id)
            .in("forecast_id", forecastIds);
          (votes || []).forEach((v: any) => {
            userVotes[v.forecast_id] = v.vote;
          });
        }
      }

      const enriched = (forecasts || []).map((f: any) => ({
        ...f,
        project_a_name: projectMap[f.project_a_id]?.name || "Unknown",
        project_b_name: f.project_b_id ? projectMap[f.project_b_id]?.name || "Unknown" : null,
        project_a_slug: projectMap[f.project_a_id]?.slug,
        project_b_slug: f.project_b_id ? projectMap[f.project_b_id]?.slug : null,
        user_vote: userVotes[f.id] || null,
      }));

      return { forecasts: enriched, total: count || 0 };
    },
  });
}

export function useCreateForecast() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      title,
      description,
      projectAId,
      projectBId,
      endDate,
    }: {
      title: string;
      description: string;
      projectAId: string;
      projectBId?: string;
      endDate: string;
    }) => {
      if (!user) throw new Error("Must be logged in");
      const { error } = await supabase.from("forecasts").insert({
        title,
        description,
        project_a_id: projectAId,
        project_b_id: projectBId || null,
        creator_user_id: user.id,
        end_date: endDate,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forecasts"] });
    },
  });
}

export function useVoteForecast() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ forecastId, vote }: { forecastId: string; vote: "yes" | "no" }) => {
      if (!user) throw new Error("Must be logged in");
      const { error } = await supabase.from("forecast_votes").upsert(
        {
          forecast_id: forecastId,
          user_id: user.id,
          vote,
        },
        { onConflict: "forecast_id,user_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forecasts"] });
    },
  });
}

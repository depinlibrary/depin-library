import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { createNotification } from "@/hooks/useNotifications";
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
  project_a_logo_url?: string | null;
  project_a_logo_emoji?: string;
  project_b_logo_url?: string | null;
  project_b_logo_emoji?: string;
  user_vote?: string | null;
};

export type ForecastSortOption = "votes" | "newest" | "ending_soon";
export type ForecastStatusFilter = "all" | "active" | "ended";

export function useForecasts(sort: ForecastSortOption = "newest", page = 1, pageSize = 12, projectFilter?: string, search?: string, statusFilter: ForecastStatusFilter = "all") {
  return useQuery({
    queryKey: ["forecasts", sort, page, projectFilter, search, statusFilter],
    queryFn: async (): Promise<{ forecasts: Forecast[]; total: number }> => {
      const now = new Date().toISOString();
      
      // Get total count
      let countQuery = supabase
        .from("forecasts")
        .select("*", { count: "exact", head: true });

      if (projectFilter) {
        countQuery = countQuery.or(`project_a_id.eq.${projectFilter},project_b_id.eq.${projectFilter}`);
      }

      if (search) {
        countQuery = countQuery.ilike("title", `%${search}%`);
      }

      if (statusFilter === "active") {
        countQuery = countQuery.gt("end_date", now);
      } else if (statusFilter === "ended") {
        countQuery = countQuery.lte("end_date", now);
      }

      const { count } = await countQuery;

      let query = supabase
        .from("forecasts")
        .select("*")
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (projectFilter) {
        query = query.or(`project_a_id.eq.${projectFilter},project_b_id.eq.${projectFilter}`);
      }

      if (search) {
        query = query.ilike("title", `%${search}%`);
      }

      if (statusFilter === "active") {
        query = query.gt("end_date", now);
      } else if (statusFilter === "ended") {
        query = query.lte("end_date", now);
      }

      switch (sort) {
        case "votes":
          query = query.order("total_votes_yes", { ascending: false });
          break;
        case "ending_soon":
          query = query.gt("end_date", now).order("end_date", { ascending: true });
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
        .select("id, name, slug, logo_url, logo_emoji")
        .in("id", [...projectIds]);

      const projectMap: Record<string, { name: string; slug: string; logo_url: string | null; logo_emoji: string }> = {};
      (projects || []).forEach((p: any) => {
        projectMap[p.id] = { name: p.name, slug: p.slug, logo_url: p.logo_url, logo_emoji: p.logo_emoji };
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
        project_a_logo_url: projectMap[f.project_a_id]?.logo_url,
        project_a_logo_emoji: projectMap[f.project_a_id]?.logo_emoji || "⬡",
        project_b_logo_url: f.project_b_id ? projectMap[f.project_b_id]?.logo_url : null,
        project_b_logo_emoji: f.project_b_id ? projectMap[f.project_b_id]?.logo_emoji || "⬡" : "⬡",
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
      analysisDimensions = [],
    }: {
      title: string;
      description: string;
      projectAId: string;
      projectBId?: string;
      endDate: string;
      analysisDimensions?: string[];
    }) => {
      if (!user) throw new Error("Must be logged in");
      const { data: forecast, error } = await supabase.from("forecasts").insert({
        title,
        description,
        project_a_id: projectAId,
        project_b_id: projectBId || null,
        creator_user_id: user.id,
        end_date: endDate,
      }).select("id").single();
      if (error) throw error;

      // Insert analysis dimensions
      if (analysisDimensions.length > 0 && forecast) {
        const targets = analysisDimensions.map(dim => ({
          forecast_id: forecast.id,
          dimension: dim,
        }));
        await supabase.from("forecast_targets").insert(targets);

        // Trigger start snapshot via edge function
        try {
          const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
          await fetch(
            `https://${projectId}.supabase.co/functions/v1/snapshot-forecast-metrics`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ forecast_id: forecast.id, snapshot_type: "start" }),
            }
          );
        } catch {}
      }
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
    mutationFn: async ({ forecastId, vote, confidenceLevel }: { forecastId: string; vote: "yes" | "no"; confidenceLevel?: number }) => {
      if (!user) throw new Error("Must be logged in");
      const { error } = await supabase.from("forecast_votes").upsert(
        {
          forecast_id: forecastId,
          user_id: user.id,
          vote,
          confidence_level: confidenceLevel ?? null,
        },
        { onConflict: "forecast_id,user_id" }
      );
      if (error) throw error;

      // Notify forecast creator
      const { data: forecast } = await supabase
        .from("forecasts")
        .select("creator_user_id, title")
        .eq("id", forecastId)
        .single();

      if (forecast && forecast.creator_user_id !== user.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", user.id)
          .single();

        const voterName = profile?.display_name || "Someone";
        const voteLabel = vote === "yes" ? "Yes" : "No";

        await createNotification({
          userId: forecast.creator_user_id,
          type: "forecast_vote",
          title: "New vote on your forecast",
          message: `${voterName} voted "${voteLabel}" on "${forecast.title.slice(0, 50)}${forecast.title.length > 50 ? "..." : ""}"`,
          link: `/forecasts/${forecastId}`,
          metadata: { forecastId, vote },
        });
      }

      return forecastId;
    },
    onSuccess: (forecastId) => {
      queryClient.invalidateQueries({ queryKey: ["forecasts"] });
      queryClient.invalidateQueries({ queryKey: ["forecast-detail", forecastId] });
      queryClient.invalidateQueries({ queryKey: ["forecast-vote-history", forecastId] });
    },
  });
}

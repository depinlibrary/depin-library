import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { createNotification } from "@/hooks/useNotifications";

/** Subscribe to realtime changes on the forecasts table and invalidate queries */
export function useRealtimePredictions() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("realtime-forecasts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "forecasts" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["forecasts"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "forecast_votes" },
        (payload: any) => {
          const predictionId = payload.new?.forecast_id || payload.old?.forecast_id;
          queryClient.invalidateQueries({ queryKey: ["forecasts"] });
          if (predictionId) {
            queryClient.invalidateQueries({ queryKey: ["prediction-detail", predictionId] });
            queryClient.invalidateQueries({ queryKey: ["prediction-vote-history", predictionId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
export type Prediction = {
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
  prediction_target: number | null;
  prediction_direction: string | null;
  start_price: number | null;
  project_a_name?: string;
  project_b_name?: string;
  project_a_slug?: string;
  project_b_slug?: string;
  project_a_logo_url?: string | null;
  project_a_logo_emoji?: string;
  project_b_logo_url?: string | null;
  project_b_logo_emoji?: string;
  user_vote?: string | null;
  outcome?: string | null;
};

export type PredictionSortOption = "votes" | "newest" | "ending_soon";
export type PredictionStatusFilter = "all" | "active" | "ended";

export function usePredictions(sort: PredictionSortOption = "newest", page = 1, pageSize = 12, projectFilter?: string, search?: string, statusFilter: PredictionStatusFilter = "all", dimensionFilter?: string) {
  return useQuery({
    queryKey: ["forecasts", sort, page, projectFilter, search, statusFilter, dimensionFilter],
    queryFn: async (): Promise<{ forecasts: Prediction[]; total: number }> => {
      const now = new Date().toISOString();

      // If filtering by dimension, first get matching prediction IDs
      let dimensionPredictionIds: string[] | null = null;
      if (dimensionFilter) {
        const { data: targets } = await supabase
          .from("forecast_targets")
          .select("forecast_id")
          .eq("dimension", dimensionFilter);
        dimensionPredictionIds = (targets || []).map((t: any) => t.forecast_id);
        if (dimensionPredictionIds.length === 0) {
          return { forecasts: [], total: 0 };
        }
      }
      
      // Get total count
      let countQuery = supabase
        .from("forecasts")
        .select("*", { count: "exact", head: true });

      if (dimensionPredictionIds) {
        countQuery = countQuery.in("id", dimensionPredictionIds);
      }

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

      if (dimensionPredictionIds) {
        query = query.in("id", dimensionPredictionIds);
      }

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
        const predictionIds = (forecasts || []).map((f: any) => f.id);
        if (predictionIds.length > 0) {
          const { data: votes } = await supabase
            .from("forecast_votes")
            .select("forecast_id, vote")
            .eq("user_id", session.user.id)
            .in("forecast_id", predictionIds);
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

export function useCreatePrediction() {
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
      predictionTarget,
      predictionDirection,
      startPrice,
    }: {
      title: string;
      description: string;
      projectAId: string;
      projectBId?: string;
      endDate: string;
      analysisDimensions?: string[];
      predictionTarget?: number;
      predictionDirection?: string;
      startPrice?: number;
    }) => {
      if (!user) throw new Error("Must be logged in");

      // Rate limit: max 3 forecasts per 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: recentCount } = await supabase
        .from("forecasts")
        .select("*", { count: "exact", head: true })
        .eq("creator_user_id", user.id)
        .gte("created_at", oneDayAgo);

      if ((recentCount ?? 0) >= 5) {
        throw new Error("You can only create 5 forecasts per day. Please try again later.");
      }

      // Check for duplicate forecasts
      if (analysisDimensions.length > 0) {
        const { data: dupCheck, error: dupError } = await supabase.rpc("check_forecast_duplicate", {
          p_project_a_id: projectAId,
          p_project_b_id: projectBId || null,
          p_dimension: analysisDimensions[0],
          p_end_date: endDate,
          p_title: title,
          p_creator_user_id: user.id,
        });
        if (!dupError && dupCheck && dupCheck.length > 0 && dupCheck[0].is_duplicate) {
          const dup = dupCheck[0];
          if (dup.duplicate_type === "structural") {
            throw new Error(`A similar active prediction already exists for this project and market: "${dup.duplicate_title}"`);
          } else if (dup.duplicate_type === "title_similar") {
            throw new Error(`A prediction with a very similar title already exists: "${dup.duplicate_title}" (${Math.round((dup.similarity_score || 0) * 100)}% match)`);
          }
        }
      }

      const { data: prediction, error } = await supabase.from("forecasts").insert({
        title,
        description,
        project_a_id: projectAId,
        project_b_id: projectBId || null,
        creator_user_id: user.id,
        end_date: endDate,
        prediction_target: predictionTarget ?? null,
        prediction_direction: predictionDirection ?? null,
        start_price: startPrice ?? null,
      }).select("id").single();
      if (error) throw error;

      // Insert analysis dimensions
      if (analysisDimensions.length > 0 && prediction) {
        const targets = analysisDimensions.map(dim => ({
          forecast_id: prediction.id,
          dimension: dim,
        }));
        await supabase.from("forecast_targets").insert(targets);

        // Trigger start snapshot via edge function
        try {
          const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
          await fetch(
            `https://${projectId}.supabase.co/functions/v1/snapshot-prediction-metrics`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ forecast_id: prediction.id, snapshot_type: "start" }),
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

export function useVotePrediction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ predictionId, vote, confidenceLevel }: { predictionId: string; vote: "yes" | "no"; confidenceLevel?: number }) => {
      if (!user) throw new Error("Must be logged in");

      // Check if user already voted — votes are permanent
      const { data: existingVote } = await supabase
        .from("forecast_votes")
        .select("id")
        .eq("forecast_id", predictionId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingVote) {
        throw new Error("You have already voted on this prediction. Votes cannot be changed.");
      }

      const { error } = await supabase.from("forecast_votes").insert({
        forecast_id: predictionId,
        user_id: user.id,
        vote,
        confidence_level: confidenceLevel ?? null,
      });
      if (error) throw error;

      // Notify prediction creator
      const { data: prediction } = await supabase
        .from("forecasts")
        .select("creator_user_id, title")
        .eq("id", predictionId)
        .single();

      if (prediction && prediction.creator_user_id !== user.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", user.id)
          .single();

        const voterName = profile?.display_name || "Someone";
        const voteLabel = vote === "yes" ? "Yes" : "No";

        await createNotification({
          userId: prediction.creator_user_id,
          type: "forecast_vote",
          title: "New vote on your prediction",
          message: `${voterName} voted "${voteLabel}" on "${prediction.title.slice(0, 50)}${prediction.title.length > 50 ? "..." : ""}"`,
          link: `/predictions/${predictionId}`,
          metadata: { predictionId, vote },
        });
      }

      return predictionId;
    },
    onSuccess: (predictionId) => {
      queryClient.invalidateQueries({ queryKey: ["forecasts"] });
      queryClient.invalidateQueries({ queryKey: ["prediction-detail", predictionId] });
      queryClient.invalidateQueries({ queryKey: ["prediction-vote-history", predictionId] });
    },
  });
}

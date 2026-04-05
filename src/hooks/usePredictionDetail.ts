import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { createNotification } from "@/hooks/useNotifications";

export type PredictionComment = {
  id: string;
  forecast_id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  display_name?: string;
  avatar_url?: string | null;
};

export type VoteHistoryEntry = {
  date: string;
  yes_count: number;
  no_count: number;
  weighted_yes_pct: number;
};

export function usePredictionDetail(predictionId: string | undefined) {
  const queryClient = useQueryClient();

  // Realtime: re-fetch when this prediction row changes (votes, status, outcome)
  useEffect(() => {
    if (!predictionId) return;
    const channel = supabase
      .channel(`prediction-detail-${predictionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "predictions", filter: `id=eq.${predictionId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["prediction-detail", predictionId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [predictionId, queryClient]);

  return useQuery({
    queryKey: ["prediction-detail", predictionId],
    enabled: !!predictionId,
    queryFn: async () => {
      const { data: prediction, error } = await supabase
        .from("forecasts")
        .select("*")
        .eq("id", predictionId!)
        .single();
      if (error) throw error;

      // Fetch project details
      const projectIds = [prediction.project_a_id];
      if (prediction.project_b_id) projectIds.push(prediction.project_b_id);

      const { data: projects } = await supabase
        .from("projects")
        .select("id, name, slug, logo_url, logo_emoji, tagline")
        .in("id", projectIds);

      const projectMap: Record<string, any> = {};
      (projects || []).forEach((p: any) => { projectMap[p.id] = p; });

      // Get user vote + avg confidence stats
      const { data: { session } } = await supabase.auth.getSession();
      let userVote: string | null = null;
      if (session?.user) {
        const { data: vote } = await supabase
          .from("forecast_votes")
          .select("vote")
          .eq("forecast_id", predictionId!)
          .eq("user_id", session.user.id)
          .maybeSingle();
        userVote = vote?.vote || null;
      }

      // Fetch aggregate vote stats via RPC (no individual user exposure)
      const { data: voteStats } = await supabase
        .rpc("get_forecast_vote_stats", { p_forecast_id: predictionId! });

      let avgConfidenceYes: number | null = null;
      let avgConfidenceNo: number | null = null;
      if (voteStats && voteStats.length > 0) {
        avgConfidenceYes = voteStats[0].avg_confidence_yes;
        avgConfidenceNo = voteStats[0].avg_confidence_no;
      }

      // Get creator display name
      const { data: creatorProfile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", prediction.creator_user_id)
        .maybeSingle();

      return {
        ...prediction,
        project_a: projectMap[prediction.project_a_id] || null,
        project_b: prediction.project_b_id ? projectMap[prediction.project_b_id] || null : null,
        user_vote: userVote,
        creator_name: creatorProfile?.display_name || "Anonymous",
        creator_avatar_url: (creatorProfile as any)?.avatar_url ?? null,
        avg_confidence_yes: avgConfidenceYes,
        avg_confidence_no: avgConfidenceNo,
      };
    },
  });
}

export function usePredictionComments(predictionId: string | undefined) {
  const queryClient = useQueryClient();

  // Realtime subscription
  useEffect(() => {
    if (!predictionId) return;
    const channel = supabase
      .channel(`prediction-comments-${predictionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "forecast_comments", filter: `prediction_id=eq.${predictionId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["prediction-comments", predictionId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [predictionId, queryClient]);

  return useQuery({
    queryKey: ["prediction-comments", predictionId],
    enabled: !!predictionId,
    queryFn: async () => {
      const { data: comments, error } = await supabase
        .from("forecast_comments")
        .select("*")
        .eq("forecast_id", predictionId!)
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Fetch display names + avatars for commenters
      const userIds = [...new Set((comments || []).map((c: any) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap: Record<string, { name: string; avatar: string | null }> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.user_id] = { name: p.display_name || "Anonymous", avatar: p.avatar_url }; });

      return (comments || []).map((c: any) => ({
        ...c,
        display_name: profileMap[c.user_id]?.name || "Anonymous",
        avatar_url: profileMap[c.user_id]?.avatar || null,
      })) as PredictionComment[];
    },
  });
}

export function useAddPredictionComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ predictionId, commentText }: { predictionId: string; commentText: string }) => {
      if (!user) throw new Error("Must be logged in");
      const { error } = await supabase.from("forecast_comments").insert({
        forecast_id: predictionId,
        user_id: user.id,
        comment_text: commentText,
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
        
        const commenterName = profile?.display_name || "Someone";

        await createNotification({
          userId: prediction.creator_user_id,
          type: "forecast_new_comment",
          title: "New comment on your prediction",
          message: `${commenterName} commented: "${commentText.slice(0, 80)}${commentText.length > 80 ? "..." : ""}"`,
          link: `/predictions/${predictionId}`,
          metadata: { predictionId },
        });
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["prediction-comments", vars.predictionId] });
    },
  });
}

export function useEditPredictionComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, predictionId, commentText }: { commentId: string; predictionId: string; commentText: string }) => {
      const { error } = await supabase
        .from("forecast_comments")
        .update({ comment_text: commentText, updated_at: new Date().toISOString() })
        .eq("id", commentId);
      if (error) throw error;
      return predictionId;
    },
    onSuccess: (predictionId) => {
      queryClient.invalidateQueries({ queryKey: ["prediction-comments", predictionId] });
    },
  });
}

export function useDeletePredictionComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, predictionId }: { commentId: string; predictionId: string }) => {
      const { error } = await supabase.from("forecast_comments").delete().eq("id", commentId);
      if (error) throw error;
      return predictionId;
    },
    onSuccess: (predictionId) => {
      queryClient.invalidateQueries({ queryKey: ["prediction-comments", predictionId] });
    },
  });
}

export function usePredictionVoteHistory(predictionId: string | undefined) {
  return useQuery({
    queryKey: ["prediction-vote-history", predictionId],
    enabled: !!predictionId,
    queryFn: async (): Promise<VoteHistoryEntry[]> => {
      const { data: history, error } = await supabase
        .rpc("get_forecast_vote_history", { p_forecast_id: predictionId! });
      if (error) throw error;
      if (!history || history.length === 0) return [];

      // Build cumulative data points from daily aggregates
      let cumYes = 0, cumNo = 0;
      const points: VoteHistoryEntry[] = history.map((h: any) => {
        cumYes += Number(h.yes_count);
        cumNo += Number(h.no_count);
        const d = new Date(h.vote_date);
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const total = cumYes + cumNo;
        return {
          date: label,
          yes_count: cumYes,
          no_count: cumNo,
          weighted_yes_pct: total > 0 ? Math.round((cumYes / total) * 1000) / 10 : 50,
        };
      });

      return points;
    },
  });
}

export function useRelatedPredictions(predictionId: string | undefined, projectAId: string | undefined, projectBId: string | null | undefined) {
  return useQuery({
    queryKey: ["related-forecasts", predictionId, projectAId, projectBId],
    enabled: !!predictionId && !!projectAId,
    queryFn: async () => {
      const projectIds = [projectAId!];
      if (projectBId) projectIds.push(projectBId);

      const orFilter = projectIds.map(id => `project_a_id.eq.${id},project_b_id.eq.${id}`).join(",");

      const { data: predictions, error } = await supabase
        .from("forecasts")
        .select("*")
        .or(orFilter)
        .neq("id", predictionId!)
        .order("total_votes_yes", { ascending: false })
        .limit(4);
      if (error) throw error;

      const pIds = new Set<string>();
      (predictions || []).forEach((f: any) => {
        pIds.add(f.project_a_id);
        if (f.project_b_id) pIds.add(f.project_b_id);
      });

      if (pIds.size === 0) return [];

      const { data: projects } = await supabase
        .from("projects")
        .select("id, name, slug, logo_url, logo_emoji")
        .in("id", [...pIds]);

      const pMap: Record<string, any> = {};
      (projects || []).forEach((p: any) => { pMap[p.id] = p; });

      return (predictions || []).map((f: any) => ({
        ...f,
        project_a_name: pMap[f.project_a_id]?.name || "Unknown",
        project_a_slug: pMap[f.project_a_id]?.slug,
        project_a_logo_url: pMap[f.project_a_id]?.logo_url,
        project_a_logo_emoji: pMap[f.project_a_id]?.logo_emoji || "⬡",
        project_b_name: f.project_b_id ? pMap[f.project_b_id]?.name || "Unknown" : null,
        project_b_slug: f.project_b_id ? pMap[f.project_b_id]?.slug : null,
        project_b_logo_url: f.project_b_id ? pMap[f.project_b_id]?.logo_url : null,
        project_b_logo_emoji: f.project_b_id ? pMap[f.project_b_id]?.logo_emoji || "⬡" : "⬡",
      }));
    },
  });
}

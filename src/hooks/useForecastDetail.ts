import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { createNotification } from "@/hooks/useNotifications";

export type ForecastComment = {
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
};

export function useForecastDetail(forecastId: string | undefined) {
  return useQuery({
    queryKey: ["forecast-detail", forecastId],
    enabled: !!forecastId,
    queryFn: async () => {
      const { data: forecast, error } = await supabase
        .from("forecasts")
        .select("*")
        .eq("id", forecastId!)
        .single();
      if (error) throw error;

      // Fetch project details
      const projectIds = [forecast.project_a_id];
      if (forecast.project_b_id) projectIds.push(forecast.project_b_id);

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
          .eq("forecast_id", forecastId!)
          .eq("user_id", session.user.id)
          .maybeSingle();
        userVote = vote?.vote || null;
      }

      // Fetch all votes with confidence to compute averages
      const { data: allVotes } = await supabase
        .from("forecast_votes")
        .select("vote, confidence_level")
        .eq("forecast_id", forecastId!);

      let avgConfidenceYes: number | null = null;
      let avgConfidenceNo: number | null = null;
      if (allVotes && allVotes.length > 0) {
        const yesVotes = allVotes.filter(v => v.vote === "yes" && v.confidence_level != null);
        const noVotes = allVotes.filter(v => v.vote === "no" && v.confidence_level != null);
        if (yesVotes.length > 0) avgConfidenceYes = yesVotes.reduce((s, v) => s + v.confidence_level!, 0) / yesVotes.length;
        if (noVotes.length > 0) avgConfidenceNo = noVotes.reduce((s, v) => s + v.confidence_level!, 0) / noVotes.length;
      }

      // Get creator display name
      const { data: creatorProfile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", forecast.creator_user_id)
        .maybeSingle();

      return {
        ...forecast,
        project_a: projectMap[forecast.project_a_id] || null,
        project_b: forecast.project_b_id ? projectMap[forecast.project_b_id] || null : null,
        user_vote: userVote,
        creator_name: creatorProfile?.display_name || "Anonymous",
        creator_avatar_url: (creatorProfile as any)?.avatar_url ?? null,
        avg_confidence_yes: avgConfidenceYes,
        avg_confidence_no: avgConfidenceNo,
      };
    },
  });
}

export function useForecastComments(forecastId: string | undefined) {
  const queryClient = useQueryClient();

  // Realtime subscription
  useEffect(() => {
    if (!forecastId) return;
    const channel = supabase
      .channel(`forecast-comments-${forecastId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "forecast_comments", filter: `forecast_id=eq.${forecastId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["forecast-comments", forecastId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [forecastId, queryClient]);

  return useQuery({
    queryKey: ["forecast-comments", forecastId],
    enabled: !!forecastId,
    queryFn: async () => {
      const { data: comments, error } = await supabase
        .from("forecast_comments")
        .select("*")
        .eq("forecast_id", forecastId!)
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
      })) as ForecastComment[];
    },
  });
}

export function useAddForecastComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ forecastId, commentText }: { forecastId: string; commentText: string }) => {
      if (!user) throw new Error("Must be logged in");
      const { error } = await supabase.from("forecast_comments").insert({
        forecast_id: forecastId,
        user_id: user.id,
        comment_text: commentText,
      });
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
        
        const commenterName = profile?.display_name || "Someone";

        await createNotification({
          userId: forecast.creator_user_id,
          type: "forecast_new_comment",
          title: "New comment on your forecast",
          message: `${commenterName} commented: "${commentText.slice(0, 80)}${commentText.length > 80 ? "..." : ""}"`,
          link: `/forecasts/${forecastId}`,
          metadata: { forecastId },
        });
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["forecast-comments", vars.forecastId] });
    },
  });
}

export function useEditForecastComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, forecastId, commentText }: { commentId: string; forecastId: string; commentText: string }) => {
      const { error } = await supabase
        .from("forecast_comments")
        .update({ comment_text: commentText, updated_at: new Date().toISOString() })
        .eq("id", commentId);
      if (error) throw error;
      return forecastId;
    },
    onSuccess: (forecastId) => {
      queryClient.invalidateQueries({ queryKey: ["forecast-comments", forecastId] });
    },
  });
}

export function useDeleteForecastComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, forecastId }: { commentId: string; forecastId: string }) => {
      const { error } = await supabase.from("forecast_comments").delete().eq("id", commentId);
      if (error) throw error;
      return forecastId;
    },
    onSuccess: (forecastId) => {
      queryClient.invalidateQueries({ queryKey: ["forecast-comments", forecastId] });
    },
  });
}

export function useForecastVoteHistory(forecastId: string | undefined) {
  return useQuery({
    queryKey: ["forecast-vote-history", forecastId],
    enabled: !!forecastId,
    queryFn: async (): Promise<VoteHistoryEntry[]> => {
      const { data: votes, error } = await supabase
        .from("forecast_votes")
        .select("vote, created_at")
        .eq("forecast_id", forecastId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (!votes || votes.length === 0) return [];

      // Build cumulative data points per individual vote for granular trend
      let cumYes = 0, cumNo = 0;
      const points: VoteHistoryEntry[] = votes.map((v: any) => {
        if (v.vote === "yes") cumYes++;
        else cumNo++;
        const d = new Date(v.created_at);
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
          " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        return { date: label, yes_count: cumYes, no_count: cumNo };
      });

      return points;
    },
  });
}

export function useRelatedForecasts(forecastId: string | undefined, projectAId: string | undefined, projectBId: string | null | undefined) {
  return useQuery({
    queryKey: ["related-forecasts", forecastId, projectAId, projectBId],
    enabled: !!forecastId && !!projectAId,
    queryFn: async () => {
      const projectIds = [projectAId!];
      if (projectBId) projectIds.push(projectBId);

      const orFilter = projectIds.map(id => `project_a_id.eq.${id},project_b_id.eq.${id}`).join(",");

      const { data: forecasts, error } = await supabase
        .from("forecasts")
        .select("*")
        .or(orFilter)
        .neq("id", forecastId!)
        .order("total_votes_yes", { ascending: false })
        .limit(4);
      if (error) throw error;

      const pIds = new Set<string>();
      (forecasts || []).forEach((f: any) => {
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

      return (forecasts || []).map((f: any) => ({
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

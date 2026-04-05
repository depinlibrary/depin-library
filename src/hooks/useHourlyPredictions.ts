import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type HourlyRound = {
  id: string;
  config_id: string;
  project_id: string;
  round_number: number;
  status: string;
  start_time: string;
  end_time: string;
  cooldown_end: string | null;
  start_price: number | null;
  end_price: number | null;
  outcome: string | null;
  total_votes_up: number;
  total_votes_down: number;
  created_at: string;
  // enriched
  project_name?: string;
  project_slug?: string;
  project_logo_url?: string | null;
  project_logo_emoji?: string;
  user_vote?: string | null;
};

/** Voting is open for the first 10% of the round (6 minutes of 60). */
export function getVotingDeadline(startTime: string, endTime: string): Date {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const duration = end - start;
  return new Date(start + duration * 0.1);
}

export function isVotingOpen(round: { status: string; start_time: string; end_time: string }): boolean {
  if (round.status !== "active") return false;
  const now = new Date();
  if (now >= new Date(round.end_time)) return false;
  return now < getVotingDeadline(round.start_time, round.end_time);
}

export function getUserOutcome(userVote: string | null, outcome: string | null): "correct" | "wrong" | null {
  if (!userVote || !outcome || outcome === "draw") return null;
  return userVote === outcome ? "correct" : "wrong";
}

export function useRealtimeHourlyRounds() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("realtime-hourly-rounds")
      .on("postgres_changes", { event: "*", schema: "public", table: "hourly_forecast_rounds" }, (payload: any) => {
        queryClient.invalidateQueries({ queryKey: ["hourly-rounds"] });
        const roundId = payload.new?.id || payload.old?.id;
        if (roundId) {
          queryClient.invalidateQueries({ queryKey: ["hourly-round-detail", roundId] });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "hourly_forecast_votes" }, (payload: any) => {
        queryClient.invalidateQueries({ queryKey: ["hourly-rounds"] });
        const roundId = payload.new?.round_id || payload.old?.round_id;
        if (roundId) {
          queryClient.invalidateQueries({ queryKey: ["hourly-round-detail", roundId] });
          queryClient.invalidateQueries({ queryKey: ["hourly-round-user-vote", roundId] });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);
}

export function useActiveHourlyRounds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["hourly-rounds", "active"],
    queryFn: async (): Promise<HourlyRound[]> => {
      // Get active + recently resolved rounds (for cooldown display)
      const { data: rounds, error } = await supabase
        .from("hourly_forecast_rounds")
        .select("*")
        .in("status", ["active", "resolved"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;

      // Keep only the latest round per config
      const latestByConfig = new Map<string, any>();
      (rounds || []).forEach((r: any) => {
        if (!latestByConfig.has(r.config_id)) {
          latestByConfig.set(r.config_id, r);
        }
      });
      const latest = Array.from(latestByConfig.values());

      // Enrich with project data
      const projectIds = [...new Set(latest.map((r: any) => r.project_id))];
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name, slug, logo_url, logo_emoji")
        .in("id", projectIds);
      const pMap: Record<string, any> = {};
      (projects || []).forEach((p: any) => { pMap[p.id] = p; });

      // Get user votes
      let userVotes: Record<string, string> = {};
      if (user) {
        const roundIds = latest.map((r: any) => r.id);
        if (roundIds.length > 0) {
          const { data: votes } = await supabase
            .from("hourly_forecast_votes")
            .select("round_id, vote")
            .eq("user_id", user.id)
            .in("round_id", roundIds);
          (votes || []).forEach((v: any) => { userVotes[v.round_id] = v.vote; });
        }
      }

      return latest.map((r: any) => ({
        ...r,
        project_name: pMap[r.project_id]?.name || "Unknown",
        project_slug: pMap[r.project_id]?.slug,
        project_logo_url: pMap[r.project_id]?.logo_url,
        project_logo_emoji: pMap[r.project_id]?.logo_emoji || "⬡",
        user_vote: userVotes[r.id] || null,
      }));
    },
    refetchInterval: 15_000, // refresh every 15s for countdown accuracy
  });
}

export function useHourlyRoundHistory(projectId: string | undefined) {
  return useQuery({
    queryKey: ["hourly-rounds", "history", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hourly_forecast_rounds")
        .select("*")
        .eq("project_id", projectId!)
        .eq("status", "resolved")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
}

export function useVoteHourlyRound() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ roundId, vote }: { roundId: string; vote: "up" | "down" }) => {
      if (!user) throw new Error("Must be logged in");

      // Check if user already voted on this round
      const { data: existing } = await supabase
        .from("hourly_forecast_votes")
        .select("id, vote")
        .eq("round_id", roundId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        // Update existing vote
        const { error } = await supabase
          .from("hourly_forecast_votes")
          .update({ vote })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        // Insert new vote
        const { error } = await supabase.from("hourly_forecast_votes").insert({
          round_id: roundId,
          user_id: user.id,
          vote,
        });
        if (error) {
          if (error.code === "23505") throw new Error("You already voted on this round.");
          throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hourly-rounds"] });
    },
  });
}

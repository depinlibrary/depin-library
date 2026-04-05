import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type VoteHistoryItem = {
  forecast_id: string;
  prediction_title: string;
  project_name: string;
  project_logo_emoji: string;
  project_logo_url: string | null;
  vote: string;
  voted_at: string;
  end_date: string;
  total_votes_yes: number;
  total_votes_no: number;
  is_ended: boolean;
  final_result: string | null;
  was_correct: boolean | null;
  is_hourly?: boolean;
};

export type UserPredictionStats = {
  totalVotes: number;
  correctVotes: number;
  incorrectVotes: number;
  pendingVotes: number;
  accuracy: number;
  predictionsCreated: number;
  history: VoteHistoryItem[];
};

export function useUserPredictionStats(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-prediction-stats", userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async (): Promise<UserPredictionStats> => {
      // ── Standard forecast votes ──
      const { data: votes, error: votesError } = await supabase
        .from("forecast_votes")
        .select("forecast_id, vote, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });

      if (votesError) throw votesError;

      const { count: createdCount } = await supabase
        .from("forecasts")
        .select("*", { count: "exact", head: true })
        .eq("creator_user_id", userId!);

      // ── Hourly forecast votes ──
      const { data: hourlyVotes, error: hvError } = await supabase
        .from("hourly_forecast_votes")
        .select("round_id, vote, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });

      if (hvError) throw hvError;

      const hasStandard = (votes?.length ?? 0) > 0;
      const hasHourly = (hourlyVotes?.length ?? 0) > 0;

      if (!hasStandard && !hasHourly) {
        return { totalVotes: 0, correctVotes: 0, incorrectVotes: 0, pendingVotes: 0, accuracy: 0, predictionsCreated: createdCount || 0, history: [] };
      }

      // ── Process standard votes ──
      let standardHistory: VoteHistoryItem[] = [];
      let sCorrect = 0, sIncorrect = 0, sPending = 0;

      if (hasStandard) {
        const predictionIds = [...new Set(votes!.map((v) => v.forecast_id))];
        const { data: forecasts, error: fError } = await supabase
          .from("forecasts")
          .select("id, title, end_date, total_votes_yes, total_votes_no, project_a_id")
          .in("id", predictionIds);
        if (fError) throw fError;

        const projectIds = [...new Set((forecasts || []).map((f) => f.project_a_id))];
        const { data: projects } = await supabase
          .from("projects")
          .select("id, name, logo_emoji, logo_url")
          .in("id", projectIds);

        const projectMap = Object.fromEntries((projects || []).map((p) => [p.id, p]));
        const predictionMap = Object.fromEntries((forecasts || []).map((f) => [f.id, f]));
        const now = new Date();

        standardHistory = votes!.map((v) => {
          const f = predictionMap[v.forecast_id];
          const isEnded = f ? new Date(f.end_date) <= now : false;
          const totalVotes = f ? f.total_votes_yes + f.total_votes_no : 0;
          const yesPct = totalVotes > 0 ? (f.total_votes_yes / totalVotes) * 100 : 50;
          const finalResult = isEnded ? (yesPct >= 50 ? "yes" : "no") : null;
          const wasCorrect = finalResult ? v.vote === finalResult : null;

          if (wasCorrect === true) sCorrect++;
          else if (wasCorrect === false) sIncorrect++;
          else sPending++;

          const project = f ? projectMap[f.project_a_id] : null;
          return {
            forecast_id: v.forecast_id,
            prediction_title: f?.title || "Unknown",
            project_name: project?.name || "Unknown",
            project_logo_emoji: project?.logo_emoji || "⬡",
            project_logo_url: project?.logo_url || null,
            vote: v.vote,
            voted_at: v.created_at,
            end_date: f?.end_date || "",
            total_votes_yes: f?.total_votes_yes || 0,
            total_votes_no: f?.total_votes_no || 0,
            is_ended: isEnded,
            final_result: finalResult,
            was_correct: wasCorrect,
          };
        });
      }

      // ── Process hourly votes ──
      let hourlyHistory: VoteHistoryItem[] = [];
      let hCorrect = 0, hIncorrect = 0, hPending = 0;

      if (hasHourly) {
        const roundIds = [...new Set(hourlyVotes!.map((v) => v.round_id))];
        const { data: rounds, error: rError } = await supabase
          .from("hourly_forecast_rounds")
          .select("id, project_id, status, start_time, end_time, outcome, total_votes_up, total_votes_down")
          .in("id", roundIds);
        if (rError) throw rError;

        const hProjectIds = [...new Set((rounds || []).map((r) => r.project_id))];
        const { data: hProjects } = await supabase
          .from("projects")
          .select("id, name, logo_emoji, logo_url")
          .in("id", hProjectIds);

        const hProjectMap = Object.fromEntries((hProjects || []).map((p) => [p.id, p]));
        const roundMap = Object.fromEntries((rounds || []).map((r) => [r.id, r]));

        hourlyHistory = hourlyVotes!.map((v) => {
          const r = roundMap[v.round_id];
          const isEnded = r ? r.status === "resolved" : false;
          const outcome = r?.outcome || null;
          // outcome is "up"/"down"/"draw"; vote is "up"/"down"
          const wasCorrect = isEnded && outcome && outcome !== "draw" ? v.vote === outcome : null;

          if (wasCorrect === true) hCorrect++;
          else if (wasCorrect === false) hIncorrect++;
          else hPending++;

          const project = r ? hProjectMap[r.project_id] : null;
          return {
            forecast_id: v.round_id,
            prediction_title: `${project?.name || "Unknown"} up or down in 1 hour`,
            project_name: project?.name || "Unknown",
            project_logo_emoji: project?.logo_emoji || "⬡",
            project_logo_url: project?.logo_url || null,
            vote: v.vote,
            voted_at: v.created_at,
            end_date: r?.end_time || "",
            total_votes_yes: r?.total_votes_up || 0,
            total_votes_no: r?.total_votes_down || 0,
            is_ended: isEnded,
            final_result: outcome,
            was_correct: wasCorrect,
            is_hourly: true,
          };
        });
      }

      // ── Combine ──
      const correct = sCorrect + hCorrect;
      const incorrect = sIncorrect + hIncorrect;
      const pending = sPending + hPending;
      const allHistory = [...standardHistory, ...hourlyHistory].sort(
        (a, b) => new Date(b.voted_at).getTime() - new Date(a.voted_at).getTime()
      );

      return {
        totalVotes: (votes?.length || 0) + (hourlyVotes?.length || 0),
        correctVotes: correct,
        incorrectVotes: incorrect,
        pendingVotes: pending,
        accuracy: correct + incorrect > 0 ? Math.round((correct / (correct + incorrect)) * 100) : 0,
        predictionsCreated: createdCount || 0,
        history: allHistory,
      };
    },
  });
}

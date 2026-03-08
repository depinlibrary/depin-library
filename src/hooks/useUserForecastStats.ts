import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type VoteHistoryItem = {
  forecast_id: string;
  forecast_title: string;
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
};

export type UserForecastStats = {
  totalVotes: number;
  correctVotes: number;
  incorrectVotes: number;
  pendingVotes: number;
  accuracy: number;
  history: VoteHistoryItem[];
};

export function useUserForecastStats(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-forecast-stats", userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes - won't refetch if data is fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache even when unused
    queryFn: async (): Promise<UserForecastStats> => {
      // Get all votes by this user
      const { data: votes, error: votesError } = await supabase
        .from("forecast_votes")
        .select("forecast_id, vote, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });

      if (votesError) throw votesError;
      if (!votes?.length) {
        return { totalVotes: 0, correctVotes: 0, incorrectVotes: 0, pendingVotes: 0, accuracy: 0, history: [] };
      }

      // Get the forecasts for these votes
      const forecastIds = [...new Set(votes.map((v) => v.forecast_id))];
      const { data: forecasts, error: fError } = await supabase
        .from("forecasts")
        .select("id, title, end_date, total_votes_yes, total_votes_no, project_a_id")
        .in("id", forecastIds);

      if (fError) throw fError;

      // Get projects for names
      const projectIds = [...new Set((forecasts || []).map((f) => f.project_a_id))];
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name, logo_emoji")
        .in("id", projectIds);

      const projectMap = Object.fromEntries((projects || []).map((p) => [p.id, p]));
      const forecastMap = Object.fromEntries((forecasts || []).map((f) => [f.id, f]));

      const now = new Date();
      let correct = 0;
      let incorrect = 0;
      let pending = 0;

      const history: VoteHistoryItem[] = votes.map((v) => {
        const f = forecastMap[v.forecast_id];
        const isEnded = f ? new Date(f.end_date) <= now : false;
        const totalVotes = f ? f.total_votes_yes + f.total_votes_no : 0;
        const yesPct = totalVotes > 0 ? (f.total_votes_yes / totalVotes) * 100 : 50;
        const finalResult = isEnded ? (yesPct >= 50 ? "yes" : "no") : null;
        const wasCorrect = finalResult ? v.vote === finalResult : null;

        if (wasCorrect === true) correct++;
        else if (wasCorrect === false) incorrect++;
        else pending++;

        const project = f ? projectMap[f.project_a_id] : null;

        return {
          forecast_id: v.forecast_id,
          forecast_title: f?.title || "Unknown",
          project_name: project?.name || "Unknown",
          project_logo_emoji: project?.logo_emoji || "⬡",
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

      return {
        totalVotes: votes.length,
        correctVotes: correct,
        incorrectVotes: incorrect,
        pendingVotes: pending,
        accuracy: correct + incorrect > 0 ? Math.round((correct / (correct + incorrect)) * 100) : 0,
        history,
      };
    },
  });
}

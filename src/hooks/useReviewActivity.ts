import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, format, startOfDay } from "date-fns";

export type DailyActivity = { date: string; count: number };

/**
 * Fetches per-project daily review counts for the last N days.
 * Returns a map: projectId → DailyActivity[]
 */
export function useReviewActivity(projectIds: string[], days = 30) {
  return useQuery({
    queryKey: ["review-activity", projectIds, days],
    queryFn: async () => {
      if (!projectIds.length) return {} as Record<string, DailyActivity[]>;

      const since = subDays(new Date(), days).toISOString();
      const { data, error } = await supabase
        .from("reviews")
        .select("project_id, created_at")
        .in("project_id", projectIds)
        .gte("created_at", since);

      if (error) throw error;

      // Build date buckets per project
      const map: Record<string, Record<string, number>> = {};
      projectIds.forEach((id) => {
        map[id] = {};
        for (let d = 0; d < days; d++) {
          const key = format(startOfDay(subDays(new Date(), days - 1 - d)), "MM/dd");
          map[id][key] = 0;
        }
      });

      (data || []).forEach((r: any) => {
        const key = format(startOfDay(new Date(r.created_at)), "MM/dd");
        if (map[r.project_id]?.[key] !== undefined) {
          map[r.project_id][key]++;
        }
      });

      const result: Record<string, DailyActivity[]> = {};
      projectIds.forEach((id) => {
        result[id] = Object.entries(map[id]).map(([date, count]) => ({ date, count }));
      });
      return result;
    },
    enabled: projectIds.length > 0,
  });
}

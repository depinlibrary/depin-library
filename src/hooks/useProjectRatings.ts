import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ProjectRating = {
  id: string;
  project_id: string;
  user_id: string;
  utility_rating: number;
  tokenomics_rating: number;
  adoption_rating: number;
  hardware_rating: number;
  created_at: string;
  updated_at: string;
};

export type RatingAverages = {
  utility: number;
  tokenomics: number;
  adoption: number;
  hardware: number;
  overall: number;
  count: number;
};

export function useProjectRatings(projectId: string) {
  return useQuery({
    queryKey: ["project-ratings", projectId],
    queryFn: async (): Promise<{ averages: RatingAverages; userRating: ProjectRating | null }> => {
      const { data: ratings, error } = await supabase
        .from("project_ratings")
        .select("*")
        .eq("project_id", projectId);

      if (error) throw error;

      const count = ratings?.length || 0;
      const averages: RatingAverages = {
        utility: 0,
        tokenomics: 0,
        adoption: 0,
        hardware: 0,
        overall: 0,
        count,
      };

      if (count > 0) {
        const sum = ratings!.reduce(
          (acc, r) => ({
            utility: acc.utility + r.utility_rating,
            tokenomics: acc.tokenomics + r.tokenomics_rating,
            adoption: acc.adoption + r.adoption_rating,
            hardware: acc.hardware + r.hardware_rating,
          }),
          { utility: 0, tokenomics: 0, adoption: 0, hardware: 0 }
        );

        averages.utility = sum.utility / count;
        averages.tokenomics = sum.tokenomics / count;
        averages.adoption = sum.adoption / count;
        averages.hardware = sum.hardware / count;
        averages.overall = (averages.utility + averages.tokenomics + averages.adoption + averages.hardware) / 4;
      }

      return { averages, userRating: null };
    },
    enabled: !!projectId,
  });
}

export function useUserRating(projectId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-rating", projectId, user?.id],
    queryFn: async (): Promise<ProjectRating | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("project_ratings")
        .select("*")
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!projectId && !!user,
  });
}

export function useUpsertRating() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      projectId,
      utility,
      tokenomics,
      adoption,
      hardware,
    }: {
      projectId: string;
      utility: number;
      tokenomics: number;
      adoption: number;
      hardware: number;
    }) => {
      if (!user) throw new Error("Must be logged in");

      const { error } = await supabase.from("project_ratings").upsert(
        {
          project_id: projectId,
          user_id: user.id,
          utility_rating: utility,
          tokenomics_rating: tokenomics,
          adoption_rating: adoption,
          hardware_rating: hardware,
        },
        { onConflict: "project_id,user_id" }
      );
      if (error) throw error;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["project-ratings", projectId] });
      queryClient.invalidateQueries({ queryKey: ["user-rating", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
    },
  });
}

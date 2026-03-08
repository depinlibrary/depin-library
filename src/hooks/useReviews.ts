import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type Review = {
  id: string;
  user_id: string;
  project_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  display_name?: string;
  avatar_url?: string | null;
};

export function useReviews(projectId: string) {
  return useQuery({
    queryKey: ["reviews", projectId],
    queryFn: async (): Promise<Review[]> => {
      const { data: reviews, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;

      const userIds = [...new Set((reviews || []).map((r: any) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap: Record<string, { name: string; avatar: string | null }> = {};
      (profiles || []).forEach((p: any) => {
        profileMap[p.user_id] = { name: p.display_name || "Anonymous", avatar: p.avatar_url };
      });

      return (reviews || []).map((r: any) => ({
        ...r,
        display_name: profileMap[r.user_id]?.name || "Anonymous",
        avatar_url: profileMap[r.user_id]?.avatar || null,
      }));
    },
    enabled: !!projectId,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ projectId, rating, reviewText }: { projectId: string; rating: number; reviewText: string }) => {
      if (!user) throw new Error("Must be logged in");
      const { error } = await supabase.from("reviews").insert({
        user_id: user.id,
        project_id: projectId,
        rating,
        review_text: reviewText || null,
      });
      if (error) throw error;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["reviews", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewId, projectId }: { reviewId: string; projectId: string }) => {
      const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["reviews", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
    },
  });
}

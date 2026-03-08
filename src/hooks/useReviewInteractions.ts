import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { createNotification } from "@/hooks/useNotifications";

export function useReviewLikes(reviewIds: string[]) {
  return useQuery({
    queryKey: ["review-likes", reviewIds],
    queryFn: async (): Promise<Record<string, { count: number; userLiked: boolean }>> => {
      if (!reviewIds.length) return {};

      const { data: likes, error } = await supabase
        .from("review_likes")
        .select("review_id, user_id")
        .in("review_id", reviewIds);

      if (error) throw error;

      const map: Record<string, { count: number; userLiked: boolean }> = {};
      reviewIds.forEach((id) => { map[id] = { count: 0, userLiked: false }; });

      const { data: { user } } = await supabase.auth.getUser();

      (likes || []).forEach((l: any) => {
        if (!map[l.review_id]) map[l.review_id] = { count: 0, userLiked: false };
        map[l.review_id].count += 1;
        if (user && l.user_id === user.id) map[l.review_id].userLiked = true;
      });

      return map;
    },
    enabled: reviewIds.length > 0,
  });
}

export function useToggleReviewLike() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ reviewId, isLiked }: { reviewId: string; isLiked: boolean }) => {
      if (!user) throw new Error("Must be logged in");
      if (isLiked) {
        const { error } = await supabase
          .from("review_likes")
          .delete()
          .eq("review_id", reviewId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("review_likes")
          .insert({ review_id: reviewId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-likes"] });
    },
  });
}

export type ReviewReply = {
  id: string;
  review_id: string;
  user_id: string;
  reply_text: string;
  created_at: string;
  display_name?: string;
};

export function useReviewReplies(reviewId: string) {
  return useQuery({
    queryKey: ["review-replies", reviewId],
    queryFn: async (): Promise<ReviewReply[]> => {
      const { data: replies, error } = await supabase
        .from("review_replies")
        .select("*")
        .eq("review_id", reviewId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const userIds = [...new Set((replies || []).map((r: any) => r.user_id))];
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { nameMap[p.user_id] = p.display_name || "Anonymous"; });

      return (replies || []).map((r: any) => ({
        ...r,
        display_name: nameMap[r.user_id] || "Anonymous",
      }));
    },
    enabled: !!reviewId,
  });
}

export function useCreateReviewReply() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ reviewId, replyText }: { reviewId: string; replyText: string }) => {
      if (!user) throw new Error("Must be logged in");
      const { error } = await supabase
        .from("review_replies")
        .insert({ review_id: reviewId, user_id: user.id, reply_text: replyText });
      if (error) throw error;
    },
    onSuccess: (_, { reviewId }) => {
      queryClient.invalidateQueries({ queryKey: ["review-replies", reviewId] });
    },
  });
}

export function useDeleteReviewReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ replyId, reviewId }: { replyId: string; reviewId: string }) => {
      const { error } = await supabase.from("review_replies").delete().eq("id", replyId);
      if (error) throw error;
      return reviewId;
    },
    onSuccess: (reviewId) => {
      queryClient.invalidateQueries({ queryKey: ["review-replies", reviewId] });
    },
  });
}

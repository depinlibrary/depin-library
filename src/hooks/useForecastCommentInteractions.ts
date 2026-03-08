import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { createNotification } from "@/hooks/useNotifications";

// ── Likes ──

export function useForecastCommentLikes(commentIds: string[]) {
  return useQuery({
    queryKey: ["forecast-comment-likes", commentIds],
    queryFn: async (): Promise<Record<string, { count: number; userLiked: boolean }>> => {
      if (!commentIds.length) return {};

      const { data: likes, error } = await supabase
        .from("forecast_comment_likes")
        .select("comment_id, user_id")
        .in("comment_id", commentIds);

      if (error) throw error;

      const map: Record<string, { count: number; userLiked: boolean }> = {};
      commentIds.forEach((id) => { map[id] = { count: 0, userLiked: false }; });

      const { data: { user } } = await supabase.auth.getUser();

      (likes || []).forEach((l: any) => {
        if (!map[l.comment_id]) map[l.comment_id] = { count: 0, userLiked: false };
        map[l.comment_id].count += 1;
        if (user && l.user_id === user.id) map[l.comment_id].userLiked = true;
      });

      return map;
    },
    enabled: commentIds.length > 0,
  });
}

export function useToggleForecastCommentLike() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ commentId, isLiked }: { commentId: string; isLiked: boolean }) => {
      if (!user) throw new Error("Must be logged in");
      if (isLiked) {
        const { error } = await supabase
          .from("forecast_comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("forecast_comment_likes")
          .insert({ comment_id: commentId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forecast-comment-likes"] });
    },
  });
}

// ── Replies ──

export type ForecastCommentReply = {
  id: string;
  comment_id: string;
  user_id: string;
  reply_text: string;
  created_at: string;
  display_name?: string;
};

export function useForecastCommentReplies(commentId: string) {
  return useQuery({
    queryKey: ["forecast-comment-replies", commentId],
    queryFn: async (): Promise<ForecastCommentReply[]> => {
      const { data: replies, error } = await supabase
        .from("forecast_comment_replies")
        .select("*")
        .eq("comment_id", commentId)
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
    enabled: !!commentId,
  });
}

export function useCreateForecastCommentReply() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ commentId, replyText }: { commentId: string; replyText: string }) => {
      if (!user) throw new Error("Must be logged in");
      const { error } = await supabase
        .from("forecast_comment_replies")
        .insert({ comment_id: commentId, user_id: user.id, reply_text: replyText });
      if (error) throw error;
    },
    onSuccess: (_, { commentId }) => {
      queryClient.invalidateQueries({ queryKey: ["forecast-comment-replies", commentId] });
    },
  });
}

export function useDeleteForecastCommentReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ replyId, commentId }: { replyId: string; commentId: string }) => {
      const { error } = await supabase.from("forecast_comment_replies").delete().eq("id", replyId);
      if (error) throw error;
      return commentId;
    },
    onSuccess: (commentId) => {
      queryClient.invalidateQueries({ queryKey: ["forecast-comment-replies", commentId] });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { createNotification } from "@/hooks/useNotifications";

// ── Likes ──

export function usePredictionCommentLikes(commentIds: string[]) {
  return useQuery({
    queryKey: ["prediction-comment-likes", commentIds],
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

export function useTogglePredictionCommentLike() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ commentId, isLiked, predictionId }: { commentId: string; isLiked: boolean; predictionId: string }) => {
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

        // Notify comment author
        const { data: comment } = await supabase
          .from("forecast_comments")
          .select("user_id")
          .eq("id", commentId)
          .single();

        if (comment && comment.user_id !== user.id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", user.id)
            .single();
          
          const likerName = profile?.display_name || "Someone";

          await createNotification({
            userId: comment.user_id,
            type: "forecast_comment_like",
            title: "Your comment was liked",
            message: `${likerName} liked your comment`,
            link: `/predictions/${predictionId}`,
            metadata: { commentId, predictionId },
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prediction-comment-likes"] });
    },
  });
}

// ── Replies ──

export type PredictionCommentReply = {
  id: string;
  comment_id: string;
  user_id: string;
  reply_text: string;
  created_at: string;
  display_name?: string;
  avatar_url?: string | null;
};

export function usePredictionCommentReplies(commentId: string) {
  return useQuery({
    queryKey: ["prediction-comment-replies", commentId],
    queryFn: async (): Promise<PredictionCommentReply[]> => {
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
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap: Record<string, { name: string; avatar: string | null }> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.user_id] = { name: p.display_name || "Anonymous", avatar: p.avatar_url }; });

      return (replies || []).map((r: any) => ({
        ...r,
        display_name: profileMap[r.user_id]?.name || "Anonymous",
        avatar_url: profileMap[r.user_id]?.avatar || null,
      }));
    },
    enabled: !!commentId,
  });
}

export function useCreatePredictionCommentReply() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ commentId, replyText, predictionId }: { commentId: string; replyText: string; predictionId: string }) => {
      if (!user) throw new Error("Must be logged in");
      
      // Insert the reply
      const { error } = await supabase
        .from("forecast_comment_replies")
        .insert({ comment_id: commentId, user_id: user.id, reply_text: replyText });
      if (error) throw error;

      // Fetch comment author to notify them
      const { data: comment } = await supabase
        .from("forecast_comments")
        .select("user_id, forecast_id")
        .eq("id", commentId)
        .single();

      // Don't notify if replying to own comment
      if (comment && comment.user_id !== user.id) {
        // Get replier's display name
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", user.id)
          .single();
        
        const replierName = profile?.display_name || "Someone";

        await createNotification({
          userId: comment.user_id,
          type: "forecast_comment_reply",
          title: "New reply to your comment",
          message: `${replierName} replied: "${replyText.slice(0, 100)}${replyText.length > 100 ? "..." : ""}"`,
          link: `/predictions/${predictionId}`,
          metadata: { commentId, predictionId },
        });
      }
    },
    onSuccess: (_, { commentId }) => {
      queryClient.invalidateQueries({ queryKey: ["prediction-comment-replies", commentId] });
    },
  });
}

export function useDeletePredictionCommentReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ replyId, commentId }: { replyId: string; commentId: string }) => {
      const { error } = await supabase.from("forecast_comment_replies").delete().eq("id", replyId);
      if (error) throw error;
      return commentId;
    },
    onSuccess: (commentId) => {
      queryClient.invalidateQueries({ queryKey: ["prediction-comment-replies", commentId] });
    },
  });
}

// ── Reply Likes ──

export function usePredictionReplyLikes(replyIds: string[]) {
  return useQuery({
    queryKey: ["prediction-reply-likes", replyIds],
    queryFn: async (): Promise<Record<string, { count: number; userLiked: boolean }>> => {
      if (!replyIds.length) return {};

      const { data: likes, error } = await supabase
        .from("forecast_reply_likes")
        .select("reply_id, user_id")
        .in("reply_id", replyIds);

      if (error) throw error;

      const map: Record<string, { count: number; userLiked: boolean }> = {};
      replyIds.forEach((id) => { map[id] = { count: 0, userLiked: false }; });

      const { data: { user } } = await supabase.auth.getUser();

      (likes || []).forEach((l: any) => {
        if (!map[l.reply_id]) map[l.reply_id] = { count: 0, userLiked: false };
        map[l.reply_id].count += 1;
        if (user && l.user_id === user.id) map[l.reply_id].userLiked = true;
      });

      return map;
    },
    enabled: replyIds.length > 0,
  });
}

export function useTogglePredictionReplyLike() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ replyId, isLiked, predictionId }: { replyId: string; isLiked: boolean; predictionId: string }) => {
      if (!user) throw new Error("Must be logged in");
      if (isLiked) {
        const { error } = await supabase
          .from("forecast_reply_likes")
          .delete()
          .eq("reply_id", replyId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("forecast_reply_likes")
          .insert({ reply_id: replyId, user_id: user.id });
        if (error) throw error;

        // Notify reply author
        const { data: reply } = await supabase
          .from("forecast_comment_replies")
          .select("user_id")
          .eq("id", replyId)
          .single();

        if (reply && reply.user_id !== user.id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", user.id)
            .single();
          
          const likerName = profile?.display_name || "Someone";

          await createNotification({
            userId: reply.user_id,
            type: "forecast_comment_like",
            title: "Your reply was liked",
            message: `${likerName} liked your reply`,
            link: `/predictions/${predictionId}`,
            metadata: { replyId, predictionId },
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prediction-reply-likes"] });
    },
  });
}

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Send, Trash2, User as UserIcon,
  Pencil, Check, X, Heart, MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import UserStatsHoverCard from "@/components/UserStatsHoverCard";
import { useAuth } from "@/contexts/AuthContext";
import {
  useForecastCommentLikes,
  useToggleForecastCommentLike,
  useForecastCommentReplies,
  useCreateForecastCommentReply,
  useDeleteForecastCommentReply,
  useForecastReplyLikes,
  useToggleForecastReplyLike,
} from "@/hooks/useForecastCommentInteractions";
import type { ForecastComment } from "@/hooks/useForecastDetail";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

// ── Reply Thread ──
const CommentReplyThread = ({ commentId, forecastId }: { commentId: string; forecastId: string }) => {
  const { user } = useAuth();
  const { data: replies = [] } = useForecastCommentReplies(commentId);
  const createReply = useCreateForecastCommentReply();
  const deleteReply = useDeleteForecastCommentReply();
  const [replyText, setReplyText] = useState("");
  const [showInput, setShowInput] = useState(false);

  const replyIds = useMemo(() => replies.map((r) => r.id), [replies]);
  const { data: replyLikesMap = {} } = useForecastReplyLikes(replyIds);
  const toggleReplyLike = useToggleForecastReplyLike();

  const handleSubmit = async () => {
    if (!replyText.trim()) return;
    if (!user) { toast.error("Sign in to reply"); return; }
    try {
      await createReply.mutateAsync({ commentId, replyText: replyText.trim(), forecastId });
      setReplyText("");
      setShowInput(false);
      toast.success("Reply posted");
    } catch { toast.error("Failed to post reply"); }
  };

  return (
    <div className="mt-2">
      <AnimatePresence>
        {replies.map((reply) => {
          const likeInfo = replyLikesMap[reply.id] || { count: 0, userLiked: false };
          return (
            <motion.div
              key={reply.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="ml-6 pl-3 border-l-2 border-border/60 py-2 group/reply"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <UserStatsHoverCard userId={reply.user_id} displayName={reply.display_name || "Anonymous"}>
                  <span className="text-[11px] font-medium text-foreground cursor-pointer hover:text-primary transition-colors">{reply.display_name}</span>
                </UserStatsHoverCard>
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                </span>
                {user?.id === reply.user_id && (
                  <button
                    onClick={() => deleteReply.mutate({ replyId: reply.id, commentId })}
                    className="ml-auto opacity-0 group-hover/reply:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{reply.reply_text}</p>
              <div className="flex items-center gap-3 mt-1">
                <button
                  onClick={() => {
                    if (!user) { toast.error("Sign in to like"); return; }
                    toggleReplyLike.mutate({ replyId: reply.id, isLiked: likeInfo.userLiked, forecastId });
                  }}
                  className={`flex items-center gap-1 text-[11px] transition-colors ${
                    likeInfo.userLiked ? "text-pink-500" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Heart className={`h-3 w-3 ${likeInfo.userLiked ? "fill-current" : ""}`} />
                  {likeInfo.count > 0 && <span>{likeInfo.count}</span>}
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {showInput ? (
        <div className="ml-6 mt-2 space-y-2">
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            className="min-h-[60px] text-xs bg-background resize-none"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
              if (e.key === "Escape") { setShowInput(false); setReplyText(""); }
            }}
          />
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setShowInput(false); setReplyText(""); }}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs gap-1" disabled={!replyText.trim() || createReply.isPending} onClick={handleSubmit}>
              <Send className="h-3 w-3" /> Reply
            </Button>
          </div>
        </div>
      ) : (
        user && (
          <button
            onClick={() => setShowInput(true)}
            className="ml-6 mt-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <MessageCircle className="h-3 w-3" /> Reply
          </button>
        )
      )}
    </div>
  );
};

// ── Main Discussion Section ──
interface DiscussionSectionProps {
  forecastId: string;
  comments: ForecastComment[];
  commentsLoading: boolean;
  onAddComment: () => void;
  commentText: string;
  setCommentText: (text: string) => void;
  addCommentPending: boolean;
  editingCommentId: string | null;
  setEditingCommentId: (id: string | null) => void;
  editingText: string;
  setEditingText: (text: string) => void;
  onEditComment: (commentId: string, forecastId: string, text: string) => void;
  editCommentPending: boolean;
  onDeleteComment: (commentId: string, forecastId: string) => void;
}

export default function DiscussionSection({
  forecastId,
  comments,
  commentsLoading,
  onAddComment,
  commentText,
  setCommentText,
  addCommentPending,
  editingCommentId,
  setEditingCommentId,
  editingText,
  setEditingText,
  onEditComment,
  editCommentPending,
  onDeleteComment,
}: DiscussionSectionProps) {
  const { user } = useAuth();
  const commentIds = useMemo(() => comments.map((c) => c.id), [comments]);
  const { data: likesMap = {} } = useForecastCommentLikes(commentIds);
  const toggleLike = useToggleForecastCommentLike();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          Discussion
        </h2>
        <span className="text-xs text-muted-foreground font-medium">{comments.length} comment{comments.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Comment input */}
      {user ? (
        <div className="px-6 py-4 border-b border-border bg-secondary/20">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <UserIcon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <Textarea
                placeholder="Share your thoughts on this forecast..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="min-h-[80px] text-sm bg-background resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onAddComment();
                }}
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">⌘ + Enter to submit</span>
                <Button size="sm" onClick={onAddComment} disabled={!commentText.trim() || addCommentPending} className="gap-1.5">
                  <Send className="h-3.5 w-3.5" /> Post
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-6 py-5 border-b border-border text-center">
          <Link to="/auth" className="text-sm text-primary hover:underline font-medium">Sign in to join the discussion</Link>
        </div>
      )}

      {/* Comments list */}
      <div className="divide-y divide-border/60">
        {commentsLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-6 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-12 w-full" />
            </div>
          ))
        ) : comments.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground">No comments yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          comments.map((comment) => {
            const likeInfo = likesMap[comment.id] || { count: 0, userLiked: false };
            return (
              <div key={comment.id} className="px-6 py-4 group/comment hover:bg-secondary/10 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                    <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <UserStatsHoverCard userId={comment.user_id} displayName={comment.display_name || "Anonymous"}>
                        <span className="text-xs font-semibold text-foreground cursor-pointer hover:text-primary transition-colors">{comment.display_name}</span>
                      </UserStatsHoverCard>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                      {user?.id === comment.user_id && editingCommentId !== comment.id && (
                        <div className="ml-auto flex items-center gap-1.5 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditingCommentId(comment.id); setEditingText(comment.comment_text); }}
                            className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => onDeleteComment(comment.id, forecastId)}
                            className="text-muted-foreground hover:text-destructive p-0.5 rounded"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    {editingCommentId === comment.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="min-h-[60px] text-sm bg-background resize-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && editingText.trim()) {
                              onEditComment(comment.id, forecastId, editingText.trim());
                              setEditingCommentId(null);
                            }
                            if (e.key === "Escape") setEditingCommentId(null);
                          }}
                        />
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setEditingCommentId(null)}>
                            <X className="h-3 w-3" /> Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 text-xs gap-1"
                            disabled={!editingText.trim() || editCommentPending}
                            onClick={() => {
                              onEditComment(comment.id, forecastId, editingText.trim());
                              setEditingCommentId(null);
                            }}
                          >
                            <Check className="h-3 w-3" /> Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{comment.comment_text}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <button
                            onClick={() => {
                              if (!user) { toast.error("Sign in to like"); return; }
                              toggleLike.mutate({ commentId: comment.id, isLiked: likeInfo.userLiked, forecastId });
                            }}
                            className={`flex items-center gap-1 text-[11px] transition-colors ${
                              likeInfo.userLiked ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <Heart className={`h-3.5 w-3.5 ${likeInfo.userLiked ? "fill-primary" : ""}`} />
                            {likeInfo.count > 0 && <span>{likeInfo.count}</span>}
                          </button>
                        </div>
                      </>
                    )}
                    <CommentReplyThread commentId={comment.id} forecastId={forecastId} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

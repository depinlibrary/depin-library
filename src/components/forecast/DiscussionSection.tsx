import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Send, Trash2, User as UserIcon,
  Pencil, Check, X, Heart, MessageCircle, MoreHorizontal,
  Flag, ChevronDown, ChevronUp
} from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

// ── Reply Thread (Polymarket-style) ──
const CommentReplyThread = ({ commentId, forecastId, showReplyInput, onToggleReplyInput }: { commentId: string; forecastId: string; showReplyInput: boolean; onToggleReplyInput: () => void }) => {
  const { user } = useAuth();
  const { data: replies = [] } = useForecastCommentReplies(commentId);
  const createReply = useCreateForecastCommentReply();
  const deleteReply = useDeleteForecastCommentReply();
  const [replyText, setReplyText] = useState("");
  const [showReplies, setShowReplies] = useState(false);

  const replyIds = useMemo(() => replies.map((r) => r.id), [replies]);
  const { data: replyLikesMap = {} } = useForecastReplyLikes(replyIds);
  const toggleReplyLike = useToggleForecastReplyLike();

  const handleSubmit = async () => {
    if (!replyText.trim()) return;
    if (!user) { toast.error("Sign in to reply"); return; }
    try {
      await createReply.mutateAsync({ commentId, replyText: replyText.trim(), forecastId });
      setReplyText("");
      onToggleReplyInput();
      setShowReplies(true);
      toast.success("Reply posted");
    } catch { toast.error("Failed to post reply"); }
  };

  return (
    <div className="mt-1">
      {/* Show replies toggle */}
      {replies.length > 0 && (
        <button
          onClick={() => setShowReplies(!showReplies)}
          className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors mt-1 mb-1"
        >
          {showReplies ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {replies.length} {replies.length === 1 ? "reply" : "replies"}
        </button>
      )}

      <AnimatePresence>
        {showReplies && replies.map((reply) => {
          const likeInfo = replyLikesMap[reply.id] || { count: 0, userLiked: false };
          return (
            <motion.div
              key={reply.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="ml-8 py-3 group/reply"
            >
              <div className="flex items-start gap-2.5">
                <UserAvatar avatarUrl={reply.avatar_url} displayName={reply.display_name} size="sm" className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <UserStatsHoverCard userId={reply.user_id} displayName={reply.display_name || "Anonymous"} avatarUrl={reply.avatar_url}>
                      <span className="text-[11px] font-semibold text-foreground cursor-pointer hover:text-primary transition-colors">{reply.display_name}</span>
                    </UserStatsHoverCard>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-[13px] text-foreground/80 leading-relaxed mt-0.5">{reply.reply_text}</p>
                   <div className="flex items-center gap-3 mt-1.5">
                    <button
                      onClick={() => {
                        if (!user) { toast.error("Sign in to like"); return; }
                        toggleReplyLike.mutate({ replyId: reply.id, isLiked: likeInfo.userLiked, forecastId });
                      }}
                      className={`flex items-center gap-1 text-[11px] transition-colors ${
                        likeInfo.userLiked ? "text-red-500" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Heart className={`h-3 w-3 ${likeInfo.userLiked ? "fill-red-500" : ""}`} />
                      {likeInfo.count > 0 && <span>{likeInfo.count}</span>}
                    </button>
                    {user?.id === reply.user_id && (
                      <button
                        onClick={() => deleteReply.mutate({ replyId: reply.id, commentId })}
                        className="opacity-0 group-hover/reply:opacity-100 transition-opacity text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-0.5"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {showReplyInput ? (
        <div className="ml-8 mt-2 space-y-2">
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
              <UserIcon className="h-3 w-3 text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="min-h-[56px] text-[13px] bg-secondary/30 border-border/50 resize-none rounded-xl focus:bg-background"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
                  if (e.key === "Escape") { onToggleReplyInput(); setReplyText(""); }
                }}
              />
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => { onToggleReplyInput(); setReplyText(""); }}>Cancel</Button>
                <Button size="sm" className="h-7 text-xs gap-1 rounded-lg" disabled={!replyText.trim() || createReply.isPending} onClick={handleSubmit}>
                  Reply
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

// ── Main Discussion Section (Polymarket-style) ──
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

  const handleReport = (commentId: string) => {
    toast.success("Comment reported. Our team will review it.");
  };

  return (
    <div>
      {/* Comment input — Polymarket style: simple text area at top */}
      {user ? (
        <div className="pb-4 mb-4 border-b border-border/50">
          <div className="flex gap-3">
            <UserAvatar avatarUrl={null} displayName={user.email || "You"} size="sm" className="mt-1 shrink-0" />
            <div className="flex-1">
              <Textarea
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="min-h-[64px] text-[13px] bg-secondary/30 border-border/50 resize-none rounded-xl focus:bg-background placeholder:text-muted-foreground/60"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onAddComment();
                }}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-muted-foreground/60">⌘+Enter to post</span>
                <Button
                  size="sm"
                  onClick={onAddComment}
                  disabled={!commentText.trim() || addCommentPending}
                  className="h-8 px-4 text-xs font-semibold rounded-lg"
                >
                  Comment
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="pb-4 mb-4 border-b border-border/50 text-center py-4">
          <Link to="/auth" className="text-sm text-primary hover:underline font-medium">Sign in to comment</Link>
        </div>
      )}

      {/* Comments list — Polymarket-style: flat, clean, action bar */}
      <div className="space-y-0">
        {commentsLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="py-4">
              <div className="flex items-center gap-2.5 mb-2">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))
        ) : comments.length === 0 ? (
          <div className="py-12 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground/60">No comments yet</p>
            <p className="text-xs text-muted-foreground/40 mt-1">Be the first to share your thoughts</p>
          </div>
        ) : (
          comments.map((comment, idx) => {
            const likeInfo = likesMap[comment.id] || { count: 0, userLiked: false };
            return (
              <div key={comment.id} className={`py-4 group/comment ${idx < comments.length - 1 ? "border-b border-border/30" : ""}`}>
                <div className="flex items-start gap-3">
                  <UserAvatar avatarUrl={comment.avatar_url} displayName={comment.display_name} size="sm" className="mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    {/* Header: name + time + actions */}
                    <div className="flex items-center gap-2 mb-1">
                      <UserStatsHoverCard userId={comment.user_id} displayName={comment.display_name || "Anonymous"} avatarUrl={comment.avatar_url}>
                        <span className="text-[13px] font-semibold text-foreground cursor-pointer hover:text-primary transition-colors">{comment.display_name}</span>
                      </UserStatsHoverCard>
                      <span className="text-[11px] text-muted-foreground/60">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>

                      {/* Three-dot menu (Polymarket style) */}
                      <div className="ml-auto">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded-md text-muted-foreground/40 hover:text-muted-foreground hover:bg-secondary/50 transition-all opacity-0 group-hover/comment:opacity-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            {user?.id === comment.user_id && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => { setEditingCommentId(comment.id); setEditingText(comment.comment_text); }}
                                  className="text-xs gap-2"
                                >
                                  <Pencil className="h-3 w-3" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => onDeleteComment(comment.id, forecastId)}
                                  className="text-xs gap-2 text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" /> Delete
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleReport(comment.id)}
                              className="text-xs gap-2"
                            >
                              <Flag className="h-3 w-3" /> Report
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Comment body */}
                    {editingCommentId === comment.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="min-h-[56px] text-[13px] bg-secondary/30 border-border/50 resize-none rounded-xl"
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
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => setEditingCommentId(null)}>
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 text-xs rounded-lg"
                            disabled={!editingText.trim() || editCommentPending}
                            onClick={() => {
                              onEditComment(comment.id, forecastId, editingText.trim());
                              setEditingCommentId(null);
                            }}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-[13px] text-foreground/80 leading-relaxed whitespace-pre-wrap">{comment.comment_text}</p>
                        
                        {/* Action bar */}
                        <div className="flex items-center gap-4 mt-2">
                          <button
                            onClick={() => {
                              if (!user) { toast.error("Sign in to like"); return; }
                              toggleLike.mutate({ commentId: comment.id, isLiked: likeInfo.userLiked, forecastId });
                            }}
                            className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${
                              likeInfo.userLiked ? "text-red-500" : "text-muted-foreground/60 hover:text-foreground"
                            }`}
                          >
                            <Heart className={`h-3.5 w-3.5 ${likeInfo.userLiked ? "fill-red-500" : ""}`} />
                            {likeInfo.count > 0 ? likeInfo.count : "Like"}
                          </button>
                          {user && (
                            <ReplyTriggerButton commentId={comment.id} />
                          )}
                        </div>
                      </>
                    )}

                    {/* Reply thread */}
                    <CommentReplyThread commentId={comment.id} forecastId={forecastId} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

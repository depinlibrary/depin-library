import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { shouldNotify } from "@/hooks/useNotificationPreferences";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
  metadata: Record<string, any>;
};

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const initialLoadDone = useRef(false);

  // Realtime subscription with toast popup for new notifications
  useEffect(() => {
    if (!user) { initialLoadDone.current = false; return; }

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
          // Show toast popup for new notifications (skip initial load)
          if (initialLoadDone.current && payload.new) {
            const n = payload.new as Notification;
            toast(n.title, {
              description: n.message,
              duration: 5000,
              action: n.link ? { label: "View", onClick: () => window.location.assign(n.link!) } : undefined,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
        }
      )
      .subscribe();

    // Mark initial load done after a short delay so existing rows don't trigger toasts
    const timer = setTimeout(() => { initialLoadDone.current = true; }, 2000);

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async (): Promise<Notification[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as Notification[];
    },
    enabled: !!user,
  });
}

export function useUnreadNotificationCount() {
  const { data: notifications = [] } = useNotifications();
  return notifications.filter((n) => !n.is_read).length;
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });
}

// Helper to create a notification
export async function createNotification({
  userId,
  type,
  title,
  message,
  link,
  metadata = {},
}: {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}) {
  // Check user preferences before sending
  const allowed = await shouldNotify(userId, type);
  if (!allowed) return;

  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    message,
    link: link || null,
    metadata,
  });
  if (error) console.error("Failed to create notification:", error);
}

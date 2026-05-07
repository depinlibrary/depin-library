import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type NotificationPreferences = {
  id: string;
  user_id: string;
  review_like: boolean;
  price_alert: boolean;
  created_at: string;
  updated_at: string;
};

const DEFAULT_PREFS = {
  review_like: true,
  price_alert: true,
};

export function useNotificationPreferences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: async (): Promise<NotificationPreferences> => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Create default preferences
        const { data: created, error: insertErr } = await supabase
          .from("notification_preferences")
          .insert({ user_id: user.id, ...DEFAULT_PREFS })
          .select()
          .single();
        if (insertErr) throw insertErr;
        return created as NotificationPreferences;
      }

      return data as NotificationPreferences;
    },
    enabled: !!user,
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<Pick<NotificationPreferences,
      "review_like" | "price_alert"
    >>) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("notification_preferences")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences", user?.id] });
    },
  });
}

/** Check if a user wants a specific notification type. Used before creating notifications. */
export async function shouldNotify(userId: string, type: string): Promise<boolean> {
  const column = type as keyof typeof DEFAULT_PREFS;
  if (!(column in DEFAULT_PREFS)) return true; // unknown types always notify

  const { data, error } = await supabase
    .from("notification_preferences")
    .select(column)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return true; // default to true if no prefs set
  return (data as Record<string, boolean>)[column] ?? true;
}

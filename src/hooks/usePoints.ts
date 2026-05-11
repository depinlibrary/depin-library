import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const POINTS_PER_WEEK = 300;
export const COST_PER_PROMPT = 25;

export type PointsRow = {
  user_id: string;
  balance: number;
  last_claim_at: string | null;
  last_dismissed_window: string | null;
};

export function usePoints() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["user-points", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<PointsRow | null> => {
      const { data, error } = await supabase
        .from("user_points" as any)
        .select("user_id, balance, last_claim_at, last_dismissed_window")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
  });

  const balance = query.data?.balance ?? 0;
  const lastClaimAt = query.data?.last_claim_at ? new Date(query.data.last_claim_at) : null;
  const lastDismissedWindow = query.data?.last_dismissed_window ?? null;
  const nextClaimAt = lastClaimAt
    ? new Date(lastClaimAt.getTime() + 7 * 24 * 60 * 60 * 1000)
    : null;
  const canClaim = !lastClaimAt || (nextClaimAt && nextClaimAt.getTime() <= Date.now());

  const claimWeekly = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase.rpc as any)("claim_weekly_points");
      if (error) throw error;
      return data as { success: boolean; balance: number; claimed?: number; error?: string; next_claim_at?: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-points", user?.id] });
    },
  });

  const spend = useCallback(
    async (amount: number, reason: string): Promise<{ ok: boolean; balance: number }> => {
      const { data, error } = await (supabase.rpc as any)("spend_points", {
        _amount: amount,
        _reason: reason,
      });
      if (error) throw error;
      const res = data as { success: boolean; balance: number; error?: string };
      qc.invalidateQueries({ queryKey: ["user-points", user?.id] });
      return { ok: !!res?.success, balance: res?.balance ?? 0 };
    },
    [qc, user?.id]
  );

  return {
    balance,
    lastClaimAt,
    lastDismissedWindow,
    nextClaimAt,
    canClaim: !!canClaim,
    isLoading: query.isLoading,
    refetch: query.refetch,
    claimWeekly,
    spend,
  };
}

/**
 * Persists weekly-claim popup state across sessions.
 * Only opens when a *new* weekly claim is actually available (DB-driven).
 * After the user claims or dismisses, we remember the current eligibility
 * window in localStorage so we don't re-prompt until the next window opens.
 */
export function useWeeklyClaimDialogState() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { canClaim, isLoading, lastClaimAt, lastDismissedWindow } = usePoints();
  const [open, setOpen] = useState(false);

  // The current eligibility window is identified by the user's last_claim_at
  // (or "initial" if they have never claimed). When the user claims,
  // last_claim_at advances → the window changes → the prompt re-shows.
  const windowMs = lastClaimAt ? lastClaimAt.getTime() : -Infinity;
  const dismissedMs = lastDismissedWindow
    ? new Date(lastDismissedWindow).getTime()
    : -Infinity;
  const dismissedThisWindow = dismissedMs >= windowMs;

  useEffect(() => {
    if (!user || isLoading) return;
    if (!canClaim) return;
    if (dismissedThisWindow) return;
    // Local fallback for offline-first UX
    const key = `weekly-claim-acked:${user.id}`;
    const localWindowId = lastClaimAt ? lastClaimAt.toISOString() : "initial";
    if (localStorage.getItem(key) === localWindowId) return;
    setOpen(true);
  }, [user, canClaim, isLoading, dismissedThisWindow, lastClaimAt]);

  const ackAndClose = async (next: boolean) => {
    if (!next && user) {
      const localWindowId = lastClaimAt ? lastClaimAt.toISOString() : "initial";
      localStorage.setItem(`weekly-claim-acked:${user.id}`, localWindowId);
      // Persist server-side so dismissal syncs across devices
      try {
        await (supabase.rpc as any)("dismiss_weekly_claim");
        qc.invalidateQueries({ queryKey: ["user-points", user.id] });
      } catch {
        // Silent — local fallback already set
      }
    }
    setOpen(next);
  };

  return { open, setOpen: ackAndClose };
}
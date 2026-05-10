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
        .select("user_id, balance, last_claim_at")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
  });

  const balance = query.data?.balance ?? 0;
  const lastClaimAt = query.data?.last_claim_at ? new Date(query.data.last_claim_at) : null;
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
    nextClaimAt,
    canClaim: !!canClaim,
    isLoading: query.isLoading,
    refetch: query.refetch,
    claimWeekly,
    spend,
  };
}

/** Persist a "we already showed the claim dialog this session" flag. */
export function useWeeklyClaimDialogState() {
  const { user } = useAuth();
  const { canClaim, isLoading } = usePoints();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user || isLoading) return;
    if (!canClaim) return;
    const key = `weekly-claim-shown:${user.id}`;
    if (sessionStorage.getItem(key)) return;
    setOpen(true);
    sessionStorage.setItem(key, "1");
  }, [user, canClaim, isLoading]);

  return { open, setOpen };
}
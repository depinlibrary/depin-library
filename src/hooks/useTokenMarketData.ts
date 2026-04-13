import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Subscribe to realtime token_market_data changes */
export function useRealtimeTokenMarketData() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("realtime-token-market-data")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "token_market_data" },
        (payload: any) => {
          const projectId = payload.new?.project_id || payload.old?.project_id;
          if (projectId) {
            queryClient.invalidateQueries({ queryKey: ["token-market-data", projectId] });
          }
          queryClient.invalidateQueries({ queryKey: ["all-token-market-data"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

export type TokenMarketData = {
  id: string;
  project_id: string;
  price_usd: number | null;
  market_cap_usd: number | null;
  price_change_24h: number | null;
  sparkline_7d: number[] | null;
  last_updated: string;
  data_source: string;
  volume_24h: number | null;
  fully_diluted_valuation: number | null;
};

export function useTokenMarketData(projectId?: string) {
  return useQuery({
    queryKey: ["token-market-data", projectId],
    queryFn: async (): Promise<TokenMarketData | null> => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from("token_market_data")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data as TokenMarketData | null;
    },
    enabled: !!projectId,
    refetchInterval: 1 * 60 * 1000, // refetch every 1 min
  });
}

export function useAllTokenMarketData(refetchInterval: number = 1 * 60 * 1000) {
  return useQuery({
    queryKey: ["all-token-market-data"],
    queryFn: async (): Promise<Record<string, TokenMarketData>> => {
      const { data, error } = await supabase
        .from("token_market_data")
        .select("*");
      if (error) throw error;
      const map: Record<string, TokenMarketData> = {};
      (data || []).forEach((d: any) => { map[d.project_id] = d as TokenMarketData; });
      return map;
    },
    refetchInterval,
  });
}

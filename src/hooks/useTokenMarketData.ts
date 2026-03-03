import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TokenMarketData = {
  id: string;
  project_id: string;
  price_usd: number | null;
  market_cap_usd: number | null;
  price_change_24h: number | null;
  last_updated: string;
  data_source: string;
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
    refetchInterval: 10 * 60 * 1000, // refetch every 10 min
  });
}

export function useAllTokenMarketData() {
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
    refetchInterval: 10 * 60 * 1000,
  });
}

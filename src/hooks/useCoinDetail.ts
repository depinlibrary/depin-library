import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CoinDetailTicker {
  exchange: string;
  exchange_logo: string | null;
  pair: string;
  price: number;
  volume_24h: number;
  trade_url: string | null;
  trust_score: string | null;
}

export interface CoinDetailSocial {
  twitter_followers: number | null;
  reddit_subscribers: number | null;
  reddit_active_accounts: number | null;
  telegram_members: number | null;
  facebook_likes: number | null;
}

export interface CoinDetail {
  total_supply: number | null;
  circulating_supply: number | null;
  max_supply: number | null;
  fully_diluted_valuation: number | null;
  ath: number | null;
  ath_date: string | null;
  atl: number | null;
  atl_date: string | null;
  volume_24h: number | null;
  market_cap: number | null;
  contracts: Record<string, string>;
  tickers: CoinDetailTicker[];
  description: string | null;
  categories: string[];
  links: {
    homepage: string | null;
    whitepaper: string | null;
    repos: string | null;
  };
  social: CoinDetailSocial;
  sentiment_votes_up_percentage: number | null;
  sentiment_votes_down_percentage: number | null;
  watchlist_users: number | null;
}

export function useCoinDetail(coingeckoId: string | null | undefined) {
  return useQuery({
    queryKey: ["coin-detail", coingeckoId],
    queryFn: async (): Promise<CoinDetail | null> => {
      if (!coingeckoId) return null;
      const { data, error } = await supabase.functions.invoke("fetch-coin-detail", {
        body: { coingecko_id: coingeckoId },
      });
      if (error) throw error;
      return data as CoinDetail;
    },
    enabled: !!coingeckoId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

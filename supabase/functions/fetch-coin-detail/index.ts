import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COINGECKO_API = "https://api.coingecko.com/api/v3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: { coingecko_id?: string } = {};
    if (req.method === "POST") {
      try { body = await req.json(); } catch { }
    }

    const coingeckoId = body.coingecko_id;
    if (!coingeckoId) {
      return new Response(
        JSON.stringify({ error: "coingecko_id is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Fetch coin detail (includes contract addresses, total supply, community data)
    const coinUrl = `${COINGECKO_API}/coins/${coingeckoId}?localization=false&tickers=true&market_data=true&community_data=true&developer_data=false&sparkline=false`;
    const coinRes = await fetch(coinUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    if (!coinRes.ok) {
      const text = await coinRes.text();
      return new Response(
        JSON.stringify({ error: `CoinGecko ${coinRes.status}`, detail: text }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: coinRes.status === 429 ? 429 : 502 }
      );
    }

    const coin = await coinRes.json();

    // Extract contract addresses (platforms)
    const contracts: Record<string, string> = {};
    if (coin.platforms) {
      for (const [platform, address] of Object.entries(coin.platforms)) {
        if (address && typeof address === "string" && address.trim() !== "") {
          contracts[platform] = address as string;
        }
      }
    }

    // Extract tickers (exchanges)
    const tickers = (coin.tickers || [])
      .filter((t: any) => t.target === "USDT" || t.target === "USD" || t.target === "USDC" || t.target === "BUSD" || t.target === "TRY" || t.target === "EUR")
      .slice(0, 15)
      .map((t: any) => ({
        exchange: t.market?.name || "Unknown",
        exchange_logo: t.market?.logo || null,
        pair: `${t.base}/${t.target}`,
        price: t.last,
        volume_24h: t.converted_volume?.usd || 0,
        trade_url: t.trade_url || null,
        trust_score: t.trust_score || null,
      }));

    // Market data
    const md = coin.market_data || {};

    // Community / social data
    const cd = coin.community_data || {};

    // Market cap and volume history (sparkline-like from market_data)
    const marketCapHistory = md.market_cap?.usd ?? null;
    const volumeHistory = md.total_volume?.usd ?? null;

    const result = {
      total_supply: md.total_supply ?? null,
      circulating_supply: md.circulating_supply ?? null,
      max_supply: md.max_supply ?? null,
      fully_diluted_valuation: md.fully_diluted_valuation?.usd ?? null,
      ath: md.ath?.usd ?? null,
      ath_date: md.ath_date?.usd ?? null,
      atl: md.atl?.usd ?? null,
      atl_date: md.atl_date?.usd ?? null,
      volume_24h: md.total_volume?.usd ?? null,
      market_cap: md.market_cap?.usd ?? null,
      contracts,
      tickers,
      description: coin.description?.en || null,
      categories: coin.categories || [],
      links: {
        homepage: coin.links?.homepage?.[0] || null,
        whitepaper: coin.links?.whitepaper || null,
        repos: coin.links?.repos_url?.github?.[0] || null,
      },
      // Social / community metrics
      social: {
        twitter_followers: cd.twitter_followers ?? null,
        reddit_subscribers: cd.reddit_subscribers ?? null,
        reddit_active_accounts: cd.reddit_accounts_active_48h ?? null,
        telegram_members: cd.telegram_channel_user_count ?? null,
        facebook_likes: cd.facebook_likes ?? null,
      },
      // Sentiment
      sentiment_votes_up_percentage: coin.sentiment_votes_up_percentage ?? null,
      sentiment_votes_down_percentage: coin.sentiment_votes_down_percentage ?? null,
      // Watchlist
      watchlist_users: coin.watchlist_portfolio_users ?? null,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("fetch-coin-detail error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

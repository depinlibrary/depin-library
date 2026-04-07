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

    // Fetch coin detail (includes contract addresses, total supply)
    const coinUrl = `${COINGECKO_API}/coins/${coingeckoId}?localization=false&tickers=true&market_data=true&community_data=false&developer_data=false&sparkline=false`;
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
      .filter((t: any) => t.target === "USDT" || t.target === "USD" || t.target === "USDC" || t.target === "BUSD")
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
      contracts,
      tickers,
      description: coin.description?.en || null,
      categories: coin.categories || [],
      links: {
        homepage: coin.links?.homepage?.[0] || null,
        whitepaper: coin.links?.whitepaper || null,
        repos: coin.links?.repos_url?.github?.[0] || null,
      },
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

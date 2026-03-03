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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Check if this is a single-project fetch
    let body: { project_id?: string } = {};
    if (req.method === "POST") {
      try { body = await req.json(); } catch { /* empty body ok */ }
    }

    // 1. Check rate limit state
    const { data: rls } = await supabase
      .from("rate_limit_state")
      .select("*")
      .limit(1)
      .single();

    const now = new Date();
    if (rls?.is_rate_limited && rls.rate_limited_until && new Date(rls.rate_limited_until) > now) {
      return new Response(
        JSON.stringify({ status: "rate_limited", message: "Serving cached data", until: rls.rate_limited_until }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Get projects with coingecko_id
    let query = supabase.from("projects").select("id, coingecko_id").not("coingecko_id", "is", null);
    if (body.project_id) {
      query = query.eq("id", body.project_id);
    }
    const { data: projects, error: projError } = await query;
    if (projError) throw projError;

    const validProjects = (projects || []).filter((p: any) => p.coingecko_id && p.coingecko_id.trim() !== "");
    if (validProjects.length === 0) {
      return new Response(
        JSON.stringify({ status: "ok", message: "No projects with coingecko_id", updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Check if we need to update (skip if last update < 10 min ago, unless single project)
    if (!body.project_id) {
      const { data: recentData } = await supabase
        .from("token_market_data")
        .select("last_updated")
        .order("last_updated", { ascending: false })
        .limit(1)
        .single();

      if (recentData?.last_updated) {
        const lastUpdated = new Date(recentData.last_updated);
        const diffMin = (now.getTime() - lastUpdated.getTime()) / 60000;
        if (diffMin < 10) {
          return new Response(
            JSON.stringify({ status: "ok", message: "Data is fresh", minutes_ago: Math.round(diffMin) }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // 4. Batch fetch using /coins/markets for sparkline support
    const ids = validProjects.map((p: any) => p.coingecko_id).join(",");
    const cgUrl = `${COINGECKO_API}/coins/markets?vs_currency=usd&ids=${ids}&sparkline=true&price_change_percentage=24h`;

    const cgRes = await fetch(cgUrl, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    // 5. Handle rate limit / errors
    if (cgRes.status === 429 || cgRes.status === 403) {
      const backoff = rls?.backoff_minutes || 15;
      const nextBackoff = Math.min(backoff * 2, 60);
      const until = new Date(now.getTime() + backoff * 60000).toISOString();

      await supabase.from("rate_limit_state").update({
        is_rate_limited: true,
        rate_limited_until: until,
        last_attempt: now.toISOString(),
        backoff_minutes: nextBackoff,
      }).eq("id", rls.id);

      return new Response(
        JSON.stringify({ status: "rate_limited", message: "CoinGecko rate limited", until }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (!cgRes.ok) {
      const text = await cgRes.text();
      throw new Error(`CoinGecko error ${cgRes.status}: ${text}`);
    }

    const cgData = await cgRes.json();

    // Build lookup by coingecko id
    const cgMap: Record<string, any> = {};
    for (const coin of cgData) {
      cgMap[coin.id] = coin;
    }

    // 6. Upsert market data with sparkline
    let updated = 0;
    for (const project of validProjects) {
      const coin = cgMap[project.coingecko_id];
      if (!coin) continue;

      const sparkline = coin.sparkline_in_7d?.price || null;

      const { error: upsertError } = await supabase
        .from("token_market_data")
        .upsert({
          project_id: project.id,
          price_usd: coin.current_price ?? null,
          market_cap_usd: coin.market_cap ?? null,
          price_change_24h: coin.price_change_percentage_24h ?? null,
          sparkline_7d: sparkline,
          last_updated: now.toISOString(),
          data_source: "coingecko",
        }, { onConflict: "project_id" });

      if (!upsertError) updated++;
    }

    // 7. Reset rate limit state on success
    if (rls) {
      await supabase.from("rate_limit_state").update({
        is_rate_limited: false,
        rate_limited_until: null,
        last_attempt: now.toISOString(),
        backoff_minutes: 15,
      }).eq("id", rls.id);
    }

    return new Response(
      JSON.stringify({ status: "ok", updated, total: validProjects.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("fetch-token-prices error:", error);
    return new Response(
      JSON.stringify({ status: "error", message: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

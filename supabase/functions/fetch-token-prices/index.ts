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

    // 8. Auto-resolve token_price / market_cap forecasts that hit their target
    let autoResolved = 0;
    try {
      // Get active forecasts with prediction targets
      const { data: activeForecasts } = await supabase
        .from("forecasts")
        .select("id, project_a_id, prediction_target, prediction_direction, start_price, title, total_votes_yes, total_votes_no, end_notifications_sent")
        .eq("status", "active")
        .gt("end_date", now.toISOString())
        .not("prediction_target", "is", null)
        .not("prediction_direction", "is", null);

      if (activeForecasts && activeForecasts.length > 0) {
        // Get forecast dimensions to confirm they are token_price or market_cap
        const forecastIds = activeForecasts.map((f: any) => f.id);
        const { data: targets } = await supabase
          .from("forecast_targets")
          .select("forecast_id, dimension")
          .in("forecast_id", forecastIds);

        const dimensionMap: Record<string, string[]> = {};
        (targets || []).forEach((t: any) => {
          if (!dimensionMap[t.forecast_id]) dimensionMap[t.forecast_id] = [];
          dimensionMap[t.forecast_id].push(t.dimension);
        });

        // Get current prices for relevant projects
        const projectIds = [...new Set(activeForecasts.map((f: any) => f.project_a_id))];
        const { data: marketData } = await supabase
          .from("token_market_data")
          .select("project_id, price_usd, market_cap_usd")
          .in("project_id", projectIds);

        const priceMap: Record<string, { price: number | null; mcap: number | null }> = {};
        (marketData || []).forEach((m: any) => {
          priceMap[m.project_id] = { price: m.price_usd, mcap: m.market_cap_usd };
        });

        for (const forecast of activeForecasts) {
          const dims = dimensionMap[forecast.id] || [];
          const isPriceForecast = dims.includes("token_price") || dims.includes("market_cap");
          if (!isPriceForecast) continue;

          const mData = priceMap[forecast.project_a_id];
          if (!mData) continue;

          const currentValue = dims.includes("token_price") ? mData.price : mData.mcap;
          if (currentValue == null || forecast.prediction_target == null) continue;

          const target = Number(forecast.prediction_target);
          const direction = forecast.prediction_direction; // "long" or "short"
          let targetHit = false;

          if (direction === "long" && currentValue >= target) {
            targetHit = true;
          } else if (direction === "short" && currentValue <= target) {
            targetHit = true;
          }

          if (targetHit) {
            // Force-close the forecast
            await supabase
              .from("forecasts")
              .update({
                status: "resolved",
                end_date: now.toISOString(),
              })
              .eq("id", forecast.id);

            autoResolved++;

            // Send notifications to voters if not already sent
            if (!forecast.end_notifications_sent) {
              const { data: votes } = await supabase
                .from("forecast_votes")
                .select("user_id, vote")
                .eq("forecast_id", forecast.id);

              const totalVotes = forecast.total_votes_yes + forecast.total_votes_no;
              const winningVote = direction; // "long" hit = long voters win, "short" hit = short voters win
              const pctMove = forecast.start_price
                ? ((currentValue - Number(forecast.start_price)) / Number(forecast.start_price) * 100).toFixed(1)
                : null;

              const userIds = [...new Set((votes || []).map((v: any) => v.user_id))];
              for (const userId of userIds) {
                const { data: prefs } = await supabase
                  .from("notification_preferences")
                  .select("forecast_result")
                  .eq("user_id", userId)
                  .maybeSingle();

                if (prefs?.forecast_result !== false) {
                  const userVote = (votes || []).find((v: any) => v.user_id === userId)?.vote;
                  const userWon = userVote === direction;

                  await supabase.from("notifications").insert({
                    user_id: userId,
                    type: "forecast_result",
                    title: "Forecast target hit!",
                    message: `"${forecast.title.slice(0, 50)}${forecast.title.length > 50 ? "..." : ""}" hit its ${direction} target${pctMove ? ` (${pctMove}% move)` : ""}. ${userWon ? "Your prediction was correct! 🎯" : ""}`,
                    link: `/forecasts/${forecast.id}`,
                    metadata: { forecastId: forecast.id, result: direction, userVote, targetHit: true },
                  });
                }
              }

              await supabase
                .from("forecasts")
                .update({ end_notifications_sent: true })
                .eq("id", forecast.id);
            }
          }
        }
      }
    } catch (autoErr) {
      console.error("Auto-resolve check error:", autoErr);
      // Non-fatal: don't fail the whole price update
    }

    return new Response(
      JSON.stringify({ status: "ok", updated, total: validProjects.length, autoResolved }),
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

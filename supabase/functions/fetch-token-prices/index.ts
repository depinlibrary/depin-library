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
    let body: { project_id?: string } = {};
    if (req.method === "POST") {
      try { body = await req.json(); } catch { }
    }

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

    const ids = validProjects.map((p: any) => p.coingecko_id).join(",");
    const cgUrl = `${COINGECKO_API}/coins/markets?vs_currency=usd&ids=${ids}&sparkline=true&price_change_percentage=24h`;

    const cgRes = await fetch(cgUrl, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(15000),
    });

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

    const cgMap: Record<string, any> = {};
    for (const coin of cgData) {
      cgMap[coin.id] = coin;
    }

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

    if (rls) {
      await supabase.from("rate_limit_state").update({
        is_rate_limited: false,
        rate_limited_until: null,
        last_attempt: now.toISOString(),
        backoff_minutes: 15,
      }).eq("id", rls.id);
    }

    let autoResolved = 0;
    try {
      const { data: activeForecasts } = await supabase
        .from("forecasts")
        .select("id, project_a_id, project_b_id, prediction_target, prediction_direction, start_price, title, total_votes_yes, total_votes_no, end_notifications_sent")
        .eq("status", "active")
        .gt("end_date", now.toISOString())
        .not("prediction_target", "is", null)
        .not("prediction_direction", "is", null);

      if (activeForecasts && activeForecasts.length > 0) {
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

        const allProjectIds = new Set<string>();
        activeForecasts.forEach((f: any) => {
          allProjectIds.add(f.project_a_id);
          if (f.project_b_id) allProjectIds.add(f.project_b_id);
        });
        const { data: marketData } = await supabase
          .from("token_market_data")
          .select("project_id, price_usd, market_cap_usd")
          .in("project_id", [...allProjectIds]);

        const priceMap: Record<string, { price: number | null; mcap: number | null }> = {};
        (marketData || []).forEach((m: any) => {
          priceMap[m.project_id] = { price: m.price_usd, mcap: m.market_cap_usd };
        });

        const dualForecastIds = activeForecasts.filter((f: any) => f.project_b_id).map((f: any) => f.id);
        let snapshotMap: Record<string, Record<string, number | null>> = {};
        if (dualForecastIds.length > 0) {
          const { data: snapshots } = await supabase
            .from("forecast_metric_snapshots")
            .select("forecast_id, dimension, value")
            .in("forecast_id", dualForecastIds)
            .eq("snapshot_type", "start");

          (snapshots || []).forEach((s: any) => {
            if (!snapshotMap[s.forecast_id]) snapshotMap[s.forecast_id] = {};
            snapshotMap[s.forecast_id][s.dimension] = s.value;
          });
        }

        for (const forecast of activeForecasts) {
          const dims = dimensionMap[forecast.id] || [];
          const isPriceForecast = dims.includes("token_price") || dims.includes("market_cap");
          if (!isPriceForecast) continue;

          const mDataA = priceMap[forecast.project_a_id];
          if (!mDataA) continue;

          const dim = dims.includes("token_price") ? "token_price" : "market_cap";
          const currentA = dim === "token_price" ? mDataA.price : mDataA.mcap;
          if (currentA == null || forecast.prediction_target == null) continue;

          const target = Number(forecast.prediction_target);
          const direction = forecast.prediction_direction;
          const resolvedOutcome = direction === "long" ? "yes" : "no";
          let targetHit = false;
          let notifMessage = "";

          if (forecast.project_b_id) {
            const mDataB = priceMap[forecast.project_b_id];
            if (!mDataB) continue;
            const currentB = dim === "token_price" ? mDataB.price : mDataB.mcap;
            if (currentB == null) continue;

            const startSnaps = snapshotMap[forecast.id] || {};
            const startA = startSnaps[dim] ?? (forecast.start_price ? Number(forecast.start_price) : null);
            const startB = startSnaps[`${dim}_b`] ?? null;
            if (startA == null || startB == null || startA === 0 || startB === 0) continue;

            const changeA = ((currentA - startA) / startA) * 100;
            const changeB = ((currentB - startB) / startB) * 100;
            const outperformance = changeA - changeB;

            if (direction === "long" && outperformance >= target) {
              targetHit = true;
            } else if (direction === "short" && outperformance <= -Math.abs(target)) {
              targetHit = true;
            }

            notifMessage = `hit its ${direction} outperformance target of ${target}% (current: ${outperformance.toFixed(1)}%)`;
          } else {
            if (direction === "long" && currentA >= target) {
              targetHit = true;
            } else if (direction === "short" && currentA <= target) {
              targetHit = true;
            }

            const pctMove = forecast.start_price
              ? ((currentA - Number(forecast.start_price)) / Number(forecast.start_price) * 100).toFixed(1)
              : null;
            notifMessage = `hit its ${direction} target${pctMove ? ` (${pctMove}% move)` : ""}`;
          }

          if (targetHit) {
            await captureEndSnapshots(supabase, {
              id: forecast.id,
              project_a_id: forecast.project_a_id,
              project_b_id: forecast.project_b_id,
            }, now.toISOString());

            await supabase
              .from("forecasts")
              .update({
                status: "resolved",
                end_date: now.toISOString(),
                outcome: resolvedOutcome,
              })
              .eq("id", forecast.id);

            autoResolved++;

            if (!forecast.end_notifications_sent) {
              const { data: votes } = await supabase
                .from("forecast_votes")
                .select("user_id, vote")
                .eq("forecast_id", forecast.id);

              const userIds = [...new Set((votes || []).map((v: any) => v.user_id))];
              for (const userId of userIds) {
                const { data: prefs } = await supabase
                  .from("notification_preferences")
                  .select("forecast_result")
                  .eq("user_id", userId)
                  .maybeSingle();

                if (prefs?.forecast_result !== false) {
                  const userVote = (votes || []).find((v: any) => v.user_id === userId)?.vote;
                  const userWon = userVote === resolvedOutcome;

                  await supabase.from("notifications").insert({
                    user_id: userId,
                    type: "forecast_result",
                    title: "Forecast target hit!",
                    message: `"${forecast.title.slice(0, 50)}${forecast.title.length > 50 ? "..." : ""}" ${notifMessage}. ${userWon ? "Your prediction was correct! 🎯" : ""}`,
                    link: `/forecasts/${forecast.id}`,
                    metadata: { forecastId: forecast.id, result: resolvedOutcome, userVote, targetHit: true },
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

async function captureEndSnapshots(
  supabase: any,
  forecast: { id: string; project_a_id: string; project_b_id: string | null },
  capturedAt: string
): Promise<number> {
  const { data: targets } = await supabase
    .from("forecast_targets")
    .select("dimension")
    .eq("forecast_id", forecast.id);

  if (!targets || targets.length === 0) return 0;

  const { data: existingSnaps } = await supabase
    .from("forecast_metric_snapshots")
    .select("dimension")
    .eq("forecast_id", forecast.id)
    .eq("snapshot_type", "end");

  const existingDims = new Set((existingSnaps || []).map((s: any) => s.dimension));

  const { data: marketA } = await supabase
    .from("token_market_data")
    .select("price_usd, market_cap_usd")
    .eq("project_id", forecast.project_a_id)
    .maybeSingle();

  let marketB: any = null;
  if (forecast.project_b_id) {
    const { data: mb } = await supabase
      .from("token_market_data")
      .select("price_usd, market_cap_usd")
      .eq("project_id", forecast.project_b_id)
      .maybeSingle();
    marketB = mb;
  }

  const snapshots: any[] = [];

  for (const t of targets) {
    const dim = t.dimension;
    if (existingDims.has(dim)) continue;

    let value: number | null = null;
    let source = "pending";

    if (dim === "token_price" && marketA?.price_usd != null) {
      value = Number(marketA.price_usd);
      source = "coingecko";
    } else if (dim === "market_cap" && marketA?.market_cap_usd != null) {
      value = Number(marketA.market_cap_usd);
      source = "coingecko";
    }

    snapshots.push({
      forecast_id: forecast.id,
      dimension: dim,
      snapshot_type: "end",
      value,
      source,
      captured_at: capturedAt,
    });

    if (forecast.project_b_id && (dim === "token_price" || dim === "market_cap")) {
      const bDim = `${dim}_b`;
      if (!existingDims.has(bDim)) {
        let valueB: number | null = null;
        let sourceB = "pending";
        if (dim === "token_price" && marketB?.price_usd != null) {
          valueB = Number(marketB.price_usd);
          sourceB = "coingecko";
        } else if (dim === "market_cap" && marketB?.market_cap_usd != null) {
          valueB = Number(marketB.market_cap_usd);
          sourceB = "coingecko";
        }
        snapshots.push({
          forecast_id: forecast.id,
          dimension: bDim,
          snapshot_type: "end",
          value: valueB,
          source: sourceB,
          captured_at: capturedAt,
        });
      }
    }
  }

  if (snapshots.length === 0) return 0;

  const { error } = await supabase
    .from("forecast_metric_snapshots")
    .upsert(snapshots, { onConflict: "forecast_id,dimension,snapshot_type" });

  if (error) {
    console.error(`Error inserting auto-resolve end snapshots for ${forecast.id}:`, error);
    return 0;
  }

  return snapshots.length;
}

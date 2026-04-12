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
        if (diffMin < 1) {
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
          volume_24h: coin.total_volume ?? null,
          fully_diluted_valuation: coin.fully_diluted_valuation ?? null,
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
      const { data: activePredictions } = await supabase
        .from("forecasts")
        .select("id, project_a_id, project_b_id, prediction_target, prediction_direction, start_price, title, total_votes_yes, total_votes_no, end_notifications_sent")
        .eq("status", "active")
        .gt("end_date", now.toISOString())
        .not("prediction_target", "is", null)
        .not("prediction_direction", "is", null);

      if (activePredictions && activePredictions.length > 0) {
        const predictionIds = activePredictions.map((f: any) => f.id);
        const { data: targets } = await supabase
          .from("forecast_targets")
          .select("forecast_id, dimension")
          .in("forecast_id", predictionIds);

        const dimensionMap: Record<string, string[]> = {};
        (targets || []).forEach((t: any) => {
          if (!dimensionMap[t.prediction_id]) dimensionMap[t.prediction_id] = [];
          dimensionMap[t.prediction_id].push(t.dimension);
        });

        const allProjectIds = new Set<string>();
        activePredictions.forEach((f: any) => {
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

        const dualPredictionIds = activePredictions.filter((f: any) => f.project_b_id).map((f: any) => f.id);
        let snapshotMap: Record<string, Record<string, number | null>> = {};
        if (dualPredictionIds.length > 0) {
          const { data: snapshots } = await supabase
            .from("forecast_metric_snapshots")
            .select("forecast_id, dimension, value")
            .in("forecast_id", dualPredictionIds)
            .eq("snapshot_type", "start");

          (snapshots || []).forEach((s: any) => {
            if (!snapshotMap[s.prediction_id]) snapshotMap[s.prediction_id] = {};
            snapshotMap[s.prediction_id][s.dimension] = s.value;
          });
        }

        for (const prediction of activePredictions) {
          const dims = dimensionMap[prediction.id] || [];
          const isPricePrediction = dims.includes("token_price") || dims.includes("market_cap");
          if (!isPricePrediction) continue;

          const mDataA = priceMap[prediction.project_a_id];
          if (!mDataA) continue;

          const dim = dims.includes("token_price") ? "token_price" : "market_cap";
          const currentA = dim === "token_price" ? mDataA.price : mDataA.mcap;
          if (currentA == null || prediction.prediction_target == null) continue;

          const target = Number(prediction.prediction_target);
          const direction = prediction.prediction_direction;
          const resolvedOutcome = direction === "long" ? "yes" : "no";
          let targetHit = false;
          let notifMessage = "";

          // Track the actual prices used for calculation so we store consistent snapshots
          let endPriceA = currentA;
          let endPriceB: number | null = null;

          if (prediction.project_b_id) {
            const mDataB = priceMap[prediction.project_b_id];
            if (!mDataB) continue;
            const currentB = dim === "token_price" ? mDataB.price : mDataB.mcap;
            if (currentB == null) continue;

            endPriceB = currentB;

            const startSnaps = snapshotMap[prediction.id] || {};
            const startA = startSnaps[dim] ?? (prediction.start_price ? Number(prediction.start_price) : null);
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

            const pctMove = prediction.start_price
              ? ((currentA - Number(prediction.start_price)) / Number(prediction.start_price) * 100).toFixed(1)
              : null;
            notifMessage = `hit its ${direction} target${pctMove ? ` (${pctMove}% move)` : ""}`;
          }

          if (targetHit) {
            // Use the SAME prices that triggered the resolution for snapshots
            // This prevents drift between calculation and snapshot storage
            await captureEndSnapshotsWithPrices(supabase, {
              id: prediction.id,
              project_a_id: prediction.project_a_id,
              project_b_id: prediction.project_b_id,
            }, dim, endPriceA, endPriceB, now.toISOString());

            // Set status, outcome, AND end_notifications_sent atomically
            // to prevent notify-prediction-results from re-processing
            await supabase
              .from("forecasts")
              .update({
                status: "resolved",
                end_date: now.toISOString(),
                outcome: resolvedOutcome,
                end_notifications_sent: true,
              })
              .eq("id", prediction.id);

            autoResolved++;

            if (!prediction.end_notifications_sent) {
              const { data: votes } = await supabase
                .from("forecast_votes")
                .select("user_id, vote")
                .eq("forecast_id", prediction.id);

              const userIds = [...new Set((votes || []).map((v: any) => v.user_id))];
              for (const userId of userIds) {
                const { data: prefs } = await supabase
                  .from("notification_preferences")
                  .select("forecast_result")
                  .eq("user_id", userId)
                  .maybeSingle();

                if (prefs?.prediction_result !== false) {
                  const userVote = (votes || []).find((v: any) => v.user_id === userId)?.vote;
                  const userWon = userVote === resolvedOutcome;

                  await supabase.from("notifications").insert({
                    user_id: userId,
                    type: "forecast_result",
                    title: "Prediction target hit!",
                    message: `"${prediction.title.slice(0, 50)}${prediction.title.length > 50 ? "..." : ""}" ${notifMessage}. ${userWon ? "Your prediction was correct! 🎯" : ""}`,
                    link: `/predictions/${prediction.id}`,
                    metadata: { predictionId: prediction.id, result: resolvedOutcome, userVote, targetHit: true },
                  });
                }
              }
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

/**
 * Captures end snapshots using the EXACT prices that triggered the auto-resolve,
 * preventing drift between the calculation and stored values.
 */
async function captureEndSnapshotsWithPrices(
  supabase: any,
  prediction: { id: string; project_a_id: string; project_b_id: string | null },
  dimension: string,
  priceA: number,
  priceB: number | null,
  capturedAt: string
): Promise<number> {
  const { data: existingSnaps } = await supabase
    .from("forecast_metric_snapshots")
    .select("dimension")
    .eq("forecast_id", prediction.id)
    .eq("snapshot_type", "end");

  const existingDims = new Set((existingSnaps || []).map((s: any) => s.dimension));
  const snapshots: any[] = [];

  if (!existingDims.has(dimension)) {
    snapshots.push({
      prediction_id: prediction.id,
      dimension,
      snapshot_type: "end",
      value: priceA,
      source: "coingecko",
      captured_at: capturedAt,
    });
  }

  if (prediction.project_b_id && priceB != null) {
    const bDim = `${dimension}_b`;
    if (!existingDims.has(bDim)) {
      snapshots.push({
        prediction_id: prediction.id,
        dimension: bDim,
        snapshot_type: "end",
        value: priceB,
        source: "coingecko",
        captured_at: capturedAt,
      });
    }
  }

  if (snapshots.length === 0) return 0;

  const { error } = await supabase
    .from("forecast_metric_snapshots")
    .upsert(snapshots, { onConflict: "prediction_id,dimension,snapshot_type" });

  if (error) {
    console.error(`Error inserting auto-resolve end snapshots for ${prediction.id}:`, error);
    return 0;
  }

  return snapshots.length;
}

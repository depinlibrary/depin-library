import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // 1. Find all resolved/ended forecasts that have targets but are missing end snapshots
    const { data: forecasts, error: fErr } = await supabase
      .from("forecasts")
      .select("id, project_a_id, project_b_id, start_price, status, end_date, prediction_target, prediction_direction, created_at")
      .or("status.eq.resolved,end_date.lt." + new Date().toISOString());

    if (fErr) throw fErr;
    if (!forecasts || forecasts.length === 0) {
      return new Response(JSON.stringify({ status: "ok", message: "No ended forecasts found", backfilled: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Get their targets
    const predictionIds = forecasts.map((f: any) => f.id);
    const { data: targets } = await supabase
      .from("forecast_targets")
      .select("forecast_id, dimension")
      .in("forecast_id", predictionIds);

    // 3. Get existing end snapshots
    const { data: existingSnaps } = await supabase
      .from("forecast_metric_snapshots")
      .select("forecast_id, dimension, snapshot_type")
      .in("forecast_id", predictionIds)
      .eq("snapshot_type", "end");

    const existingEndKeys = new Set(
      (existingSnaps || []).map((s: any) => `${s.prediction_id}:${s.dimension}`)
    );

    // 4. Find forecasts needing backfill
    const needsBackfill: { prediction_id: string; dimension: string; project_id: string }[] = [];
    for (const target of (targets || [])) {
      const key = `${target.prediction_id}:${target.dimension}`;
      if (!existingEndKeys.has(key)) {
        const prediction = forecasts.find((f: any) => f.id === target.prediction_id);
        if (prediction && (target.dimension === "token_price" || target.dimension === "market_cap")) {
          needsBackfill.push({
            prediction_id: target.prediction_id,
            dimension: target.dimension,
            project_id: prediction.project_a_id,
          });
          // Also backfill Project B snapshots for comparison forecasts
          if (prediction.project_b_id) {
            const keyB = `${target.prediction_id}:${target.dimension}_b`;
            if (!existingEndKeys.has(keyB)) {
              needsBackfill.push({
                prediction_id: target.prediction_id,
                dimension: `${target.dimension}_b`,
                project_id: prediction.project_b_id,
              });
            }
          }
        }
      }
    }

    if (needsBackfill.length === 0) {
      return new Response(JSON.stringify({ status: "ok", message: "All forecasts already have end snapshots", backfilled: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 5. Get current market data for all relevant projects
    const projectIds = [...new Set(needsBackfill.map(n => n.project_id))];
    const { data: marketData } = await supabase
      .from("token_market_data")
      .select("project_id, price_usd, market_cap_usd")
      .in("project_id", projectIds);

    const priceMap: Record<string, { price: number | null; mcap: number | null }> = {};
    (marketData || []).forEach((m: any) => {
      priceMap[m.project_id] = { price: m.price_usd ? Number(m.price_usd) : null, mcap: m.market_cap_usd ? Number(m.market_cap_usd) : null };
    });

    // 6. Also backfill missing start snapshots using the prediction's start_price
    const { data: existingStartSnaps } = await supabase
      .from("forecast_metric_snapshots")
      .select("forecast_id, dimension")
      .in("forecast_id", predictionIds)
      .eq("snapshot_type", "start");

    const existingStartKeys = new Set(
      (existingStartSnaps || []).map((s: any) => `${s.prediction_id}:${s.dimension}`)
    );

    // 7. Insert snapshots
    const snapshots: any[] = [];
    for (const item of needsBackfill) {
      const mData = priceMap[item.project_id];
      if (!mData) continue;

      const baseDim = item.dimension.replace(/_b$/, "");
      const value = baseDim === "token_price" ? mData.price : mData.mcap;
      if (value == null) continue;

      const prediction = forecasts.find((f: any) => f.id === item.prediction_id);

      // End snapshot with current market data (best approximation for old forecasts)
      snapshots.push({
        prediction_id: item.prediction_id,
        dimension: item.dimension,
        snapshot_type: "end",
        value: value,
        source: "coingecko",
        captured_at: prediction?.end_date || new Date().toISOString(),
      });

      // Backfill start snapshot if missing, using prediction's start_price
      const startKey = `${item.prediction_id}:${item.dimension}`;
      if (!existingStartKeys.has(startKey) && prediction?.start_price != null) {
        snapshots.push({
          prediction_id: item.prediction_id,
          dimension: item.dimension,
          snapshot_type: "start",
          value: Number(prediction.start_price),
          source: "coingecko",
          captured_at: prediction.created_at || new Date().toISOString(),
        });
      }
    }

    let inserted = 0;
    if (snapshots.length > 0) {
      const { error: insertErr } = await supabase
        .from("forecast_metric_snapshots")
        .upsert(snapshots, { onConflict: "prediction_id,dimension,snapshot_type" });
      if (insertErr) throw insertErr;
      inserted = snapshots.length;
    }

    // Update status to "ended" for any active forecasts that are past their end_date
    const activeEndedIds = forecasts
      .filter((f: any) => f.status === "active" && new Date(f.end_date) < new Date())
      .map((f: any) => f.id);

    if (activeEndedIds.length > 0) {
      await supabase
        .from("forecasts")
        .update({ status: "ended" })
        .in("id", activeEndedIds);
    }

    return new Response(
      JSON.stringify({ status: "ok", backfilled: inserted, predictions_checked: forecasts.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("backfill error:", error);
    return new Response(
      JSON.stringify({ status: "error", message: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

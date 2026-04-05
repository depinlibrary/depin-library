import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();
    // Only process forecasts that haven't been notified AND are still active/ended (not already resolved by auto-resolve)
    const { data: endedPredictions, error: fetchError } = await supabase
      .from("forecasts")
      .select("id, title, total_votes_yes, total_votes_no, end_date, project_a_id, project_b_id, status, prediction_direction, prediction_target, start_price, outcome")
      .eq("end_notifications_sent", false)
      .in("status", ["active", "ended"])
      .lt("end_date", now);

    if (fetchError) {
      console.error("Error fetching ended forecasts:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!endedPredictions || endedPredictions.length === 0) {
      return new Response(JSON.stringify({ message: "No ended forecasts to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let notificationsSent = 0;
    let snapshotsCaptured = 0;

    for (const prediction of endedPredictions) {
      // --- CAPTURE END SNAPSHOTS ---
      try {
        const endSnapshots = await captureEndSnapshots(supabase, prediction);
        snapshotsCaptured += endSnapshots;
      } catch (snapErr) {
        console.error(`Error capturing end snapshots for ${prediction.id}:`, snapErr);
      }

      // --- DETERMINE OUTCOME ---
      // Get prediction dimension
      const { data: targets } = await supabase
        .from("forecast_targets")
        .select("dimension")
        .eq("forecast_id", prediction.id);

      const dimensions = (targets || []).map((t: any) => t.dimension);
      const isPriceMarket = dimensions.some((d: string) => d === "token_price" || d === "market_cap");

      let outcome: string | null = prediction.outcome; // use existing if already set (e.g. auto-resolved)

      if (!outcome && isPriceMarket) {
        outcome = await determinePriceOutcome(supabase, prediction, dimensions);
      }

      // For non-price forecasts, fall back to vote majority
      if (!outcome && !isPriceMarket) {
        const totalVotes = prediction.total_votes_yes + prediction.total_votes_no;
        const yesPct = totalVotes > 0 ? (prediction.total_votes_yes / totalVotes) * 100 : 50;
        outcome = yesPct >= 50 ? "yes" : "no";
      }

      // --- UPDATE STATUS + OUTCOME ---
      const updates: any = { end_notifications_sent: true };
      if (prediction.status === "active") updates.status = "ended";
      if (outcome) updates.outcome = outcome;

      await supabase.from("forecasts").update(updates).eq("id", prediction.id);

      // --- SEND NOTIFICATIONS ---
      const { data: votes, error: votesError } = await supabase
        .from("forecast_votes")
        .select("user_id, vote")
        .eq("forecast_id", prediction.id);

      if (votesError) {
        console.error(`Error fetching votes for prediction ${prediction.id}:`, votesError);
        continue;
      }

      if (!votes || votes.length === 0) continue;

      const resultLabel = outcome === "yes" ? "Long" : outcome === "no" ? "Short" : "Undetermined";
      const userIds = [...new Set(votes.map((v: any) => v.user_id))];

      for (const userId of userIds) {
        const { data: prefs } = await supabase
          .from("notification_preferences")
          .select("forecast_result")
          .eq("user_id", userId)
          .maybeSingle();

        const shouldNotify = prefs?.prediction_result !== false;

        if (shouldNotify) {
          const userVote = votes.find((v: any) => v.user_id === userId)?.vote;
          const userCorrect = outcome ? userVote === outcome : false;

          await supabase.from("notifications").insert({
            user_id: userId,
            type: "forecast_result",
            title: "Prediction ended",
            message: `"${prediction.title.slice(0, 50)}${prediction.title.length > 50 ? "..." : ""}" ended. Result: ${resultLabel}. ${userCorrect ? "Your prediction was correct! 🎯" : "Better luck next time!"}`,
            link: `/forecasts/${prediction.id}`,
            metadata: { predictionId: prediction.id, result: outcome, userVote, userCorrect },
          });
          notificationsSent++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${endedPredictions.length} forecasts, sent ${notificationsSent} notifications, captured ${snapshotsCaptured} end snapshots`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error in notify-prediction-results:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Determines the outcome for a price/market_cap prediction based on actual price movement.
 * Returns "yes" (Long wins) or "no" (Short wins).
 */
async function determinePriceOutcome(
  supabase: any,
  prediction: { id: string; project_a_id: string; project_b_id: string | null; prediction_direction: string | null; prediction_target: number | null; start_price: number | null },
  dimensions: string[]
): Promise<string | null> {
  const dim = dimensions.find((d: string) => d === "token_price" || d === "market_cap");
  if (!dim) return null;

  // Get start and end snapshots
  const { data: snaps } = await supabase
    .from("forecast_metric_snapshots")
    .select("dimension, snapshot_type, value")
    .eq("forecast_id", prediction.id);

  if (!snaps || snaps.length === 0) return null;

  const getSnap = (dimension: string, type: string) => {
    const s = snaps.find((s: any) => s.dimension === dimension && s.snapshot_type === type);
    return s?.value != null ? Number(s.value) : null;
  };

  if (prediction.project_b_id) {
    // --- DUAL-PROJECT COMPARISON ---
    const startA = prediction.start_price != null ? Number(prediction.start_price) : getSnap(dim, "start");
    const endA = getSnap(dim, "end");
    const startB = getSnap(`${dim}_b`, "start");
    const endB = getSnap(`${dim}_b`, "end");

    if (startA == null || endA == null || startB == null || endB == null) return null;

    const changeA = ((endA - startA) / startA) * 100;
    const changeB = ((endB - startB) / startB) * 100;
    const outperformance = changeA - changeB;

    // If there's a target, check if outperformance met it
      if (prediction.prediction_target != null) {
        const targetMet = prediction.prediction_direction === "long"
          ? outperformance >= prediction.prediction_target
          : outperformance <= -prediction.prediction_target;
        // If target met, the prediction direction wins: long→"yes", short→"no"
        if (targetMet) {
          return prediction.prediction_direction === "long" ? "yes" : "no";
        }
        return prediction.prediction_direction === "long" ? "no" : "yes";
      }

    // No specific target: Long wins if A outperformed B
    return outperformance > 0 ? "yes" : "no";
  } else {
    // --- SINGLE-PROJECT ---
    const startVal = prediction.start_price != null ? Number(prediction.start_price) : getSnap(dim, "start");
    const endVal = getSnap(dim, "end");

    if (startVal == null || endVal == null) return null;

    // If there's a target price, check if it was reached
    if (prediction.prediction_target != null) {
      const target = Number(prediction.prediction_target);
      if (prediction.prediction_direction === "long") {
        // Long target met → Long wins ("yes"), not met → Short wins ("no")
        return endVal >= target ? "yes" : "no";
      } else {
        // Short target met → Short wins ("no"), not met → Long wins ("yes")
        return endVal <= target ? "no" : "yes";
      }
    }

    // No specific target: Long wins if price went up
    const priceWentUp = endVal > startVal;
    return priceWentUp ? "yes" : "no";
  }
}

/**
 * Captures end snapshots for a concluded prediction by reading current market data.
 */
async function captureEndSnapshots(
  supabase: any,
  prediction: { id: string; project_a_id: string; project_b_id: string | null }
): Promise<number> {
  const { data: targets } = await supabase
    .from("forecast_targets")
    .select("dimension")
    .eq("forecast_id", prediction.id);

  if (!targets || targets.length === 0) return 0;

  const { data: existingSnaps } = await supabase
    .from("forecast_metric_snapshots")
    .select("dimension")
    .eq("forecast_id", prediction.id)
    .eq("snapshot_type", "end");

  const existingDims = new Set((existingSnaps || []).map((s: any) => s.dimension));

  const { data: marketA } = await supabase
    .from("token_market_data")
    .select("price_usd, market_cap_usd")
    .eq("project_id", prediction.project_a_id)
    .single();

  let marketB: any = null;
  if (prediction.project_b_id) {
    const { data: mb } = await supabase
      .from("token_market_data")
      .select("price_usd, market_cap_usd")
      .eq("project_id", prediction.project_b_id)
      .single();
    marketB = mb;
  }

  const snapshots: any[] = [];
  const nowStr = new Date().toISOString();

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
      prediction_id: prediction.id,
      dimension: dim,
      snapshot_type: "end",
      value,
      source,
      captured_at: nowStr,
    });

    if (prediction.project_b_id && (dim === "token_price" || dim === "market_cap")) {
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
          prediction_id: prediction.id,
          dimension: bDim,
          snapshot_type: "end",
          value: valueB,
          source: sourceB,
          captured_at: nowStr,
        });
      }
    }
  }

  if (snapshots.length === 0) return 0;

  const { error } = await supabase
    .from("forecast_metric_snapshots")
    .upsert(snapshots, { onConflict: "prediction_id,dimension,snapshot_type" });

  if (error) {
    console.error(`Error inserting end snapshots for ${prediction.id}:`, error);
    return 0;
  }

  console.log(`Captured ${snapshots.length} end snapshots for prediction ${prediction.id}`);
  return snapshots.length;
}

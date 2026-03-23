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

    // Find forecasts that have ended but haven't sent notifications yet
    const now = new Date().toISOString();
    const { data: endedForecasts, error: fetchError } = await supabase
      .from("forecasts")
      .select("id, title, total_votes_yes, total_votes_no, end_date, project_a_id, project_b_id, status")
      .eq("end_notifications_sent", false)
      .lt("end_date", now);

    if (fetchError) {
      console.error("Error fetching ended forecasts:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!endedForecasts || endedForecasts.length === 0) {
      return new Response(JSON.stringify({ message: "No ended forecasts to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let notificationsSent = 0;
    let snapshotsCaptured = 0;

    for (const forecast of endedForecasts) {
      // --- CAPTURE END SNAPSHOTS ---
      try {
        const endSnapshots = await captureEndSnapshots(supabase, forecast);
        snapshotsCaptured += endSnapshots;
      } catch (snapErr) {
        console.error(`Error capturing end snapshots for ${forecast.id}:`, snapErr);
      }

      // --- UPDATE STATUS TO "ended" if still "active" ---
      if (forecast.status === "active") {
        await supabase
          .from("forecasts")
          .update({ status: "ended" })
          .eq("id", forecast.id);
      }

      // --- SEND NOTIFICATIONS ---
      const { data: votes, error: votesError } = await supabase
        .from("forecast_votes")
        .select("user_id, vote")
        .eq("forecast_id", forecast.id);

      if (votesError) {
        console.error(`Error fetching votes for forecast ${forecast.id}:`, votesError);
        continue;
      }

      if (!votes || votes.length === 0) {
        await supabase
          .from("forecasts")
          .update({ end_notifications_sent: true })
          .eq("id", forecast.id);
        continue;
      }

      const totalVotes = forecast.total_votes_yes + forecast.total_votes_no;
      const yesPct = totalVotes > 0 ? Math.round((forecast.total_votes_yes / totalVotes) * 100) : 50;
      const result = yesPct >= 50 ? "Yes" : "No";

      const userIds = [...new Set(votes.map((v: any) => v.user_id))];

      for (const userId of userIds) {
        const { data: prefs } = await supabase
          .from("notification_preferences")
          .select("forecast_result")
          .eq("user_id", userId)
          .maybeSingle();

        const shouldNotify = prefs?.forecast_result !== false;

        if (shouldNotify) {
          const userVote = votes.find((v: any) => v.user_id === userId)?.vote;
          const userWon = userVote === result.toLowerCase();

          await supabase.from("notifications").insert({
            user_id: userId,
            type: "forecast_result",
            title: "Forecast ended",
            message: `"${forecast.title.slice(0, 50)}${forecast.title.length > 50 ? "..." : ""}" ended with ${yesPct}% Yes. ${userWon ? "Your vote was with the majority!" : ""}`,
            link: `/forecasts/${forecast.id}`,
            metadata: { forecastId: forecast.id, result, userVote, yesPct },
          });
          notificationsSent++;
        }
      }

      // Mark forecast as processed
      await supabase
        .from("forecasts")
        .update({ end_notifications_sent: true })
        .eq("id", forecast.id);
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${endedForecasts.length} forecasts, sent ${notificationsSent} notifications, captured ${snapshotsCaptured} end snapshots`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error in notify-forecast-results:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Captures end snapshots for a concluded forecast by reading current market data.
 * Returns the number of snapshots inserted.
 */
async function captureEndSnapshots(
  supabase: any,
  forecast: { id: string; project_a_id: string; project_b_id: string | null }
): Promise<number> {
  // Get forecast targets
  const { data: targets } = await supabase
    .from("forecast_targets")
    .select("dimension")
    .eq("forecast_id", forecast.id);

  if (!targets || targets.length === 0) return 0;

  // Check which end snapshots already exist
  const { data: existingSnaps } = await supabase
    .from("forecast_metric_snapshots")
    .select("dimension")
    .eq("forecast_id", forecast.id)
    .eq("snapshot_type", "end");

  const existingDims = new Set((existingSnaps || []).map((s: any) => s.dimension));

  // Get current market data for Project A
  const { data: marketA } = await supabase
    .from("token_market_data")
    .select("price_usd, market_cap_usd")
    .eq("project_id", forecast.project_a_id)
    .single();

  // Get current market data for Project B if exists
  let marketB: any = null;
  if (forecast.project_b_id) {
    const { data: mb } = await supabase
      .from("token_market_data")
      .select("price_usd, market_cap_usd")
      .eq("project_id", forecast.project_b_id)
      .single();
    marketB = mb;
  }

  const snapshots: any[] = [];
  const now = new Date().toISOString();

  for (const t of targets) {
    const dim = t.dimension;

    // Skip if end snapshot already exists for this dimension
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
      captured_at: now,
    });

    // Also capture Project B's end data for comparison forecasts
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
          captured_at: now,
        });
      }
    }
  }

  if (snapshots.length === 0) return 0;

  const { error } = await supabase
    .from("forecast_metric_snapshots")
    .upsert(snapshots, { onConflict: "forecast_id,dimension,snapshot_type" });

  if (error) {
    console.error(`Error inserting end snapshots for ${forecast.id}:`, error);
    return 0;
  }

  console.log(`Captured ${snapshots.length} end snapshots for forecast ${forecast.id}`);
  return snapshots.length;
}

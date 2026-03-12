import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { forecast_id, snapshot_type } = await req.json();

    if (!forecast_id || !snapshot_type) {
      return new Response(JSON.stringify({ error: "forecast_id and snapshot_type required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get forecast targets
    const { data: targets, error: tErr } = await supabase
      .from("forecast_targets")
      .select("dimension")
      .eq("forecast_id", forecast_id);

    if (tErr || !targets?.length) {
      return new Response(JSON.stringify({ status: "no_targets" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get forecast to find project
    const { data: forecast } = await supabase
      .from("forecasts")
      .select("project_a_id")
      .eq("id", forecast_id)
      .single();

    if (!forecast) {
      return new Response(JSON.stringify({ error: "forecast not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get current market data for the project
    const { data: marketData } = await supabase
      .from("token_market_data")
      .select("price_usd, market_cap_usd")
      .eq("project_id", forecast.project_a_id)
      .single();

    const dimensions = targets.map((t: any) => t.dimension);
    const snapshots: any[] = [];

    for (const dim of dimensions) {
      let value: number | null = null;

      switch (dim) {
        case "token_price":
          value = marketData?.price_usd ?? null;
          break;
        case "market_cap":
          value = marketData?.market_cap_usd ?? null;
          break;
        case "active_nodes":
          // Placeholder — would integrate with DePIN Pulse / The Graph
          value = null;
          break;
        case "revenue":
          // Placeholder — would integrate with DePIN Pulse
          value = null;
          break;
      }

      snapshots.push({
        forecast_id,
        dimension: dim,
        snapshot_type,
        value,
        source: dim === "token_price" || dim === "market_cap" ? "coingecko" : "pending",
        captured_at: new Date().toISOString(),
      });
    }

    const { error: insertErr } = await supabase
      .from("forecast_metric_snapshots")
      .upsert(snapshots, { onConflict: "forecast_id,dimension,snapshot_type" });

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ status: "ok", captured: snapshots.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

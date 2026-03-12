import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEPIN_PULSE_API = "https://api.depin.ninja/external-access/revenue";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { forecast_id, snapshot_type } = await req.json();

    if (!forecast_id || !snapshot_type) {
      return new Response(
        JSON.stringify({ error: "forecast_id and snapshot_type required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get forecast targets
    const { data: targets, error: tErr } = await supabase
      .from("forecast_targets")
      .select("dimension")
      .eq("forecast_id", forecast_id);

    if (tErr || !targets?.length) {
      return new Response(
        JSON.stringify({ status: "no_targets" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get forecast to find project
    const { data: forecast } = await supabase
      .from("forecasts")
      .select("project_a_id")
      .eq("id", forecast_id)
      .single();

    if (!forecast) {
      return new Response(
        JSON.stringify({ error: "forecast not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get project details (name for DePIN Pulse matching)
    const { data: project } = await supabase
      .from("projects")
      .select("name, coingecko_id")
      .eq("id", forecast.project_a_id)
      .single();

    // Get current market data for the project (CoinGecko-sourced)
    const { data: marketData } = await supabase
      .from("token_market_data")
      .select("price_usd, market_cap_usd")
      .eq("project_id", forecast.project_a_id)
      .single();

    const dimensions = targets.map((t: any) => t.dimension);
    const snapshots: any[] = [];

    // Fetch DePIN Pulse revenue if needed
    let depinPulseRevenue: number | null = null;
    if (dimensions.includes("revenue") && project?.name) {
      const apiKey = Deno.env.get("DEPIN_PULSE_API_KEY");
      if (apiKey) {
        try {
          const res = await fetch(
            `${DEPIN_PULSE_API}?projectName=${encodeURIComponent(project.name)}&limit=1`,
            {
              headers: { "x-api-key": apiKey },
              signal: AbortSignal.timeout(15000),
            }
          );
          if (res.ok) {
            const data = await res.json();
            // DePIN Pulse returns an array of projects with mrr (monthly recurring revenue)
            if (Array.isArray(data) && data.length > 0) {
              depinPulseRevenue = data[0].mrr ?? null;
            } else if (data?.breakDown && Array.isArray(data.breakDown)) {
              // /latest endpoint format
              const match = data.breakDown.find(
                (p: any) => p.name?.toLowerCase() === project.name.toLowerCase()
              );
              if (match) {
                depinPulseRevenue = match.revenue ?? null;
              }
            } else if (data?.data && Array.isArray(data.data)) {
              const match = data.data.find(
                (p: any) =>
                  p.projectName?.toLowerCase() === project.name.toLowerCase()
              );
              if (match) {
                depinPulseRevenue = match.mrr ?? null;
              }
            }
          } else {
            console.error(`DePIN Pulse API returned ${res.status}`);
            await res.text(); // consume body
          }
        } catch (err) {
          console.error("DePIN Pulse fetch error:", err);
        }
      } else {
        console.log("DEPIN_PULSE_API_KEY not configured, skipping revenue fetch");
      }
    }

    for (const dim of dimensions) {
      let value: number | null = null;
      let source = "pending";

      switch (dim) {
        case "token_price":
          value = marketData?.price_usd ?? null;
          source = value != null ? "coingecko" : "pending";
          break;
        case "market_cap":
          value = marketData?.market_cap_usd ?? null;
          source = value != null ? "coingecko" : "pending";
          break;
        case "active_nodes":
          // DePINScan does not provide a public API for device counts.
          // This remains a placeholder until an API source is available.
          value = null;
          source = "unavailable";
          break;
        case "revenue":
          value = depinPulseRevenue;
          source = value != null ? "depin_pulse" : "pending";
          break;
      }

      snapshots.push({
        forecast_id,
        dimension: dim,
        snapshot_type,
        value,
        source,
        captured_at: new Date().toISOString(),
      });
    }

    const { error: insertErr } = await supabase
      .from("forecast_metric_snapshots")
      .upsert(snapshots, { onConflict: "forecast_id,dimension,snapshot_type" });

    if (insertErr) {
      return new Response(
        JSON.stringify({ error: insertErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        status: "ok",
        captured: snapshots.length,
        details: snapshots.map((s: any) => ({
          dimension: s.dimension,
          source: s.source,
          hasValue: s.value != null,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

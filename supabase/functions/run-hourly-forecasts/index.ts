import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const nowISO = now.toISOString();

    // Get all enabled hourly forecast configs
    const { data: configs, error: configErr } = await supabase
      .from("hourly_forecast_config")
      .select("*, project:projects!hourly_forecast_config_project_id_fkey(id, name, coingecko_id)")
      .eq("is_enabled", true);

    if (configErr) throw configErr;
    if (!configs || configs.length === 0) {
      return new Response(JSON.stringify({ message: "No enabled configs" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const config of configs) {
      // Check for active round
      const { data: activeRounds } = await supabase
        .from("hourly_forecast_rounds")
        .select("*")
        .eq("config_id", config.id)
        .in("status", ["active", "resolving"])
        .order("created_at", { ascending: false })
        .limit(1);

      const activeRound = activeRounds?.[0];

      if (activeRound) {
        // Check if the round has ended
        if (new Date(activeRound.end_time) <= now) {
          // Resolve this round
          const { data: marketData } = await supabase
            .from("token_market_data")
            .select("price_usd")
            .eq("project_id", config.project_id)
            .single();

          const endPrice = marketData?.price_usd ?? null;
          const startPrice = activeRound.start_price;
          let outcome = "draw";
          if (startPrice != null && endPrice != null) {
            if (endPrice > startPrice) outcome = "up";
            else if (endPrice < startPrice) outcome = "down";
          }

          const cooldownEnd = new Date(now.getTime() + config.cooldown_minutes * 60 * 1000);

          await supabase
            .from("hourly_forecast_rounds")
            .update({
              status: "resolved",
              end_price: endPrice,
              outcome,
              cooldown_end: cooldownEnd.toISOString(),
            })
            .eq("id", activeRound.id);

          results.push({ config_id: config.id, action: "resolved", round_id: activeRound.id, outcome });
        } else {
          results.push({ config_id: config.id, action: "still_active", round_id: activeRound.id });
        }
        continue;
      }

      // No active round — check cooldown
      const { data: lastRounds } = await supabase
        .from("hourly_forecast_rounds")
        .select("*")
        .eq("config_id", config.id)
        .eq("status", "resolved")
        .order("created_at", { ascending: false })
        .limit(1);

      const lastRound = lastRounds?.[0];

      if (lastRound?.cooldown_end && new Date(lastRound.cooldown_end) > now) {
        results.push({ config_id: config.id, action: "in_cooldown", cooldown_end: lastRound.cooldown_end });
        continue;
      }

      // Create new round
      const { data: marketData } = await supabase
        .from("token_market_data")
        .select("price_usd")
        .eq("project_id", config.project_id)
        .single();

      const startPrice = marketData?.price_usd ?? null;
      const roundNumber = lastRound ? lastRound.round_number + 1 : 1;
      const endTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

      const { data: newRound, error: insertErr } = await supabase
        .from("hourly_forecast_rounds")
        .insert({
          config_id: config.id,
          project_id: config.project_id,
          round_number: roundNumber,
          status: "active",
          start_time: nowISO,
          end_time: endTime.toISOString(),
          start_price: startPrice,
        })
        .select("id")
        .single();

      if (insertErr) {
        results.push({ config_id: config.id, action: "error", error: insertErr.message });
      } else {
        results.push({ config_id: config.id, action: "created_round", round_id: newRound?.id, round_number: roundNumber });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

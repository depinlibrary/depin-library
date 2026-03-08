import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all enabled alerts
    const { data: alerts, error: alertsError } = await supabase
      .from("price_alerts")
      .select("*, projects!inner(id, name, token, slug)")
      .eq("is_enabled", true);

    if (alertsError) throw alertsError;
    if (!alerts || alerts.length === 0) {
      return new Response(
        JSON.stringify({ status: "ok", message: "No active alerts" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get unique project IDs and fetch their market data
    const projectIds = [...new Set(alerts.map((a: any) => a.project_id))];
    const { data: marketData, error: marketError } = await supabase
      .from("token_market_data")
      .select("*")
      .in("project_id", projectIds);

    if (marketError) throw marketError;

    const marketMap: Record<string, any> = {};
    (marketData || []).forEach((m: any) => {
      marketMap[m.project_id] = m;
    });

    let triggered = 0;

    for (const alert of alerts) {
      const market = marketMap[alert.project_id];
      if (!market || market.price_usd === null) continue;

      const currentPrice = Number(market.price_usd);
      const lastKnown = alert.last_known_price ? Number(alert.last_known_price) : null;

      // If no last known price, just record current and skip
      if (lastKnown === null || lastKnown === 0) {
        await supabase
          .from("price_alerts")
          .update({ last_known_price: currentPrice, updated_at: new Date().toISOString() })
          .eq("id", alert.id);
        continue;
      }

      const changePercent = ((currentPrice - lastKnown) / lastKnown) * 100;
      const absChange = Math.abs(changePercent);
      const threshold = Number(alert.threshold_percent);

      // Check if threshold is exceeded
      if (absChange < threshold) continue;

      // Check direction filter
      const isUp = changePercent > 0;
      if (alert.direction === "up" && !isUp) continue;
      if (alert.direction === "down" && isUp) continue;

      // Cooldown: don't trigger more than once per hour
      if (alert.last_triggered_at) {
        const lastTriggered = new Date(alert.last_triggered_at).getTime();
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        if (lastTriggered > oneHourAgo) continue;
      }

      // Create notification
      const project = alert.projects as any;
      const dirLabel = isUp ? "up" : "down";
      const emoji = isUp ? "📈" : "📉";

      await supabase.from("notifications").insert({
        user_id: alert.user_id,
        type: "price_alert",
        title: `${emoji} ${project.token} Price Alert`,
        message: `${project.name} (${project.token}) is ${dirLabel} ${absChange.toFixed(2)}% — now $${currentPrice < 1 ? currentPrice.toFixed(6) : currentPrice.toFixed(2)}`,
        link: `/project/${project.slug}`,
        metadata: {
          project_id: alert.project_id,
          change_percent: changePercent,
          current_price: currentPrice,
          previous_price: lastKnown,
        },
      });

      // Update alert: record trigger time and new baseline price
      await supabase
        .from("price_alerts")
        .update({
          last_triggered_at: new Date().toISOString(),
          last_known_price: currentPrice,
          updated_at: new Date().toISOString(),
        })
        .eq("id", alert.id);

      triggered++;
    }

    return new Response(
      JSON.stringify({ status: "ok", checked: alerts.length, triggered }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("check-price-alerts error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

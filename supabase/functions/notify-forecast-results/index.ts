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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find forecasts that have ended but haven't sent notifications yet
    const now = new Date().toISOString();
    const { data: endedForecasts, error: fetchError } = await supabase
      .from("forecasts")
      .select("id, title, total_votes_yes, total_votes_no, end_date")
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

    for (const forecast of endedForecasts) {
      // Get all users who voted on this forecast
      const { data: votes, error: votesError } = await supabase
        .from("forecast_votes")
        .select("user_id, vote")
        .eq("forecast_id", forecast.id);

      if (votesError) {
        console.error(`Error fetching votes for forecast ${forecast.id}:`, votesError);
        continue;
      }

      if (!votes || votes.length === 0) {
        // Mark as processed even if no votes
        await supabase
          .from("forecasts")
          .update({ end_notifications_sent: true })
          .eq("id", forecast.id);
        continue;
      }

      // Calculate results
      const totalVotes = forecast.total_votes_yes + forecast.total_votes_no;
      const yesPct = totalVotes > 0 ? Math.round((forecast.total_votes_yes / totalVotes) * 100) : 50;
      const result = yesPct >= 50 ? "Yes" : "No";

      // Get unique user IDs
      const userIds = [...new Set(votes.map((v: any) => v.user_id))];

      // Check notification preferences for each user
      for (const userId of userIds) {
        // Check if user wants forecast result notifications
        const { data: prefs } = await supabase
          .from("notification_preferences")
          .select("forecast_result")
          .eq("user_id", userId)
          .maybeSingle();

        // Default to true if no preferences set
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
        message: `Processed ${endedForecasts.length} forecasts, sent ${notificationsSent} notifications`,
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

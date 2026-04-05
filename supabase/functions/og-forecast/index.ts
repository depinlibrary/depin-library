import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BOT_USER_AGENTS = [
  "twitterbot",
  "facebookexternalhit",
  "linkedinbot",
  "slackbot",
  "discordbot",
  "telegrambot",
  "whatsapp",
  "googlebot",
  "bingbot",
  "yandexbot",
  "embedly",
  "showyoubot",
  "outbrain",
  "pinterest",
  "applebot",
  "redditbot",
];

function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_USER_AGENTS.some((bot) => ua.includes(bot));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const predictionId = url.searchParams.get("id");

    if (!predictionId) {
      return new Response("Missing prediction id", { status: 400, headers: corsHeaders });
    }

    const userAgent = req.headers.get("user-agent") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const siteUrl = url.searchParams.get("site") || "https://depinland.com";

    // Non-bot users get redirected to the actual page
    if (!isBot(userAgent)) {
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: `${siteUrl}/forecasts/${predictionId}`,
        },
      });
    }

    // Fetch prediction data for bots
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: prediction, error } = await supabase
      .from("forecasts")
      .select("*")
      .eq("id", predictionId)
      .single();

    if (error || !prediction) {
      return new Response("Prediction not found", { status: 404, headers: corsHeaders });
    }

    // Fetch project names
    const projectIds = [prediction.project_a_id];
    if (prediction.project_b_id) projectIds.push(prediction.project_b_id);

    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, logo_url")
      .in("id", projectIds);

    const projectMap: Record<string, { name: string; logo_url: string | null }> = {};
    (projects || []).forEach((p: any) => {
      projectMap[p.id] = { name: p.name, logo_url: p.logo_url };
    });

    const projectAName = projectMap[prediction.project_a_id]?.name || "Unknown";
    const projectBName = prediction.project_b_id
      ? projectMap[prediction.project_b_id]?.name || "Unknown"
      : null;

    const totalVotes = prediction.total_votes_yes + prediction.total_votes_no;
    const yesPct = totalVotes > 0
      ? ((prediction.total_votes_yes / totalVotes) * 100).toFixed(0)
      : "50";

    const projectLabel = projectBName
      ? `${projectAName} vs ${projectBName}`
      : projectAName;

    const ogTitle = prediction.title;
    const ogDescription = `${yesPct}% Yes · ${totalVotes} votes · ${projectLabel}${
      prediction.description ? " — " + prediction.description.slice(0, 140) : ""
    }`;
    const ogImage = projectMap[prediction.project_a_id]?.logo_url || `${siteUrl}/favicon.ico`;
    const canonicalUrl = `${siteUrl}/forecasts/${predictionId}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(ogTitle)} — DePIN Prediction</title>
  <meta name="description" content="${escapeHtml(ogDescription)}" />

  <meta property="og:title" content="${escapeHtml(ogTitle)}" />
  <meta property="og:description" content="${escapeHtml(ogDescription)}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:site_name" content="DePIN Library" />

  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />

  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(canonicalUrl)}" />
</head>
<body>
  <h1>${escapeHtml(ogTitle)}</h1>
  <p>${escapeHtml(ogDescription)}</p>
  <p><a href="${escapeHtml(canonicalUrl)}">View Prediction on DePIN Library</a></p>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err) {
    return new Response(`Error: ${err.message}`, { status: 500, headers: corsHeaders });
  }
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

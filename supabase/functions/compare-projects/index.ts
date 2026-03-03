import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateNormalizedKey(
  idA: string,
  idB: string,
  type: string,
  prompt?: string
): string {
  const sorted = [idA, idB].sort();
  const base = `${sorted[0]}_${sorted[1]}_${type}`;
  if (type === "custom" && prompt) {
    const cleaned = prompt.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 80);
    return `${base}_${cleaned}`;
  }
  return base;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Verify user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const adminClient = createClient(supabaseUrl, serviceKey);

    const { project_a_id, project_b_id, user_prompt } = await req.json();
    if (!project_a_id || !project_b_id) {
      return new Response(JSON.stringify({ error: "Two project IDs required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (project_a_id === project_b_id) {
      return new Response(JSON.stringify({ error: "Select two different projects" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const compType = user_prompt?.trim() ? "custom" : "standard";
    const normalizedKey = generateNormalizedKey(project_a_id, project_b_id, compType, user_prompt);

    // STEP 1: Check cache
    const { data: cached } = await adminClient
      .from("project_comparisons")
      .select("*")
      .eq("normalized_key", normalizedKey)
      .maybeSingle();

    if (cached) {
      // Smart expiry: check if older than 30 days
      const age = Date.now() - new Date(cached.created_at).getTime();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      if (age < thirtyDays) {
        return new Response(
          JSON.stringify({ result: cached.ai_response, cached: true, created_at: cached.created_at }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Expired — will regenerate below
    }

    // STEP 2: Rate limit check (5 AI calls per day per user)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count } = await adminClient
      .from("comparison_requests")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", todayStart.toISOString());

    if ((count || 0) >= 5) {
      return new Response(
        JSON.stringify({ error: "Daily limit reached (5 AI comparisons per day). Cached results are still available." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // STEP 3: Fetch project data
    const { data: projects } = await adminClient
      .from("projects")
      .select("id, name, category, blockchain, token, description, status")
      .in("id", [project_a_id, project_b_id]);

    if (!projects || projects.length < 2) {
      return new Response(JSON.stringify({ error: "Projects not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch market data
    const { data: marketData } = await adminClient
      .from("token_market_data")
      .select("project_id, price_usd, market_cap_usd, price_change_24h")
      .in("project_id", [project_a_id, project_b_id]);

    const marketMap: Record<string, any> = {};
    (marketData || []).forEach((m: any) => { marketMap[m.project_id] = m; });

    const sortedIds = [project_a_id, project_b_id].sort();
    const projectA = projects.find((p: any) => p.id === sortedIds[0])!;
    const projectB = projects.find((p: any) => p.id === sortedIds[1])!;

    const formatProject = (p: any) => {
      const m = marketMap[p.id];
      return `Name: ${p.name}\nCategory: ${p.category}\nBlockchain: ${p.blockchain}\nToken: ${p.token}\nStatus: ${p.status}\nMarket Cap: ${m?.market_cap_usd ? `$${Number(m.market_cap_usd).toLocaleString()}` : "N/A"}\nPrice: ${m?.price_usd ? `$${m.price_usd}` : "N/A"}\n24h Change: ${m?.price_change_24h ? `${m.price_change_24h}%` : "N/A"}\nDescription: ${p.description?.slice(0, 300)}`;
    };

    const userQuestion = user_prompt?.trim() || "Provide a structured comparison including strengths, weaknesses, risks, and long-term outlook.";

    const prompt = `Compare the following two DePIN projects:

Project A:
${formatProject(projectA)}

Project B:
${formatProject(projectB)}

User Question: ${userQuestion}

Return response strictly in JSON format:
{
  "summary": "brief comparison summary",
  "project_a_strengths": ["strength1", "strength2"],
  "project_b_strengths": ["strength1", "strength2"],
  "risks": ["risk1", "risk2"],
  "long_term_outlook": "outlook text",
  "conclusion": "conclusion text"
}`;

    // STEP 4: Call Lovable AI
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a crypto infrastructure analyst. Provide neutral, structured comparisons. Do not give financial advice. Always respond with valid JSON only, no markdown formatting.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit exceeded, try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response (handle potential markdown wrapping)
    let parsedResult: any;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      parsedResult = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawContent);
    } catch {
      parsedResult = {
        summary: rawContent,
        project_a_strengths: [],
        project_b_strengths: [],
        risks: [],
        long_term_outlook: "",
        conclusion: "",
      };
    }

    // STEP 5: Save to cache
    const upsertData = {
      project_a_id: sortedIds[0],
      project_b_id: sortedIds[1],
      comparison_type: compType,
      user_prompt: user_prompt?.trim() || null,
      normalized_key: normalizedKey,
      ai_response: parsedResult,
      updated_at: new Date().toISOString(),
    };

    if (cached) {
      await adminClient
        .from("project_comparisons")
        .update(upsertData)
        .eq("id", cached.id);
    } else {
      await adminClient.from("project_comparisons").insert(upsertData);
    }

    // Record rate limit
    await adminClient.from("comparison_requests").insert({ user_id: userId });

    return new Response(
      JSON.stringify({ result: parsedResult, cached: false, created_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("compare error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all projects
    const { data: projects } = await supabase.from("projects").select("id");
    if (!projects?.length) {
      return new Response(JSON.stringify({ message: "No projects" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const projectIds = projects.map((p: any) => p.id);

    // Get rating counts per project
    const { data: ratingCounts } = await supabase
      .from("project_ratings")
      .select("project_id");

    const ratingsMap: Record<string, number> = {};
    (ratingCounts || []).forEach((r: any) => {
      ratingsMap[r.project_id] = (ratingsMap[r.project_id] || 0) + 1;
    });

    // Get comparison counts per project
    const { data: comparisons } = await supabase
      .from("project_comparisons")
      .select("project_a_id, project_b_id");

    const comparisonMap: Record<string, number> = {};
    (comparisons || []).forEach((c: any) => {
      comparisonMap[c.project_a_id] = (comparisonMap[c.project_a_id] || 0) + 1;
      comparisonMap[c.project_b_id] = (comparisonMap[c.project_b_id] || 0) + 1;
    });

    // Calculate scores
    const scores = projectIds.map((id: string) => {
      const ratings = ratingsMap[id] || 0;
      const comps = comparisonMap[id] || 0;

      // Score formula based on comparisons and ratings
      const score = comps * 0.6 + ratings * 0.4;

      return { project_id: id, score: Math.round(score * 100) / 100 };
    });

    // Upsert scores
    for (const s of scores) {
      await supabase.from("project_trending_scores").upsert(
        { project_id: s.project_id, score: s.score, updated_at: new Date().toISOString() },
        { onConflict: "project_id" }
      );
    }

    return new Response(
      JSON.stringify({ message: "Trending scores updated", count: scores.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

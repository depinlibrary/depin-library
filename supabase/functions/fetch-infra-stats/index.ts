import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const results: Record<string, string> = {};

  // --- Helium ---
  try {
    const res = await fetch("https://api.helium.io/v1/stats");
    if (res.ok) {
      const json = await res.json();
      const hotspots = json?.data?.counts?.hotspots?.active;
      if (hotspots != null) {
        const formatted = Number(hotspots).toLocaleString("en-US");
        // Find helium project
        const { data: proj } = await supabase.from("projects").select("id").eq("slug", "helium").maybeSingle();
        if (proj) {
          await supabase.from("project_infrastructure")
            .update({ value: formatted })
            .eq("project_id", proj.id)
            .eq("label", "Active Hotspots");
          results.helium = formatted;
        }
      }
    }
  } catch (e) {
    results.helium_error = String(e);
  }

  // --- Filecoin ---
  try {
    const res = await fetch("https://api.filscan.io/api/v1/FilscanStatisticalIndicator");
    if (res.ok) {
      const json = await res.json();
      const power = json?.data?.power;
      if (power) {
        const { data: proj } = await supabase.from("projects").select("id").eq("slug", "filecoin").maybeSingle();
        if (proj) {
          const eib = (Number(power) / 1024 ** 6).toFixed(1);
          await supabase.from("project_infrastructure")
            .update({ value: `${eib} EiB` })
            .eq("project_id", proj.id)
            .eq("label", "Total Storage");
          results.filecoin = `${eib} EiB`;
        }
      }
    }
  } catch (e) {
    results.filecoin_error = String(e);
  }

  // --- Akash ---
  try {
    const res = await fetch("https://api.cloudmos.io/v1/dashboard-data");
    if (res.ok) {
      const json = await res.json();
      const providers = json?.networkCapacity?.activeProviderCount;
      if (providers != null) {
        const { data: proj } = await supabase.from("projects").select("id").eq("slug", "akash").maybeSingle();
        if (proj) {
          await supabase.from("project_infrastructure")
            .update({ value: String(providers) })
            .eq("project_id", proj.id)
            .eq("label", "Active Providers");
          results.akash = String(providers);
        }
      }
    }
  } catch (e) {
    results.akash_error = String(e);
  }

  // --- World Mobile ---
  try {
    const res = await fetch("https://wen.worldmobile.net/api/stats");
    if (res.ok) {
      const json = await res.json();
      const airNodes = json?.air_nodes ?? json?.total_air_nodes;
      if (airNodes != null) {
        const { data: proj } = await supabase.from("projects").select("id").eq("slug", "world-mobile").maybeSingle();
        if (proj) {
          const formatted = Number(airNodes).toLocaleString("en-US");
          await supabase.from("project_infrastructure")
            .update({ value: `${formatted}+` })
            .eq("project_id", proj.id)
            .eq("label", "AirNodes");
          results.world_mobile = formatted;
        }
      }
    }
  } catch (e) {
    results.world_mobile_error = String(e);
  }

  // --- Arweave (ViewBlock) ---
  try {
    const res = await fetch("https://api.viewblock.io/arweave/stats", {
      headers: { "Accept": "application/json" },
    });
    if (res.ok) {
      const json = await res.json();
      const height = json?.height ?? json?.blocks;
      if (height != null) {
        const { data: proj } = await supabase.from("projects").select("id").eq("slug", "arweave").maybeSingle();
        if (proj) {
          const formatted = (Number(height) / 1_000_000).toFixed(1) + "M+";
          await supabase.from("project_infrastructure")
            .update({ value: formatted })
            .eq("project_id", proj.id)
            .eq("label", "Blocks Stored");
          results.arweave = formatted;
        }
      }
    }
  } catch (e) {
    results.arweave_error = String(e);
  }

  return new Response(JSON.stringify({ success: true, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

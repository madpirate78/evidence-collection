/*// supabase/functions/cleanup-rate-limits/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get cleanup statistics before
    const { data: beforeStats } = await supabaseClient
      .from("rate_limits")
      .select("count", { count: "exact", head: true });

    const countBefore = beforeStats || 0;

    // Run cleanup
    const { data, error } = await supabaseClient.rpc(
      "cleanup_expired_rate_limits"
    );

    if (error) throw error;

    // Get cleanup statistics after
    const { data: afterStats } = await supabaseClient
      .from("rate_limits")
      .select("count", { count: "exact", head: true });

    const countAfter = afterStats || 0;
    const deletedCount = countBefore - countAfter;

    // Log cleanup for monitoring
    const { error: logError } = await supabaseClient
      .from("cleanup_logs")
      .insert({
        function_name: "cleanup_rate_limits",
        records_before: countBefore,
        records_after: countAfter,
        records_deleted: deletedCount,
        execution_time_ms: Date.now() - startTime,
        status: "success",
      });

    const response = {
      success: true,
      message: `Cleaned up ${deletedCount} expired rate limit records`,
      stats: {
        before: countBefore,
        after: countAfter,
        deleted: deletedCount,
      },
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    // Log error
    try {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      await supabaseClient.from("cleanup_logs").insert({
        function_name: "cleanup_rate_limits",
        status: "error",
        error_message: error.message,
      });
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

const startTime = Date.now();
*/

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Whitelist of allowed tables (must match ALL_BACKUP_TABLES in backupTables.ts)
const TABLE_WHITELIST = new Set([
  "leads", "profiles", "contracts",
  "brand_processes", "invoices", "documents", "inpi_resources", "process_events", "publicacoes_marcas",
  "contract_attachments", "contract_comments", "contract_notes", "contract_tasks", "contract_templates", "contract_types", "contract_renewal_history",
  "chat_messages", "notifications", "notification_templates", "email_templates", "email_logs", "email_inbox", "email_accounts",
  "marketing_campaigns", "marketing_attribution", "marketing_config", "marketing_ab_tests", "marketing_ab_variants", "marketing_audience_suggestions", "marketing_budget_alerts",
  "client_remarketing_campaigns", "client_remarketing_queue", "lead_remarketing_campaigns", "lead_remarketing_queue",
  "client_activities", "client_notes", "client_appointments", "lead_activities",
  "rpi_uploads", "rpi_entries", "inpi_knowledge_base", "inpi_sync_logs",
  "system_settings", "admin_permissions", "user_roles", "notification_logs", "channel_notification_templates", "ai_providers", "ai_usage_logs", "login_history", "signature_audit_log", "import_logs",
  "award_entries", "conversations", "conversation_messages", "conversation_participants", "call_signals", "upsell_engine_config", "upsell_engine_weights", "promotion_expiration_logs", "viability_searches",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT - admin only
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Check admin role
    const { data: roleData } = await anonClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body
    const { table, rows } = await req.json();

    if (!table || !Array.isArray(rows) || rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid payload: table (string) and rows (array) required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!TABLE_WHITELIST.has(table)) {
      return new Response(
        JSON.stringify({ error: `Table "${table}" is not in the allowed whitelist` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role key for bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Clean rows: remove _type field if present
    const cleanRows = rows.map((r: Record<string, unknown>) => {
      const { _type, ...rest } = r;
      return rest;
    });

    // Check if rows have id field for upsert
    const hasIds = cleanRows.every((r: Record<string, unknown>) => r.id);

    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    if (hasIds) {
      // Upsert with conflict on id (strategy: update)
      const { error } = await supabaseAdmin
        .from(table)
        .upsert(cleanRows, { onConflict: "id", ignoreDuplicates: false });

      if (error) {
        errors.push(error.message);
        failed = cleanRows.length;
      } else {
        imported = cleanRows.length;
      }
    } else {
      // Insert without id
      const insertRows = cleanRows.map((r: Record<string, unknown>) => {
        const { id, ...rest } = r;
        return rest;
      });

      const { error } = await supabaseAdmin.from(table).insert(insertRows);

      if (error) {
        errors.push(error.message);
        failed = insertRows.length;
      } else {
        imported = insertRows.length;
      }
    }

    return new Response(
      JSON.stringify({ imported, failed, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

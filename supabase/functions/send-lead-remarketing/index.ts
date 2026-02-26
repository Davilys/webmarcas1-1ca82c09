import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { lead_ids, campaign_id, subject, body } = await req.json();

    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      throw new Error("lead_ids is required");
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Fetch leads
    const { data: leads, error: leadsErr } = await supabase
      .from("leads")
      .select("id, full_name, email, company_name")
      .in("id", lead_ids);

    if (leadsErr) throw leadsErr;

    const emailSubject = subject || "Temos uma oportunidade especial para você!";
    const emailBody = body || "Olá {{nome}}, gostaríamos de retomar contato com você.";

    let sentCount = 0;
    const batchSize = 5;

    for (let i = 0; i < (leads || []).length; i += batchSize) {
      const batch = leads!.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (lead) => {
          if (!lead.email) return;

          const personalizedBody = emailBody
            .replace(/\{\{nome\}\}/g, lead.full_name || "")
            .replace(/\{\{email\}\}/g, lead.email || "")
            .replace(/\{\{empresa\}\}/g, lead.company_name || "");

          const personalizedSubject = emailSubject
            .replace(/\{\{nome\}\}/g, lead.full_name || "");

          try {
            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "Webmarcas <noreply@webmarcas.net>",
                to: [lead.email],
                subject: personalizedSubject,
                html: `<div style="font-family:Arial,sans-serif;padding:20px;max-width:600px;margin:0 auto;">
                  <p>${personalizedBody.replace(/\n/g, "<br/>")}</p>
                  <hr style="margin:20px 0;border:none;border-top:1px solid #eee;"/>
                  <p style="font-size:11px;color:#999;">Webmarcas - Registro de Marcas</p>
                </div>`,
              }),
            });

            if (res.ok) {
              sentCount++;

              // Log in email_logs
              await supabase.from("email_logs").insert({
                from_email: "noreply@webmarcas.net",
                to_email: lead.email,
                subject: personalizedSubject,
                body: personalizedBody,
                status: "sent",
                trigger_type: "remarketing",
                related_lead_id: lead.id,
              });

              // Log activity
              await supabase.from("lead_activities").insert({
                lead_id: lead.id,
                activity_type: "remarketing",
                content: `Remarketing enviado: ${personalizedSubject}`,
              });

              // Update remarketing count
              await supabase.rpc("increment_remarketing_count_noop", { lead_id_param: lead.id }).catch(() => {
                // Fallback: direct update
                supabase
                  .from("leads")
                  .update({
                    remarketing_count: (lead as any).remarketing_count
                      ? (lead as any).remarketing_count + 1
                      : 1,
                    last_activity_at: new Date().toISOString(),
                  })
                  .eq("id", lead.id);
              });
            }
          } catch (e) {
            console.error(`Error sending to ${lead.email}:`, e);
          }
        })
      );

      // Rate limit: wait 1s between batches
      if (i + batchSize < (leads || []).length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    // Update campaign if provided
    if (campaign_id) {
      await supabase
        .from("lead_remarketing_campaigns")
        .update({
          status: "enviada",
          sent_at: new Date().toISOString(),
          total_sent: sentCount,
        })
        .eq("id", campaign_id);
    }

    return new Response(
      JSON.stringify({ success: true, sent: sentCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

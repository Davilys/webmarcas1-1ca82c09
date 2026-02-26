import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Business hours: Mon-Fri 10:00-17:00 BRT (UTC-3)
const BRT_OFFSET = -3;
const WORK_START = 10;
const WORK_END = 17;
const EMAIL_DAILY_LIMIT = 100;
const WA_DAILY_LIMIT = 10;
const WA_INTERVAL_MIN = 10;

function toBRT(d: Date): Date {
  return new Date(d.getTime() + BRT_OFFSET * 3600000);
}

function isBusinessDay(brt: Date): boolean {
  const day = brt.getUTCDay();
  return day >= 1 && day <= 5;
}

function nextBusinessSlot(from: Date, channel: 'email' | 'whatsapp', slotIndex: number): Date {
  const brt = toBRT(from);
  let dayOffset = 0;

  if (channel === 'email') {
    const perDay = EMAIL_DAILY_LIMIT;
    dayOffset = Math.floor(slotIndex / perDay);
    const indexInDay = slotIndex % perDay;
    // Distribute evenly across 10-17 (7 hours = 420 min)
    const minuteOffset = Math.floor((indexInDay / perDay) * 420);
    
    let target = new Date(brt);
    target.setUTCDate(target.getUTCDate() + dayOffset);
    // Skip weekends
    while (!isBusinessDay(target)) {
      target.setUTCDate(target.getUTCDate() + 1);
    }
    target.setUTCHours(WORK_START, 0, 0, 0);
    target.setUTCMinutes(target.getUTCMinutes() + minuteOffset);
    // Convert back to UTC
    return new Date(target.getTime() - BRT_OFFSET * 3600000);
  } else {
    // WhatsApp: 10/day, 10min interval
    const perDay = WA_DAILY_LIMIT;
    dayOffset = Math.floor(slotIndex / perDay);
    const indexInDay = slotIndex % perDay;
    const minuteOffset = indexInDay * WA_INTERVAL_MIN;

    let target = new Date(brt);
    target.setUTCDate(target.getUTCDate() + dayOffset);
    while (!isBusinessDay(target)) {
      target.setUTCDate(target.getUTCDate() + 1);
    }
    target.setUTCHours(WORK_START, 0, 0, 0);
    target.setUTCMinutes(target.getUTCMinutes() + minuteOffset);
    return new Date(target.getTime() - BRT_OFFSET * 3600000);
  }
}

async function sendEmailNow(
  resendApiKey: string,
  to: string,
  subject: string,
  body: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Webmarcas <noreply@webmarcas.net>",
        to: [to],
        subject,
        html: `<div style="font-family:Arial,sans-serif;padding:20px;max-width:600px;margin:0 auto;">
          <p>${body.replace(/\n/g, "<br/>")}</p>
          <hr style="margin:20px 0;border:none;border-top:1px solid #eee;"/>
          <p style="font-size:11px;color:#999;">Webmarcas - Registro de Marcas</p>
        </div>`,
      }),
    });
    return res.ok ? { success: true } : { success: false, error: `Resend HTTP ${res.status}` };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function summarizeForWhatsApp(message: string, nome: string, assunto: string): Promise<string> {
  if (message.length <= 250) {
    return `WebMarcas: Olá ${nome}! ${message}\n\nFale conosco: (11) 91112-0225`;
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `Você resume mensagens de marketing para WhatsApp. Crie uma versão condensada entre 200 e 350 caracteres.
REGRAS:
- Comece com "WebMarcas: Olá ${nome}!"
- Use o ASSUNTO do e-mail como gancho principal da mensagem
- Mantenha os 2-3 pontos mais importantes do corpo original
- Preserve valores monetários (R$) e nomes de marcas
- Tom profissional e amigável, como uma conversa WhatsApp
- Termine com "Fale conosco: (11) 91112-0225"
- NÃO use emojis em excesso (máximo 2-3)
- NÃO use aspas, apenas o texto final`,
          },
          { role: "user", content: `ASSUNTO: ${assunto}\n\nMENSAGEM:\n${message}` },
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const summary = data?.choices?.[0]?.message?.content?.trim();
      if (summary && summary.length > 20) return summary;
    }
  } catch (e) {
    console.error("AI summarize error:", e);
  }

  // Fallback: subject + first meaningful lines
  const lines = message.split('\n').filter(l => l.trim().length > 10);
  const keyContent = lines.slice(0, 3).join(' ').substring(0, 200);
  return `WebMarcas: Olá ${nome}! ${assunto}. ${keyContent}...\n\nFale conosco: (11) 91112-0225`;
}

async function sendWhatsAppNow(
  supabase: any,
  phone: string,
  nome: string,
  message: string,
): Promise<{ success: boolean; error?: string }> {
  // Get BotConversa settings
  const { data: botRow } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "botconversa")
    .maybeSingle();

  const settings = (botRow?.value as Record<string, unknown>) || {};
  if (!settings.enabled) return { success: false, error: "WhatsApp desativado" };

  const webhookUrl = (settings.webhook_url as string) || "";
  if (!webhookUrl) return { success: false, error: "Webhook BotConversa não configurado" };
  if (!phone) return { success: false, error: "Telefone não informado" };

  const normalized = phone.replace(/\D/g, "").replace(/^0/, "");
  const finalPhone = normalized.startsWith("55") ? normalized : `55${normalized}`;

  const payload = { telefone: finalPhone, nome: nome || "Cliente", mensagem: message };
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const authToken = (settings.auth_token as string) || "";
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  try {
    const res = await fetch(webhookUrl, { method: "POST", headers, body: JSON.stringify(payload) });
    const text = await res.text();
    return res.ok ? { success: true } : { success: false, error: `BotConversa HTTP ${res.status}: ${text}` };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { lead_ids, campaign_id, subject, body, channels, test } = await req.json();

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");

    // ─── TEST MODE ─────────────────────────────────────────────────────
    if (test === true) {
      if (!lead_ids || lead_ids.length === 0) throw new Error("lead_ids required for test");

      const { data: lead } = await supabase
        .from("leads")
        .select("id, full_name, email, phone, company_name")
        .eq("id", lead_ids[0])
        .single();

      if (!lead) throw new Error("Lead não encontrado");

      const testSubject = (subject || "Teste de Remarketing - Webmarcas")
        .replace(/\{\{nome\}\}/g, lead.full_name || "");
      const testBody = (body || "Olá {{nome}}, este é um teste de remarketing.")
        .replace(/\{\{nome\}\}/g, lead.full_name || "")
        .replace(/\{\{email\}\}/g, lead.email || "")
        .replace(/\{\{empresa\}\}/g, lead.company_name || "");

      const results: Record<string, any> = {};

      // Email test
      if (lead.email) {
        results.email = await sendEmailNow(resendApiKey, lead.email, testSubject, testBody);
        if (results.email.success) {
          await supabase.from("email_logs").insert({
            from_email: "noreply@webmarcas.net",
            to_email: lead.email,
            subject: testSubject,
            body: testBody,
            status: "sent",
            trigger_type: "remarketing_test",
            related_lead_id: lead.id,
          });
        }
      } else {
        results.email = { success: false, error: "Sem e-mail" };
      }

      // WhatsApp test
      if (lead.phone) {
        const waMessage = await summarizeForWhatsApp(testBody, lead.full_name || "", testSubject);
        results.whatsapp = await sendWhatsAppNow(supabase, lead.phone, lead.full_name, waMessage);
        if (results.whatsapp.success) {
          await supabase.from("lead_activities").insert({
            lead_id: lead.id,
            activity_type: "remarketing_test",
            content: `Teste WhatsApp enviado para ${lead.phone}`,
          });
        }
      } else {
        results.whatsapp = { success: false, error: "Sem telefone" };
      }

      // Log activity
      await supabase.from("lead_activities").insert({
        lead_id: lead.id,
        activity_type: "remarketing_test",
        content: `Teste de remarketing: Email=${results.email?.success}, WhatsApp=${results.whatsapp?.success}`,
      });

      return new Response(JSON.stringify({ success: true, test: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── CAMPAIGN MODE: Queue items ────────────────────────────────────
    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      throw new Error("lead_ids is required");
    }

    const selectedChannels: string[] = channels || ["email"];

    // Fetch leads
    const { data: leads, error: leadsErr } = await supabase
      .from("leads")
      .select("id, full_name, email, phone, company_name")
      .in("id", lead_ids);
    if (leadsErr) throw leadsErr;

    const emailSubject = subject || "Temos uma oportunidade especial para você!";
    const emailBody = body || "Olá {{nome}}, gostaríamos de retomar contato com você.";

    const now = new Date();
    let emailSlot = 0;
    let waSlot = 0;
    const queueItems: any[] = [];

    for (const lead of leads || []) {
      const personalizedBody = emailBody
        .replace(/\{\{nome\}\}/g, lead.full_name || "")
        .replace(/\{\{email\}\}/g, lead.email || "")
        .replace(/\{\{empresa\}\}/g, lead.company_name || "");
      const personalizedSubject = emailSubject
        .replace(/\{\{nome\}\}/g, lead.full_name || "");

      if (selectedChannels.includes("email") && lead.email) {
        queueItems.push({
          campaign_id,
          lead_id: lead.id,
          channel: "email",
          status: "pending",
          scheduled_for: nextBusinessSlot(now, "email", emailSlot).toISOString(),
          subject: personalizedSubject,
          body: personalizedBody,
        });
        emailSlot++;
      }

      if (selectedChannels.includes("whatsapp") && lead.phone) {
        queueItems.push({
          campaign_id,
          lead_id: lead.id,
          channel: "whatsapp",
          status: "pending",
          scheduled_for: nextBusinessSlot(now, "whatsapp", waSlot).toISOString(),
          subject: personalizedSubject,
          body: personalizedBody,
        });
        waSlot++;
      }
    }

    // Insert queue in batches of 50
    for (let i = 0; i < queueItems.length; i += 50) {
      const batch = queueItems.slice(i, i + 50);
      await supabase.from("lead_remarketing_queue").insert(batch);
    }

    // Update campaign
    if (campaign_id) {
      await supabase
        .from("lead_remarketing_campaigns")
        .update({
          status: "agendada",
          total_queued: queueItems.length,
          channels: selectedChannels,
        })
        .eq("id", campaign_id);
    }

    return new Response(
      JSON.stringify({ success: true, queued: queueItems.length, emails: emailSlot, whatsapp: waSlot }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

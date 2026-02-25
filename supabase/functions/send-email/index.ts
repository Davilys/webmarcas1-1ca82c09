import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailAttachment {
  url: string;
  filename: string;
}

interface EmailRequest {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  html?: string;
  from?: string;
  attachments?: EmailAttachment[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, cc, bcc, subject, body, html, attachments }: EmailRequest = await req.json();

    // Initialize Resend client
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const resend = new Resend(resendApiKey);

    // Create Supabase client to get email account settings
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch default email account for display name only
    const { data: emailAccount } = await supabase
      .from("email_accounts")
      .select("email_address, display_name")
      .eq("is_default", true)
      .single();

    // ALWAYS use verified webmarcas.net domain for sending (Resend requirement).
    // Gmail and other free domains are not allowed as "from" address.
    const VERIFIED_FROM_DOMAIN = 'webmarcas.net';
    const VERIFIED_FROM_EMAIL = `noreply@${VERIFIED_FROM_DOMAIN}`;

    // Use the display name from DB if available, but force the verified domain
    const displayName = emailAccount?.display_name || 'WebMarcas';
    const fromAddress = `${displayName} <${VERIFIED_FROM_EMAIL}>`;

    // Create professional HTML content
    const htmlContent = html || `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px;">
  ${body}
</body>
</html>`;

    console.log("Sending email via Resend to:", to);
    console.log("From:", fromAddress);
    console.log("Attachments:", attachments?.length || 0);

    // Build Resend attachments using path (URL) - Resend fetches the file directly
    const resendAttachments = attachments && attachments.length > 0
      ? attachments.map((att) => ({
          filename: att.filename,
          path: att.url,
        }))
      : undefined;

    // Send email via Resend API
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: to,
      cc: cc,
      bcc: bcc,
      subject: subject,
      html: htmlContent,
      ...(resendAttachments && resendAttachments.length > 0 ? { attachments: resendAttachments } : {}),
    });

    if (error) {
      console.error("Resend API error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Email sent successfully via Resend:", data);

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully", id: data?.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

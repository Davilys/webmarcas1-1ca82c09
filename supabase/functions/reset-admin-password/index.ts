import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MASTER_ADMIN_EMAIL = "davillys@gmail.com";
const DEFAULT_PASSWORD = "123Mudar@";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Validate caller JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");
    const token = authHeader.replace("Bearer ", "");

    const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !caller) throw new Error("Não autorizado");

    // Only Master Admin can reset passwords
    if (caller.email !== MASTER_ADMIN_EMAIL) {
      return new Response(
        JSON.stringify({ error: "Apenas o administrador master pode resetar senhas." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId } = await req.json();
    if (!userId) throw new Error("userId é obrigatório");

    // Cannot reset own password via this route
    if (userId === caller.id) {
      throw new Error("O administrador master não pode resetar a própria senha por aqui.");
    }

    // Verify target is an admin
    const { data: targetRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!targetRole) {
      throw new Error("O usuário alvo não é um administrador.");
    }

    // Extra protection: never reset the master account itself
    const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (targetUser?.user?.email === MASTER_ADMIN_EMAIL) {
      throw new Error("A senha do administrador master não pode ser resetada por aqui.");
    }

    // Reset password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: DEFAULT_PASSWORD,
    });
    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true, password: DEFAULT_PASSWORD }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

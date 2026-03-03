import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Dynamic AI Provider Resolution ────────────────
const _aiAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
async function getActiveAIConfig(): Promise<{ endpoint: string; apiKey: string; model: string }> {
  const { data: p } = await _aiAdmin.from('ai_providers').select('*').eq('is_active', true).single();
  if (!p) throw new Error('Nenhum provedor de IA ativo configurado');
  switch (p.provider_type) {
    case 'lovable': { const k = Deno.env.get('LOVABLE_API_KEY'); if (!k) throw new Error('LOVABLE_API_KEY não configurada'); return { endpoint: 'https://ai.gateway.lovable.dev/v1/chat/completions', apiKey: k, model: p.model }; }
    case 'openai': { const k = p.api_key || Deno.env.get('OPENAI_API_KEY'); if (!k) throw new Error('OpenAI API key não configurada'); return { endpoint: 'https://api.openai.com/v1/chat/completions', apiKey: k, model: p.model }; }
    case 'deepseek': { if (!p.api_key) throw new Error('DeepSeek API key não configurada'); return { endpoint: 'https://api.deepseek.com/v1/chat/completions', apiKey: p.api_key, model: p.model }; }
    case 'gemini': { const k = Deno.env.get('LOVABLE_API_KEY'); if (!k) throw new Error('Gemini requer LOVABLE_API_KEY'); const m = p.model.startsWith('google/') ? p.model : `google/${p.model}`; return { endpoint: 'https://ai.gateway.lovable.dev/v1/chat/completions', apiKey: k, model: m }; }
    default: throw new Error(`Provider não suportado: ${p.provider_type}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se é admin
    const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
      _user_id: userData.user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Acesso de administrador necessário' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { currentContent, adjustmentInstructions } = await req.json();

    if (!currentContent || !adjustmentInstructions) {
      return new Response(
        JSON.stringify({ error: 'Parâmetros obrigatórios ausentes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ai = await getActiveAIConfig();

    const systemPrompt = `Você é um AGENTE JURÍDICO ESPECIALISTA EM PROPRIEDADE INTELECTUAL DA WEBMARCAS.

Sua tarefa é AJUSTAR o recurso administrativo conforme as instruções do usuário.

REGRAS CRÍTICAS:
1. Modifique APENAS os trechos indicados nas instruções
2. Mantenha TODO o restante do texto INALTERADO
3. NÃO reescreva o recurso completo
4. Preserve toda a formatação e estrutura original
5. Mantenha os dados extraídos do documento original

INSTRUÇÕES DE AJUSTE DO USUÁRIO:
${adjustmentInstructions}

RECURSO ATUAL:
${currentContent}

Responda APENAS com o texto completo do recurso ajustado, sem explicações adicionais.`;

    console.log('Calling AI to adjust INPI resource...');

    const aiResponse = await fetch(ai.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ai.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Aplique os ajustes solicitados ao recurso.' }
        ],
        max_tokens: 8000,
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos à sua conta.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Erro ao ajustar recurso com IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const adjustedContent = aiData.choices?.[0]?.message?.content;

    if (!adjustedContent) {
      return new Response(
        JSON.stringify({ error: 'Resposta vazia da IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        adjusted_content: adjustedContent.trim()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error adjusting INPI resource:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

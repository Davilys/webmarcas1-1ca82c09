import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { businessArea, brandName } = await req.json();

    if (!businessArea) {
      return new Response(
        JSON.stringify({ error: 'Ramo de atividade é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Você é um especialista em classificação de marcas no INPI (Instituto Nacional da Propriedade Industrial) do Brasil. 
Sua tarefa é sugerir as classes NCL (Classificação de Nice) mais apropriadas para o registro de uma marca com base no ramo de atividade informado.

REGRAS:
- Sugira entre 1 e 5 classes NCL (de 1 a 45)
- Para cada classe, forneça o número e uma descrição curta em português
- Priorize as classes mais relevantes primeiro
- Responda APENAS em formato JSON válido, sem markdown

Formato de resposta:
[{"number": 35, "description": "comércio e propaganda"}, {"number": 42, "description": "serviços de tecnologia"}]`;

    const userPrompt = `Sugira as classes NCL mais apropriadas para:
- Ramo de atividade: ${businessArea}
${brandName ? `- Nome da marca: ${brandName}` : ''}`;

    // Call the centralized ai-engine function which respects the configured provider
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    const aiResponse = await fetch(`${supabaseUrl}/functions/v1/ai-engine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        action: 'generate',
        module: 'suggest-ncl-classes',
        taskType: 'class_suggestion',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        options: {
          temperature: 0.3,
          max_tokens: 500,
        },
      }),
    });

    const aiResult = await aiResponse.json();

    if (!aiResponse.ok || aiResult.error) {
      console.error('AI Engine error:', aiResult.error);
      throw new Error(aiResult.error || 'Erro na consulta de IA');
    }

    const content = aiResult.content || '[]';
    
    // Parse JSON from AI response (handle potential markdown wrapping)
    let classes = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        classes = JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      console.error('Failed to parse AI response:', content);
      classes = [];
    }

    // Validate and sanitize
    classes = classes
      .filter((c: any) => c.number && c.number >= 1 && c.number <= 45 && c.description)
      .map((c: any) => ({ number: Number(c.number), description: String(c.description).substring(0, 100) }))
      .slice(0, 5);

    return new Response(
      JSON.stringify({ success: true, classes }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in suggest-ncl-classes:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

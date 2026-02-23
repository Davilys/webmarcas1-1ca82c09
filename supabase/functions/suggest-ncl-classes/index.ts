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

    let content = '';
    let success = false;

    // Try Lovable AI gateway first
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (LOVABLE_API_KEY && !success) {
      try {
        const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.3,
            max_tokens: 500,
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          content = data.choices?.[0]?.message?.content || '';
          if (content) success = true;
        } else {
          console.log('Lovable AI unavailable, trying OpenAI fallback');
        }
      } catch (e) {
        console.log('Lovable AI failed, trying OpenAI fallback');
      }
    }

    // Fallback: call OpenAI directly
    if (!success) {
      const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
      if (!OPENAI_API_KEY) throw new Error('No AI provider available');

      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_completion_tokens: 500,
        }),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`OpenAI error ${resp.status}: ${txt}`);
      }

      const data = await resp.json();
      content = data.choices?.[0]?.message?.content || '[]';
    }

    console.log('AI content received:', content.substring(0, 300));
    
    // Parse JSON from AI response (handle potential markdown wrapping)
    let classes = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        classes = JSON.parse(jsonMatch[0]);
      } else {
        console.error('No JSON array found in AI response:', content);
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

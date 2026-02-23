import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const aiGatewayUrl = 'https://ai.gateway.lovable.dev';

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

    const response = await fetch(`${aiGatewayUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI Gateway error:', errText);
      throw new Error('Erro na consulta de IA');
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || '[]';
    
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  indeferimento: 'RECURSO CONTRA INDEFERIMENTO',
  exigencia_merito: 'CUMPRIMENTO DE EXIGÊNCIA DE MÉRITO / RECURSO ADMINISTRATIVO',
  oposicao: 'MANIFESTAÇÃO À OPOSIÇÃO'
};

function buildSystemPrompt(resourceTypeLabel: string, currentDate: string, agentStrategy?: string, agentName?: string): string {
  return `#instruction

Você é um ADVOGADO ESPECIALISTA EM PROPRIEDADE INDUSTRIAL de ELITE,
com décadas de atuação exclusiva em REGISTRO DE MARCAS NO INPI.
Seu papel é analisar documentos oficiais do INPI e elaborar
RECURSOS ADMINISTRATIVOS DE ALTÍSSIMO NÍVEL JURÍDICO,
equivalentes aos produzidos pelos melhores escritórios do Brasil
(Dannemann Siemsen, Guerra IP, David Do Nascimento).

Você NÃO é um assistente genérico. Você é um advogado real,
experiente, técnico, estratégico e extremamente criterioso.
Cada recurso que você elabora deve ser APTO PARA PROTOCOLO IMEDIATO NO INPI.

⚠️ REGRAS ABSOLUTAS E INVIOLÁVEIS:
- JAMAIS inventar fatos, decisões ou jurisprudência
- JAMAIS criar números de processos fictícios
- JAMAIS simplificar ou superficializar a argumentação
- JAMAIS produzir textos genéricos que poderiam servir para qualquer caso
- JAMAIS alterar dados extraídos do documento enviado
- Cada recurso DEVE ter no MÍNIMO 3.000 palavras de conteúdo substantivo
- A argumentação deve ser DENSA, PROFUNDA e ESPECÍFICA ao caso concreto
- NUNCA termine o recurso de forma abrupta ou incompleta

#especializacao_completa

Você domina INTEGRALMENTE e aplica com maestria:

LEGISLAÇÃO:
- Lei da Propriedade Industrial (Lei nº 9.279/96) — todos os artigos relevantes
- Convenção da União de Paris (CUP) — arts. 6bis, 6ter, 6quinquies
- Acordo TRIPS/OMC — arts. 15 a 21
- Protocolo de Madri (quando aplicável)

DOUTRINA (autores que DEVEM ser citados quando pertinente):
- Denis Borges Barbosa — "Uma Introdução à Propriedade Intelectual" e "Proteção das Marcas"
- J. da Gama Cerqueira — "Tratado da Propriedade Industrial" (obra clássica)
- Lélio Denicoli Schmidt — "Marcas em Semiótica"
- Carlos Alberto Bittar — "Teoria e Prática da Propriedade Industrial"
- Tinoco Soares — "Lei de Patentes, Marcas e Direitos Conexos"

NORMATIVA INPI:
- Manual de Marcas do INPI (Resolução INPI/PR nº 288/2023 e atualizações)
- Diretrizes de Análise de Marcas — Capítulos sobre confusão, coexistência, especialidade
- Classificação Internacional de Nice (12ª edição) — com detalhamento de cada classe e subclasse
- Tabela de Retribuições vigente do INPI

JURISPRUDÊNCIA REAL APLICÁVEL (cite SEMPRE as que forem pertinentes):

STJ — Precedentes fundamentais:
- REsp 1.188.105/RJ — coexistência de marcas em segmentos diversos (Rel. Min. Luis Felipe Salomão, 4ª Turma)
- REsp 1.315.621/SP — convivência marcária e princípio da especialidade (Rel. Min. Nancy Andrighi, 3ª Turma)
- REsp 862.117/RJ — segmento de mercado diverso como fator de convivência (Rel. Min. Ari Pargendler)
- REsp 1.166.498/RJ — distinção suficiente no conjunto marcário (Rel. Min. Nancy Andrighi)
- REsp 1.095.362/SP — convivência pacífica no mercado como prova (Rel. Min. Massami Uyeda)
- AgRg no REsp 1.346.089/RJ — impressão de conjunto vs. elementos isolados
- AgRg no REsp 1.255.654/RJ — coexistência e não-confusão
- REsp 1.032.014/RS — marca fraca e convivência (Rel. Min. Nancy Andrighi)
- REsp 949.514/RJ — princípio da especialidade (Rel. Min. Fernando Gonçalves)
- REsp 1.340.933/SP — notoriedade e diluição
- EREsp 1.403.979/PR — trade dress e concorrência desleal

TRF-2 (2ª Turma Especializada — principal tribunal de PI do Brasil):
- Apelação 0800858-92.2014.4.02.5101 — reforma de indeferimento por análise superficial
- Apelação 0004389-61.2009.4.02.5101 — coexistência de marcas semelhantes em classes distintas
- Apelação 0096695-18.2017.4.02.5101 — erro de análise comparativa do INPI
- Agravo 0501803-49.2019.4.02.5101 — falha na fundamentação do indeferimento

TRF-3:
- Apelação 5003471-64.2019.4.03.6100 — nulidade por falta de confusão efetiva
- Apelação 0013264-04.2011.4.03.6100 — princípio da especialidade aplicado

#tipo_recurso_atual
TIPO: ${resourceTypeLabel}

#estrutura_obrigatoria_detalhada

O recurso DEVE seguir RIGOROSAMENTE esta estrutura com PROFUNDIDADE em cada seção.
ATENÇÃO: O recurso COMPLETO deve ter NO MÍNIMO 3.000 palavras. Desenvolva CADA seção com profundidade.

═══════════════════════════════════════════════════════════
RECURSO ADMINISTRATIVO – ${resourceTypeLabel}
MARCA: [NOME DA MARCA EXTRAÍDO DO PDF]
═══════════════════════════════════════════════════════════

EXCELENTÍSSIMO SENHOR PRESIDENTE DA DIRETORIA DE MARCAS,
PATENTES E DESENHOS INDUSTRIAIS DO INSTITUTO NACIONAL
DA PROPRIEDADE INDUSTRIAL – INPI

Processo INPI nº: [número extraído]
Marca: [nome + natureza (nominativa/mista/figurativa)]
Classe NCL (12ª Ed.): [classe + especificação completa dos produtos/serviços]
Titular/Requerente: [nome completo]
Oponente: [quando identificável no documento]
Procurador: Davilys Danques de Oliveira Cunha – CPF 393.239.118-79

══════════════════════════════════════════════════════════

I – SÍNTESE DOS FATOS E DO HISTÓRICO PROCESSUAL
(Mínimo 400 palavras)
- Narrar cronologicamente TODO o histórico do processo
- Explicar detalhadamente o que ocorreu com base EXCLUSIVA no PDF
- Identificar o fundamento legal utilizado pelo INPI (artigo, inciso, alínea)
- Contextualizar a decisão dentro do panorama administrativo do INPI
- Demonstrar compreensão completa do caso concreto
- Transcrever trechos relevantes do despacho do INPI quando possível

II – DA TEMPESTIVIDADE E LEGITIMIDADE
(100-200 palavras)
- Demonstrar que o recurso é tempestivo (prazo de 60 dias - art. 212 LPI)
- Confirmar a legitimidade do recorrente
- Citar o art. 212 e parágrafos da Lei 9.279/96
- Mencionar o recolhimento da retribuição federal (GRU código 271)

III – FUNDAMENTAÇÃO JURÍDICA APROFUNDADA
(Mínimo 600 palavras)
- Analisar DETALHADAMENTE cada fundamento utilizado pelo INPI na decisão
- Demonstrar com precisão POR QUE a decisão está equivocada
- Citar TEXTUALMENTE os artigos da LPI aplicáveis (transcrever o dispositivo legal)
- Aplicar a doutrina de Denis Borges Barbosa, Gama Cerqueira e Tinoco Soares
- Demonstrar que a interpretação do INPI é restritiva ou equivocada
- Analisar CADA inciso do art. 124 que o INPI invocou e REFUTAR com argumentos sólidos
- Demonstrar como o Manual de Marcas do INPI fundamenta a tese do recurso
- Citar páginas e capítulos específicos do Manual de Marcas

IV – ANÁLISE TÉCNICA DO CONJUNTO MARCÁRIO
(Mínimo 500 palavras)
- Aplicar o critério de "IMPRESSÃO DE CONJUNTO" (não comparação elemento a elemento)
- Análise FONÉTICA detalhada: pronúncia, número de sílabas, sonoridade, acento tônico, cadência
- Análise VISUAL detalhada: grafismo, tipografia, elementos figurativos, cores, disposição espacial
- Análise IDEOLÓGICA/CONCEITUAL: significado semântico, campo conceitual, associação mental, evocação
- Análise de MERCADO: segmentos diferentes, canais de venda, público-alvo, faixa de preço
- Referenciar o Manual de Marcas do INPI sobre critérios de confusão (Capítulo 5, Seção 5.10 e seguintes)
- Aplicar a "Teoria da Distância" (Abstandslehre) conforme doutrina e jurisprudência
- Quando aplicável, análise de TRADE DRESS (art. 124, XIX da LPI)
- Tabela comparativa: coluna 1 = marca do requerente, coluna 2 = marca citada, demonstrando diferenças

V – DA INEXISTÊNCIA DE CONFUSÃO OU ASSOCIAÇÃO INDEVIDA
(Mínimo 400 palavras)
- Demonstrar TECNICAMENTE que não há risco de confusão para o consumidor
- Aplicar a "Teoria da Distância" — demonstrar que a distância entre as marcas é suficiente
- Demonstrar a diferenciação do público consumidor (consumidor médio vs. especializado)
- Citar exemplos concretos de convivência no mercado (se aplicável)
- Demonstrar que o consumidor do segmento é capaz de distinguir as marcas
- Aplicar o "teste do consumidor distraído" conforme a jurisprudência do STJ
- Analisar a força distintiva dos elementos em cotejo (elemento fraco vs. elemento dominante)
- Demonstrar que elementos comuns são de uso corrente/genérico e não geram exclusividade

VI – DOS PRECEDENTES E JURISPRUDÊNCIA APLICÁVEL
(Mínimo 500 palavras)
- Citar no MÍNIMO 6 precedentes jurisprudenciais REAIS e PERTINENTES
- Cada precedente deve ter: número completo, tribunal, turma, relator, e trecho da EMENTA
- Explicar POR QUE cada precedente se aplica ao caso concreto
- Demonstrar que existe TENDÊNCIA JURISPRUDENCIAL favorável à tese
- Citar decisões do próprio INPI que sejam favoráveis (precedentes administrativos)
- Organizar precedentes por TESE: separar por argumento (especialidade, conjunto marcário, convivência)
- Citar decisões recentes (2020-2025) para demonstrar atualidade da tese

VII – DA CONCLUSÃO E DEMONSTRAÇÃO DE REGISTRABILIDADE
(Mínimo 300 palavras)
- Sintetizar TODOS os argumentos apresentados de forma coesa
- Demonstrar de forma objetiva e conclusiva a registrabilidade da marca
- Reforçar que o indeferimento/exigência é injusto e contrário à lei e jurisprudência
- Demonstrar o prejuízo causado ao titular pelo indeferimento
- Invocar os princípios da razoabilidade e proporcionalidade
- Mencionar o direito fundamental à livre iniciativa (art. 170, CF/88)

VIII – DOS PEDIDOS
(200-300 palavras — pedidos ESPECÍFICOS e juridicamente adequados)

Ante o exposto, requer:

a) Seja CONHECIDO o presente recurso administrativo, por tempestivo e regular;
b) No mérito, seja PROVIDO o recurso, para REFORMAR integralmente a decisão recorrida;
c) Seja DEFERIDO o registro da marca [NOME] na classe NCL [XX], conforme especificação originalmente requerida;
d) Subsidiariamente, caso assim não se entenda, seja a marca deferida com limitação de especificação a: [especificação limitada quando aplicável];
e) Ainda subsidiariamente, seja determinada a CONVERSÃO DO JULGAMENTO EM DILIGÊNCIA para melhor instrução do feito;
f) Seja determinada a publicação do deferimento na Revista da Propriedade Industrial (RPI);

Protesta provar o alegado por todos os meios de prova em direito admitidos.

#encerramento_obrigatorio

Nestes termos,
Pede e espera deferimento.

São Paulo, ${currentDate}.

_______________________________________
Davilys Danques de Oliveira Cunha
Procurador(a) Constituído(a)
CPF: 393.239.118-79

${agentStrategy ? `#estrategia_especifica_do_agente

IMPORTANTE: Aplique a estratégia abaixo como CAMADA ADICIONAL sobre a estrutura obrigatória.
A estratégia do agente deve ENRIQUECER e APROFUNDAR o recurso, não substituir seções.
Use esta estratégia para dar um TOM e ABORDAGEM específicos a cada seção.

${agentStrategy}` : ''}

${agentName ? `#agente_responsavel: ${agentName}` : ''}

#padrao_qualidade_elite

EXIGÊNCIAS MÍNIMAS DE QUALIDADE — VERIFICAÇÃO OBRIGATÓRIA:
1. O recurso completo deve ter NO MÍNIMO 3.000 palavras — NÃO ENCURTE
2. Cada seção deve ter a extensão mínima especificada — RESPEITE os mínimos
3. A argumentação deve ser ESPECÍFICA ao caso concreto — NUNCA genérica
4. Toda jurisprudência citada deve ser REAL e verificável
5. Toda legislação deve ser citada com artigo, inciso e alínea exatos
6. O texto deve ter qualidade equivalente aos melhores escritórios de PI do Brasil
7. A linguagem deve ser jurídica profissional formal, sem simplificações
8. CADA argumento deve ser desenvolvido em no mínimo 2-3 parágrafos densos
9. O recurso NÃO pode terminar abruptamente — deve ter TODAS as 8 seções completas
10. Cite ao menos 6 precedentes jurisprudenciais reais com ementas

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON):
{
  "extracted_data": {
    "process_number": "número do processo",
    "brand_name": "nome da marca",
    "ncl_class": "classe NCL com descrição completa dos produtos/serviços",
    "holder": "nome do titular completo",
    "examiner_or_opponent": "oponente (não incluir nome do examinador)",
    "legal_basis": "fundamento legal completo utilizado pelo INPI (artigo, inciso, alínea)"
  },
  "resource_content": "CONTEÚDO COMPLETO DO RECURSO COM TODAS AS 8 SEÇÕES DESENVOLVIDAS (texto extenso, profundo e formatado)"
}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { fileBase64, fileType, resourceType, agentStrategy, agentName } = await req.json();

    if (!fileBase64 || !fileType || !resourceType) {
      return new Response(
        JSON.stringify({ error: 'Parâmetros obrigatórios ausentes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resourceTypeLabel = RESOURCE_TYPE_LABELS[resourceType] || 'RECURSO ADMINISTRATIVO';

    const currentDate = new Date().toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const systemPrompt = buildSystemPrompt(resourceTypeLabel, currentDate, agentStrategy, agentName);

    const userContent: any[] = [
      {
        type: "text",
        text: "Analise o documento PDF anexado do INPI e elabore o recurso administrativo COMPLETO, EXTENSO e ROBUSTO conforme as instruções. O recurso deve ter no MÍNIMO 3.000 palavras, seguindo rigorosamente TODAS as 8 seções obrigatórias com a extensão mínima especificada para cada uma. NÃO simplifique, NÃO encurte, NÃO produza texto genérico. Cada argumento deve ser desenvolvido em múltiplos parágrafos com profundidade jurídica real."
      }
    ];

    if (fileType === 'application/pdf') {
      userContent.push({
        type: "file",
        file: {
          filename: "documento_inpi.pdf",
          file_data: `data:application/pdf;base64,${fileBase64}`
        }
      });
    } else {
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:${fileType};base64,${fileBase64}`
        }
      });
    }

    console.log('Calling AI with elite legal prompt, agent:', agentName || 'default');

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        max_tokens: 16000,
        temperature: 0.25,
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
        JSON.stringify({ error: 'Erro ao processar documento com IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Resposta vazia da IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI response received, length:', content.length, 'chars');

    let parsedResult;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                       content.match(/```\s*([\s\S]*?)\s*```/) ||
                       [null, content];
      const jsonStr = jsonMatch[1] || content;
      parsedResult = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.log('Could not parse JSON, using raw content');
      parsedResult = {
        extracted_data: {
          process_number: '',
          brand_name: '',
          ncl_class: '',
          holder: '',
          examiner_or_opponent: '',
          legal_basis: ''
        },
        resource_content: content
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        extracted_data: parsedResult.extracted_data || {},
        resource_content: parsedResult.resource_content || content,
        resource_type: resourceType,
        resource_type_label: resourceTypeLabel
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing INPI resource:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

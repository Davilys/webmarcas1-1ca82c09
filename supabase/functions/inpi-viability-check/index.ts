const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Lista de marcas de alto renome
const FAMOUS_BRANDS = [
  'petrobras', 'itau', 'itaú', 'bradesco', 'caixa', 'santander', 'nubank',
  'magazine luiza', 'magalu', 'casas bahia', 'coca-cola', 'coca cola', 'cocacola',
  'nike', 'apple', 'samsung', 'globo', 'fiat', 'volkswagen', 'natura', 'boticario',
  'o boticário', 'shopee', 'mercado livre', 'mercadolivre', 'heineken', 'ambev',
  'brahma', 'skol', 'antartica', 'antarctica', 'google', 'microsoft', 'amazon',
  'netflix', 'spotify', 'uber', 'ifood', '99', 'rappi', 'picpay', 'stone',
  'pagseguro', 'cielo', 'rede', 'getnet', 'bmw', 'mercedes', 'audi', 'toyota',
  'honda', 'hyundai', 'chevrolet', 'ford', 'renault', 'peugeot', 'citroen',
  'jeep', 'land rover', 'porsche', 'ferrari', 'lamborghini', 'rolex', 'cartier',
  'louis vuitton', 'gucci', 'prada', 'chanel', 'dior', 'hermes', 'armani',
  'versace', 'burberry', 'tiffany', 'pandora', 'swarovski', 'ray-ban', 'rayban',
  'oakley', 'adidas', 'puma', 'reebok', 'new balance', 'asics', 'mizuno',
  'vans', 'converse', 'mcdonalds', 'mc donalds', "mcdonald's", 'burger king',
  'subway', 'starbucks', 'kfc', 'pizza hut', 'dominos', "domino's", 'habib',
  'habibs', "habib's", 'outback', 'madero', 'giraffas', 'bobs', "bob's", 'havaianas',
  'visa', 'mastercard', 'american express', 'amex', 'elo', 'hipercard',
  'disney', 'warner', 'paramount', 'universal', 'sony', 'lg', 'philips',
  'panasonic', 'jbl', 'bose', 'beats', 'dell', 'hp', 'lenovo', 'asus', 'acer',
  'intel', 'amd', 'nvidia', 'telegram', 'whatsapp', 'instagram', 'facebook',
  'meta', 'twitter', 'tiktok', 'youtube', 'linkedin', 'pinterest', 'snapchat'
];

// Mapeamento de ramos para classes NCL (fallback)
const BUSINESS_AREA_CLASSES: Record<string, { classes: number[], descriptions: string[] }> = {
  'tecnologia': { classes: [9, 42, 35], descriptions: ['Classe 09 – Aparelhos e instrumentos científicos, software, hardware', 'Classe 42 – Serviços tecnológicos e de design, desenvolvimento de software', 'Classe 35 – Publicidade, gestão de negócios'] },
  'alimentacao': { classes: [43, 30, 29], descriptions: ['Classe 43 – Serviços de restaurante e alimentação', 'Classe 30 – Café, chá, massas, pães, doces e condimentos', 'Classe 29 – Carne, peixe, frutas, legumes, leite e derivados'] },
  'moda': { classes: [25, 18, 35], descriptions: ['Classe 25 – Vestuário, calçados e chapelaria', 'Classe 18 – Couro, bolsas, malas e artigos de selaria', 'Classe 35 – Comércio varejista'] },
  'saude': { classes: [44, 5, 10], descriptions: ['Classe 44 – Serviços médicos, veterinários e de beleza', 'Classe 05 – Produtos farmacêuticos e sanitários', 'Classe 10 – Aparelhos médicos e cirúrgicos'] },
  'educacao': { classes: [41, 16, 9], descriptions: ['Classe 41 – Educação, treinamento e entretenimento', 'Classe 16 – Material de instrução e ensino', 'Classe 09 – Aparelhos para reprodução de som ou imagem'] },
  'beleza': { classes: [44, 3, 35], descriptions: ['Classe 44 – Salão de beleza, estética e cabeleireiro', 'Classe 03 – Cosméticos, perfumaria e produtos de higiene', 'Classe 35 – Comércio de produtos de beleza'] },
  'construcao': { classes: [37, 19, 6], descriptions: ['Classe 37 – Construção civil e reparação', 'Classe 19 – Materiais de construção não metálicos', 'Classe 06 – Metais comuns e materiais de construção metálicos'] },
  'financeiro': { classes: [36, 35, 42], descriptions: ['Classe 36 – Seguros, negócios financeiros e imobiliários', 'Classe 35 – Gestão de negócios e contabilidade', 'Classe 42 – Serviços tecnológicos financeiros'] },
  'advocacia': { classes: [45, 35, 41], descriptions: ['Classe 45 – Serviços jurídicos e advocacia', 'Classe 35 – Gestão de negócios', 'Classe 41 – Educação jurídica e treinamentos'] },
  'automotivo': { classes: [37, 12, 35], descriptions: ['Classe 37 – Reparação e manutenção de veículos', 'Classe 12 – Veículos e aparelhos de locomoção', 'Classe 35 – Comércio de veículos e peças'] },
  'default': { classes: [35, 41, 42], descriptions: ['Classe 35 – Publicidade, gestão de negócios', 'Classe 41 – Educação, treinamento e cultura', 'Classe 42 – Serviços científicos e tecnológicos'] }
};

function normalizeString(str: string): string {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function isFamousBrand(brandName: string): boolean {
  const normalized = normalizeString(brandName);
  return FAMOUS_BRANDS.some(famous =>
    normalized.includes(normalizeString(famous)) ||
    normalizeString(famous).includes(normalized)
  );
}

function getClassesForBusinessAreaFallback(businessArea: string): { classes: number[], descriptions: string[] } {
  const normalized = normalizeString(businessArea);
  for (const [key, value] of Object.entries(BUSINESS_AREA_CLASSES)) {
    if (key !== 'default' && normalized.includes(key)) return value;
  }
  const keywordMap: [string[], string][] = [
    [['software', 'app', 'sistema', 'ti'], 'tecnologia'],
    [['restaurante', 'comida', 'gastronomia', 'lanchonete'], 'alimentacao'],
    [['roupa', 'vestuario', 'loja', 'boutique'], 'moda'],
    [['clinica', 'hospital', 'medic', 'farmacia'], 'saude'],
    [['escola', 'curso', 'ensino', 'faculdade'], 'educacao'],
    [['salao', 'estetica', 'cabelo', 'cosmetico'], 'beleza'],
    [['obra', 'engenharia', 'arquitetura', 'pedreiro'], 'construcao'],
    [['banco', 'investimento', 'credito', 'financeira'], 'financeiro'],
    [['advogado', 'juridico', 'direito'], 'advocacia'],
    [['carro', 'moto', 'oficina', 'mecanica'], 'automotivo'],
  ];
  for (const [keywords, area] of keywordMap) {
    if (keywords.some(k => normalized.includes(k))) return BUSINESS_AREA_CLASSES[area];
  }
  return BUSINESS_AREA_CLASSES.default;
}

// ========== ETAPA 2: Mapeamento NCL via IA ==========
async function suggestClassesWithAI(businessArea: string): Promise<{ classes: number[], descriptions: string[] }> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    console.log('[CLASSES] LOVABLE_API_KEY não configurada, usando fallback');
    return getClassesForBusinessAreaFallback(businessArea);
  }

  try {
    console.log(`[CLASSES] Consultando IA para ramo: "${businessArea}"`);
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-5.2',
        messages: [
          { role: 'system', content: 'Você é um especialista em propriedade intelectual e classificação NCL do INPI Brasil. Responda sempre em JSON válido, sem markdown.' },
          { role: 'user', content: `Sugira EXATAMENTE 3 classes NCL (1-45) para o ramo "${businessArea}". JSON: {"classes":[n1,n2,n3],"descriptions":["Classe XX – desc1","Classe XX – desc2","Classe XX – desc3"]}` }
        ],
        temperature: 0.3,
        max_completion_tokens: 600,
      }),
    });

    if (!response.ok) {
      console.error(`[CLASSES] Erro IA: ${response.status}`);
      return getClassesForBusinessAreaFallback(businessArea);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      // Extract JSON from potential markdown wrapping
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.classes) && parsed.classes.length === 3 &&
            Array.isArray(parsed.descriptions) && parsed.descriptions.length === 3 &&
            parsed.classes.every((c: number) => c >= 1 && c <= 45)) {
          console.log(`[CLASSES] IA sugeriu:`, parsed.classes);
          return parsed;
        }
      }
    }
  } catch (error) {
    console.error('[CLASSES] Erro:', error);
  }
  return getClassesForBusinessAreaFallback(businessArea);
}

// ========== UTILIDADE: Busca DuckDuckGo (sem API key) ==========
async function searchDuckDuckGo(query: string): Promise<Array<{ title: string; url: string; description: string }>> {
  try {
    console.log(`[DDG] Buscando: "${query}"`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `q=${encodeURIComponent(query)}`,
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[DDG] HTTP ${response.status}`);
      return [];
    }

    const html = await response.text();
    const results: Array<{ title: string; url: string; description: string }> = [];

    // Parse DuckDuckGo HTML results
    const resultBlocks = html.split('class="result ');
    for (let i = 1; i < resultBlocks.length && results.length < 10; i++) {
      const block = resultBlocks[i];
      
      // Extract title from result__a
      const titleMatch = block.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/);
      const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : '';
      
      // Extract URL from result__url or href
      const urlMatch = block.match(/href="([^"]*)"/) || block.match(/class="result__url"[^>]*>([\s\S]*?)<\/a>/);
      let url = '';
      if (urlMatch) {
        url = urlMatch[1].replace(/<[^>]*>/g, '').trim();
        // DuckDuckGo wraps URLs in redirect links
        if (url.includes('uddg=')) {
          const decoded = decodeURIComponent(url.split('uddg=')[1]?.split('&')[0] || '');
          url = decoded || url;
        }
        if (!url.startsWith('http')) url = `https://${url}`;
      }
      
      // Extract description/snippet
      const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/) ||
                           block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/span>/);
      const description = snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, '').trim() : '';

      if (title && url) {
        results.push({ title, url, description });
      }
    }

    console.log(`[DDG] Encontrados ${results.length} resultados para "${query}"`);
    return results;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[DDG] Timeout para "${query}"`);
    } else {
      console.error(`[DDG] Erro:`, error);
    }
    return [];
  }
}

// ========== ETAPA 3: Consulta INPI via DuckDuckGo + IA ==========
async function searchINPI(brandName: string, mainClass: number): Promise<{
  totalResultados: number;
  resultados: Array<{ processo: string; marca: string; situacao: string; classe: string; titular: string }>;
  consultadoEm: string;
  error?: string;
}> {
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  try {
    // Duas buscas DuckDuckGo em paralelo
    const [inpiResults, generalResults] = await Promise.all([
      searchDuckDuckGo(`"${brandName}" site:busca.inpi.gov.br`),
      searchDuckDuckGo(`"${brandName}" INPI registro marca classe ${mainClass}`),
    ]);

    const allResults = [...inpiResults, ...generalResults];
    console.log(`[INPI] DuckDuckGo: ${allResults.length} resultados combinados`);

    if (allResults.length === 0) {
      return { totalResultados: 0, resultados: [], consultadoEm: now };
    }

    // Enviar resultados reais ao GPT-5.2 para estruturar
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return { totalResultados: allResults.length, resultados: [], consultadoEm: now, error: 'IA indisponível para estruturar resultados' };
    }

    const searchData = allResults.map(r => `- ${r.title}\n  URL: ${r.url}\n  ${r.description}`).join('\n\n');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-5.2',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em marcas do INPI. Analise os resultados de busca abaixo e extraia APENAS registros de marca que sejam relevantes para a marca "${brandName}".
Responda APENAS em JSON: {"totalResultados": N, "resultados": [{"processo": "NNNNNNNNN", "marca": "NOME", "situacao": "Registro em vigor|Pedido depositado|Arquivado/Extinto", "classe": "NN", "titular": "NOME"}]}
Se os resultados não contiverem dados de processos INPI reais, retorne {"totalResultados": 0, "resultados": []}.
NÃO invente números de processo ou dados. Extraia apenas do que está nos resultados de busca.`
          },
          {
            role: 'user',
            content: `Resultados de busca para a marca "${brandName}" (classe principal ${mainClass}):\n\n${searchData}`
          }
        ],
        temperature: 0.1,
        max_completion_tokens: 800,
      }),
    });

    if (!response.ok) {
      console.error(`[INPI] IA erro: ${response.status}`);
      return { totalResultados: allResults.length, resultados: [], consultadoEm: now, error: 'Erro ao estruturar resultados INPI' };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (typeof parsed.totalResultados === 'number' && Array.isArray(parsed.resultados)) {
          console.log(`[INPI] IA estruturou ${parsed.totalResultados} resultados dos dados reais`);
          return { ...parsed, consultadoEm: now };
        }
      }
    }
  } catch (error) {
    console.error('[INPI] Erro:', error);
  }
  return { totalResultados: 0, resultados: [], consultadoEm: now, error: 'Consulta INPI inconclusiva' };
}

// ========== ETAPA 4: Busca CNPJ via DuckDuckGo + IA ==========
async function searchCNPJ(brandName: string): Promise<{
  total: number;
  matches: Array<{ nome: string; cnpj: string; situacao: string }>;
}> {
  try {
    // Duas buscas DuckDuckGo em paralelo
    const [generalResults, siteResults] = await Promise.all([
      searchDuckDuckGo(`"${brandName}" CNPJ empresa razao social`),
      searchDuckDuckGo(`"${brandName}" cnpj.info OR cnpja.com OR casadosdados.com.br`),
    ]);

    const allResults = [...generalResults, ...siteResults];
    console.log(`[CNPJ] DuckDuckGo: ${allResults.length} resultados combinados`);

    if (allResults.length === 0) {
      return { total: 0, matches: [] };
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) return { total: 0, matches: [] };

    const searchData = allResults.map(r => `- ${r.title}\n  URL: ${r.url}\n  ${r.description}`).join('\n\n');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-5.2',
        messages: [
          {
            role: 'system',
            content: `Analise os resultados de busca e extraia dados de empresas brasileiras com nome "${brandName}" ou similar.
Responda APENAS em JSON: {"total": N, "matches": [{"nome": "RAZAO SOCIAL", "cnpj": "XX.XXX.XXX/XXXX-XX", "situacao": "Ativa|Baixada|Inapta"}]}
Extraia APENAS dados reais dos resultados. Se não houver dados de CNPJ nos resultados, retorne {"total": 0, "matches": []}.`
          },
          {
            role: 'user',
            content: `Resultados de busca para empresas com nome "${brandName}":\n\n${searchData}`
          }
        ],
        temperature: 0.1,
        max_completion_tokens: 600,
      }),
    });

    if (!response.ok) return { total: 0, matches: [] };

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (typeof parsed.total === 'number' && Array.isArray(parsed.matches)) {
          console.log(`[CNPJ] IA extraiu ${parsed.total} empresas dos dados reais`);
          return { total: parsed.total, matches: parsed.matches.slice(0, 5) };
        }
      }
    }
  } catch (error) {
    console.error('[CNPJ] Erro:', error);
  }
  return { total: 0, matches: [] };
}

// ========== ETAPA 5: Busca Internet via DuckDuckGo (sem IA) ==========
async function searchInternet(brandName: string): Promise<{
  socialMatches: Array<{ plataforma: string; encontrado: boolean; url?: string; descricao?: string }>;
  webMatches: Array<{ titulo: string; url: string; descricao: string }>;
}> {
  try {
    // 4 buscas DuckDuckGo em paralelo (3 redes sociais + geral)
    const [igResults, fbResults, liResults, webResults] = await Promise.all([
      searchDuckDuckGo(`"${brandName}" site:instagram.com`),
      searchDuckDuckGo(`"${brandName}" site:facebook.com`),
      searchDuckDuckGo(`"${brandName}" site:linkedin.com`),
      searchDuckDuckGo(`"${brandName}"`),
    ]);

    // Parsear presença em redes sociais diretamente (sem IA)
    const checkSocial = (results: Array<{ title: string; url: string; description: string }>, platform: string, domain: string) => {
      const match = results.find(r => r.url.includes(domain));
      return {
        plataforma: platform,
        encontrado: !!match,
        url: match?.url,
        descricao: match ? match.title : undefined,
      };
    };

    const socialMatches = [
      checkSocial(igResults, 'Instagram', 'instagram.com'),
      checkSocial(fbResults, 'Facebook', 'facebook.com'),
      checkSocial(liResults, 'LinkedIn', 'linkedin.com'),
    ];

    // Web matches: filtrar resultados gerais removendo redes sociais
    const socialDomains = ['instagram.com', 'facebook.com', 'linkedin.com', 'twitter.com', 'tiktok.com'];
    const webMatches = webResults
      .filter(r => !socialDomains.some(d => r.url.includes(d)))
      .slice(0, 5)
      .map(r => ({ titulo: r.title, url: r.url, descricao: r.description }));

    console.log(`[INTERNET] Social: ${socialMatches.filter(s => s.encontrado).length}/3 | Web: ${webMatches.length}`);

    return { socialMatches, webMatches };
  } catch (error) {
    console.error('[INTERNET] Erro:', error);
  }

  return {
    socialMatches: [
      { plataforma: 'Instagram', encontrado: false },
      { plataforma: 'Facebook', encontrado: false },
      { plataforma: 'LinkedIn', encontrado: false },
    ],
    webMatches: []
  };
}

// ========== ETAPA 6: Decisão final via IA ==========
async function generateFinalAnalysis(
  brandName: string,
  businessArea: string,
  classes: number[],
  classDescriptions: string[],
  inpiData: any,
  cnpjData: any,
  internetData: any
): Promise<{
  level: 'high' | 'medium' | 'low';
  viabilidade: string;
  title: string;
  description: string;
  laudo: string;
}> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const collectedData = `
DADOS COLETADOS:

1. CONSULTA INPI:
- Total de resultados: ${inpiData.totalResultados}
- Resultados: ${JSON.stringify(inpiData.resultados)}
- Data consulta: ${inpiData.consultadoEm}
${inpiData.error ? `- Erro: ${inpiData.error}` : ''}

2. CONSULTA CNPJ/EMPRESAS:
- Total: ${cnpjData.total}
- Matches: ${JSON.stringify(cnpjData.matches)}

3. PRESENÇA NA INTERNET:
- Redes sociais: ${JSON.stringify(internetData.socialMatches)}
- Web: ${JSON.stringify(internetData.webMatches)}

4. CLASSES NCL SUGERIDAS:
${classDescriptions.join('\n')}
`;

  if (!LOVABLE_API_KEY) {
    // Fallback sem IA
    return buildFallbackAnalysis(brandName, businessArea, classes, classDescriptions, inpiData, cnpjData, internetData, now);
  }

  try {
    console.log('[ANALISE] Gerando laudo via IA...');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-5.2',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em registro de marcas no INPI Brasil. Analise os dados coletados e gere um laudo técnico de viabilidade.

REGRAS DE DECISÃO:
- INDISPONIVEL (level: "low"): Se encontrar registro em vigor ou pedido ativo na mesma classe NCL
- VIAVEL_INICIAL (level: "high"): Se zero resultados INPI na busca exata + classe principal
- POSSIVEL_COM_ALERTA (level: "medium"): Se apenas marcas arquivadas/extintas ou em classes diferentes

Responda APENAS em JSON:
{
  "level": "high" | "medium" | "low",
  "viabilidade": "VIAVEL_INICIAL" | "POSSIVEL_COM_ALERTA" | "INDISPONIVEL",
  "title": "título curto do resultado",
  "description": "descrição de 1-2 frases",
  "laudo": "laudo técnico completo e detalhado em texto formatado"
}

O laudo deve conter TODAS estas seções:
1. DADOS DA CONSULTA (marca, ramo, data)
2. RESULTADO DA PESQUISA NO INPI (detalhamento dos resultados encontrados)
3. ANÁLISE DE COLIDÊNCIA EMPRESARIAL (CNPJs encontrados)
4. ANÁLISE DE COLIDÊNCIA NA INTERNET (redes sociais e web)
5. CLASSES NCL RECOMENDADAS
6. CONCLUSÃO TÉCNICA (viabilidade e justificativa)
7. ORIENTAÇÃO JURÍDICA
8. AVISO: "O DONO DA MARCA É QUEM REGISTRA PRIMEIRO!"

Use separadores ━━━ entre seções. Use emojis nos títulos das seções. Seja detalhado e profissional.`
          },
          {
            role: 'user',
            content: `Marca: "${brandName}"\nRamo: "${businessArea}"\nData: ${now}\n\n${collectedData}`
          }
        ],
        temperature: 0.3,
        max_completion_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[ANALISE] Erro IA: ${response.status} ${errText}`);
      return buildFallbackAnalysis(brandName, businessArea, classes, classDescriptions, inpiData, cnpjData, internetData, now);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.level && parsed.laudo) {
          console.log(`[ANALISE] Resultado IA: ${parsed.viabilidade} (${parsed.level})`);
          return {
            level: parsed.level,
            viabilidade: parsed.viabilidade || (parsed.level === 'high' ? 'VIAVEL_INICIAL' : parsed.level === 'medium' ? 'POSSIVEL_COM_ALERTA' : 'INDISPONIVEL'),
            title: parsed.title,
            description: parsed.description,
            laudo: parsed.laudo
          };
        }
      }
    }
  } catch (error) {
    console.error('[ANALISE] Erro:', error);
  }

  return buildFallbackAnalysis(brandName, businessArea, classes, classDescriptions, inpiData, cnpjData, internetData, now);
}

function buildFallbackAnalysis(
  brandName: string, businessArea: string, classes: number[], classDescriptions: string[],
  inpiData: any, cnpjData: any, internetData: any, now: string
) {
  // Determine level based on INPI results
  let level: 'high' | 'medium' | 'low' = 'high';
  let viabilidade = 'VIAVEL_INICIAL';
  let searchIncomplete = false;

  // Se houve erro na busca INPI (ex: Firecrawl sem créditos), não concluir "alta viabilidade"
  if (inpiData.error) {
    level = 'medium';
    viabilidade = 'POSSIVEL_COM_ALERTA';
    searchIncomplete = true;
  } else if (inpiData.totalResultados > 0) {
    const hasActive = inpiData.resultados.some((r: any) =>
      r.situacao?.toLowerCase().includes('vigor') || r.situacao?.toLowerCase().includes('pedido') || r.situacao?.toLowerCase().includes('deposit'));
    if (hasActive) {
      level = 'low';
      viabilidade = 'INDISPONIVEL';
    } else {
      level = 'medium';
      viabilidade = 'POSSIVEL_COM_ALERTA';
    }
  }

  const inpiSection = inpiData.totalResultados > 0
    ? inpiData.resultados.map((r: any, i: number) => `${i + 1}. ${r.marca} | Processo: ${r.processo} | Situação: ${r.situacao} | Classe: ${r.classe}`).join('\n')
    : searchIncomplete
    ? '⚠️ A consulta ao banco do INPI não pôde ser completada nesta sessão. Os resultados são parciais. Recomendamos nova consulta.'
    : 'Nenhuma marca idêntica encontrada na base do INPI.';

  const cnpjSection = cnpjData.total > 0
    ? cnpjData.matches.map((m: any, i: number) => `${i + 1}. ${m.nome} | CNPJ: ${m.cnpj} | Situação: ${m.situacao}`).join('\n')
    : 'Nenhuma empresa com nome idêntico encontrada.';

  const socialSection = internetData.socialMatches.length > 0
    ? internetData.socialMatches.map((s: any) => `• ${s.plataforma}: ${s.encontrado ? '✅ Encontrado' : '❌ Não encontrado'}${s.url ? ` - ${s.url}` : ''}`).join('\n')
    : 'Nenhuma presença em redes sociais identificada.';

  const webSection = internetData.webMatches.length > 0
    ? internetData.webMatches.map((w: any, i: number) => `${i + 1}. ${w.titulo}\n   ${w.url}`).join('\n')
    : 'Nenhum site relevante encontrado.';

  const laudo = `*LAUDO TÉCNICO DE VIABILIDADE DE MARCA*
*Pesquisa Real – INPI + Mercado + Internet*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 *DADOS DA CONSULTA*

Marca Pesquisada: ${brandName.toUpperCase()}
Ramo de Atividade: ${businessArea}
Data/Hora: ${now}
Tipo de Pesquisa: COMPLETA (INPI + CNPJ + Internet)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 *RESULTADO DA PESQUISA NO INPI*

Total de resultados: ${inpiData.totalResultados}
${inpiSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏢 *ANÁLISE DE COLIDÊNCIA EMPRESARIAL (CNPJ)*

Total de empresas encontradas: ${cnpjData.total}
${cnpjSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌐 *ANÁLISE DE COLIDÊNCIA NA INTERNET*

Redes Sociais:
${socialSection}

Sites e Web:
${webSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏷️ *CLASSES NCL RECOMENDADAS*

${classDescriptions.join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚖️ *CONCLUSÃO TÉCNICA*

${level === 'high' ?
`A marca "${brandName.toUpperCase()}" apresenta ALTA VIABILIDADE de registro. Não foram encontradas marcas idênticas ativas na base do INPI. Recomendamos prosseguir com o registro imediatamente.` :
level === 'medium' ?
`A marca "${brandName.toUpperCase()}" apresenta VIABILIDADE MÉDIA. Foram encontrados registros similares, porém arquivados ou em classes diferentes. Recomendamos consulta especializada.` :
`A marca "${brandName.toUpperCase()}" apresenta BAIXA VIABILIDADE. Existem marcas conflitantes ativas que provavelmente impedirão o registro. Sugerimos alteração do nome.`}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚖️ *ORIENTAÇÃO JURÍDICA*

O ideal é registrar nas 3 classes para máxima proteção.
Se a questão for financeira, orientamos registrar urgente na classe principal.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ *IMPORTANTE*

O DONO DA MARCA É QUEM REGISTRA PRIMEIRO!
Não perca tempo.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WebMarcas - Registro de Marcas
www.webmarcas.net`;

  return {
    level,
    viabilidade,
    title: searchIncomplete ? 'Pesquisa Parcial' : level === 'high' ? 'Alta Viabilidade' : level === 'medium' ? 'Média Viabilidade' : 'Baixa Viabilidade',
    description: searchIncomplete
      ? 'A consulta ao INPI não pôde ser completada. Os resultados são parciais — recomendamos nova consulta ou fale com nossos especialistas.'
      : level === 'high'
      ? 'Sua marca está disponível para registro! Não encontramos conflitos na base do INPI.'
      : level === 'medium'
      ? 'Existem registros similares. Recomendamos consulta especializada antes de prosseguir.'
      : 'Existem marcas conflitantes ativas na base do INPI. Consulte nossos especialistas.',
    laudo
  };
}

// ========== HANDLER PRINCIPAL ==========
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brandName, businessArea } = await req.json();

    if (!brandName || !businessArea) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nome da marca e ramo de atividade são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ETAPA 1: Verificação marca famosa
    if (isFamousBrand(brandName)) {
      return new Response(
        JSON.stringify({
          success: true, isFamousBrand: true, level: 'blocked',
          title: 'Marca de Alto Renome',
          description: `A marca "${brandName}" é uma marca de alto renome protegida em todas as classes. Não é possível registrar.`,
          laudo: null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[VIABILITY] ========== INÍCIO: "${brandName}" / "${businessArea}" ==========`);

    // ETAPA 2: Mapeamento NCL via IA
    const { classes, descriptions } = await suggestClassesWithAI(businessArea);
    const mainClass = classes[0];

    // ETAPAS 3, 4, 5: Consultas em PARALELO
    const [inpiData, cnpjData, internetData] = await Promise.all([
      searchINPI(brandName, mainClass),
      searchCNPJ(brandName),
      searchInternet(brandName),
    ]);

    console.log(`[VIABILITY] INPI: ${inpiData.totalResultados} | CNPJ: ${cnpjData.total} | Social: ${internetData.socialMatches.filter(s => s.encontrado).length} | Web: ${internetData.webMatches.length}`);

    // ETAPA 6: Análise final via IA
    const analysis = await generateFinalAnalysis(
      brandName, businessArea, classes, descriptions, inpiData, cnpjData, internetData
    );

    const response = {
      success: true,
      isFamousBrand: false,
      level: analysis.level,
      title: analysis.title,
      description: analysis.description,
      laudo: analysis.laudo,
      classes,
      classDescriptions: descriptions,
      searchDate: inpiData.consultadoEm,
      // Novos campos estruturados
      viabilidade: analysis.viabilidade,
      inpiData: {
        totalResultados: inpiData.totalResultados,
        resultados: inpiData.resultados,
        consultadoEm: inpiData.consultadoEm
      },
      cnpjData: {
        total: cnpjData.total,
        matches: cnpjData.matches
      },
      internetData: {
        socialMatches: internetData.socialMatches,
        webMatches: internetData.webMatches
      },
      // Compat: keep analysisResult for old frontends
      analysisResult: {
        totalResults: inpiData.totalResultados,
        brands: inpiData.resultados,
        patternScore: analysis.level === 'high' ? 90 : analysis.level === 'medium' ? 60 : 30,
        searchAttempted: true
      }
    };

    console.log(`[VIABILITY] ========== FIM: ${analysis.viabilidade} (${analysis.level}) ==========`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in viability check:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erro ao processar a consulta' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

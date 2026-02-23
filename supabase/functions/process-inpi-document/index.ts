const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapeamento de ramos para classes NCL
const BUSINESS_AREA_CLASSES: Record<string, { classes: number[], descriptions: string[] }> = {
  'tecnologia': {
    classes: [9, 42, 35],
    descriptions: [
      'Classe 09 – Aparelhos e instrumentos científicos, software, hardware e equipamentos eletrônicos',
      'Classe 42 – Serviços científicos, tecnológicos e de design, desenvolvimento de software',
      'Classe 35 – Publicidade, gestão de negócios, administração comercial'
    ]
  },
  'alimentacao': {
    classes: [43, 30, 29],
    descriptions: [
      'Classe 43 – Serviços de restaurante, alimentação e hospedagem',
      'Classe 30 – Café, chá, cacau, açúcar, arroz, massas, pães, doces e condimentos',
      'Classe 29 – Carne, peixe, aves, caça, frutas, legumes, ovos, leite e derivados'
    ]
  },
  'moda': {
    classes: [25, 18, 35],
    descriptions: [
      'Classe 25 – Vestuário, calçados e chapelaria',
      'Classe 18 – Couro, bolsas, malas, guarda-chuvas e artigos de selaria',
      'Classe 35 – Publicidade, gestão de negócios, comércio varejista'
    ]
  },
  'saude': {
    classes: [44, 5, 10],
    descriptions: [
      'Classe 44 – Serviços médicos, veterinários, higiênicos e de beleza',
      'Classe 05 – Produtos farmacêuticos, veterinários e sanitários',
      'Classe 10 – Aparelhos e instrumentos médicos, cirúrgicos e odontológicos'
    ]
  },
  'educacao': {
    classes: [41, 16, 9],
    descriptions: [
      'Classe 41 – Educação, treinamento, entretenimento e atividades desportivas e culturais',
      'Classe 16 – Papel, produtos de papelaria, material de instrução e ensino',
      'Classe 09 – Aparelhos para gravação, transmissão ou reprodução de som ou imagem'
    ]
  },
  'beleza': {
    classes: [44, 3, 35],
    descriptions: [
      'Classe 44 – Serviços de salão de beleza, estética e cabeleireiro',
      'Classe 03 – Cosméticos, perfumaria, óleos essenciais e produtos de higiene',
      'Classe 35 – Publicidade e comércio de produtos de beleza'
    ]
  },
  'construcao': {
    classes: [37, 19, 6],
    descriptions: [
      'Classe 37 – Construção civil, reparação e serviços de instalação',
      'Classe 19 – Materiais de construção não metálicos (cimento, tijolo, vidro)',
      'Classe 06 – Metais comuns e suas ligas, materiais de construção metálicos'
    ]
  },
  'financeiro': {
    classes: [36, 35, 42],
    descriptions: [
      'Classe 36 – Seguros, negócios financeiros, imobiliários e bancários',
      'Classe 35 – Gestão de negócios, administração comercial e contabilidade',
      'Classe 42 – Serviços científicos e tecnológicos relacionados a finanças'
    ]
  },
  'advocacia': {
    classes: [45, 35, 41],
    descriptions: [
      'Classe 45 – Serviços jurídicos, advocacia e consultoria legal',
      'Classe 35 – Gestão de negócios e administração de escritórios',
      'Classe 41 – Educação jurídica, palestras e treinamentos'
    ]
  },
  'automotivo': {
    classes: [37, 12, 35],
    descriptions: [
      'Classe 37 – Reparação e manutenção de veículos',
      'Classe 12 – Veículos, aparelhos de locomoção por terra, ar ou água',
      'Classe 35 – Comércio de veículos e peças automotivas'
    ]
  },
  'default': {
    classes: [35, 41, 42],
    descriptions: [
      'Classe 35 – Publicidade, gestão de negócios e administração comercial',
      'Classe 41 – Educação, treinamento, entretenimento e cultura',
      'Classe 42 – Serviços científicos, tecnológicos e de pesquisa'
    ]
  }
};

function normalizeString(str: string): string {
  return str.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function getClassesForBusinessArea(businessArea: string): { classes: number[], descriptions: string[] } {
  const normalized = normalizeString(businessArea);
  
  for (const [key, value] of Object.entries(BUSINESS_AREA_CLASSES)) {
    if (key !== 'default' && normalized.includes(key)) {
      return value;
    }
  }
  
  // Keywords matching
  if (normalized.includes('software') || normalized.includes('app') || normalized.includes('sistema') || normalized.includes('ti')) {
    return BUSINESS_AREA_CLASSES.tecnologia;
  }
  if (normalized.includes('restaurante') || normalized.includes('comida') || normalized.includes('gastronomia') || normalized.includes('lanchonete')) {
    return BUSINESS_AREA_CLASSES.alimentacao;
  }
  if (normalized.includes('roupa') || normalized.includes('vestuario') || normalized.includes('loja') || normalized.includes('boutique')) {
    return BUSINESS_AREA_CLASSES.moda;
  }
  if (normalized.includes('clinica') || normalized.includes('hospital') || normalized.includes('medic') || normalized.includes('farmacia')) {
    return BUSINESS_AREA_CLASSES.saude;
  }
  if (normalized.includes('escola') || normalized.includes('curso') || normalized.includes('ensino') || normalized.includes('faculdade')) {
    return BUSINESS_AREA_CLASSES.educacao;
  }
  if (normalized.includes('salao') || normalized.includes('estetica') || normalized.includes('cabelo') || normalized.includes('cosmetico')) {
    return BUSINESS_AREA_CLASSES.beleza;
  }
  if (normalized.includes('obra') || normalized.includes('engenharia') || normalized.includes('arquitetura') || normalized.includes('pedreiro')) {
    return BUSINESS_AREA_CLASSES.construcao;
  }
  if (normalized.includes('banco') || normalized.includes('investimento') || normalized.includes('credito') || normalized.includes('financeira')) {
    return BUSINESS_AREA_CLASSES.financeiro;
  }
  if (normalized.includes('advogado') || normalized.includes('juridico') || normalized.includes('direito') || normalized.includes('escritorio')) {
    return BUSINESS_AREA_CLASSES.advocacia;
  }
  if (normalized.includes('carro') || normalized.includes('moto') || normalized.includes('oficina') || normalized.includes('mecanica')) {
    return BUSINESS_AREA_CLASSES.automotivo;
  }
  
  return BUSINESS_AREA_CLASSES.default;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brandName, businessArea, fileBase64, fileType, fileName } = await req.json();

    if (!brandName || !businessArea || !fileBase64) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Nome da marca, ramo de atividade e arquivo são obrigatórios' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'API key não configurada' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare image content for vision model
    const isImage = fileType.startsWith('image/');
    const isPDF = fileType === 'application/pdf';

    // Generate current date/time in Brazil timezone
    const now = new Date();
    const brazilTime = now.toLocaleString('pt-BR', { 
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Use AI with vision to analyze the document
    let extractedData = {
      foundBrands: false,
      brandsList: [] as string[],
      noResults: false,
      searchDate: brazilTime,
      rawText: ''
    };

    try {
      // Build the message with image for vision model
      const messages = [
        {
          role: 'system',
          content: `Você é um especialista em análise de documentos do INPI (Instituto Nacional da Propriedade Industrial) do Brasil.
          
Analise o documento/imagem enviado que contém o resultado de uma pesquisa de marca no INPI.

Extraia as seguintes informações:
1. Se foram encontradas marcas na pesquisa (olhe para "Número de resultados" ou lista de marcas)
2. A lista de marcas encontradas (se houver)
3. Se o resultado mostra "Nenhum resultado encontrado" ou similar
4. A data/hora da pesquisa se visível

Responda APENAS com um JSON no formato:
{
  "foundBrands": true/false,
  "brandsList": ["marca1", "marca2"],
  "noResults": true/false,
  "extractedText": "texto relevante extraído do documento"
}

Se for PDF, analise o texto. Se for imagem, faça OCR e analise.`
        },
        {
          role: 'user',
          content: isImage ? [
            {
              type: 'text',
              text: `Analise este resultado de pesquisa do INPI para a marca "${brandName}".`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${fileType};base64,${fileBase64}`
              }
            }
          ] : `Analise o seguinte documento PDF (base64) para a marca "${brandName}": ${fileBase64.substring(0, 5000)}...`
        }
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5.1-mini',
          messages,
          max_tokens: 1000
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        
        console.log('AI Response:', content);
        
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            extractedData = {
              ...extractedData,
              foundBrands: parsed.foundBrands || false,
              brandsList: parsed.brandsList || [],
              noResults: parsed.noResults || false,
              rawText: parsed.extractedText || ''
            };
          }
        } catch (parseError) {
          console.error('Error parsing AI response:', parseError);
        }
      }
    } catch (error) {
      console.error('AI analysis error:', error);
    }

    // Determine viability level based on extracted data
    let viabilityLevel: 'high' | 'medium' | 'low' = 'high';
    
    if (extractedData.foundBrands && extractedData.brandsList.length > 0) {
      // Check if any found brand is exactly the same
      const normalizedBrand = normalizeString(brandName);
      const hasExactMatch = extractedData.brandsList.some(
        b => normalizeString(b) === normalizedBrand
      );
      
      if (hasExactMatch) {
        viabilityLevel = 'low';
      } else {
        viabilityLevel = 'medium';
      }
    } else if (extractedData.noResults) {
      viabilityLevel = 'high';
    }

    // Get classes for the business area
    const { classes, descriptions } = getClassesForBusinessArea(businessArea);
    const classesText = descriptions.join('\n');

    // Build the official laudo
    const laudo = `*LAUDO TÉCNICO DE VIABILIDADE DE MARCA*
*Baseado em Documento Oficial do INPI*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 *DADOS DA CONSULTA*

Marca Pesquisada: ${brandName.toUpperCase()}
Ramo de Atividade: ${businessArea}
Documento Anexado: ${fileName}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 *RESULTADO DA PESQUISA NO INPI*

Data da Análise: ${brazilTime}

${viabilityLevel === 'high' ? 
`✅ NENHUM RESULTADO CONFLITANTE ENCONTRADO

A pesquisa oficial no INPI não retornou marcas idênticas registradas.
Sua marca "${brandName.toUpperCase()}" apresenta ALTA viabilidade de registro.` : 

viabilityLevel === 'medium' ?
`⚠️ MARCAS SIMILARES ENCONTRADAS

Foram identificadas as seguintes marcas no INPI:
${extractedData.brandsList.map(b => `• ${b}`).join('\n') || '• Marcas similares detectadas'}

Recomendamos análise mais detalhada por um especialista antes de prosseguir.` :

`❌ MARCA CONFLITANTE ENCONTRADA

Foi identificada marca idêntica ou muito similar registrada:
${extractedData.brandsList.map(b => `• ${b}`).join('\n') || '• Marca idêntica detectada'}

Existe alto risco de indeferimento do pedido de registro.`}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚖️ *CONCLUSÃO TÉCNICA*

${viabilityLevel === 'high' ? 
'A marca apresenta ALTA VIABILIDADE de registro. Não foram encontradas marcas idênticas nas bases do INPI que possam impedir o registro.' :
viabilityLevel === 'medium' ?
'A marca apresenta VIABILIDADE MÉDIA. Existem marcas similares que podem gerar oposição ou exigência. Recomendamos consultar um especialista.' :
'A marca apresenta BAIXA VIABILIDADE. Existem marcas conflitantes que provavelmente impedirão o registro. Sugerimos alteração do nome ou consulta especializada.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏷️ *CLASSES RECOMENDADAS PARA REGISTRO*

${classesText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚖️ *ORIENTAÇÃO JURÍDICA*

O ideal é registrar nas 3 classes para máxima proteção da marca.
Se a questão for financeira, orientamos registrar urgente na classe principal.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 *OBSERVAÇÃO IMPORTANTE*

✅ Pesquisa realizada com base em documento oficial do INPI anexado pelo cliente.
✅ Este laudo tem caráter técnico-informativo.
✅ O DONO DA MARCA É QUEM REGISTRA PRIMEIRO!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WebMarcas - Registro de Marcas
www.webmarcas.net`;

    return new Response(
      JSON.stringify({
        success: true,
        isOfficialDocument: true,
        level: viabilityLevel,
        title: viabilityLevel === 'high' ? 'Alta Viabilidade' : 
               viabilityLevel === 'medium' ? 'Média Viabilidade' : 'Baixa Viabilidade',
        description: viabilityLevel === 'high' 
          ? 'Sua marca está disponível para registro! Não encontramos conflitos no documento oficial do INPI.'
          : viabilityLevel === 'medium'
          ? 'Encontramos algumas marcas similares no documento. Recomendamos análise por especialista.'
          : 'Existem marcas conflitantes no documento oficial. Consulte nossos especialistas.',
        laudo,
        classes,
        classDescriptions: descriptions,
        searchDate: brazilTime,
        extractedData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing document:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro ao processar o documento' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

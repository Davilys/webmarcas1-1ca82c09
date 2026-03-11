import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  indeferimento: 'RECURSO CONTRA INDEFERIMENTO',
  exigencia_merito: 'CUMPRIMENTO DE EXIGÊNCIA DE MÉRITO / RECURSO ADMINISTRATIVO',
  oposicao: 'MANIFESTAÇÃO À OPOSIÇÃO',
  notificacao_extrajudicial: 'NOTIFICAÇÃO EXTRAJUDICIAL',
  troca_procurador: 'PETIÇÃO DE TROCA DE PROCURADOR',
  nomeacao_procurador: 'PETIÇÃO DE NOMEAÇÃO DE PROCURADOR'
};

function buildNotificacaoPrompt(
  currentDate: string,
  notificanteData: any,
  notificadoData: any,
  userInstructions: string,
  agentStrategy?: string,
  agentName?: string
): string {
  return `#instruction

Você é um ADVOGADO ESPECIALISTA EM PROPRIEDADE INDUSTRIAL de ELITE,
com décadas de atuação em DEFESA DE MARCAS E NOTIFICAÇÕES EXTRAJUDICIAIS.
Seu papel é elaborar uma NOTIFICAÇÃO EXTRAJUDICIAL COMPLETA, ROBUSTA E JURIDICAMENTE VIÁVEL
para cessar o uso indevido de marca registrada.

IMPORTANTE: Este documento NÃO é um recurso administrativo no INPI.
É uma NOTIFICAÇÃO EXTRAJUDICIAL dirigida diretamente ao INFRATOR (Notificado).
NÃO inclua "Pede deferimento", "Termos em que", nem referências ao INPI como destinatário.

⚠️ REGRAS ABSOLUTAS E INVIOLÁVEIS:
- JAMAIS inventar fatos, decisões ou jurisprudência
- JAMAIS criar números de processos fictícios  
- JAMAIS simplificar ou superficializar a argumentação
- O documento DEVE ter no MÍNIMO 2.000 palavras de conteúdo substantivo
- A argumentação deve ser DENSA, PROFUNDA e ESPECÍFICA ao caso concreto
- NUNCA termine o documento de forma abrupta ou incompleta

#dados_das_partes

NOTIFICANTE (Titular da Marca):
- Nome/Razão Social: ${notificanteData.nome || 'Não informado'}
- CPF/CNPJ: ${notificanteData.cpf_cnpj || 'Não informado'}
- Endereço: ${notificanteData.endereco || 'Não informado'}
- Marca: ${notificanteData.marca || 'Não informada'}
- Processo INPI nº: ${notificanteData.processo_inpi || 'Não informado'}
- Registro da Marca nº: ${notificanteData.registro_marca || 'Não informado'}

NOTIFICADO (Infrator):
- Nome/Razão Social: ${notificadoData.nome || 'Não informado'}
- CPF/CNPJ: ${notificadoData.cpf_cnpj || 'Não informado'}
- Endereço: ${notificadoData.endereco || 'Não informado'}

#instrucoes_do_usuario
${userInstructions || 'O usuário não forneceu instruções adicionais. Elabore a notificação com base nos dados fornecidos.'}

#identidade_institucional

O documento deve ser elaborado em nome da WEBMARCAS INTELLIGENCE PI™:
- CNPJ: 39.528.012/0001-29
- Endereço: Av. Brigadeiro Luiz Antônio, 2696, Centro — São Paulo/SP — CEP 01402-000
- Telefone: (11) 9 1112-0225
- E-mail: juridico@webmarcas.net
- Site: www.webmarcas.net

O ENCERRAMENTO deve conter APENAS:
- Data: São Paulo, ${currentDate}
- Assinatura: Davilys Danques de Oliveira Cunha
- Qualificação: Procurador
- SEM CPF (não incluir CPF na assinatura)
- SEM "Pede deferimento"
- SEM "Termos em que"

#estrutura_obrigatoria

═══════════════════════════════════════════════════════════
NOTIFICAÇÃO EXTRAJUDICIAL
═══════════════════════════════════════════════════════════

I – IDENTIFICAÇÃO DAS PARTES
(Dados completos do Notificante e do Notificado conforme fornecidos)

II – DOS FATOS
(Mínimo 500 palavras)
- Narrativa detalhada e cronológica do uso indevido da marca
- Baseado nas instruções do usuário e documentos anexados
- Descrever como, onde, de que forma a marca está sendo usada indevidamente
- Demonstrar o conhecimento prévio do registro da marca pelo notificante
- Detalhar os produtos/serviços em que a marca está sendo usada indevidamente

III – DO DIREITO
(Mínimo 600 palavras)
- Lei da Propriedade Industrial (Lei nº 9.279/96):
  * Art. 129 — direitos de propriedade da marca registrada
  * Art. 130 — proteções conferidas ao titular
  * Art. 189 — crime de violação de direito de marca
  * Art. 190 — crime de uso indevido de marca alheia
- Código Civil (Lei nº 10.406/2002):
  * Art. 186 — ato ilícito (violação de direito de marca = ato ilícito)
  * Art. 927 — obrigação de reparar dano causado por ato ilícito
  * Art. 944 — extensão da indenização pela extensão do dano
- Constituição Federal:
  * Art. 5º, XXIX — proteção à propriedade das marcas
- Jurisprudência relevante do STJ e TRFs sobre uso indevido de marca

IV – DA NOTIFICAÇÃO E INTIMAÇÃO
(Mínimo 300 palavras)
- INTIMAR o Notificado a:
  a) CESSAR IMEDIATAMENTE todo e qualquer uso da marca
  b) RETIRAR de circulação todos os materiais (físicos e digitais) que contenham a marca
  c) REMOVER das redes sociais, sites, plataformas digitais qualquer referência à marca
  d) ABSTER-SE de utilizar a marca em qualquer meio
- Prazo de 30 (trinta) dias corridos para cumprimento integral
- A presente notificação serve como marco de ciência inequívoca da irregularidade

V – DAS CONSEQUÊNCIAS DO DESCUMPRIMENTO
(Mínimo 300 palavras)
- Medidas judiciais cabíveis caso não haja cumprimento:
  a) Ação de abstenção de uso com tutela de urgência
  b) Busca e apreensão de materiais que contenham a marca
  c) Ação indenizatória por danos materiais e morais
  d) Representação criminal com base nos arts. 189 e 190 da LPI
  e) Multa diária (astreintes) por descumprimento
- Responsabilização integral pelos custos processuais e honorários advocatícios
- Constituição em mora do Notificado a partir do recebimento desta notificação

VI – DO ENCERRAMENTO
- A presente notificação constitui prova inequívoca de ciência
- Data e local
- Assinatura: Davilys Danques de Oliveira Cunha, Procurador (SEM CPF)

${agentStrategy ? `#estrategia_especifica_do_agente

IMPORTANTE: Aplique a estratégia abaixo como CAMADA ADICIONAL sobre a estrutura obrigatória.
A estratégia do agente deve ENRIQUECER e APROFUNDAR a notificação.

${agentStrategy}` : ''}

${agentName ? `#agente_responsavel: ${agentName}` : ''}

#padrao_qualidade

EXIGÊNCIAS MÍNIMAS:
1. O documento completo deve ter NO MÍNIMO 2.000 palavras
2. Toda jurisprudência citada deve ser REAL e verificável
3. Toda legislação deve ser citada com artigo, inciso e alínea exatos
4. O texto deve ter qualidade equivalente aos melhores escritórios de PI
5. A linguagem deve ser jurídica profissional formal
6. O documento NÃO pode terminar abruptamente
7. NÃO incluir "Pede deferimento" nem "Termos em que" no encerramento
8. O encerramento deve ter APENAS: data, nome "Davilys Danques de Oliveira Cunha" e "Procurador"

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON):
{
  "extracted_data": {
    "process_number": "${notificanteData.processo_inpi || ''}",
    "brand_name": "${notificanteData.marca || ''}",
    "ncl_class": "",
    "holder": "${notificanteData.nome || ''}",
    "examiner_or_opponent": "${notificadoData.nome || ''}",
    "legal_basis": "Arts. 129, 130, 189 e 190 da Lei 9.279/96; Arts. 186, 927 e 944 do CC; Art. 5º, XXIX da CF/88"
  },
  "resource_content": "CONTEÚDO COMPLETO DA NOTIFICAÇÃO EXTRAJUDICIAL COM TODAS AS SEÇÕES (texto extenso, profundo e formatado)"
}`;
}

function buildProcuradorPrompt(
  currentDate: string,
  procuradorData: any,
  resourceType: string,
  agentStrategy?: string,
  agentName?: string
): string {
  const isTroca = resourceType === 'troca_procurador';
  const tipoLabel = isTroca ? 'TROCA DE PROCURADOR' : 'NOMEAÇÃO DE PROCURADOR';
  
  return `#instruction

Você é um ADVOGADO ESPECIALISTA EM PROPRIEDADE INDUSTRIAL de ELITE,
com décadas de atuação em REGISTRO DE MARCAS NO INPI.
Seu papel é elaborar uma PETIÇÃO DE ${tipoLabel} COMPLETA, ROBUSTA E JURIDICAMENTE VIÁVEL
para ser protocolada junto ao INPI.

⚠️ REGRAS ABSOLUTAS E INVIOLÁVEIS:
- JAMAIS inventar fatos, decisões ou jurisprudência
- JAMAIS criar números de processos fictícios
- O documento DEVE ter no MÍNIMO 1.500 palavras de conteúdo substantivo
- A argumentação deve ser DENSA, PROFUNDA e ESPECÍFICA ao caso concreto
- NUNCA termine o documento de forma abrupta ou incompleta

#dados_do_processo

TITULAR/CONSTITUINTE:
- Nome/Razão Social: ${procuradorData.titular || 'Não informado'}
- CPF/CNPJ: ${procuradorData.cpf_cnpj_titular || 'Não informado'}
- Marca: ${procuradorData.marca || 'Não informada'}
- Processo INPI nº: ${procuradorData.processo_inpi || 'Não informado'}
- Classe NCL: ${procuradorData.ncl_class || 'Não informada'}

${isTroca ? `PROCURADOR ANTERIOR (A SER REVOGADO):
- Nome: ${procuradorData.procurador_antigo || 'Não informado'}
- CPF: ${procuradorData.cpf_procurador_antigo || 'Não informado'}
` : ''}
NOVO PROCURADOR (A SER NOMEADO):
- Nome: Davilys Danques de Oliveira Cunha
- CPF: 393.239.118-79
- RG: 50.688.779-0
- Nacionalidade: Brasileiro, casado
- Endereço: Av. Brigadeiro Luís Antônio, Nº 2696 - Centro, São Paulo/SP - CEP 01402-000

#motivo_e_instrucoes
${procuradorData.motivo || 'O usuário não forneceu instruções adicionais.'}

#identidade_institucional

O documento deve ser elaborado em nome da WEBMARCAS INTELLIGENCE PI™:
- CNPJ: 39.528.012/0001-29
- Endereço: Av. Brigadeiro Luiz Antônio, 2696, Centro — São Paulo/SP — CEP 01402-000
- Telefone: (11) 9 1112-0225
- E-mail: juridico@webmarcas.net
- Site: www.webmarcas.net

#estrutura_obrigatoria

═══════════════════════════════════════════════════════════
PETIÇÃO DE ${tipoLabel}
═══════════════════════════════════════════════════════════

EXCELENTÍSSIMO SENHOR PRESIDENTE DA DIRETORIA DE MARCAS,
PATENTES E DESENHOS INDUSTRIAIS DO INSTITUTO NACIONAL
DA PROPRIEDADE INDUSTRIAL – INPI

Processo INPI nº: [número do processo]
Marca: [nome da marca]
Classe NCL: [classe]

I – QUALIFICAÇÃO DAS PARTES
(Dados completos do Titular/Constituinte)

II – DO OBJETO DA PETIÇÃO
(Mínimo 300 palavras)
${isTroca 
  ? `- Declarar a REVOGAÇÃO dos poderes outorgados ao procurador anterior
- Informar os dados completos do procurador revogado
- Declarar a NOMEAÇÃO e CONSTITUIÇÃO do novo procurador
- Informar os dados completos do novo procurador
- Fundamentar na Lei 9.279/96 (LPI), arts. 216 e 217
- Mencionar a Resolução INPI/PR pertinente sobre representação`
  : `- Declarar a NOMEAÇÃO e CONSTITUIÇÃO de procurador
- Informar os dados completos do procurador nomeado
- Fundamentar na Lei 9.279/96 (LPI), arts. 216 e 217
- Mencionar a Resolução INPI/PR pertinente sobre representação`
}

III – DA FUNDAMENTAÇÃO LEGAL
(Mínimo 400 palavras)
- Art. 216 da LPI — representação por procurador
- Art. 217 da LPI — requisitos da procuração
- Instrução Normativa INPI pertinente
- Manual de Marcas do INPI — seção sobre representação
- Código Civil — arts. 653 a 692 (mandato)
${isTroca ? '- Art. 682 do CC — extinção do mandato por revogação' : ''}

IV – DA OUTORGA DE PODERES
(Mínimo 300 palavras)
- Poderes específicos para representar o titular perante o INPI
- Poderes para protocolar petições, acompanhar processos, receber notificações
- Poderes para interpor recursos administrativos
- Poderes para praticar todos os atos necessários à defesa dos interesses do titular
- Cláusula de substabelecimento (com ou sem reserva de poderes)

V – DOS PEDIDOS
- Seja recebida e processada a presente petição
${isTroca 
  ? `- Seja averbada a REVOGAÇÃO dos poderes do procurador anterior
- Seja averbada a NOMEAÇÃO do novo procurador
- Que todas as futuras comunicações e intimações sejam dirigidas ao novo procurador`
  : `- Seja averbada a NOMEAÇÃO do procurador constituído
- Que todas as futuras comunicações e intimações sejam dirigidas ao procurador nomeado`
}

#encerramento_obrigatorio

Nestes termos,
Pede e espera deferimento.

São Paulo, ${currentDate}.

_______________________________________
${procuradorData.titular || '[NOME DO TITULAR]'}
Titular/Constituinte
${procuradorData.cpf_cnpj_titular ? `CPF/CNPJ: ${procuradorData.cpf_cnpj_titular}` : ''}

${agentStrategy ? `#estrategia_especifica_do_agente

IMPORTANTE: Aplique a estratégia abaixo como CAMADA ADICIONAL sobre a estrutura obrigatória.

${agentStrategy}` : ''}

${agentName ? `#agente_responsavel: ${agentName}` : ''}

#padrao_qualidade

EXIGÊNCIAS MÍNIMAS:
1. O documento completo deve ter NO MÍNIMO 1.500 palavras
2. Toda legislação deve ser citada com artigo, inciso e alínea exatos
3. O texto deve ter qualidade equivalente aos melhores escritórios de PI
4. A linguagem deve ser jurídica profissional formal
5. O documento NÃO pode terminar abruptamente

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON):
{
  "extracted_data": {
    "process_number": "${procuradorData.processo_inpi || ''}",
    "brand_name": "${procuradorData.marca || ''}",
    "ncl_class": "${procuradorData.ncl_class || ''}",
    "holder": "${procuradorData.titular || ''}",
    "examiner_or_opponent": "Davilys Danques de Oliveira Cunha",
    "legal_basis": "Arts. 216 e 217 da Lei 9.279/96; Arts. 653 a 692 do CC"
  },
  "resource_content": "CONTEÚDO COMPLETO DA PETIÇÃO COM TODAS AS SEÇÕES (texto extenso, profundo e formatado)"
}`;
}

function buildSystemPrompt(
  resourceTypeLabel: string,
  currentDate: string,
  agentStrategy?: string,
  agentName?: string
): string {
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

    const body = await req.json();
    const { resourceType, agentStrategy, agentName } = body;

    if (!resourceType) {
      return new Response(
        JSON.stringify({ error: 'Tipo de recurso não informado' }),
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

    const currentDate = new Date().toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    let systemPrompt: string;
    const userContent: any[] = [];

    if (resourceType === 'notificacao_extrajudicial') {
      // Notificação Extrajudicial flow
      const { notificanteData, notificadoData, userInstructions, files } = body;

      systemPrompt = buildNotificacaoPrompt(
        currentDate,
        notificanteData || {},
        notificadoData || {},
        userInstructions || '',
        agentStrategy,
        agentName
      );

      let textInstruction = "Elabore a NOTIFICAÇÃO EXTRAJUDICIAL COMPLETA, EXTENSA e JURIDICAMENTE ROBUSTA conforme as instruções. O documento deve ter no MÍNIMO 2.000 palavras, seguindo rigorosamente TODAS as seções obrigatórias. NÃO simplifique, NÃO encurte. Cada argumento deve ser desenvolvido com profundidade jurídica real.";

      if (files && files.length > 0) {
        textInstruction += `\n\nO usuário anexou ${files.length} documento(s) de prova. Analise-os para enriquecer a narrativa dos fatos.`;
      }

      userContent.push({ type: "text", text: textInstruction });

      // Add attached files
      if (files && Array.isArray(files)) {
        for (const file of files) {
          if (file.type === 'application/pdf') {
            userContent.push({
              type: "file",
              file: {
                filename: file.name || "documento.pdf",
                file_data: `data:application/pdf;base64,${file.base64}`
              }
            });
          } else if (file.type?.startsWith('image/')) {
            userContent.push({
              type: "image_url",
              image_url: {
                url: `data:${file.type};base64,${file.base64}`
              }
            });
          }
        }
      }
    } else if (resourceType === 'troca_procurador' || resourceType === 'nomeacao_procurador') {
      // Procurador flow
      const { procuradorData, files } = body;

      systemPrompt = buildProcuradorPrompt(
        currentDate,
        procuradorData || {},
        resourceType,
        agentStrategy,
        agentName
      );

      const tipoLabel = resourceType === 'troca_procurador' ? 'TROCA DE PROCURADOR' : 'NOMEAÇÃO DE PROCURADOR';
      let textInstruction = `Elabore a PETIÇÃO DE ${tipoLabel} COMPLETA e JURIDICAMENTE ROBUSTA conforme as instruções. O documento deve ter no MÍNIMO 1.500 palavras, seguindo rigorosamente TODAS as seções obrigatórias. NÃO simplifique, NÃO encurte.`;

      if (files && files.length > 0) {
        textInstruction += `\n\nO usuário anexou ${files.length} documento(s). Analise-os para enriquecer a petição.`;
      }

      userContent.push({ type: "text", text: textInstruction });

      if (files && Array.isArray(files)) {
        for (const file of files) {
          if (file.type === 'application/pdf') {
            userContent.push({
              type: "file",
              file: {
                filename: file.name || "documento.pdf",
                file_data: `data:application/pdf;base64,${file.base64}`
              }
            });
          } else if (file.type?.startsWith('image/')) {
            userContent.push({
              type: "image_url",
              image_url: {
                url: `data:${file.type};base64,${file.base64}`
              }
            });
          }
        }
      }
    } else {
      // Standard INPI resource flow
      const { fileBase64, fileType } = body;

      if (!fileBase64 || !fileType) {
        return new Response(
          JSON.stringify({ error: 'Parâmetros obrigatórios ausentes (fileBase64, fileType)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const resourceTypeLabel = RESOURCE_TYPE_LABELS[resourceType] || 'RECURSO ADMINISTRATIVO';
      systemPrompt = buildSystemPrompt(resourceTypeLabel, currentDate, agentStrategy, agentName);

      userContent.push({
        type: "text",
        text: "Analise o documento PDF anexado do INPI e elabore o recurso administrativo COMPLETO, EXTENSO e ROBUSTO conforme as instruções. O recurso deve ter no MÍNIMO 3.000 palavras, seguindo rigorosamente TODAS as 8 seções obrigatórias com a extensão mínima especificada para cada uma. NÃO simplifique, NÃO encurte, NÃO produza texto genérico. Cada argumento deve ser desenvolvido em múltiplos parágrafos com profundidade jurídica real."
      });

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
    }

    console.log('Calling AI with prompt for:', resourceType, ', agent:', agentName || 'default');

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

    const resourceTypeLabel = RESOURCE_TYPE_LABELS[resourceType] || 'RECURSO ADMINISTRATIVO';

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

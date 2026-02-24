import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type DocumentType = 'contract' | 'procuracao' | 'distrato_multa' | 'distrato_sem_multa';

interface ContractTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[];
  is_active: boolean;
}

interface UseContractTemplateResult {
  template: ContractTemplate | null;
  isLoading: boolean;
  error: string | null;
  documentType: DocumentType;
  refetch: () => Promise<void>;
}

/**
 * Detects document type from template name
 */
export function getDocumentTypeFromTemplateName(templateName: string): DocumentType {
  const lowerName = templateName.toLowerCase();
  
  if (lowerName.includes('procura')) {
    return 'procuracao';
  }
  if (lowerName.includes('distrato') && lowerName.includes('multa')) {
    return 'distrato_multa';
  }
  if (lowerName.includes('distrato')) {
    return 'distrato_sem_multa';
  }
  return 'contract';
}

// Full default contract template with all 12 clauses
const DEFAULT_CONTRACT_TEMPLATE = `CONTRATO PARTICULAR DE PRESTAÇÃO DE SERVIÇOS DE ASSESSORAMENTO PARA REGISTRO DE MARCA JUNTO AO INPI

Por este instrumento particular de prestação de serviços, que fazem, de um lado:

I) WebMarcas Intelligence PI, com sede na cidade de SÃO PAULO, Estado de SP, na AVENIDA BRIGADEIRO LUIS ANTONIO, Nº: 2696, CEP: 01402-000, inscrita no CNPJ/MF sob o Nº: 39.528.012/0001-29, neste ato representada por seu titular, senhor Davilys Danques de Oliveira Cunha, brasileiro, casado, regularmente inscrito no RG sob o Nº 50.688.779-0 e CPF sob o Nº 393.239.118-79, a seguir denominada CONTRATADA.

II) {{razao_social_ou_nome}}, {{dados_cnpj}}com sede na {{endereco_completo}}, neste ato representada por {{nome_cliente}}, CPF sob o nº {{cpf}}, com endereço de e-mail para faturamento {{email}} e Tel: {{telefone}}, ("Contratante").

As partes celebram o presente Acordo de Tarifas, que se regerá pelas cláusulas e condições abaixo:

1. CLÁUSULA PRIMEIRA – DO OBJETO

1.1 A CONTRATADA prestará os serviços de preparo, protocolo e acompanhamento do pedido de registro da marca "{{marca}}" junto ao INPI até a conclusão do processo, no ramo de atividade: {{ramo_atividade}}.

2. CLÁUSULA SEGUNDA – DA RESPONSABILIDADE SOBRE OS SERVIÇOS CONTRATADOS

2.1 Executar os serviços com responsabilidade e qualidade;
2.2 Fornecer cópia digital dos atos praticados junto ao INPI;
2.3 Comunicar à CONTRATANTE eventuais impedimentos ou exigências;
2.4 Acompanhar semanalmente o processo no INPI e informar colidências, exigências ou publicações;
2.5 Garantir o investimento da CONTRATANTE com nova tentativa sem custos adicionais de honorários caso o registro seja negado.

3. CLÁUSULA TERCEIRA - DAS OBRIGAÇÕES GERAIS DA CONTRATADA

3.1 Enviar cópias digitais por e-mail e relatório anual do processo;
3.2 Executar os serviços conforme o contrato e a legislação;
3.3 Cumprir prazos e exigências do INPI;
3.4 Comunicar impedimentos imediatamente, a fim de cumprir as normas do INPI para garantir o registro.

4. CLÁUSULA QUARTA – DAS OBRIGAÇÕES GERAIS DA CONTRATANTE

4.1 A CONTRATANTE obriga-se a efetuar os pagamentos na forma, prazos e condições estabelecidas neste instrumento.
4.2 A CONTRATANTE compromete-se a fornecer à CONTRATADA todas as informações, documentos e materiais solicitados, de forma completa e dentro dos prazos estipulados.
4.3 A CONTRATANTE poderá solicitar ajustes ou correções nos serviços prestados somente quando houver divergência comprovada com o objeto deste contrato.
4.4 A CONTRATANTE reconhece que a CONTRATADA atua como assessoria técnica e jurídica especializada, sendo que a decisão final sobre a concessão do registro de marca cabe exclusivamente ao INPI.

5. CLÁUSULA QUINTA – DAS CONDIÇÕES DE PAGAMENTO

5.1 Os pagamentos à CONTRATADA serão efetuados conforme a opção escolhida:
{{forma_pagamento_detalhada}}
5.2 Taxas do INPI: As taxas federais obrigatórias (GRU) serão de responsabilidade exclusiva do CONTRATANTE, devendo ser recolhidas diretamente ao INPI.
5.3 O cadastro do CONTRATANTE junto ao INPI é realizado pela CONTRATADA previamente ao pagamento das taxas federais.
5.4 Em caso de parcelamento, o atraso de qualquer parcela implicará no vencimento antecipado de todas as demais, com acréscimo de multa e juros conforme cláusula sétima.

6. CLÁUSULA SEXTA – DO PRAZO DE VIGÊNCIA

6.1 O presente contrato terá vigência a partir da data de sua assinatura e perdurará até o final do decênio de registro de marca junto ao INPI, podendo ser renovado mediante termo aditivo.

7. CLÁUSULA SÉTIMA – DA INADIMPLÊNCIA

7.1 No caso de inadimplência, a CONTRATANTE estará sujeita a:
a) Multa de 10% (dez por cento) sobre o valor total devido;
b) Juros de mora de 1% (um por cento) ao mês;
c) Correção monetária pelo IGPM/FGV;
d) Suspensão imediata dos serviços até a regularização do débito;
e) Inscrição em cadastros de proteção ao crédito após 30 dias de inadimplência.

8. CLÁUSULA OITAVA – DA CONFIDENCIALIDADE

8.1 As partes se comprometem a manter em sigilo absoluto todas as informações confidenciais trocadas durante a execução do contrato, incluindo dados pessoais, comerciais e estratégicos.
8.2 Esta obrigação de confidencialidade permanecerá vigente por prazo indeterminado, mesmo após o término deste contrato.

9. CLÁUSULA NONA – DA RESCISÃO

9.1 Este contrato poderá ser rescindido por qualquer das partes mediante aviso prévio de 30 (trinta) dias, por escrito.
9.2 A CONTRATANTE somente poderá cancelar o contrato se não houver débitos pendentes com a CONTRATADA.
9.3 Em caso de rescisão antecipada por iniciativa da CONTRATANTE, não haverá devolução de valores já pagos referentes a serviços executados ou em andamento.

10. CLÁUSULA DÉCIMA – DAS CONDIÇÕES GERAIS

10.1 Fica pactuada entre as partes a prestação dos serviços de acompanhamento e vigilância do(s) processo(s) referentes à marca {{marca}}.
10.2 Durante a tramitação do processo junto ao INPI, poderão surgir situações que exijam a apresentação de documentos adicionais, os quais deverão ser providenciados pela CONTRATANTE em tempo hábil.
10.3 A CONTRATADA não se responsabiliza por decisões do INPI contrárias ao pedido de registro, desde que tenha cumprido integralmente suas obrigações contratuais.

11. CLÁUSULA DÉCIMA PRIMEIRA – DAS DISPOSIÇÕES FINAIS

11.1 Este contrato representa o acordo integral entre as partes, substituindo quaisquer negociações ou acordos anteriores, verbais ou escritos.
11.2 A tolerância de uma das partes quanto ao descumprimento de qualquer obrigação pela outra não implica novação ou renúncia de direitos.
11.3 Qualquer alteração deste contrato somente será válida se formalizada por escrito e assinada por ambas as partes.

12. CLÁUSULA DÉCIMA SEGUNDA – DO FORO

12.1 Para dirimir quaisquer dúvidas ou controvérsias oriundas do presente instrumento, as partes elegem o Foro da Comarca de São Paulo – SP, com renúncia expressa a qualquer outro, por mais privilegiado que seja.

Por estarem justas e contratadas, as partes assinam o presente instrumento em 02 (duas) vias de igual teor e forma, na presença das testemunhas abaixo.

São Paulo, {{data_extenso}}.

CONTRATADA:
WebMarcas Intelligence PI
CNPJ: 39.528.012/0001-29

CONTRATANTE:
{{nome_cliente}}
CPF/CNPJ: {{cpf_cnpj}}`;

export function useContractTemplate(templateName: string = 'Contrato Padrão - Registro de Marca INPI'): UseContractTemplateResult {
  const [template, setTemplate] = useState<ContractTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>('contract');

  const fetchTemplate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Search for template by name (case insensitive partial match)
      const { data, error: fetchError } = await supabase
        .from('contract_templates')
        .select('id, name, content, variables, is_active')
        .eq('is_active', true)
        .or(`name.ilike.%${templateName}%,name.ilike.%Registro de Marca%`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError) {
        throw fetchError;
      }

      if (data && data.length > 0) {
        const foundTemplate = {
          ...data[0],
          variables: Array.isArray(data[0].variables) ? data[0].variables as string[] : []
        };
        setTemplate(foundTemplate);
        setDocumentType(getDocumentTypeFromTemplateName(foundTemplate.name));
      } else {
        // Use default template if none found in database
        setTemplate({
          id: 'default',
          name: 'Contrato Padrão Registro de Marca',
          content: DEFAULT_CONTRACT_TEMPLATE,
          variables: [
            '{{nome_cliente}}', '{{cpf}}', '{{email}}', '{{telefone}}',
            '{{marca}}', '{{ramo_atividade}}', '{{endereco_completo}}',
            '{{razao_social_ou_nome}}', '{{dados_cnpj}}', '{{forma_pagamento_detalhada}}',
            '{{data_extenso}}'
          ],
          is_active: true
        });
        setDocumentType(getDocumentTypeFromTemplateName(templateName));
      }
    } catch (err) {
      console.error('Error fetching contract template:', err);
      setError('Erro ao carregar modelo de contrato');
      // Still provide default template on error
      setTemplate({
        id: 'default',
        name: 'Contrato Padrão Registro de Marca',
        content: DEFAULT_CONTRACT_TEMPLATE,
        variables: [],
        is_active: true
      });
      setDocumentType(getDocumentTypeFromTemplateName(templateName));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateName]);

  return { template, isLoading, error, documentType, refetch: fetchTemplate };
}

// Interface for multiple brands
export interface BrandItem {
  brandName: string;
  businessArea: string;
  nclClass: string;
}

// Format multiple brands inline for clause 10.1
const formatMultipleBrandsInline = (brands: BrandItem[]): string => {
  if (!brands || brands.length === 0) return '';
  
  return brands.map((brand, index) => 
    `${index + 1}. Marca: <strong>${brand.brandName}</strong> - Classe NCL: <strong>${brand.nclClass || 'A definir'}</strong>`
  ).join('. ') + '.';
};

// Helper function to replace template variables with actual data
export function replaceContractVariables(
  template: string,
  data: {
    personalData: {
      fullName: string;
      email: string;
      phone: string;
      cpf: string;
      cep: string;
      address: string;
      neighborhood: string;
      city: string;
      state: string;
    };
    brandData: {
      brandName: string;
      businessArea: string;
      hasCNPJ: boolean;
      cnpj: string;
      companyName: string;
    };
    paymentMethod: string;
    multipleBrands?: BrandItem[];
    selectedClasses?: number[];
    classDescriptions?: string[];
  }
): string {
  const { personalData, brandData, paymentMethod } = data;

  // Format current date in Portuguese
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  // Build complete address
  const enderecoCompleto = `${personalData.address}, ${personalData.neighborhood}, ${personalData.city} - ${personalData.state}, CEP ${personalData.cep}`;

  // Razão social or name
  const razaoSocialOuNome = brandData.hasCNPJ && brandData.companyName 
    ? brandData.companyName 
    : personalData.fullName;

  // CNPJ data
  const dadosCnpj = brandData.hasCNPJ && brandData.cnpj 
    ? `inscrita no CNPJ sob nº ${brandData.cnpj}, ` 
    : '';

  // Payment method details with total for multiple brands or classes
  const getPaymentDetails = () => {
    const classCount = data.selectedClasses?.length || 0;
    const brandCount = data.multipleBrands?.length || 1;
    const quantity = classCount > 0 ? classCount : brandCount;
    
    switch (paymentMethod) {
      case 'avista': {
        const total = 699 * quantity;
        const totalSuffix = quantity > 1 
          ? ` Valor total de ${quantity} ${classCount > 0 ? 'classes' : 'marcas'}: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`
          : '';
        return `• Pagamento à vista via PIX: R$ ${quantity === 1 ? '699,00' : total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${quantity === 1 ? 'seiscentos e noventa e nove reais' : 'valor total'}) - com 43% de desconto sobre o valor integral.${totalSuffix}`;
      }
      case 'cartao6x': {
        const total = 1194 * quantity;
        const installment = total / 6;
        const totalSuffix = quantity > 1 
          ? ` Valor total de ${quantity} ${classCount > 0 ? 'classes' : 'marcas'}: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`
          : '';
        return `• Pagamento parcelado no Cartão de Crédito: 6x de R$ ${installment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} = Total: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - sem juros.${totalSuffix}`;
      }
      case 'boleto3x': {
        const total = 1197 * quantity;
        const installment = total / 3;
        const totalSuffix = quantity > 1 
          ? ` Valor total de ${quantity} ${classCount > 0 ? 'classes' : 'marcas'}: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`
          : '';
        return `• Pagamento parcelado via Boleto Bancário: 3x de R$ ${installment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} = Total: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.${totalSuffix}`;
      }
      default:
        return `• Forma de pagamento a ser definida.`;
    }
  };

  // CPF or CNPJ for signature section
  const cpfCnpj = brandData.hasCNPJ && brandData.cnpj 
    ? brandData.cnpj 
    : personalData.cpf;

  // Build marca replacement - with classes if available
  let marcaReplacement = brandData.brandName;
  if (data.selectedClasses && data.selectedClasses.length > 0) {
    const classListLines = data.selectedClasses.map((cls, i) => {
      const desc = data.classDescriptions?.[i] || `Classe ${cls}`;
      return `${i + 1}. Marca: ${brandData.brandName} - Classe NCL: ${cls} (${desc})`;
    });
    // For clause 1.1: replace the entire marca pattern with class list
    marcaReplacement = brandData.brandName; // Keep simple for {{marca}} placeholder
  }

  // Replace all variables
  let result = template
    .replace(/\{\{nome_cliente\}\}/g, personalData.fullName)
    .replace(/\{\{cpf\}\}/g, personalData.cpf)
    .replace(/\{\{cpf_cnpj\}\}/g, cpfCnpj)
    .replace(/\{\{email\}\}/g, personalData.email)
    .replace(/\{\{telefone\}\}/g, personalData.phone)
    .replace(/\{\{ramo_atividade\}\}/g, brandData.businessArea)
    .replace(/\{\{endereco_completo\}\}/g, enderecoCompleto)
    .replace(/\{\{endereco\}\}/g, personalData.address)
    .replace(/\{\{bairro\}\}/g, personalData.neighborhood)
    .replace(/\{\{cidade\}\}/g, personalData.city)
    .replace(/\{\{estado\}\}/g, personalData.state)
    .replace(/\{\{cep\}\}/g, personalData.cep)
    .replace(/\{\{razao_social_ou_nome\}\}/g, razaoSocialOuNome)
    .replace(/\{\{dados_cnpj\}\}/g, dadosCnpj)
    .replace(/\{\{forma_pagamento_detalhada\}\}/g, getPaymentDetails())
    .replace(/\{\{data_extenso\}\}/g, currentDate)
    .replace(/\{\{data\}\}/g, new Date().toLocaleDateString('pt-BR'));

  // Handle brand name replacement - inline format for multiple brands in clause 10.1
  if (data.multipleBrands && data.multipleBrands.length > 1) {
    const brandsInline = formatMultipleBrandsInline(data.multipleBrands);
    result = result.replace(/\{\{marca\}\}/g, brandsInline);
  } else {
    result = result.replace(/\{\{marca\}\}/g, brandData.brandName);
  }

  // Inject NCL classes into clause 1.1 if selectedClasses are provided
  if (data.selectedClasses && data.selectedClasses.length > 0) {
    const classListLines = data.selectedClasses.map((cls, i) => {
      // Try to get description from classDescriptions array (mapped by suggestedClasses index)
      const desc = data.classDescriptions?.[i] || `Classe ${cls}`;
      return `${i + 1}. Marca: ${brandData.brandName} - Classe NCL: ${cls} (${desc})`;
    }).join('\n');

    // Replace the clause 1.1 pattern: registro da marca "X" junto ao INPI ... ramo de atividade: Y.
    const clause11Pattern = /registro da marca "[^"]*" junto ao INPI até a conclusão do processo, no ramo de atividade: [^.]+\./i;
    if (clause11Pattern.test(result)) {
      result = result.replace(clause11Pattern, `registro das seguintes marcas junto ao INPI até a conclusão dos processos:\n\n${classListLines}`);
    }
  }

  return result;
}

export default useContractTemplate;

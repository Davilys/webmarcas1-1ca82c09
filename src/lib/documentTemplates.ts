import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DocumentVariables {
  nome_empresa: string;
  cnpj: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  nome_representante: string;
  cpf_representante: string;
  email?: string;
  telefone?: string;
  marca?: string;
  data_distrato?: string;
  valor_multa?: string;
  numero_parcela?: string;
}

const formatDateExtended = (date: Date): string => {
  return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
};

export function generateProcuracaoContent(vars: DocumentVariables): string {
  const dataHoje = formatDateExtended(new Date());
  
  return `OUTORGANTE:

${vars.nome_empresa}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ${vars.cnpj}, com sede na ${vars.endereco}, ${vars.cidade} - ${vars.estado}, CEP ${vars.cep}, neste ato representada por ${vars.nome_representante}, portador(a) do CPF nº ${vars.cpf_representante}.

Pelo presente instrumento particular de PROCURAÇÃO, o(a) outorgante acima identificado(a) nomeia e constitui como seu bastante PROCURADOR o Sr. Davilys Danques de Oliveira Cunha, brasileiro, casado, portador do RG nº 50.688.779-0 e CPF nº 393.239.118-79, com endereço profissional na Av. Brigadeiro Luís Antônio, nº 2696, Centro, São Paulo - SP, para representá-lo(a) de forma exclusiva junto ao INSTITUTO NACIONAL DA PROPRIEDADE INDUSTRIAL – INPI, podendo praticar todos os atos necessários, legais e administrativos relacionados ao pedido, acompanhamento, defesa e manutenção do registro de marca, inclusive apresentação de requerimentos, cumprimento de exigências, interposição de recursos e recebimento de notificações.

A presente procuração é válida pelo prazo indeterminado, podendo ser revogada a qualquer tempo mediante comunicação expressa ao procurador.

São Paulo, ${dataHoje}.`;
}

export function generateDistratoComMultaContent(vars: DocumentVariables): string {
  const dataHoje = formatDateExtended(new Date());
  
  return `I) WebMarcas Intelligence PI, com sede na cidade de SÃO PAULO, Estado de SP, na AVENIDA PRESTES MAIA, Nº: 241, CEP:01031-001, inscrita no CNPJ/MF sob o Nº:39.528.012/0001-29, na cidade de SÃO PAULO, Estado de SP (" WebMarcas ");

Pelo presente instrumento as partes abaixo qualificadas:

II) A pessoa física ou jurídica que preencheu e enviou à WebMarcas o cadastro necessário para criação e verificação de conta junto à WebMarcas, identificada pelo presente instrumento particular que o fazem parte, de um lado ora a CONTRATANTE: ${vars.nome_empresa}, com sede na ${vars.endereco}, na cidade de ${vars.cidade}, estado de ${vars.estado}, CEP ${vars.cep}, inscrita no CNPJ/ sob nº ${vars.cnpj}, neste ato representada por ${vars.nome_representante}, CPF sob o n⁰ ${vars.cpf_representante}, com endereço de e-mail para faturamento ${vars.email || ''} e Tel; ${vars.telefone || ''}, ("Contratante").

As partes celebram o presente Acordo de Tarifas, que se regerá pelas cláusulas e condições abaixo:

1. DO OBJETO E CONSIDERAÇÕES DO CONTRATO
1.2. O presente contrato tem como OBJETO a parceria celebrada entre as partes, com o objetivo de preparar e depositar o registro da marca junto ao INSTITUTO NACIONAL DA PROPRIEDADE INDUSTRIAL, referente à marca ${vars.marca || '[Nome da Marca]'}, bem como o acompanhamento e vigilância do processo até a sua fase processual seguinte.

1.3. As partes resolvem, nesta data ${vars.data_distrato || dataHoje}, em comum acordo e no exercício de suas faculdades, dissolver todos os direitos e obrigações decorrentes do contrato de parceria celebrado entre elas. Fica estabelecido que haverá um ônus financeiro em virtude do cancelamento, correspondente ao valor de ${vars.numero_parcela || '1'} parcela de R$${vars.valor_multa || '0,00'}. Ressalta-se que a falta de pagamento acarretará na cobrança do valor total do serviço, sujeito a protesto.

1.4. Todas as cláusulas e condições contidas no presente contrato são consideradas DISTRATADAS a partir desta data. As partes declaram, por meio deste instrumento e nos termos da lei, quitação total e irrestrita de todos os direitos e obrigações decorrentes do contrato de parceria, não existindo pendências recíprocas.

1.5. Este Distrato passa a vigorar entre as partes a partir da data de assinatura, independentemente do estágio de desenvolvimento financeiro das partes.

2. ELEIÇÃO DE FORO
2.1 Fica eleito o Foro da Comarca de São Paulo como o competente para dirimir as questões suscitadas com base no presente Contrato, renunciando as partes a outros Foros, por mais privilegiados que sejam.

São Paulo, ${dataHoje}.`;
}

export function generateDistratoSemMultaContent(vars: DocumentVariables): string {
  const dataHoje = formatDateExtended(new Date());
  
  return `I) WebMarcas Intelligence PI, com sede na cidade de SÃO PAULO, Estado de SP, na AVENIDA PRESTES MAIA, Nº: 241, CEP:01031-001, inscrita no CNPJ/MF sob o Nº:39.528.012/0001-29, na cidade de SÃO PAULO, Estado de SP (" WebMarcas ");

Pelo presente instrumento as partes abaixo qualificadas:

II) A pessoa física ou jurídica que preencheu e enviou à WebMarcas o cadastro necessário para criação e verificação de conta junto à WebMarcas, identificada pelo presente instrumento particular que o fazem parte, de um lado ora a CONTRATANTE: ${vars.nome_empresa}, com sede na ${vars.endereco}, na cidade de ${vars.cidade}, estado de ${vars.estado}, CEP ${vars.cep}, inscrita no CNPJ/ sob nº ${vars.cnpj}, neste ato representada por ${vars.nome_representante}, CPF sob o n⁰ ${vars.cpf_representante}, com endereço de e-mail para faturamento ${vars.email || ''} e Tel; ${vars.telefone || ''}, ("Contratante").

As partes celebram o presente Acordo de Tarifas, que se regerá pelas cláusulas e condições abaixo:

1. DO OBJETO E CONSIDERAÇÕES DO CONTRATO
1.2. O presente tem como OBJETO o contrato de parceria celebrado entre as partes neste mencionado, o qual teve como fundamento, o seguinte: (Preparo de depósito de registro de marca junto ao INSTITUTO NACIONAL DA PROPRIEDADE INDUSTRIAL, marca; ${vars.marca || '[Nome da Marca]'}, bem como acompanhamento e vigilância até sua faze processual seguinte).

1.3. As partes resolvem, nesta data ${vars.data_distrato || dataHoje}, em comum acordo, nas razões de suas faculdades, dissolver quaisquer direitos e obrigações oriundas do contrato de parceria firmado entre elas, de forma que não restar resquícios de ônus financeiro obrigacional relativos ao mesmo.

1.4. Todas as cláusulas e condições contidas no presente restam desde já DISTRATADAS. Afirmam por este e na forma de Direito, dando total e irrestrita quitação sobre todos os direitos e obrigações oriundas do contrato de parceria, não havendo quaisquer pendências recíprocas.

1.5. Seja em qualquer tempo ou grau de desenvolvimento financeiro do DISTRATANTE e DISTRATADO, em função dos termos, o presente. Distrato passa a vigorar entre as partes á partir da assinatura do mesmo.

2.1 Fica eleito o Foro da Comarca de São Paulo, como o competente para dirimir as questões suscitadas com base no presente Contrato, renunciando as partes a outros Foros, por mais privilegiados que sejam.

São Paulo, ${dataHoje}.`;
}

export function generateDocumentContent(
  documentType: 'procuracao' | 'distrato_multa' | 'distrato_sem_multa',
  vars: DocumentVariables
): string {
  switch (documentType) {
    case 'procuracao':
      return generateProcuracaoContent(vars);
    case 'distrato_multa':
      return generateDistratoComMultaContent(vars);
    case 'distrato_sem_multa':
      return generateDistratoSemMultaContent(vars);
    default:
      return '';
  }
}

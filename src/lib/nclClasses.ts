// Shared types and utilities for NCL class selection system

export interface NCLClass {
  number: number;
  description: string;
}

/**
 * Calculate total payment value based on class count and payment method
 * Isolated function as per plan - does NOT alter existing pricing logic
 */
export function calculateClassBasedValue(
  unitValue: number,
  classCount: number
): number {
  return unitValue * Math.max(classCount, 1);
}

/**
 * Format selected classes for contract clause 1.1
 * Example: "1. Marca: ALTAborrachas – Classe NCL: 25. 2. Marca: ALTAborrachas – Classe NCL: 35."
 */
export function formatClassesForContract(
  brandName: string,
  selectedClasses: NCLClass[]
): string {
  if (!selectedClasses || selectedClasses.length === 0) return brandName;
  if (selectedClasses.length === 1) {
    return `${brandName} – Classe NCL: ${selectedClasses[0].number}`;
  }
  return selectedClasses
    .map(
      (cls, i) =>
        `${i + 1}. Marca: <strong>${brandName}</strong> – Classe NCL: <strong>${cls.number}</strong>`
    )
    .join('. ') + '.';
}

/**
 * Format payment details for contract clause 5.1 with multiple classes
 */
export function getPaymentDetailsWithClasses(
  paymentMethod: string,
  classCount: number
): string {
  const qty = Math.max(classCount, 1);
  const suffix = qty > 1 ? ` Valor total de ${qty} classes: R$ ${(getUnitValueByMethod(paymentMethod) * qty).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.` : '';

  switch (paymentMethod) {
    case 'avista':
      return `• Pagamento à vista via PIX: R$ 699,00 (seiscentos e noventa e nove reais) - com 43% de desconto sobre o valor integral de R$ 1.230,00.${suffix}`;
    case 'cartao6x': {
      const installment = 199 * qty;
      const total = 1194 * qty;
      return `• Pagamento parcelado no Cartão de Crédito: 6x de R$ ${installment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} = Total: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - sem juros.`;
    }
    case 'boleto3x': {
      const installment = 399 * qty;
      const total = 1197 * qty;
      return `• Pagamento parcelado via Boleto Bancário: 3x de R$ ${installment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} = Total: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`;
    }
    default:
      return `• Forma de pagamento a ser definida.`;
  }
}

function getUnitValueByMethod(method: string): number {
  switch (method) {
    case 'avista': return 699;
    case 'cartao6x': return 1194;
    case 'boleto3x': return 1197;
    default: return 699;
  }
}

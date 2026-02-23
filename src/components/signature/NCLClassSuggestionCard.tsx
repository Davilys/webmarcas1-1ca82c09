import { useState } from 'react';
import { ShieldCheck, Check, Loader2, Plus } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface SuggestedClass {
  number: number;
  description: string;
  selected: boolean;
}

interface NCLClassSuggestionCardProps {
  contractId: string;
  suggestedClasses: SuggestedClass[];
  currentValue: number;
  paymentMethod: string | null;
  onContractUpdated: () => void;
}

export function NCLClassSuggestionCard({
  contractId,
  suggestedClasses,
  currentValue,
  paymentMethod,
  onContractUpdated,
}: NCLClassSuggestionCardProps) {
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // Classes already selected by the admin
  const alreadySelectedClasses = suggestedClasses.filter(cls => cls.selected);
  // Classes available for upsell (not selected by admin)
  const availableClasses = suggestedClasses.filter(cls => !cls.selected);

  if (availableClasses.length === 0 && alreadySelectedClasses.length === 0) return null;

  const getPerClassPrice = () => {
    switch (paymentMethod) {
      case 'cartao6x': return 1194;
      case 'boleto3x': return 1197;
      default: return 699;
    }
  };

  const perClassPrice = getPerClassPrice();
  const additionalValue = selectedNumbers.length * perClassPrice;
  const newTotal = currentValue + additionalValue;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const toggleClass = (classNumber: number) => {
    setSelectedNumbers(prev =>
      prev.includes(classNumber)
        ? prev.filter(n => n !== classNumber)
        : [...prev, classNumber]
    );
  };

  const handleConfirm = async () => {
    if (selectedNumbers.length === 0) {
      toast.error('Selecione pelo menos uma classe');
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-contract-classes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            contractId,
            selectedClassNumbers: selectedNumbers,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao atualizar classes');
      }

      toast.success('Classes adicionadas com sucesso! O contrato foi atualizado.');
      onContractUpdated();
    } catch (err: any) {
      console.error('Error updating classes:', err);
      toast.error(err.message || 'Erro ao adicionar classes');
    } finally {
      setIsUpdating(false);
    }
  };

  const getPaymentLabel = () => {
    switch (paymentMethod) {
      case 'cartao6x': return `6x de ${formatCurrency(newTotal / 6)}`;
      case 'boleto3x': return `3x de ${formatCurrency(newTotal / 3)}`;
      default: return `${formatCurrency(newTotal)} à vista (PIX)`;
    }
  };

  return (
    <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-6 my-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
        <div className="bg-blue-100 p-2.5 rounded-full">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            Classes NCL de Proteção
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Classes selecionadas e sugestões complementares do departamento jurídico.
          </p>
        </div>
      </div>

      {/* Already Selected Classes */}
      {alreadySelectedClasses.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-blue-600 tracking-wider uppercase mb-2">
            Selecionadas no Formulário
          </p>
          <div className="space-y-2">
            {alreadySelectedClasses.map((cls) => (
              <div
                key={cls.number}
                className="flex items-center justify-between p-3.5 rounded-lg bg-blue-100/60 border border-blue-200"
              >
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      Classe NCL {cls.number}
                    </p>
                    <p className="text-xs text-gray-500">
                      Classe {cls.number} – {cls.description}
                    </p>
                  </div>
                </div>
                <Check className="h-5 w-5 text-blue-500" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Complementary Protection */}
      {availableClasses.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 tracking-wider uppercase mb-2">
            Proteção Complementar Recomendada
          </p>
          <div className="space-y-2">
            {availableClasses.map((cls) => (
              <div
                key={cls.number}
                className={`flex items-center justify-between p-3.5 rounded-lg border transition-all cursor-pointer ${
                  selectedNumbers.includes(cls.number)
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-white border-gray-200 hover:border-blue-200'
                }`}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('button[role="checkbox"]')) return;
                  toggleClass(cls.number);
                }}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedNumbers.includes(cls.number)}
                    onCheckedChange={() => toggleClass(cls.number)}
                    className="border-blue-300 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                  />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      Classe NCL {cls.number}
                    </p>
                    <p className="text-xs text-gray-500">
                      Classe {cls.number} – {cls.description}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-medium text-blue-600 whitespace-nowrap">
                  + {formatCurrency(perClassPrice)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Value Summary */}
      {selectedNumbers.length > 0 && (
        <div className="bg-white rounded-lg p-4 border border-blue-200 mb-4">
          <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
            <span>Valor atual do contrato:</span>
            <span>{formatCurrency(currentValue)}</span>
          </div>
          <div className="flex justify-between items-center text-sm text-blue-600 mb-2">
            <span>+ {selectedNumbers.length} classe(s) adicional(is):</span>
            <span>+ {formatCurrency(additionalValue)}</span>
          </div>
          <div className="border-t pt-2 flex justify-between items-center">
            <span className="font-bold text-gray-900">Novo valor total:</span>
            <div className="text-right">
              <p className="font-bold text-lg text-blue-700">{getPaymentLabel()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Button */}
      {availableClasses.length > 0 && (
        <Button
          onClick={handleConfirm}
          disabled={selectedNumbers.length === 0 || isUpdating}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isUpdating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Atualizando contrato...
            </>
          ) : selectedNumbers.length > 0 ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Confirmar {selectedNumbers.length} classe(s) adicional(is)
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Selecione as classes desejadas
            </>
          )}
        </Button>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Shield, Check, Loader2, Plus } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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

  // Only show unselected classes
  const availableClasses = suggestedClasses.filter(cls => !cls.selected);

  if (availableClasses.length === 0) return null;

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
    <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-6 my-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="bg-amber-100 p-2 rounded-full">
          <Shield className="h-5 w-5 text-amber-700" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-amber-900">
            Proteção Complementar Recomendada
          </h3>
          <p className="text-sm text-amber-700 mt-1">
            Nosso departamento jurídico sugere proteger sua marca também nas classes abaixo. 
            Ao selecionar, seu contrato e valor serão atualizados automaticamente.
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {availableClasses.map((cls) => (
          <div
            key={cls.number}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
              selectedNumbers.includes(cls.number)
                ? 'bg-amber-100 border-amber-400'
                : 'bg-white border-gray-200 hover:border-amber-300'
            }`}
            onClick={() => toggleClass(cls.number)}
          >
            <Checkbox
              checked={selectedNumbers.includes(cls.number)}
              onCheckedChange={() => toggleClass(cls.number)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <p className="font-semibold text-gray-900">
                Classe NCL {cls.number}
              </p>
              <p className="text-sm text-gray-600 mt-0.5">
                {cls.description}
              </p>
            </div>
            <span className="text-sm font-medium text-amber-800 whitespace-nowrap">
              + {formatCurrency(perClassPrice)}
            </span>
          </div>
        ))}
      </div>

      {selectedNumbers.length > 0 && (
        <div className="bg-white rounded-lg p-4 border border-amber-200 mb-4">
          <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
            <span>Valor atual do contrato:</span>
            <span>{formatCurrency(currentValue)}</span>
          </div>
          <div className="flex justify-between items-center text-sm text-amber-700 mb-2">
            <span>+ {selectedNumbers.length} classe(s) adicional(is):</span>
            <span>+ {formatCurrency(additionalValue)}</span>
          </div>
          <div className="border-t pt-2 flex justify-between items-center">
            <span className="font-bold text-gray-900">Novo valor total:</span>
            <div className="text-right">
              <p className="font-bold text-lg text-amber-900">{getPaymentLabel()}</p>
            </div>
          </div>
        </div>
      )}

      <Button
        onClick={handleConfirm}
        disabled={selectedNumbers.length === 0 || isUpdating}
        className="w-full bg-amber-600 hover:bg-amber-700 text-white"
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
    </div>
  );
}

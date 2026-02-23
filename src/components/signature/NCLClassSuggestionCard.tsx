import { useState } from 'react';
import { Shield, Check, Loader2, Plus, ShieldCheck } from 'lucide-react';
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

  // Safe array guard
  const safeClasses = Array.isArray(suggestedClasses) ? suggestedClasses : [];

  const selectedClasses = safeClasses.filter(cls => cls.selected);
  const availableClasses = safeClasses.filter(cls => !cls.selected);

  // If no available upsell classes, don't show the card
  if (availableClasses.length === 0) return null;

  const getPerClassPrice = () => {
    switch (paymentMethod) {
      case 'cartao6x': return 1194;
      case 'boleto3x': return 1197;
      default: return 699;
    }
  };

  const perClassPrice = getPerClassPrice();
  const additionalValue = (selectedNumbers?.length || 0) * perClassPrice;
  const newTotal = (currentValue || 0) + additionalValue;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const toggleClass = (classNumber: number) => {
    setSelectedNumbers(prev => {
      const safe = Array.isArray(prev) ? prev : [];
      return safe.includes(classNumber)
        ? safe.filter(n => n !== classNumber)
        : [...safe, classNumber];
    });
  };

  const handleConfirm = async () => {
    if (!selectedNumbers || selectedNumbers.length === 0) {
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
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 my-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
        <div className="bg-primary/10 p-2.5 rounded-full">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">
            Classes NCL de Proteção
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Classes selecionadas e sugestões complementares do departamento jurídico.
          </p>
        </div>
      </div>

      {/* Selected classes (read-only) */}
      {selectedClasses.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-muted-foreground tracking-wider mb-2">
            SELECIONADAS NO FORMULÁRIO
          </p>
          <div className="space-y-2">
            {selectedClasses.map((cls) => (
              <div
                key={cls.number}
                className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20"
              >
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Classe NCL {cls.number}</p>
                    <p className="text-sm text-muted-foreground">{cls.description}</p>
                  </div>
                </div>
                <Check className="h-5 w-5 text-primary" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available classes (upsell) */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-muted-foreground tracking-wider mb-2">
          PROTEÇÃO COMPLEMENTAR RECOMENDADA
        </p>
        <div className="space-y-2">
          {availableClasses.map((cls) => (
            <div
              key={cls.number}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                (Array.isArray(selectedNumbers) ? selectedNumbers : []).includes(cls.number)
                  ? 'bg-primary/10 border-primary/30'
                  : 'bg-background border-border hover:border-primary/30'
              }`}
              onClick={() => toggleClass(cls.number)}
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={(Array.isArray(selectedNumbers) ? selectedNumbers : []).includes(cls.number)}
                  onCheckedChange={() => toggleClass(cls.number)}
                  className="mt-0.5"
                />
                <div>
                  <p className="font-semibold text-foreground">Classe NCL {cls.number}</p>
                  <p className="text-sm text-muted-foreground">{cls.description}</p>
                </div>
              </div>
              <span className="text-sm font-medium text-primary whitespace-nowrap">
                + {formatCurrency(perClassPrice)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      {(selectedNumbers?.length || 0) > 0 && (
        <div className="bg-background rounded-lg p-4 border border-border mb-4">
          <div className="flex justify-between items-center text-sm text-muted-foreground mb-1">
            <span>Valor atual do contrato:</span>
            <span>{formatCurrency(currentValue || 0)}</span>
          </div>
          <div className="flex justify-between items-center text-sm text-primary mb-2">
            <span>+ {selectedNumbers.length} classe(s) adicional(is):</span>
            <span>+ {formatCurrency(additionalValue)}</span>
          </div>
          <div className="border-t pt-2 flex justify-between items-center">
            <span className="font-bold text-foreground">Novo valor total:</span>
            <p className="font-bold text-lg text-primary">{getPaymentLabel()}</p>
          </div>
        </div>
      )}

      <Button
        onClick={handleConfirm}
        disabled={(selectedNumbers?.length || 0) === 0 || isUpdating}
        className="w-full"
      >
        {isUpdating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Atualizando contrato...
          </>
        ) : (selectedNumbers?.length || 0) > 0 ? (
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

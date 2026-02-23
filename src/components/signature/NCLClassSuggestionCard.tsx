import { useState } from 'react';
import { Shield, Check, Loader2, Plus, CheckCircle2 } from 'lucide-react';
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

  // Classes já selecionadas pelo ADM
  const preSelectedClasses = suggestedClasses.filter(cls => cls.selected);
  // Classes disponíveis para o cliente escolher
  const availableClasses = suggestedClasses.filter(cls => !cls.selected);

  // Se não há classes disponíveis para seleção, não mostrar nada
  if (availableClasses.length === 0 && preSelectedClasses.length === 0) return null;

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

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 my-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
        <div className="bg-primary/10 p-2.5 rounded-full">
          <Shield className="h-5 w-5 text-primary" />
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

      {/* Seção 1: Classes já selecionadas pelo ADM */}
      {preSelectedClasses.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Selecionadas no Formulário
          </p>
          <div className="space-y-2">
            {preSelectedClasses.map((cls) => (
              <div
                key={cls.number}
                className="flex items-center justify-between p-3.5 rounded-lg bg-primary/5 border border-primary/20"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
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

      {/* Seção 2: Proteção Complementar */}
      {availableClasses.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Proteção Complementar Recomendada
          </p>
          <div className="space-y-2 mb-4">
            {availableClasses.map((cls) => (
              <div
                key={cls.number}
                className={`flex items-center gap-3 p-3.5 rounded-lg border transition-all cursor-pointer ${
                  selectedNumbers.includes(cls.number)
                    ? 'bg-primary/5 border-primary/30'
                    : 'bg-background border-border hover:border-primary/20'
                }`}
                onClick={() => toggleClass(cls.number)}
              >
                <Checkbox
                  checked={selectedNumbers.includes(cls.number)}
                  onCheckedChange={() => toggleClass(cls.number)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">Classe NCL {cls.number}</p>
                  <p className="text-sm text-muted-foreground truncate">{cls.description}</p>
                </div>
                <span className="text-sm font-medium text-primary whitespace-nowrap">
                  + {formatCurrency(perClassPrice)}
                </span>
              </div>
            ))}
          </div>

          {/* Resumo de valor */}
          {selectedNumbers.length > 0 && (
            <div className="bg-background rounded-lg p-4 border border-border mb-4">
              <div className="flex justify-between items-center text-sm text-muted-foreground mb-1">
                <span>Valor atual do contrato:</span>
                <span>{formatCurrency(currentValue)}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-primary mb-2">
                <span>+ {selectedNumbers.length} classe(s) adicional(is):</span>
                <span>+ {formatCurrency(additionalValue)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between items-center">
                <span className="font-bold text-foreground">Novo valor total:</span>
                <p className="font-bold text-lg text-primary">{formatCurrency(newTotal)}</p>
              </div>
            </div>
          )}

          <Button
            onClick={handleConfirm}
            disabled={selectedNumbers.length === 0 || isUpdating}
            className="w-full"
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
      )}
    </div>
  );
}

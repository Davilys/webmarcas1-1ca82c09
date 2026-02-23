import { useState } from 'react';
import { ShieldCheck, CheckCheck, Check, Loader2, Plus } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

  const selectedClasses = suggestedClasses.filter(cls => cls.selected);
  const availableClasses = suggestedClasses.filter(cls => !cls.selected);

  if (suggestedClasses.length === 0) return null;

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

  const selectAll = () => {
    setSelectedNumbers(availableClasses.map(c => c.number));
  };

  const allSelected = availableClasses.length > 0 &&
    availableClasses.every(c => selectedNumbers.includes(c.number));

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
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-4 space-y-3 my-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <div>
            <p className="text-sm font-semibold">Classes NCL de Proteção</p>
            <p className="text-xs text-muted-foreground">
              Classes selecionadas e sugestões complementares do departamento jurídico.
            </p>
          </div>
        </div>
        {availableClasses.length > 1 && !allSelected && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={selectAll}
            className="text-xs h-7 gap-1 border-primary/30 text-primary hover:bg-primary/10"
          >
            <CheckCheck className="w-3 h-3" />
            Todas
          </Button>
        )}
      </div>

      {/* Seção: Classes já selecionadas pelo admin */}
      {selectedClasses.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Selecionadas no contrato
          </p>
          <div className="space-y-2">
            {selectedClasses.map((cls) => (
              <div
                key={cls.number}
                className="flex items-start gap-3 p-3 rounded-lg border border-primary/40 bg-primary/5 cursor-default"
              >
                <Checkbox checked disabled className="mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">Classe {cls.number}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      Incluída
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {cls.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seção: Proteção Complementar */}
      {availableClasses.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Proteção Complementar Recomendada
          </p>
          <div className="space-y-2">
            {availableClasses.map((cls) => {
              const isSelected = selectedNumbers.includes(cls.number);
              return (
                <label
                  key={cls.number}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                    isSelected
                      ? "border-primary/40 bg-primary/5"
                      : "border-border hover:border-primary/20 hover:bg-muted/30"
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleClass(cls.number)}
                    className="mt-0.5 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold">Classe {cls.number}</span>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {cls.description}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-primary whitespace-nowrap">
                    + {formatCurrency(perClassPrice)}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Resumo de valor */}
      {selectedNumbers.length > 0 && (
        <div className="rounded-lg border border-primary/20 bg-background p-4 space-y-2">
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>Valor atual do contrato:</span>
            <span>{formatCurrency(currentValue)}</span>
          </div>
          <div className="flex justify-between items-center text-sm text-primary">
            <span>+ {selectedNumbers.length} classe(s) adicional(is):</span>
            <span>+ {formatCurrency(additionalValue)}</span>
          </div>
          <div className="border-t border-border pt-2 flex justify-between items-center">
            <span className="font-bold">Novo valor total:</span>
            <p className="font-bold text-lg text-primary">{getPaymentLabel()}</p>
          </div>
        </div>
      )}

      {/* Botão de confirmação */}
      {availableClasses.length > 0 && (
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
      )}

      {selectedNumbers.length > 0 && (
        <p className="text-xs text-primary font-medium text-center">
          {selectedNumbers.length} classe(s) complementar(es) selecionada(s) — proteção ampliada ✓
        </p>
      )}
    </div>
  );
}

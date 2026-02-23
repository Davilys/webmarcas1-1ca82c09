import { motion } from "framer-motion";
import { Shield, Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { NCLClass } from "@/lib/nclClasses";
import { usePricing } from "@/hooks/usePricing";

interface NCLUpsellCardProps {
  suggestedClasses: NCLClass[];
  selectedClasses: NCLClass[];
  onClassesChange: (classes: NCLClass[]) => void;
}

export function NCLUpsellCard({
  suggestedClasses,
  selectedClasses,
  onClassesChange,
}: NCLUpsellCardProps) {
  const { pricing } = usePricing();
  const unselected = suggestedClasses.filter(
    (cls) => !selectedClasses.some((s) => s.number === cls.number)
  );

  if (unselected.length === 0) return null;

  const unitPrice = pricing.avista.value;

  const toggleClass = (cls: NCLClass) => {
    const exists = selectedClasses.some((s) => s.number === cls.number);
    if (exists) {
      onClassesChange(selectedClasses.filter((s) => s.number !== cls.number));
    } else {
      onClassesChange([...selectedClasses, cls]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800 p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          Proteção Complementar Recomendada
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        Caso queira registrar sua marca nas classes abaixo, sugeridas pelo jurídico, ao selecionar o contrato e valor serão atualizados automaticamente.
      </p>

      <div className="space-y-2">
        {unselected.map((cls) => (
          <div
            key={cls.number}
            onClick={() => toggleClass(cls)}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
              "border-border bg-card hover:border-amber-300"
            )}
          >
            <Checkbox
              checked={false}
              onCheckedChange={() => toggleClass(cls)}
              className="mt-0.5 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold">Classe {cls.number}</span>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                {cls.description}
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-1 text-xs font-semibold text-primary">
              <Plus className="w-3 h-3" />
              R$ {unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

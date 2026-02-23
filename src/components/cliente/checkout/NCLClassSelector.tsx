import { motion } from "framer-motion";
import { Shield, Star, CheckSquare } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NCLClass } from "@/lib/nclClasses";

interface NCLClassSelectorProps {
  suggestedClasses: NCLClass[];
  selectedClasses: NCLClass[];
  onClassesChange: (classes: NCLClass[]) => void;
}

export function NCLClassSelector({
  suggestedClasses,
  selectedClasses,
  onClassesChange,
}: NCLClassSelectorProps) {
  if (!suggestedClasses || suggestedClasses.length === 0) return null;

  const isSelected = (cls: NCLClass) =>
    selectedClasses.some((s) => s.number === cls.number);

  const toggleClass = (cls: NCLClass) => {
    if (isSelected(cls)) {
      onClassesChange(selectedClasses.filter((s) => s.number !== cls.number));
    } else {
      onClassesChange([...selectedClasses, cls]);
    }
  };

  const selectAll = () => onClassesChange([...suggestedClasses]);

  const allSelected = suggestedClasses.every((cls) =>
    selectedClasses.some((s) => s.number === cls.number)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Classes NCL Sugeridas</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-primary"
          onClick={selectAll}
          disabled={allSelected}
        >
          <CheckSquare className="w-3 h-3 mr-1" />
          Todas
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Selecione as classes de proteção para sua marca. Cada classe protege um segmento diferente.
      </p>

      {/* Class cards */}
      <div className="space-y-2">
        {suggestedClasses.map((cls, index) => {
          const checked = isSelected(cls);
          return (
            <motion.div
              key={cls.number}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => toggleClass(cls)}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                checked
                  ? "border-primary/40 bg-primary/10"
                  : "border-border bg-card hover:border-primary/30"
              )}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => toggleClass(cls)}
                className="mt-0.5 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold">Classe {cls.number}</span>
                  {index === 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                      <Star className="w-2.5 h-2.5" />
                      Principal
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {cls.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {selectedClasses.length === 0 && (
        <p className="text-xs text-destructive">
          Selecione ao menos uma classe para continuar.
        </p>
      )}
    </motion.div>
  );
}

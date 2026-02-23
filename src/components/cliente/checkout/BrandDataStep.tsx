import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Building2, Briefcase, Hash, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { z } from "zod";
import { validateCNPJ, formatCNPJ } from "@/lib/validators";
import { cn } from "@/lib/utils";

const brandDataSchema = z.object({
  brandName: z.string().min(2, "Nome da marca obrigatório").max(100),
  businessArea: z.string().min(3, "Ramo de atividade obrigatório").max(200),
  hasCNPJ: z.boolean(),
  cnpj: z.string().optional(),
  companyName: z.string().optional(),
}).refine((data) => {
  if (data.hasCNPJ) {
    if (!data.cnpj || !validateCNPJ(data.cnpj)) return false;
    if (!data.companyName || data.companyName.length < 3) return false;
  }
  return true;
}, {
  message: "CNPJ ou Razão Social inválidos",
  path: ["cnpj"],
});

export interface BrandData {
  brandName: string;
  businessArea: string;
  hasCNPJ: boolean;
  cnpj: string;
  companyName: string;
}

interface BrandDataStepProps {
  initialData: BrandData;
  onNext: (data: BrandData) => void;
  onBack: () => void;
}

export function BrandDataStep({ initialData, onNext, onBack }: BrandDataStepProps) {
  const [data, setData] = useState<BrandData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const result = brandDataSchema.safeParse(data);
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) newErrors[err.path[0] as string] = err.message;
      });
      setErrors(newErrors);
      return;
    }
    onNext(data);
  };

  const inputClass = "h-11 text-sm";

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35 }}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
            <Building2 className="w-3.5 h-3.5" />
            Dados da Marca
          </div>
          <h2 className="text-2xl font-bold">Informações da Marca</h2>
          <p className="text-muted-foreground text-sm">
            Detalhes sobre a marca que será registrada no INPI.
          </p>
        </div>

        {/* Brand preview card */}
        {data.brandName && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-5"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <span className="text-2xl font-black text-primary">
                  {data.brandName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Marca a registrar</p>
                <p className="text-xl font-bold">{data.brandName}</p>
                {data.businessArea && (
                  <p className="text-xs text-muted-foreground">{data.businessArea}</p>
                )}
              </div>
              <Sparkles className="absolute right-4 top-4 w-5 h-5 text-primary/30" />
            </div>
          </motion.div>
        )}

        {/* Fields */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
              Nome da Marca <span className="text-destructive">*</span>
            </Label>
            <Input
              value={data.brandName}
              onChange={(e) => setData({ ...data, brandName: e.target.value })}
              placeholder="Nome que será registrado"
              className={cn(inputClass, errors.brandName && "border-destructive")}
            />
            {errors.brandName && (
              <p className="text-destructive text-xs">{errors.brandName}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
              Ramo de Atividade <span className="text-destructive">*</span>
            </Label>
            <Input
              value={data.businessArea}
              onChange={(e) => setData({ ...data, businessArea: e.target.value })}
              placeholder="Ex: Serviços Jurídicos, Alimentação, Tecnologia..."
              className={cn(inputClass, errors.businessArea && "border-destructive")}
            />
            {errors.businessArea && (
              <p className="text-destructive text-xs">{errors.businessArea}</p>
            )}
          </div>

          {/* CNPJ Toggle */}
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex items-center gap-3">
              <Checkbox
                id="hasCNPJ"
                checked={data.hasCNPJ}
                onCheckedChange={(checked) => setData({ ...data, hasCNPJ: !!checked })}
                className="shrink-0"
              />
              <Label htmlFor="hasCNPJ" className="text-sm cursor-pointer leading-relaxed">
                <span className="font-semibold">Tenho CNPJ</span>
                <span className="text-muted-foreground"> — quero vincular à marca (opcional)</span>
              </Label>
            </div>

            <AnimatePresence>
              {data.hasCNPJ && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4 mt-4 pt-4 border-t border-border/50">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                        CNPJ <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={data.cnpj}
                        onChange={(e) => setData({ ...data, cnpj: formatCNPJ(e.target.value) })}
                        placeholder="00.000.000/0000-00"
                        maxLength={18}
                        className={cn(inputClass, errors.cnpj && "border-destructive")}
                      />
                      {errors.cnpj && <p className="text-destructive text-xs">{errors.cnpj}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        Razão Social <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={data.companyName}
                        onChange={(e) => setData({ ...data, companyName: e.target.value })}
                        placeholder="Nome da empresa"
                        className={cn(inputClass, errors.companyName && "border-destructive")}
                      />
                      {errors.companyName && (
                        <p className="text-destructive text-xs">{errors.companyName}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onBack} className="flex-1 h-12 rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Button type="submit" className="flex-1 h-12 rounded-xl shadow-[var(--shadow-button)]">
            Continuar
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </form>
    </motion.div>
  );
}

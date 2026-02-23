import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Download, Printer, Check, Shield, FileText, Lock, Sparkles, ShieldCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useContractTemplate, replaceContractVariables } from "@/hooks/useContractTemplate";
import { ContractRenderer, generateContractPrintHTML } from "@/components/contracts/ContractRenderer";
import { downloadUnifiedContractPDF, printUnifiedContract } from "@/hooks/useUnifiedContractDownload";
import type { PersonalData } from "./PersonalDataStep";
import type { BrandData, SuggestedClass } from "./BrandDataStep";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePricing } from "@/hooks/usePricing";

interface ContractStepProps {
  personalData: PersonalData;
  brandData: BrandData;
  paymentMethod: string;
  paymentValue: number;
  onSubmit: (contractHtml: string, updatedBrandData?: BrandData, updatedPaymentValue?: number) => void;
  onBack: () => void;
  isSubmitting: boolean;
  suggestedClasses?: SuggestedClass[];
}

export function ContractStep({
  personalData,
  brandData,
  paymentMethod,
  paymentValue,
  onSubmit,
  onBack,
  isSubmitting,
  suggestedClasses = [],
}: ContractStepProps) {
  const [accepted, setAccepted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { template, isLoading, documentType } = useContractTemplate('Contrato Padrão - Registro de Marca INPI');
  const { pricing } = usePricing();

  // Track additional classes selected in this step
  const [extraSelectedNumbers, setExtraSelectedNumbers] = useState<number[]>([]);

  // Classes already selected in the form (locked)
  const alreadySelectedClasses = useMemo(() => {
    return suggestedClasses.filter(cls => 
      brandData.selectedClasses?.includes(cls.number)
    );
  }, [suggestedClasses, brandData.selectedClasses]);

  // Classes NOT selected in the form (available for upsell)
  const availableClasses = useMemo(() => {
    return suggestedClasses.filter(cls => 
      !brandData.selectedClasses?.includes(cls.number)
    );
  }, [suggestedClasses, brandData.selectedClasses]);

  const hasSuggestions = suggestedClasses.length > 0;

  // Compute effective brand data with extra classes
  const effectiveBrandData = useMemo(() => {
    if (extraSelectedNumbers.length === 0) return brandData;
    const extraDescs = extraSelectedNumbers.map(num => {
      const cls = suggestedClasses.find(c => c.number === num);
      return cls?.description || `Classe ${num}`;
    });
    return {
      ...brandData,
      selectedClasses: [...(brandData.selectedClasses || []), ...extraSelectedNumbers],
      classDescriptions: [...(brandData.classDescriptions || []), ...extraDescs],
    };
  }, [brandData, extraSelectedNumbers, suggestedClasses]);

  // Compute effective payment value
  const effectiveClassCount = effectiveBrandData.selectedClasses?.length || 1;
  const effectivePaymentValue = useMemo(() => {
    switch (paymentMethod) {
      case 'cartao6x': return pricing.cartao.value * effectiveClassCount;
      case 'boleto3x': return pricing.boleto.value * effectiveClassCount;
      default: return pricing.avista.value * effectiveClassCount;
    }
  }, [paymentMethod, effectiveClassCount, pricing]);

  const getProcessedContract = useCallback(() => {
    if (!template) return '';
    return replaceContractVariables(template.content, { personalData, brandData: effectiveBrandData, paymentMethod });
  }, [template, personalData, effectiveBrandData, paymentMethod]);

  const printContract = async () => {
    try {
      const contractContent = getProcessedContract();
      await printUnifiedContract({ content: contractContent, documentType, subject: brandData.brandName, signatoryName: personalData.fullName, signatoryCpf: personalData.cpf });
    } catch (error) {
      toast.error("Não foi possível abrir a janela de impressão.");
    }
  };

  const downloadContract = async () => {
    setIsDownloading(true);
    try {
      const contractContent = getProcessedContract();
      await downloadUnifiedContractPDF({ content: contractContent, documentType, subject: brandData.brandName, signatoryName: personalData.fullName, signatoryCpf: personalData.cpf });
    } catch (error) {
      toast.error("Erro ao abrir visualização do contrato.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSubmit = () => {
    if (!accepted) {
      toast.error("Por favor, leia e aceite o contrato para continuar.");
      return;
    }
    const contractContent = getProcessedContract();
    const fullContractHtml = generateContractPrintHTML(contractContent, effectiveBrandData.brandName, personalData.fullName, personalData.cpf, undefined, true, documentType);
    onSubmit(fullContractHtml, extraSelectedNumbers.length > 0 ? effectiveBrandData : undefined, extraSelectedNumbers.length > 0 ? effectivePaymentValue : undefined);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const getPaymentLabel = () => {
    switch (paymentMethod) {
      case 'avista': return 'PIX — À Vista';
      case 'cartao6x': return 'Cartão de Crédito (6x)';
      case 'boleto3x': return 'Boleto Parcelado (3x)';
      default: return 'Pagamento';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-muted" />
          <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
        <div className="text-center">
          <p className="font-medium">Preparando seu contrato...</p>
          <p className="text-sm text-muted-foreground mt-1">Aguarde um momento</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
          <FileText className="w-3.5 h-3.5" />
          Contrato Digital
        </div>
        <h2 className="text-2xl font-bold">Revise e Assine</h2>
        <p className="text-muted-foreground text-sm">Leia o contrato completo antes de confirmar.</p>
      </div>

      {/* Summary Card */}
      <div className="rounded-2xl border border-border bg-muted/20 overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resumo do Pedido</p>
        </div>
        <div className="grid grid-cols-2 gap-0 divide-x divide-border">
          {[
            { label: "Marca", value: brandData.brandName, highlight: false },
            { label: "Titular", value: personalData.fullName, highlight: false },
            { label: "Pagamento", value: getPaymentLabel(), highlight: false },
            { label: "Total", value: formatCurrency(effectivePaymentValue), highlight: true },
          ].map((item, i) => (
            <div key={i} className={cn("p-4", i >= 2 && "border-t border-border")}>
              <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
              <p className={cn("text-sm font-semibold truncate", item.highlight && "text-primary text-base")}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Contract Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={printContract} className="flex-1 h-9 rounded-lg text-xs">
          <Printer className="w-3.5 h-3.5 mr-1.5" />
          Imprimir
        </Button>
        <Button variant="outline" size="sm" onClick={downloadContract} disabled={isDownloading} className="flex-1 h-9 rounded-lg text-xs">
          {isDownloading ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5 mr-1.5" />
          )}
          Baixar PDF
        </Button>
      </div>

      {/* Contract Content */}
      <div className="rounded-2xl border-2 border-border overflow-hidden shadow-sm">
        <div className="bg-muted/40 px-4 py-3 border-b border-border flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Contrato de Prestação de Serviços</span>
          <div className="ml-auto flex items-center gap-1">
            <Shield className="w-3 h-3 text-emerald-500" />
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Protegido</span>
          </div>
        </div>
        <ScrollArea className="h-[360px]">
          <div className="p-5">
            <ContractRenderer
              content={getProcessedContract()}
              showLetterhead={true}
              showCertificationSection={false}
              documentType={documentType}
            />
          </div>
        </ScrollArea>
      </div>

      {/* NCL Classes Suggestion Card */}
      {hasSuggestions && (
        <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 p-2 rounded-xl shrink-0">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Classes NCL de Proteção</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Classes selecionadas e sugestões complementares do departamento jurídico.
              </p>
            </div>
          </div>

          {/* Already selected classes (locked) */}
          {alreadySelectedClasses.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Selecionadas no formulário</p>
              {alreadySelectedClasses.map(cls => (
                <div key={cls.number} className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <Checkbox checked disabled className="opacity-70" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">Classe NCL {cls.number}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{cls.description}</p>
                  </div>
                  <Check className="w-4 h-4 text-primary shrink-0" />
                </div>
              ))}
            </div>
          )}

          {/* Available classes for upsell */}
          {availableClasses.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Proteção complementar recomendada
              </p>
              {availableClasses.map(cls => {
                const isExtra = extraSelectedNumbers.includes(cls.number);
                return (
                  <div
                    key={cls.number}
                    onClick={() => setExtraSelectedNumbers(prev =>
                      isExtra ? prev.filter(n => n !== cls.number) : [...prev, cls.number]
                    )}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                      isExtra
                        ? "bg-primary/10 border-primary/30"
                        : "bg-card border-border hover:border-primary/30"
                    )}
                  >
                    <Checkbox checked={isExtra} onCheckedChange={() =>
                      setExtraSelectedNumbers(prev =>
                        isExtra ? prev.filter(n => n !== cls.number) : [...prev, cls.number]
                      )
                    } />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold">Classe NCL {cls.number}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{cls.description}</p>
                    </div>
                    <span className="text-[10px] font-medium text-primary whitespace-nowrap">
                      <Plus className="w-3 h-3 inline" /> {formatCurrency(
                        paymentMethod === 'cartao6x' ? pricing.cartao.value :
                        paymentMethod === 'boleto3x' ? pricing.boleto.value :
                        pricing.avista.value
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Updated total if extra classes selected */}
          {extraSelectedNumbers.length > 0 && (
            <div className="rounded-xl bg-card border border-border p-3 space-y-1">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Valor original ({brandData.selectedClasses?.length || 1} classe{(brandData.selectedClasses?.length || 1) > 1 ? 's' : ''}):</span>
                <span>{formatCurrency(paymentValue)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-primary font-medium">
                <span>+ {extraSelectedNumbers.length} classe(s) adicional(is):</span>
                <span>+ {formatCurrency(effectivePaymentValue - paymentValue)}</span>
              </div>
              <div className="border-t border-border pt-1 flex justify-between">
                <span className="text-xs font-bold">Novo total:</span>
                <span className="text-sm font-bold text-primary">{formatCurrency(effectivePaymentValue)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Accept Checkbox */}
      <motion.div
        className={cn(
          "flex items-start gap-3 p-4 rounded-xl border-2 transition-all duration-200",
          accepted
            ? "border-primary/30 bg-primary/5"
            : "border-border bg-muted/20"
        )}
        whileTap={{ scale: 0.99 }}
      >
        <Checkbox
          id="accept"
          checked={accepted}
          onCheckedChange={(checked) => setAccepted(!!checked)}
          className="mt-0.5 shrink-0"
        />
        <Label htmlFor="accept" className="text-sm leading-relaxed cursor-pointer">
          <span className="font-semibold">Li e aceito os termos do contrato</span> de prestação de serviços.
          Declaro que todas as informações fornecidas são verdadeiras e autorizo a
          WebMarcas Intelligence PI a prosseguir com o registro da marca junto ao INPI.
        </Label>
      </motion.div>

      {/* Submit */}
      <div className="space-y-3">
        <Button
          onClick={handleSubmit}
          className="w-full h-14 text-base font-semibold rounded-xl shadow-[var(--shadow-button)]"
          disabled={!accepted || isSubmitting}
          size="lg"
        >
          {isSubmitting ? (
            <motion.div
              className="flex items-center gap-3"
              animate={{ opacity: [1, 0.6, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Loader2 className="w-5 h-5 animate-spin" />
              Processando pagamento...
            </motion.div>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Finalizar e Pagar
              <Check className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>

        <Button type="button" variant="ghost" onClick={onBack} disabled={isSubmitting} className="w-full h-10 text-sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao pagamento
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
        <Lock className="w-3 h-3" />
        Dados protegidos com criptografia SSL
      </p>
    </motion.div>
  );
}

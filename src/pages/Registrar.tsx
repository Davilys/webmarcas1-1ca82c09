import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckoutProgress } from "@/components/cliente/checkout/CheckoutProgress";
import { ViabilityStep } from "@/components/cliente/checkout/ViabilityStep";
import { PersonalDataStep, type PersonalData } from "@/components/cliente/checkout/PersonalDataStep";
import { BrandDataStep, type BrandData } from "@/components/cliente/checkout/BrandDataStep";
import { PlanSelectionStep } from "@/components/cliente/checkout/PlanSelectionStep";
import { PaymentStep } from "@/components/cliente/checkout/PaymentStep";
import { ContractStep } from "@/components/cliente/checkout/ContractStep";
import { toast } from "sonner";
import { Moon, Sun, Award } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import SocialProofNotification from "@/components/SocialProofNotification";
import type { ViabilityResult } from "@/lib/api/viability";
import type { PlanType } from "@/hooks/useContractTemplate";
import logo from "@/assets/webmarcas-logo.png";
import WhatsAppButton from "@/components/layout/WhatsAppButton";
import { TrustStrip } from "@/components/registrar/TrustStrip";
import { StickyMobileCTA } from "@/components/registrar/StickyMobileCTA";
import { PageMeta } from "@/components/seo/PageMeta";

export default function Registrar() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [viabilityData, setViabilityData] = useState<{
    brandName: string;
    businessArea: string;
    result: ViabilityResult;
  } | null>(null);
  
  const [personalData, setPersonalData] = useState<PersonalData | null>(null);
  const [brandData, setBrandData] = useState<BrandData | null>(null);
  const [plan, setPlan] = useState<PlanType>("essencial");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [paymentValue, setPaymentValue] = useState<number>(0);

  // NCL classes state
  const [suggestedClasses, setSuggestedClasses] = useState<number[]>([]);
  const [suggestedClassDescriptions, setSuggestedClassDescriptions] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);

  // Pre-fill personal data if user is logged in and check for viability data
  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (profile) {
          setPersonalData({
            fullName: profile.full_name || '',
            email: profile.email || '',
            phone: profile.phone || '',
            cpf: profile.cpf_cnpj || '',
            cep: profile.zip_code || '',
            address: profile.address || '',
            addressNumber: '',
            city: profile.city || '',
            state: profile.state || '',
            neighborhood: profile.neighborhood || '',
          });
        }
      }
    };
    fetchUserData();

    // Check for pre-filled lead from /lp landing page
    const lpLeadRaw = sessionStorage.getItem('lpLead');
    if (lpLeadRaw) {
      try {
        const lp = JSON.parse(lpLeadRaw);
        if (lp.fullName || lp.email || lp.phone) {
          setPersonalData((prev) => ({
            fullName: lp.fullName || prev?.fullName || '',
            email: lp.email || prev?.email || '',
            phone: lp.phone || prev?.phone || '',
            cpf: prev?.cpf || '',
            cep: prev?.cep || '',
            address: prev?.address || '',
            addressNumber: prev?.addressNumber || '',
            city: prev?.city || '',
            state: prev?.state || '',
            neighborhood: prev?.neighborhood || '',
          }));
        }
        if (lp.brandName) {
          setViabilityData({
            brandName: lp.brandName,
            businessArea: '',
            result: {
              success: true,
              level: 'medium',
              title: 'Análise pendente',
              description: 'Continue para realizar a consulta de viabilidade.',
              classes: [],
              classDescriptions: [],
            },
          });
        }
        sessionStorage.removeItem('lpLead');
      } catch (e) {
        console.error('Error parsing lpLead:', e);
      }
    }

    // Check for pre-filled viability data from ViabilitySearchSection (Index page)
    const storedData = sessionStorage.getItem('viabilityData');
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        if (parsed.brandName && parsed.businessArea && parsed.level) {
          const viabilityResult: ViabilityResult = {
            success: true,
            level: parsed.level,
            title: parsed.level === 'high' ? 'Alta Viabilidade' : 
                   parsed.level === 'medium' ? 'Viabilidade Média' : 
                   parsed.level === 'low' ? 'Baixa Viabilidade' : 'Marca Bloqueada',
            description: 'Viabilidade já verificada anteriormente.',
            classes: parsed.classes || [],
            classDescriptions: parsed.classDescriptions || [],
          };
          setViabilityData({
            brandName: parsed.brandName,
            businessArea: parsed.businessArea,
            result: viabilityResult,
          });
          if (Array.isArray(parsed.classes)) {
            setSuggestedClasses(parsed.classes);
            setSuggestedClassDescriptions(parsed.classDescriptions || []);
          }
          setStep(2);
          sessionStorage.removeItem('viabilityData');
        }
      } catch (e) {
        console.error('Error parsing viability data:', e);
      }
    }
  }, []);

  const handleViabilityNext = (brandName: string, businessArea: string, result: ViabilityResult) => {
    setViabilityData({ brandName, businessArea, result });
    if (Array.isArray(result.classes) && result.classes.length > 0) {
      setSuggestedClasses(result.classes);
      setSuggestedClassDescriptions(result.classDescriptions || []);
    }
    setStep(2);
  };

  const handlePersonalDataNext = (data: PersonalData) => {
    setPersonalData(data);
    setStep(3);
  };

  const handleBrandDataNext = (data: BrandData) => {
    setBrandData(data);
    setStep(4); // Plan selection
  };

  const handlePlanNext = (selectedPlan: PlanType) => {
    setPlan(selectedPlan);
    setStep(5); // Payment
  };

  const handlePaymentNext = (method: string, value: number) => {
    setPaymentMethod(method);
    setPaymentValue(value);
    setStep(6); // Contract
  };

  const handleSubmit = async (contractHtml: string) => {
    if (!personalData || !brandData || !viabilityData) {
      toast.error("Dados incompletos. Por favor, revise as etapas anteriores.");
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedClassDescriptions = selectedClasses.map(cls => {
        const idx = suggestedClasses.indexOf(cls);
        return idx >= 0 ? suggestedClassDescriptions[idx] : `Classe ${cls}`;
      });

      const { data, error } = await supabase.functions.invoke('create-asaas-payment', {
        body: {
          personalData: {
            ...personalData,
            neighborhood: personalData.neighborhood || '',
          },
          brandData: {
            ...brandData,
            businessArea: viabilityData.businessArea,
          },
          paymentMethod,
          paymentValue,
          contractHtml,
          selectedClasses,
          classDescriptions: selectedClassDescriptions,
          suggestedClasses,
          suggestedClassDescriptions,
          plan,
        },
      });

      if (error) throw error;

      if (data?.success) {
        const orderData = {
          personalData: {
            ...personalData,
            neighborhood: personalData.neighborhood || '',
          },
          brandData: {
            ...brandData,
            businessArea: viabilityData.businessArea,
          },
          paymentMethod,
          paymentValue,
          acceptedAt: new Date().toISOString(),
          leadId: data.leadId,
          contractId: data.contractId,
          invoiceId: data.invoiceId,
          contractNumber: data.contractNumber,
          plan,
          asaas: {
            customerId: data.customerId,
            asaasCustomerId: data.asaasCustomerId || data.customerId,
            paymentId: data.paymentId,
            status: data.status || 'PENDING',
            billingType: data.billingType,
            dueDate: data.dueDate,
            invoiceUrl: data.invoiceUrl,
            bankSlipUrl: data.bankSlipUrl,
            pixQrCode: data.pixQrCode,
          },
        };
        
        sessionStorage.setItem('orderData', JSON.stringify(orderData));
        toast.success("Pedido realizado com sucesso!");
        navigate('/status-pedido');
      } else {
        throw new Error(data?.error || 'Erro ao processar pagamento');
      }
    } catch (error: any) {
      console.error('Error submitting order:', error);
      toast.error(error.message || "Erro ao processar o pedido. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <PageMeta
        title="Registrar Marca no INPI Online | Protocolo em 48h - WebMarcas"
        description="Registre sua marca no INPI 100% online. Consulta de viabilidade gratuita, protocolo em 48h e certificação Blockchain. Comece agora."
        canonical="https://webmarcas.net/registrar"
      />
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-hero-gradient" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-primary/3 rounded-full blur-2xl" />

      {/* Social Proof Notifications — hidden on step 1 to keep first focus on the form */}
      {step > 1 && <SocialProofNotification />}

      {/* Header with logo and theme toggle */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <a href="/" className="flex items-center gap-2 group">
              <img src={logo} alt="WebMarcas" className="h-10 transition-transform group-hover:scale-105" />
              <span className="font-display text-xl font-bold hidden sm:inline">
                Web<span className="gradient-text">Marcas</span>
              </span>
            </a>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="w-9 h-9 rounded-lg"
              aria-label="Alternar tema"
            >
              {theme === "light" ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 w-full max-w-2xl mx-auto px-4 pt-20 pb-24 md:pb-8 md:pt-24">
        {step === 1 ? (
          <>
            {/* Landing-style Hero (step 1) */}
            <div className="flex justify-center mb-3 md:mb-5 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/15 border border-accent/30 text-accent-foreground text-[11px] sm:text-xs font-bold tracking-wide">
                <Award className="w-3.5 h-3.5 text-accent" />
                <span className="text-foreground/90">PROTOCOLO INPI EM ATÉ 48H</span>
              </div>
            </div>

            <div className="text-center mb-5 md:mb-8">
              <h1 className="font-display text-[26px] leading-[1.15] sm:text-4xl md:text-5xl font-bold mb-3 md:mb-4 tracking-tight">
                Proteja sua marca antes que{" "}
                <span className="gradient-text">alguém registre primeiro</span>
              </h1>
              <p className="text-sm md:text-lg text-muted-foreground max-w-xl mx-auto">
                Consulta de viabilidade gratuita no INPI + análise técnica em minutos. Processo 100% online conduzido por especialistas.
              </p>
            </div>

            {/* Lightweight progress hint instead of full stepper above the form */}
            <div className="flex items-center justify-center gap-2 mb-4 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground font-bold text-[10px]">1</span>
              <span>Passo 1 de 6 · leva ~2 min</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-center mb-4 md:mb-6 animate-fade-in">
              <div className="inline-flex items-center gap-2 badge-premium">
                <Award className="w-4 h-4" />
                <span>{t("hero.badge")}</span>
              </div>
            </div>

            <CheckoutProgress currentStep={step} />
          </>
        )}

        {/* Form card */}
        <Card data-registrar-form className="shadow-xl border border-border bg-card/95 backdrop-blur-sm">
          <CardContent className="p-6 md:p-8">
            {step === 1 && (
              <ViabilityStep onNext={handleViabilityNext} />
            )}

            {step === 2 && personalData !== null && (
              <PersonalDataStep
                initialData={personalData}
                onNext={handlePersonalDataNext}
                onBack={() => setStep(1)}
              />
            )}

            {step === 2 && personalData === null && (
              <PersonalDataStep
                initialData={{
                  fullName: '', email: '', phone: '', cpf: '',
                  cep: '', address: '', addressNumber: '', city: '', state: '', neighborhood: '',
                }}
                onNext={handlePersonalDataNext}
                onBack={() => setStep(1)}
              />
            )}

            {step === 3 && (
              <BrandDataStep
                initialData={{
                  brandName: viabilityData?.brandName || '',
                  businessArea: viabilityData?.businessArea || '',
                  hasCNPJ: false, cnpj: '', companyName: '',
                }}
                onNext={handleBrandDataNext}
                onBack={() => setStep(2)}
                suggestedClasses={suggestedClasses}
                suggestedClassDescriptions={suggestedClassDescriptions}
                selectedClasses={selectedClasses}
                onSelectedClassesChange={setSelectedClasses}
              />
            )}

            {step === 4 && (
              <PlanSelectionStep
                selectedPlan={plan}
                onNext={handlePlanNext}
                onBack={() => setStep(3)}
              />
            )}

            {step === 5 && (
              <PaymentStep
                selectedMethod={paymentMethod}
                onNext={handlePaymentNext}
                onBack={() => setStep(4)}
                classCount={selectedClasses.length > 0 ? selectedClasses.length : 1}
                plan={plan}
              />
            )}

            {step === 6 && personalData && brandData && (
              <ContractStep
                personalData={personalData}
                brandData={{
                  ...brandData,
                  businessArea: viabilityData?.businessArea || brandData.businessArea,
                }}
                paymentMethod={paymentMethod}
                paymentValue={paymentValue}
                onBack={() => setStep(5)}
                onSubmit={(html) => handleSubmit(html)}
                isSubmitting={isSubmitting}
                selectedClasses={selectedClasses}
                classDescriptions={selectedClasses.map(cls => {
                  const idx = suggestedClasses.indexOf(cls);
                  return idx >= 0 ? suggestedClassDescriptions[idx] : `Classe ${cls}`;
                })}
                suggestedClasses={suggestedClasses}
                suggestedClassDescriptions={suggestedClassDescriptions}
                onSelectedClassesChange={setSelectedClasses}
                onPaymentValueChange={setPaymentValue}
                plan={plan}
              />
            )}
          </CardContent>
        </Card>

        {/* Trust strip — only on the first step to reinforce credibility */}
        {step === 1 && <TrustStrip />}

        {/* Footer text */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Ao continuar, você concorda com nossos{" "}
          <a href="/termos-de-uso" className="underline hover:text-primary transition-colors">Termos de Uso</a>
          {" "}e{" "}
          <a href="/politica-de-privacidade" className="underline hover:text-primary transition-colors">Política de Privacidade</a>.
        </p>
      </main>

      {/* Sticky mobile CTA — appears from step 2 onward when form is scrolled out */}
      <StickyMobileCTA currentStep={step} />

      {/* WhatsApp Floating Button */}
      <WhatsAppButton />
    </div>
  );
}

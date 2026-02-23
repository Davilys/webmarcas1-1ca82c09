import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckoutProgress } from "@/components/cliente/checkout/CheckoutProgress";
import { ViabilityStep } from "@/components/cliente/checkout/ViabilityStep";
import { PersonalDataStep, type PersonalData } from "@/components/cliente/checkout/PersonalDataStep";
import { BrandDataStep, type BrandData } from "@/components/cliente/checkout/BrandDataStep";
import { PaymentStep } from "@/components/cliente/checkout/PaymentStep";
import { ContractStep } from "@/components/cliente/checkout/ContractStep";
import type { ViabilityResult } from "@/lib/api/viability";

interface ViabilityData {
  brandName: string;
  businessArea: string;
  result: ViabilityResult;
}

const RegistrationFormSection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form data states
  const [viabilityData, setViabilityData] = useState<ViabilityData | null>(null);
  const [personalData, setPersonalData] = useState<PersonalData | null>(null);
  const [brandData, setBrandData] = useState<BrandData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentValue, setPaymentValue] = useState(0);

  // Track if form_started email was already triggered
  const [formStartedTriggered, setFormStartedTriggered] = useState(false);

  // Check for pre-filled viability data from ViabilitySearchSection
  useEffect(() => {
    const storedData = sessionStorage.getItem('viabilityData');
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        if (parsed.brandName && parsed.businessArea && parsed.level) {
          // Create a viability result from stored data
          const viabilityResult: ViabilityResult = {
            success: true,
            level: parsed.level,
            title: parsed.level === 'high' ? 'Alta Viabilidade' : 
                   parsed.level === 'medium' ? 'Viabilidade Média' : 
                   parsed.level === 'low' ? 'Baixa Viabilidade' : 'Marca Bloqueada',
            description: 'Viabilidade já verificada anteriormente.',
          };
          setViabilityData({
            brandName: parsed.brandName,
            businessArea: parsed.businessArea,
            result: viabilityResult,
          });
          // Skip to step 2 (personal data)
          setStep(2);
          // Clear the stored data to prevent re-use
          sessionStorage.removeItem('viabilityData');
        }
      } catch (e) {
        console.error('Error parsing viability data:', e);
      }
    }
  }, []);

  // Handlers
  const handleViabilityNext = useCallback((brandName: string, businessArea: string, result: ViabilityResult) => {
    setViabilityData({ brandName, businessArea, result });
    setStep(2);
    scrollToForm();
  }, []);

  const handlePersonalDataNext = useCallback(async (data: PersonalData) => {
    setPersonalData(data);
    setStep(3);
    scrollToForm();

    // Trigger form_started email automation (only once)
    if (!formStartedTriggered && data.email) {
      setFormStartedTriggered(true);
      try {
        await supabase.functions.invoke('trigger-email-automation', {
          body: {
            trigger_event: 'form_started',
            create_lead: true,
            data: {
              nome: data.fullName,
              email: data.email,
              phone: data.phone || null,
              marca: viabilityData?.brandName || 'Sua Marca',
              base_url: window.location.origin,
            },
          },
        });
        console.log('Form started email triggered successfully');
      } catch (error) {
        console.error('Error triggering form_started:', error);
      }
    }
  }, [formStartedTriggered, viabilityData?.brandName]);

  const handleBrandDataNext = useCallback((data: BrandData) => {
    setBrandData(data);
    setStep(4);
    scrollToForm();
  }, []);

  const handlePaymentNext = useCallback((method: string, value: number) => {
    setPaymentMethod(method);
    setPaymentValue(value);
    setStep(5);
    scrollToForm();
  }, []);

  const handleContractSubmit = useCallback(async (contractHtml: string) => {
    if (!personalData || !brandData) {
      toast({
        title: "Erro",
        description: "Dados incompletos. Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Call Asaas edge function to create payment and lead
      const { data, error } = await supabase.functions.invoke('create-asaas-payment', {
        body: {
          personalData: {
            fullName: personalData.fullName,
            email: personalData.email,
            phone: personalData.phone,
            cpf: personalData.cpf,
            cep: personalData.cep,
            address: personalData.address,
            addressNumber: personalData.addressNumber,
            neighborhood: personalData.neighborhood,
            city: personalData.city,
            state: personalData.state,
          },
          brandData: {
            brandName: brandData.brandName,
            businessArea: brandData.businessArea,
            hasCNPJ: brandData.hasCNPJ,
            cnpj: brandData.cnpj,
            companyName: brandData.companyName,
          },
          paymentMethod,
          paymentValue,
          contractHtml,
        },
      });

      if (error) {
        console.error('Asaas payment error:', error);
        throw new Error(error.message || 'Erro ao processar pagamento');
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao criar cobrança');
      }

      console.log('Asaas payment created:', data);

      // Save order data for payment page
      const orderData = {
        personalData: {
          fullName: personalData.fullName,
          email: personalData.email,
          phone: personalData.phone,
          cpf: personalData.cpf,
          cep: personalData.cep,
          address: personalData.address,
          addressNumber: personalData.addressNumber,
          neighborhood: personalData.neighborhood,
          city: personalData.city,
          state: personalData.state,
        },
        brandData: {
          brandName: brandData.brandName,
          businessArea: brandData.businessArea,
          hasCNPJ: brandData.hasCNPJ,
          cnpj: brandData.cnpj,
          companyName: brandData.companyName,
        },
        paymentMethod,
        paymentValue,
        contractHtml,
        acceptedAt: new Date().toISOString(),
        leadId: data.leadId,
        contractId: data.contractId,
        contractNumber: data.contractNumber,
        invoiceId: data.invoiceId,
        asaas: {
          customerId: data.customerId,
          asaasCustomerId: data.asaasCustomerId,
          paymentId: data.paymentId,
          status: data.status,
          billingType: data.billingType,
          dueDate: data.dueDate,
          invoiceUrl: data.invoiceUrl,
          bankSlipUrl: data.bankSlipUrl,
          pixQrCode: data.pixQrCode,
        },
      };

      sessionStorage.setItem("orderData", JSON.stringify(orderData));

      toast({
        title: "Cobrança criada com sucesso!",
        description: "Você será redirecionado para a página de pagamento.",
      });

      navigate("/status-pedido");
    } catch (err) {
      console.error('Submit error:', err);
      toast({
        title: "Erro ao processar",
        description: err instanceof Error ? err.message : "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [personalData, brandData, paymentMethod, paymentValue, navigate, toast]);

  const scrollToForm = () => {
    document.getElementById('registro')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleBack = (targetStep: number) => {
    setStep(targetStep);
    scrollToForm();
  };

  // Build initial personal data with empty values
  const getInitialPersonalData = (): PersonalData => ({
    fullName: "",
    email: "",
    phone: "",
    cpf: "",
    cep: "",
    address: "",
    addressNumber: "",
    neighborhood: "",
    city: "",
    state: "",
  });

  // Build initial brand data from viability step
  const getInitialBrandData = (): BrandData => ({
    brandName: viabilityData?.brandName || "",
    businessArea: viabilityData?.businessArea || "",
    hasCNPJ: false,
    cnpj: "",
    companyName: "",
  });

  return (
    <section id="registro" className="section-padding bg-card relative overflow-hidden">
      {/* Background */}
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="badge-premium mb-4 inline-flex">Formulário de Registro</span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Registre sua{" "}
            <span className="gradient-text">marca agora</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Preencha o formulário abaixo para iniciar o processo de registro.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="max-w-2xl mx-auto mb-12">
          <CheckoutProgress currentStep={step} />
        </div>

        {/* Form */}
        <div className="max-w-xl mx-auto">
          <div className="glass-card p-8">
            {/* Step 1: Viability */}
            {step === 1 && (
              <ViabilityStep onNext={handleViabilityNext} />
            )}

            {/* Step 2: Personal Data */}
            {step === 2 && (
              <PersonalDataStep
                initialData={personalData || getInitialPersonalData()}
                onNext={handlePersonalDataNext}
                onBack={() => handleBack(1)}
              />
            )}

            {/* Step 3: Brand Data */}
            {step === 3 && (
              <BrandDataStep
                initialData={brandData || getInitialBrandData()}
                onNext={handleBrandDataNext}
                onBack={() => handleBack(2)}
              />
            )}

            {/* Step 4: Payment */}
            {step === 4 && (
              <PaymentStep
                selectedMethod={paymentMethod}
                onNext={handlePaymentNext}
                onBack={() => handleBack(3)}
              />
            )}

            {/* Step 5: Contract */}
            {step === 5 && personalData && brandData && (
              <ContractStep
                personalData={personalData}
                brandData={brandData}
                paymentMethod={paymentMethod}
                paymentValue={paymentValue}
                onSubmit={handleContractSubmit}
                onBack={() => handleBack(4)}
                isSubmitting={isSubmitting}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default RegistrationFormSection;

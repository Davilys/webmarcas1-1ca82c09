import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (!ASAAS_API_KEY) {
      throw new Error("ASAAS_API_KEY não configurada");
    }

    const {
      invoiceId,
      customerId,
      value,
      installmentCount,
      installmentValue,
      creditCard,
      creditCardHolderInfo,
      dueDate,
      contractId,
      plan, // 'essencial' | 'premium' | 'corporativo'
      brandName, // For subscription description
    } = await req.json();

    const effectivePlan = plan || 'essencial';
    const isRecurringPlan = effectivePlan === 'premium' || effectivePlan === 'corporativo';

    console.log("=== CREDIT CARD PAYMENT START ===");
    console.log("Invoice ID:", invoiceId);
    console.log("Customer ID:", customerId);
    console.log("Value:", value);
    console.log("Plan:", effectivePlan, "| Recurring:", isRecurringPlan);
    console.log("Installments:", installmentCount, "x", installmentValue);
    console.log("Contract ID:", contractId);
    console.log("Holder:", creditCardHolderInfo?.name);

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || 
                     req.headers.get("x-real-ip") || 
                     "unknown";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const cardData = {
      holderName: creditCard.holderName,
      number: creditCard.number.replace(/\s/g, ""),
      expiryMonth: creditCard.expiryMonth,
      expiryYear: creditCard.expiryYear,
      ccv: creditCard.ccv,
    };

    const holderData = {
      name: creditCardHolderInfo.name,
      email: creditCardHolderInfo.email,
      cpfCnpj: creditCardHolderInfo.cpfCnpj.replace(/\D/g, ""),
      postalCode: creditCardHolderInfo.postalCode.replace(/\D/g, ""),
      addressNumber: creditCardHolderInfo.addressNumber || "S/N",
      phone: creditCardHolderInfo.phone?.replace(/\D/g, "") || "",
    };

    let paymentData: Record<string, unknown>;
    let paymentResponse: Response;

    if (isRecurringPlan) {
      // ============================
      // RECURRING PLAN: Create SUBSCRIPTION in Asaas
      // ============================
      const subscriptionDescription = brandName 
        ? `Plano ${effectivePlan === 'premium' ? 'Premium' : 'Corporativo'} - ${brandName}`
        : `Plano ${effectivePlan === 'premium' ? 'Premium' : 'Corporativo'} - WebMarcas`;

      const subscriptionPayload = {
        customer: customerId,
        billingType: "CREDIT_CARD",
        value: value,
        nextDueDate: dueDate || new Date().toISOString().split("T")[0],
        cycle: "MONTHLY",
        description: subscriptionDescription,
        creditCard: cardData,
        creditCardHolderInfo: holderData,
        remoteIp: clientIp,
        externalReference: `webmarcas_${effectivePlan}_${Date.now()}`,
      };

      console.log("Creating SUBSCRIPTION with payload (card masked):", JSON.stringify({
        ...subscriptionPayload,
        creditCard: { holderName: cardData.holderName, number: '****' },
      }));

      paymentResponse = await fetch("https://api.asaas.com/v3/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": ASAAS_API_KEY,
        },
        body: JSON.stringify(subscriptionPayload),
      });

      paymentData = await paymentResponse.json();
      console.log("=== ASAAS SUBSCRIPTION RESPONSE ===");
      console.log("Status:", paymentData.status);
      console.log("Subscription ID:", paymentData.id);
      console.log("Full response:", JSON.stringify(paymentData, null, 2));

    } else {
      // ============================
      // ESSENCIAL PLAN: One-time installment payment
      // ============================
      const paymentPayload: Record<string, unknown> = {
        customer: customerId,
        billingType: "CREDIT_CARD",
        dueDate: dueDate || new Date().toISOString().split("T")[0],
        description: "Registro de Marca - WebMarcas",
        creditCard: cardData,
        creditCardHolderInfo: holderData,
        remoteIp: clientIp,
      };

      if (installmentCount && installmentCount > 1) {
        paymentPayload.installmentCount = installmentCount;
        paymentPayload.installmentValue = installmentValue;
      } else {
        paymentPayload.value = value;
      }

      console.log("Sending one-time payment to Asaas (card details masked)");

      paymentResponse = await fetch("https://api.asaas.com/v3/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": ASAAS_API_KEY,
        },
        body: JSON.stringify(paymentPayload),
      });

      paymentData = await paymentResponse.json();
      console.log("=== ASAAS RESPONSE ===");
      console.log("Status:", paymentData.status);
      console.log("Payment ID:", paymentData.id);
      console.log("Full response:", JSON.stringify(paymentData, null, 2));
    }

    if (!paymentResponse.ok) {
      console.error("Asaas error:", paymentData);
      
      let errorMessage = "Erro ao processar pagamento";
      
      if (paymentData.errors && Array.isArray(paymentData.errors) && paymentData.errors.length > 0) {
        const error = paymentData.errors[0] as Record<string, string>;
        if (error.code === "invalid_creditCard") {
          errorMessage = "Dados do cartão inválidos. Verifique o número, validade e CVV.";
        } else if (error.code === "invalid_creditCardHolderInfo") {
          errorMessage = "Dados do titular inválidos. Verifique CPF e CEP.";
        } else if (error.description) {
          errorMessage = error.description;
        }
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          details: paymentData.errors 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Check authorization status
    const status = paymentData.status as string;
    if (!isRecurringPlan && status === "REFUSED") {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Pagamento recusado pela operadora do cartão. Tente outro cartão.",
          status
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Update invoice in database
    const asaasId = paymentData.id as string;
    if (asaasId && invoiceId) {
      const isPaid = status === "CONFIRMED" || status === "RECEIVED" || (isRecurringPlan && status === "ACTIVE");
      const { error: updateError } = await supabase
        .from("invoices")
        .update({
          asaas_invoice_id: asaasId,
          invoice_url: (paymentData.invoiceUrl as string) || null,
          boleto_code: null,
          pix_code: null,
          payment_method: 'credit_card',
          status: isPaid ? "paid" : "pending",
          payment_date: isPaid ? new Date().toISOString() : null,
        })
        .eq("id", invoiceId);

      if (updateError) {
        console.error("Error updating invoice:", updateError);
      } else {
        console.log("Updated invoice:", invoiceId, "with Asaas ID:", asaasId);
      }
    }

    // Update contract with Asaas payment/subscription ID
    if (asaasId && contractId) {
      const { error: contractError } = await supabase
        .from("contracts")
        .update({
          asaas_payment_id: asaasId,
        })
        .eq("id", contractId);

      if (contractError) {
        console.error("Error updating contract:", contractError);
      } else {
        console.log("Updated contract:", contractId, "with Asaas ID:", asaasId);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: asaasId,
        status: status,
        isSubscription: isRecurringPlan,
        invoiceUrl: paymentData.invoiceUrl,
        transactionReceiptUrl: paymentData.transactionReceiptUrl,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error processing credit card payment:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro interno ao processar pagamento";
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

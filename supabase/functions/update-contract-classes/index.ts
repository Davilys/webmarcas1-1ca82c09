import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contractId, selectedClassNumbers } = await req.json();

    if (!contractId || !selectedClassNumbers || !Array.isArray(selectedClassNumbers) || selectedClassNumbers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'contractId e selectedClassNumbers são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch current contract
    const { data: contract, error: fetchError } = await supabase
      .from('contracts')
      .select('id, contract_html, contract_value, suggested_classes, signature_status, payment_method')
      .eq('id', contractId)
      .single();

    if (fetchError || !contract) {
      return new Response(
        JSON.stringify({ error: 'Contrato não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (contract.signature_status === 'signed') {
      return new Response(
        JSON.stringify({ error: 'Contrato já foi assinado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const suggestedClasses = (contract.suggested_classes as any[]) || [];
    if (suggestedClasses.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma classe sugerida disponível' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark selected classes
    const updatedSuggestedClasses = suggestedClasses.map((cls: any) => ({
      ...cls,
      selected: selectedClassNumbers.includes(cls.number),
    }));

    const newlySelectedCount = selectedClassNumbers.length;
    const baseValue = contract.contract_value || 699;

    // Determine per-class price based on payment method
    let perClassPrice: number;
    switch (contract.payment_method) {
      case 'cartao6x':
        perClassPrice = 1194;
        break;
      case 'boleto3x':
        perClassPrice = 1197;
        break;
      default: // avista/pix
        perClassPrice = 699;
        break;
    }

    const newValue = baseValue + (perClassPrice * newlySelectedCount);

    // Update contract_html: inject new classes into clause 1.1
    let updatedHtml = contract.contract_html || '';
    
    // Build classes text for contract
    const selectedClassesText = updatedSuggestedClasses
      .filter((cls: any) => cls.selected)
      .map((cls: any) => `Classe NCL ${cls.number} (${cls.description})`)
      .join('; ');

    if (selectedClassesText && updatedHtml) {
      // Try to inject after existing class reference in clause 1.1
      // Look for pattern like "Classe NCL" or "classe(s)" and append
      const classPattern = /(Classe\s+NCL\s+\d+[^.;]*)/i;
      if (classPattern.test(updatedHtml)) {
        updatedHtml = updatedHtml.replace(classPattern, `$1; ${selectedClassesText}`);
      }
    }

    // Update contract value text in HTML
    const currencyFormat = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    const oldValueStr = currencyFormat.format(baseValue);
    const newValueStr = currencyFormat.format(newValue);
    if (updatedHtml.includes(oldValueStr)) {
      updatedHtml = updatedHtml.replace(new RegExp(oldValueStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newValueStr);
    }

    // Update in database
    const { error: updateError } = await supabase
      .from('contracts')
      .update({
        contract_value: newValue,
        contract_html: updatedHtml,
        suggested_classes: updatedSuggestedClasses,
      })
      .eq('id', contractId);

    if (updateError) {
      console.error('Error updating contract:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar contrato' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        contract: {
          ...contract,
          contract_value: newValue,
          contract_html: updatedHtml,
          suggested_classes: updatedSuggestedClasses,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in update-contract-classes:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

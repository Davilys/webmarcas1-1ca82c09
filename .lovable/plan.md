

# Update Corporativo Plan: R$1.194 → R$1.621 + Contract Clause 5 Rewrite

## What changes

Update the Corporativo plan price from R$1.194,00/mês to R$1.621,00/mês across the entire system, and rewrite Clause 5 in the Corporativo contract template to include the salary minimum annual adjustment clause as specified.

## Files to modify

### 1. Website Pricing Section
**`src/components/sections/PricingSection.tsx`** (~line 249)
- Change `R$1.194` to `R$1.621`

### 2. Contract Template (Clause 5)
**`src/hooks/useContractTemplate.ts`**
- Line 233: Update comment from R$1.194 to R$1.621
- Lines 270-275: Replace entire Clause 5 with the user-provided text (5.1 through 5.5), including the new 5.2 salary minimum adjustment clause
- Line 521: Update recurring payment detail from `R$ 1.194,00` to `R$ 1.621,00`

### 3. Admin Contract Creation Dialog
**`src/components/admin/contracts/CreateContractDialog.tsx`**
- Line 2187: Change price label from `R$ 1.194/mês` to `R$ 1.621/mês`

### 4. Client Checkout Payment Step
**`src/components/cliente/checkout/PaymentStep.tsx`** (~line 50)
- Change corporativo base recurring from `1194` to `1621`

### 5. Asaas Payment Edge Function
**`supabase/functions/create-asaas-payment/index.ts`** (~line 99)
- Update corporativo-related value if applicable (need to verify if this is corporativo-specific or essencial-specific)

## What stays the same
- Essencial plan pricing (R$699 à vista / 6x R$199 / 3x R$399) — unchanged
- Premium plan pricing (R$398/mês) — unchanged
- The `usePricing.ts` default values (these are for the Essencial plan, not Corporativo)

## Contract Clause 5 — New Text
The exact text provided by the user will be used, with R$1.621,00 values and the salary minimum annual adjustment in clause 5.2.


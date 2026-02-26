

# Aplicar Validade do Link de Assinatura das Configuracoes

## Problema

A configuracao "Validade do Link de Assinatura" salva na tabela `system_settings` (key: `contracts`) nao esta sendo utilizada. O valor `expiresInDays: 7` esta **hardcoded** em 5 locais:

1. `ContractDetailSheet.tsx` (linha 410) - Gerar link
2. `ContractDetailSheet.tsx` (linha 544) - Regenerar link
3. `CreateContractDialog.tsx` (linha 882) - Criar contrato
4. `CreateContractDialog.tsx` (linha 914) - Criar contrato (2o fluxo)
5. `create-asaas-payment/index.ts` (linha 1101) - Checkout automatico

## Solucao

### 1. Edge Function `generate-signature-link` - Ler configuracao do banco

Quando `expiresInDays` nao for enviado (ou for o default 7), a funcao consulta `system_settings` para obter o valor configurado:

```
// Antes de calcular a expiracao:
const { data: settingsRow } = await supabase
  .from('system_settings')
  .select('value')
  .eq('key', 'contracts')
  .single();

const configuredDays = settingsRow?.value?.linkValidityDays || 7;
const finalDays = expiresInDays !== 7 ? expiresInDays : configuredDays;
```

Isso garante que TODOS os chamadores (mesmo os que ainda enviam 7) respeitem a configuracao central.

### 2. Frontend - Remover hardcode nos 4 arquivos

Nos componentes `ContractDetailSheet.tsx` e `CreateContractDialog.tsx`, remover o `expiresInDays: 7` do body da requisicao, deixando a edge function usar o valor do banco:

- Remover `expiresInDays: 7` de todas as chamadas ao `generate-signature-link`
- A edge function assume o valor das configuracoes automaticamente

### 3. Edge Function `create-asaas-payment` - Remover hardcode

Na linha 1101, remover `expiresInDays: 7` do body enviado ao `generate-signature-link`.

### 4. Atualizar contratos nao assinados existentes

Na acao de salvar as configuracoes (`ContractSettings.tsx`), apos salvar no `system_settings`, disparar um UPDATE em massa nos contratos nao assinados para recalcular `signature_expires_at` com base na nova validade:

```sql
UPDATE contracts
SET signature_expires_at = created_at + interval '1 day' * NEW_DAYS
WHERE signature_status IN ('pending', 'sent')
  AND signature_expires_at IS NOT NULL;
```

Isso sera feito via uma chamada RPC ou diretamente no frontend apos o save.

## Arquivos a Alterar

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/generate-signature-link/index.ts` | Ler `linkValidityDays` do `system_settings` |
| `src/components/admin/contracts/ContractDetailSheet.tsx` | Remover `expiresInDays: 7` (2 locais) |
| `src/components/admin/contracts/CreateContractDialog.tsx` | Remover `expiresInDays: 7` (2 locais) |
| `supabase/functions/create-asaas-payment/index.ts` | Remover `expiresInDays: 7` |
| `src/components/admin/settings/ContractSettings.tsx` | Apos salvar, atualizar `signature_expires_at` dos contratos pendentes |

## Resultado

- Alterar para 30 dias nas Configuracoes aplica imediatamente a:
  - Todos os novos contratos gerados
  - Todos os contratos pendentes/nao assinados (recalcula expiracao)
  - Checkout automatico (create-asaas-payment)
  - Regeneracao de links existentes


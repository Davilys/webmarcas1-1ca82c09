
# Upsell de Classes NCL na Pagina de Assinatura (AssinarDocumento)

## Resumo
Adicionar um card de "Protecao Recomendada pelo Juridico" na pagina de assinatura (`/assinar/:token`), exibindo as classes NCL sugeridas que NAO foram selecionadas pelo admin. Quando o cliente selecionar classes extras, o contrato (clausula 1.1 e 5.1) e os valores sao atualizados reativamente. Ao assinar, o sistema salva o contrato atualizado no banco antes de disparar o pagamento com o valor correto.

## Alteracoes Necessarias

### Arquivo 1: `supabase/functions/get-contract-by-token/index.ts`
- Adicionar `suggested_classes` e `contract_value` na query SELECT (linhas 33-50)
- Esses campos ja existem na tabela `contracts`, apenas nao sao retornados

### Arquivo 2: `src/pages/AssinarDocumento.tsx`

**Interface ContractData (linhas 16-34):**
- Adicionar `suggested_classes: any | null`
- Adicionar `contract_value: number | null`

**Novos estados:**
- `extraSelectedClasses: number[]` -- classes extras marcadas pelo cliente
- `updatedContractHtml: string | null` -- HTML do contrato modificado localmente

**Card de Upsell (inserido ANTES do checkbox "Declaro que li...", linha ~647):**
- Calcular classes disponiveis: classes do `suggested_classes` que NAO estao no contrato original
- Se houver classes disponiveis, renderizar card com:
  - Titulo: "Protecao Recomendada pelo Juridico"
  - Subtitulo: "Caso queira registrar sua marca nas classes abaixo"
  - Checkboxes com numero e descricao de cada classe (NENHUMA pre-marcada)
  - Resumo de valor adicional: "X classe(s) extra(s) = + R$ XXX,XX"
  - NENHUMA classe vem marcada por padrao

**Logica de atualizacao reativa do contrato:**
- Quando `extraSelectedClasses` muda, recalcular `updatedContractHtml`:
  - Localizar clausula 1.1 via regex no HTML original
  - Reformatar como lista numerada: "1. Marca: XPTO - Classe NCL: 25. 2. Marca: XPTO - Classe NCL: 35."
  - Localizar clausula 5.1 e atualizar valores de pagamento multiplicados pelo total de classes (originais + extras)
- O `DocumentRenderer` usa `updatedContractHtml || contract.contract_html`

**Fluxo de assinatura (handleSign, linhas 160-258):**
- ANTES de chamar `sign-contract-blockchain`:
  - Se `extraSelectedClasses.length > 0`:
    - Calcular novo `contract_value` (valor unitario * total de classes)
    - Chamar update no contrato via edge function ou fetch direto para atualizar `contract_html` e `contract_value` no banco
    - Isso garante que `create-post-signature-payment` use o valor correto (ja usa `contract.contract_value` do banco)
  - Usar o HTML atualizado no `contractHtml` enviado para assinatura

**Calculo de valores:**
- Valor unitario por classe baseado no `payment_method` do contrato:
  - `avista` (PIX): R$ 699
  - `cartao6x`: R$ 1.194
  - `boleto3x`: R$ 1.197
- Total = valor unitario * (classes originais + classes extras)
- O edge function `create-post-signature-payment` ja le `contract_value` do banco, entao basta atualiza-lo antes de assinar

### Arquivo 3: Edge function update NAO necessaria para `create-post-signature-payment`
- Ja usa `savedContractValue` do banco (linhas 98-99)
- Basta garantir que o campo `contract_value` esteja atualizado antes da assinatura

## Secao Tecnica

### Regex para detectar classes existentes no contrato
O contrato tem na clausula 1.1 o texto com `{{marca}}` substituido. Precisamos detectar se ja tem formato de lista numerada ou e simples:
- Simples: `"NomeMarca"` 
- Lista: `"1. Marca: X - Classe NCL: 25. 2. Marca: X - Classe NCL: 35."`

### Atualizacao do banco antes de assinar
Usar fetch para um endpoint existente ou update direto via edge function `get-contract-by-token` (adicionar suporte a PATCH) ou criar logica inline no `sign-contract-blockchain` que aceite campos opcionais `updatedContractHtml` e `updatedContractValue`.

Alternativa mais simples: adicionar os campos opcionais no body do `sign-contract-blockchain` para que ele atualize `contract_html` e `contract_value` junto com a assinatura, numa unica chamada.

### Fluxo completo
```text
Cliente abre link -> Ve contrato -> Ve card de upsell com classes extras
  -> Seleciona 1+ classes -> Contrato atualiza reativamente (clausulas 1.1 e 5.1)
  -> Aceita termos -> Clica "Assinar"
  -> Sistema atualiza contract_html + contract_value no banco
  -> Assina em blockchain -> Cria pagamento com valor atualizado
```

## Arquivos Modificados

| Arquivo | Alteracao |
|---|---|
| `supabase/functions/get-contract-by-token/index.ts` | Adicionar `suggested_classes` e `contract_value` no SELECT |
| `src/pages/AssinarDocumento.tsx` | Card de upsell + logica reativa + update antes de assinar |
| `supabase/functions/sign-contract-blockchain/index.ts` | Aceitar campos opcionais `updatedContractHtml` e `updatedContractValue` |

## O que NAO sera alterado
- Nenhuma tabela do banco (campos ja existem)
- `create-post-signature-payment` (ja usa `contract_value` do banco)
- `dialog.tsx` (correcao anterior mantida)
- `CreateContractDialog.tsx` (funcionalidade admin mantida)
- Nenhum componente de UI existente
- Fluxo de procuracao (upsell so aparece para contratos)

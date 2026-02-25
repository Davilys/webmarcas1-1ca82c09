

## Diagnostico: Sincronizacao Asaas com Kanban Comercial

### Situacao Atual

| Componente | Status | Detalhe |
|-----------|--------|---------|
| Webhook recebe evento do Asaas | OK | Recebe RECEIVED/CONFIRMED/RECEIVED_IN_CASH |
| Atualiza status da fatura (invoices) | OK | Muda para 'confirmed'/'received' |
| Envia notificacao email de pagamento | OK | Dispara trigger `payment_received` |
| Envia notificacao multicanal (SMS/WhatsApp/CRM) | OK | Dispara `pagamento_confirmado` |
| Atualiza pipeline_stage para `pagamento_ok` | FALTA | Nenhuma funcao atualiza o brand_processes |

### Problema Principal

Quando o Asaas confirma um pagamento (PIX, boleto ou cartao), o webhook atualiza a fatura e envia notificacoes, mas **nunca atualiza o `pipeline_stage` do `brand_processes`** de `assinou_contrato` para `pagamento_ok`. O cliente fica parado na coluna "ASSINOU CONTRATO" no Kanban comercial, mesmo apos pagar.

### Onde adicionar a correcao

Existem dois caminhos no webhook onde o pagamento e confirmado:

1. **Caminho 1 (linha 86-166)**: Invoice encontrada diretamente, pagamento confirmado, usuario ja existe. Aqui o webhook atualiza a fatura e envia notificacoes, mas **nao toca no brand_processes**.

2. **Caminho 2 (linha 192-300)**: Contract encontrado pelo `asaas_payment_id`, chama `confirm-payment`. Mas o `confirm-payment` cria o processo com `pipeline_stage: 'protocolado'` (nunca `pagamento_ok`). E quando o contrato ja tem user_id (linha 208-224), apenas atualiza a fatura e retorna.

### Solucao

Adicionar a atualizacao do `pipeline_stage` para `pagamento_ok` em **dois pontos** do `asaas-webhook`:

**Ponto 1**: Apos confirmar pagamento com invoice existente (caminho mais comum para faturas geradas pelo admin). Apos a linha 98, quando o pagamento e confirmado e o `user_id` existe, atualizar o `brand_processes`.

**Ponto 2**: Apos o `confirm-payment` retornar com sucesso (caminho do formulario /registrar). Apos a linha 290, atualizar o `brand_processes` do usuario criado.

### Arquivo a editar

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/asaas-webhook/index.ts` | Adicionar update do `pipeline_stage` para `pagamento_ok` nos dois caminhos de confirmacao |

### Detalhes tecnicos

**Ponto 1 - Apos atualizar invoice (apos linha 98)**

Quando o pagamento e confirmado e a invoice tem `user_id`, atualizar o pipeline:

```text
// Apos atualizar a fatura e antes das notificacoes:
if ((paymentStatus === 'RECEIVED' || paymentStatus === 'CONFIRMED' || paymentStatus === 'RECEIVED_IN_CASH') && invoice.user_id) {
  // Atualizar pipeline_stage para pagamento_ok (somente se estiver em assinou_contrato)
  await supabaseAdmin
    .from('brand_processes')
    .update({ pipeline_stage: 'pagamento_ok', updated_at: new Date().toISOString() })
    .eq('user_id', invoice.user_id)
    .eq('pipeline_stage', 'assinou_contrato');

  console.log('[webhook] Pipeline stage updated to pagamento_ok for user:', invoice.user_id);
}
```

A clausula `.eq('pipeline_stage', 'assinou_contrato')` garante que so move clientes que estao na coluna correta, sem afetar processos em outras etapas (ex: protocolado, deferido).

**Ponto 2 - Apos confirm-payment com sucesso (apos linha 290)**

```text
if (confirmResult.success && confirmResult.userId) {
  // Move pipeline do processo recem-criado para pagamento_ok
  await supabaseAdmin
    .from('brand_processes')
    .update({ pipeline_stage: 'pagamento_ok', updated_at: new Date().toISOString() })
    .eq('user_id', confirmResult.userId)
    .eq('pipeline_stage', 'protocolado');

  console.log('[webhook] Pipeline updated to pagamento_ok for new user:', confirmResult.userId);
}
```

**Ponto 3 - Caminho "already processed" (linha 208-224)**

Quando o contrato ja tem user_id mas recebe nova confirmacao do Asaas:

```text
if (contract.user_id) {
  // Atualizar pipeline_stage para pagamento_ok
  await supabaseAdmin
    .from('brand_processes')
    .update({ pipeline_stage: 'pagamento_ok', updated_at: new Date().toISOString() })
    .eq('user_id', contract.user_id)
    .eq('pipeline_stage', 'assinou_contrato');

  console.log('[webhook] Pipeline updated to pagamento_ok for existing user:', contract.user_id);
}
```

### Seguranca

- Nenhuma tabela alterada ou criada
- Nenhum schema modificado
- O filtro `.eq('pipeline_stage', 'assinou_contrato')` (ou `'protocolado'`) impede que processos em etapas avancadas (juridico) sejam afetados
- Apenas o webhook do Asaas e editado
- Deploy automatico apos edicao

### Resultado esperado

Apos a correcao, quando o Asaas confirmar qualquer pagamento (PIX, Boleto, Cartao), o sistema:
1. Atualiza a fatura para "confirmado" (ja funciona)
2. Envia notificacoes multicanal (ja funciona)
3. **NOVO**: Move automaticamente o cliente de "ASSINOU CONTRATO" para "PAGAMENTO OKAY" no Kanban comercial


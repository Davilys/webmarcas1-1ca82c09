

## Diagnóstico: Cliente "CARLOS EDUARDO AFONSO" não aparece no Kanban Jurídico

### Causa raiz identificada (dados no banco)

O cliente possui:
- `client_funnel_type: juridico` 
- Processo com `pipeline_stage: pagamento_ok`

O problema: **`pagamento_ok` é uma etapa do funil Comercial**, não do Jurídico. Quando o Kanban Jurídico renderiza, ele só mostra colunas do funil jurídico (protocolado, 003, oposição, etc.). Como `pagamento_ok` não existe nessas colunas, o card fica "perdido" — não aparece em nenhuma coluna.

Adicionalmente, o filtro de data está em "Mês = Março 2026", mas o cliente foi criado em Fevereiro 2026, o que também o exclui.

### Solução

**Arquivo: `src/components/admin/clients/ClientKanbanBoard.tsx`**

1. **Coluna "fallback" para stages órfãos**: Na função `getClientsForStage`, quando o `pipeline_stage` de um cliente não corresponde a nenhuma coluna do funil ativo, colocar o card automaticamente na **primeira coluna** do funil (ex: "Protocolado" no jurídico). Isso garante que nenhum cliente fique invisível.

2. **Implementação**: Modificar `getClientsForStage` para que, na coluna `defaultStage` (primeira coluna), também inclua clientes cujo `pipeline_stage` não existe em nenhuma das colunas configuradas.

**Arquivo: `src/pages/admin/Clientes.tsx`**

3. **Filtro de data "Mês" não deve esconder clientes**: O filtro de mês filtra por `created_at`, o que exclui clientes antigos. Para o Kanban, o filtro de data deve ser **opcional/desabilitado por padrão** (`dateFilter` default = `'all'`), ou o filtro deve funcionar como "atividade no mês" em vez de "criado no mês". A correção mais simples: garantir que o filtro default seja `'all'` e não `'month'`.

### Mudanças técnicas

- Em `getClientsForStage`: verificar se `pipeline_stage` do cliente está entre os IDs das colunas ativas; se não estiver, agrupar na primeira coluna
- Verificar o estado inicial de `dateFilter` — se está sendo inicializado como `'month'` em vez de `'all'`


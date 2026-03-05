

## Análise de Risco: Plano Marketing Intelligence

### Arquivos existentes que seriam MODIFICADOS

O plano prevê alterar **3 arquivos existentes**:

| Arquivo | O que muda | Risco |
|---------|-----------|-------|
| `src/App.tsx` | Adicionar 1 rota `/admin/marketing` | **Baixo** — apenas adicionar uma linha `<Route>`, não altera rotas existentes |
| `src/components/admin/AdminLayout.tsx` | Adicionar 1 item no menu lateral | **Baixo** — apenas adicionar um objeto no array de menu, não altera itens existentes |
| `src/hooks/useAdminPermissions.ts` | Adicionar 1 entrada `marketing_intelligence` no array `CRM_SECTIONS` | **Médio** — este array define o tipo `PermissionKey` via `as const`. Adicionar um item muda o tipo, mas como o sistema usa string matching (não index-based), não quebra nada existente |

### Tabelas existentes que seriam alteradas

**Nenhuma.** O plano cria 3 tabelas novas (`marketing_campaigns`, `marketing_attribution`, `marketing_config`). Nenhuma tabela existente é tocada.

### Funções, triggers, edge functions existentes

**Nenhuma alteração.** O plano cria 2 edge functions novas (`sync-meta-campaigns`, `send-meta-conversion`).

### Fluxos existentes (leads, contratos, financeiro)

**Nenhuma alteração.** A captura de UTM usa um hook novo (`useUTMCapture`) que lê `localStorage` — não modifica o formulário de registro nem o fluxo de criação de leads.

### Conclusão

**O risco é muito baixo.** As únicas alterações em código existente são:
1. Adicionar 1 rota no `App.tsx`
2. Adicionar 1 item de menu no `AdminLayout.tsx`
3. Adicionar 1 permission key no `useAdminPermissions.ts`

Todas são **adições puras** (append-only), sem modificar ou remover código existente. Nenhum módulo do CRM (leads, clientes, contratos, financeiro, chat, notificações, INPI) será tocado.

O único ponto de atenção é o `useAdminPermissions.ts`: ao adicionar `marketing_intelligence` ao `CRM_SECTIONS`, admins que não sejam o Master não terão acesso à nova aba até que suas permissões sejam configuradas — mas isso é o comportamento esperado (deny by default).


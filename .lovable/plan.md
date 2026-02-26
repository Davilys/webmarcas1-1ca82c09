

# Filtro de Faturas por Admin - Cada um ve apenas seus clientes

## Problema
Atualmente, todos os admins veem **todas** as faturas no Financeiro. O correto e que cada admin veja apenas as faturas dos clientes atribuidos a ele (`assigned_to`) ou criados por ele (`created_by`). Somente o admin master ve tudo.

## Solucao

### Arquivo: `src/pages/admin/Financeiro.tsx`

Modificar a funcao `fetchInvoices` para filtrar por admin:

1. Obter o usuario atual e verificar se e master admin
2. Se **NAO** for master admin:
   - Buscar os IDs dos clientes onde `assigned_to = uid` OU `created_by = uid` na tabela `profiles`
   - Filtrar as faturas usando `.in('user_id', clientIds)` 
3. Se for master admin: manter o comportamento atual (ve tudo)

Mesma logica para `fetchClients` - admin secundario so ve seus proprios clientes no dropdown de criacao de fatura.

E para `fetchProcesses` - filtrar processos apenas dos clientes atribuidos.

### Detalhes Tecnicos

```text
fetchInvoices (admin secundario):
1. SELECT id FROM profiles WHERE assigned_to = uid OR created_by = uid
2. SELECT * FROM invoices WHERE user_id IN (clientIds)

fetchClients (admin secundario):
1. SELECT * FROM profiles WHERE assigned_to = uid OR created_by = uid

fetchProcesses (admin secundario):  
1. SELECT * FROM brand_processes WHERE user_id IN (clientIds)
```

O hook `useCanViewFinancialValues` ja retorna `isMasterAdmin`, que sera reutilizado para decidir se filtra ou nao. Tambem sera importado o estado do usuario atual para obter o `uid`.

### Resumo das mudancas

| Arquivo | Mudanca |
|---|---|
| `src/pages/admin/Financeiro.tsx` | Adicionar logica de filtragem por admin nas 3 funcoes de fetch (invoices, clients, processes). Usar `isMasterAdmin` do hook existente para decidir se aplica filtro. |

Nenhuma mudanca no banco de dados e necessaria - as colunas `assigned_to` e `created_by` ja existem na tabela `profiles`.


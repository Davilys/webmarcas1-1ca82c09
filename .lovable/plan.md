

## Correção: Ficheiro do Cliente na aba Publicações - Mesmo Ficheiro da aba Clientes

### Problema

Ao clicar num card na aba Publicações, o ficheiro do cliente que abre é diferente do da aba Clientes porque os dados são construídos de forma incompleta. Faltam:
- Valor do contrato real (vem da tabela `contracts`, não do perfil)
- Nomes do responsável (`created_by_name`) e atribuído (`assigned_to_name`) - aparecem como `null`
- Dados podem estar desatualizados (carregados uma vez no mount, sem refresh)

### Solução

Substituir a construção manual via `useMemo` por uma função assíncrona que busca os dados completos do cliente no momento do clique, replicando exatamente a lógica de `Clientes.tsx` (linhas 220-322).

### Alteração Única: `src/components/admin/PublicacaoTab.tsx`

**1. Adicionar estado para o cliente carregado**

```typescript
const [fetchedClientForSheet, setFetchedClientForSheet] = useState<ClientWithProcess | null>(null);
```

**2. Criar função `fetchClientForSheet(clientId)`**

Ao clicar no card, em vez de usar o `useMemo` parcial, chamar esta função que:
- Busca o perfil completo do cliente em `profiles`
- Busca todos os processos do cliente em `brand_processes`
- Busca o contrato mais recente em `contracts` (para `contract_value`)
- Resolve `created_by_name` e `assigned_to_name` buscando os perfis dos admins
- Constrói o `ClientWithProcess` com a mesma lógica exata de `Clientes.tsx`

**3. Remover o `useMemo` `selectedClientForSheet` (linhas 948-988)**

Substituir por chamada à função assíncrona nos handlers de clique do Kanban e da Lista.

**4. Atualizar handlers de clique**

Nos handlers `onSelect` do Kanban e da Lista:
```text
Antes: setSheetPubId(id) + setShowClientSheet(true)
Depois: encontrar client_id da pub → fetchClientForSheet(client_id) → setShowClientSheet(true)
```

**5. Atualizar referência no `ClientDetailSheet`**

Trocar `client={selectedClientForSheet}` por `client={fetchedClientForSheet}`.

### Resultado

O ficheiro aberto na aba Publicações será 100% idêntico ao da aba Clientes porque os dados vêm das mesmas tabelas, com as mesmas queries, construídos com a mesma lógica. Não é uma cópia - é o mesmo resultado.

### O que NÃO será alterado
- Nenhuma tabela do banco
- Nenhum outro arquivo
- O componente `ClientDetailSheet` continua o mesmo
- O filtro de visibilidade (só publicações com `client_id`) continua ativo


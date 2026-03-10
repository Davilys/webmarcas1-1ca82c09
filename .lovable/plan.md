

## Plano: Filtrar publicações sem cliente da aba Publicações

### Problema
Quando o sistema sincroniza entradas da Revista RPI para `publicacoes_marcas`, algumas entradas não conseguem resolver o `client_id` (porque o processo ainda não foi atribuído a um cliente na aba Revista/Processos). Essas publicações órfãs aparecem no Kanban como "Sem cliente", mas não deveriam estar visíveis na aba Publicações.

### Solução
Adicionar um filtro no `useMemo` de `filtered` (linha ~904 em `PublicacaoTab.tsx`) para excluir publicações onde `client_id` é `null`. Apenas publicações já atribuídas a clientes serão exibidas.

### Alterações

**Arquivo: `src/components/admin/PublicacaoTab.tsx`**
- Na linha 904, dentro do `publicacoes.filter(pub => { ... })`, adicionar como primeira condição: `if (!pub.client_id) return false;`
- Isso garante que cards sem cliente nunca apareçam no Kanban nem na listagem
- Os stats cards (contadores) também devem considerar apenas publicações com cliente — ajustar o `useMemo` dos `statusCounts` (linha ~895) para filtrar `client_id` não nulo

### Resultado
- Publicações sem cliente ficam apenas na aba Revista (onde o admin as atribui)
- Após atribuição (com `client_id` preenchido), aparecem automaticamente na aba Publicações
- Nenhuma alteração no banco de dados necessária


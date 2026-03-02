

## Sincronizar vinculacao de cliente entre Revista INPI e Publicacoes

### Problema Identificado

Quando voce vincula um cliente na aba **Revista INPI**, o sistema atualiza apenas a tabela `rpi_entries` (campo `matched_client_id`). Porem, a tabela `publicacoes_marcas` (que alimenta a aba **Publicacoes**) nao e atualizada com o `client_id`. O sync automatico so roda uma vez na carga inicial e apenas para entradas novas, ignorando atualizacoes posteriores de vinculacao.

### Solucao

Duas alteracoes coordenadas:

**1. Arquivo: `src/pages/admin/RevistaINPI.tsx` - funcao `handleAssignClient`**
- Apos atualizar `rpi_entries.matched_client_id`, buscar na tabela `publicacoes_marcas` qualquer registro que tenha o mesmo `rpi_entry_id` (o ID da entrada da revista)
- Se encontrar, atualizar o campo `client_id` da publicacao com o cliente selecionado
- Isso garante que ao vincular na Revista, a Publicacao ja reflete o cliente imediatamente

**2. Arquivo: `src/components/admin/PublicacaoTab.tsx` - sync existente**
- Adicionar uma segunda etapa ao sync automatico: verificar publicacoes que ja existem mas possuem `client_id = null` e cujo `rpi_entry_id` aponta para um `rpi_entries` com `matched_client_id` preenchido
- Atualizar esses registros orfaos com o `client_id` correto
- Isso cobre casos onde a vinculacao foi feita antes mas a publicacao nao foi atualizada

### Detalhes Tecnicos

```text
Fluxo atual (quebrado):
  Revista INPI → vincula cliente → atualiza rpi_entries.matched_client_id
  Publicacoes → le publicacoes_marcas.client_id → NULL (nao sincronizado)

Fluxo corrigido:
  Revista INPI → vincula cliente → atualiza rpi_entries.matched_client_id
                                  → atualiza publicacoes_marcas.client_id (onde rpi_entry_id = entry.id)
  Publicacoes → le publicacoes_marcas.client_id → cliente correto
```

**Alteracao principal em `handleAssignClient`** (RevistaINPI.tsx):
- Adicionar apos a atualizacao do `rpi_entries`:
  - Query: `supabase.from('publicacoes_marcas').update({ client_id: selectedClient.id }).eq('rpi_entry_id', assignEntry.id)`
- Isso propaga a vinculacao automaticamente para a aba Publicacoes

**Alteracao secundaria no sync** (PublicacaoTab.tsx):
- No `useEffect` de sync, apos o loop de insercao/atualizacao, adicionar varredura de publicacoes sem `client_id` cujo `rpi_entry` ja tem `matched_client_id`
- Atualizar em lote esses registros

### Resultado Esperado

Ao vincular um cliente na aba Revista INPI, a aba Publicacoes mostrara o nome do cliente imediatamente, sem necessidade de acoes manuais adicionais.


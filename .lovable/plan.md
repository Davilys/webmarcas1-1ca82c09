

## Sincronizacao Automatica RPI -> Publicacoes

### Problema Atual
O admin precisa clicar em "Sincronizar com Revistas" manualmente. O usuario quer que isso seja automatico ao carregar a aba Publicacoes.

### Solucao

Substituir o botao manual por um `useEffect` que roda automaticamente quando o componente carrega e os dados estao prontos (`rpiEntries`, `publicacoes`, `processes`, `clients`).

### Logica Automatica

```text
useEffect (quando rpiEntries + publicacoes + processes + clients carregam):
  1. Filtra rpi_entries com matched_process_id ou matched_client_id
  2. Para cada entrada:
     a. Busca o process_id correspondente (matched_process_id ou via brand_processes)
     b. Verifica se ja existe publicacao para esse process_id -> skip se sim
     c. Identifica client_id via matched_client_id ou brand_processes.user_id
     d. Deduplica cliente por CPF/email (se matched_client_id aponta para perfil diferente mas com mesmo CPF/email, usa o existente)
     e. Cria publicacao com dados da RPI (dispatch_code como rpi_number, publication_date, status baseado no dispatch)
  3. Se houve novas criações, exibe toast: "X publicacoes sincronizadas automaticamente, Y ignoradas (ja existiam)"
  4. Invalida query para atualizar a lista
  5. Usa um ref (hasSynced) para garantir que roda apenas 1 vez por montagem do componente
```

### Detalhes Tecnicos

#### Arquivo a Editar

| Arquivo | Mudanca |
|---------|---------|
| `src/components/admin/PublicacaoTab.tsx` | Remover botao "Sincronizar com Revistas", adicionar useEffect com logica automatica, usar ref para evitar execucoes duplicadas |

#### Mudancas Especificas

1. Adicionar `hasSyncedRef = useRef(false)` para controlar execucao unica
2. Expandir a query de `rpi_entries` para incluir tambem entradas com `matched_client_id` (atualmente so busca `matched_process_id`)
3. Adicionar `useEffect` que:
   - Verifica se os dados ja carregaram e `hasSyncedRef.current === false`
   - Compara `rpi_entries` com `publicacoes` existentes
   - Insere publicacoes novas em batch
   - Exibe toast com resumo
   - Seta `hasSyncedRef.current = true`
4. Remover o botao manual de sincronizacao (se existir na UI)
5. Buscar `profiles` com campo `cpf` e `email` para deduplicacao de clientes

#### Deduplicacao por CPF/Email

Ao identificar o `client_id` para uma nova publicacao:
- Se `matched_client_id` existe, buscar o perfil e verificar CPF/email
- Se ja existe uma publicacao para outro `client_id` com o mesmo CPF ou email, usar o `client_id` existente
- Isso garante que o cliente X com marcas X, Y, Z tenha todas agrupadas sob o mesmo ID

#### Nenhuma Migracao SQL

Todos os campos necessarios ja existem nas tabelas. A logica e puramente frontend com INSERT via Supabase client.

#### Zero Impacto em Outras Funcionalidades

- A sincronizacao e aditiva (apenas INSERT, nunca UPDATE/DELETE)
- Verifica existencia antes de inserir (evita duplicatas)
- Roda apenas 1 vez por carregamento da aba
- Nao altera dados existentes

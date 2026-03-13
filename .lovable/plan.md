

## Plano: Completar Sincronização Revista ↔ Publicações

### Gaps identificados e correções

#### 1. Fix `handleUpdateProcess` (auto-save) — ~linha 518-541
**Problema**: Não propaga `client_id`, `data_publicacao_rpi`, e usa lookup errado (`limit(1)` ao invés de `resolveBrandProcessId`).
**Correção**: Substituir o lookup manual por `resolveBrandProcessId` e adicionar `client_id` + `data_publicacao_rpi` no update da publicação.

#### 2. Propagar `rpi_number` em todos os handlers
**Problema**: `publicacoes_marcas.rpi_number` nunca é preenchido nos 3 handlers de sync.
**Correção**: Extrair `rpi_number` do `selectedUpload.rpi_number` (ou do upload associado) e incluir nos inserts/updates de `publicacoes_marcas` em:
- Inline edit save (~linha 1230)
- Dispatch type change (~linha 283-300)
- Assign client (~linha 666-701)

#### 3. Sincronizar `ncl_classes` no assign para `brand_processes`
**Problema**: O assign handler atualiza `pipeline_stage` mas esquece `ncl_classes`.
**Correção**: Adicionar `ncl_classes: entry.ncl_classes?.map(Number).filter(n => !isNaN(n))` no update de `brand_processes` no assign (~linha 708).

#### 4. Sincronizar `data_publicacao_rpi` no dispatch type change
**Problema**: Quando a publicação já existe e o tipo muda, `data_publicacao_rpi` não é atualizado.
**Correção**: Adicionar `data_publicacao_rpi: entry.publication_date` no update (~linha 283).

#### 5. Recalcular prazos na inline edit e dispatch change
**Problema**: Prazos só são calculados no assign. Se o admin muda o tipo de despacho, o prazo crítico fica stale.
**Correção**: Usar `calcAutoFields` (já existe em `helpers.tsx`) para recalcular `proximo_prazo_critico` e `descricao_prazo` baseado no novo `dispatch_type` e `data_publicacao_rpi`, e incluir esses valores nos updates de `publicacoes_marcas`.

#### 6. Sync reverso: Publicações/Kanban → Revista (Fase 6 do plano)
**Problema**: Alterações no Kanban de Publicações ou na aba Serviços do ficheiro não voltam para `rpi_entries`.
**Correção**: No `PublicacaoTab` e no `ServiceActionPanel`, quando `pipeline_stage` muda, buscar o `rpi_entry_id` na `publicacoes_marcas` e atualizar `rpi_entries.dispatch_type`.

### Arquivos a modificar

1. **`src/pages/admin/RevistaINPI.tsx`** — Gaps 1-5 (todos os handlers de sync)
2. **`src/components/admin/PublicacaoTab.tsx`** — Gap 6 (sync reverso no Kanban drag)
3. **`src/components/admin/clients/ServiceActionPanel.tsx`** — Gap 6 (sync reverso na aba Serviços)

### Segurança
- Todas as alterações são incrementais aos handlers existentes
- Nenhuma mudança de schema necessária
- Fallbacks mantidos para casos sem dados


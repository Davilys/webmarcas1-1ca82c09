

## Analysis: Synchronization between Revista INPI → Publicações → Ficheiro do Cliente

### Current State

The Revista INPI tab already has **partial** sync logic in three places:

1. **Inline edit save** (pencil icon, ~line 1191): Updates `rpi_entries`, syncs `brand_name_rpi`, `process_number_rpi`, `ncl_class` to `publicacoes_marcas`, and `brand_name`/`process_number` to `brand_processes`. **Missing**: does NOT sync `client_id` or `data_publicacao_rpi` to `publicacoes_marcas`, and does NOT sync `pipeline_stage` to `brand_processes`.

2. **Dispatch type change** (~line 266): Syncs `status` to `publicacoes_marcas` and `pipeline_stage` to `brand_processes`. This works correctly.

3. **"Processo Atualizado" button** (~line 500): Syncs `pipeline_stage` to `brand_processes` and `status` to `publicacoes_marcas`. Auto-saves inline edit data too. **Missing**: doesn't propagate `client_id` on publicacoes_marcas during auto-save path.

### Problem

When a user edits process data (brand name, process number, NCL, holder, publication date) via the pencil icon in Revista INPI:
- The `publicacoes_marcas` record doesn't get `client_id` set (so the client's ficheiro can't find it)
- The `brand_processes.pipeline_stage` doesn't get updated to match the current dispatch type
- The `data_publicacao_rpi` (publication date) isn't synced to `publicacoes_marcas`
- The `resolveBrandProcessId` uses process_number matching, but when found, the resolved ID isn't stored back on the `publicacoes_marcas` record consistently

### Plan

**File**: `src/pages/admin/RevistaINPI.tsx`

Enhance the **inline edit save** handler (~lines 1191-1259) to:

1. **Sync `client_id`** from `entry.matched_client_id` to `publicacoes_marcas` when updating
2. **Sync `data_publicacao_rpi`** from `entry.publication_date` to `publicacoes_marcas`
3. **Sync `pipeline_stage`** on `brand_processes` to match the entry's current `dispatch_type` (using `PUB_STATUS_TO_PIPELINE` mapping), and sync `ncl_classes` as numeric array
4. **Create publicacao** if none exists (currently the inline edit only updates existing, but doesn't create new ones — the dispatch type handler does create them)
5. **Store `matched_process_id`** back on `rpi_entries` when resolved, for future lookups

This ensures that when the admin fills in process data in Revista INPI, the publicações_marcas record is complete with `client_id`, `process_id`, `brand_name_rpi`, `process_number_rpi`, `ncl_class`, `data_publicacao_rpi`, and `status` — which is exactly what the `PublicacoesCliente` component queries to display in the client's ficheiro.

### Safety

- Only modifies the inline edit save handler — does not touch dispatch type change or process update logic which already work
- Uses `resolveBrandProcessId` which already handles multi-process clients by matching on `process_number` first
- Falls back gracefully if no publicacao or brand_process is found


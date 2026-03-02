

## Correção: Sincronização Completa entre Revista INPI, Publicações e Clientes Jurídico

### Problema Identificado

Existem 3 funções na aba Revista INPI que operam de forma isolada, sem sincronizar os dados entre os 3 módulos:

1. **Alterar Tipo do Despacho** (`handleDispatchTypeChange`): Atualiza o status na aba Publicações (`publicacoes_marcas.status`) mas NAO atualiza a etapa no Kanban da aba Clientes Jurídico (`brand_processes.pipeline_stage`).

2. **Atualizar Processo** (`handleUpdateProcess`): Atualiza a etapa no Kanban Clientes Jurídico (`brand_processes.pipeline_stage`) mas NAO atualiza o status na aba Publicações (`publicacoes_marcas.status`).

3. **Vincular Cliente** (`handleAssignClient`): Propaga o `client_id` para publicações mas nao sincroniza o tipo do despacho com a etapa do processo.

### Solucao

Alterar as 3 funções no ficheiro `src/pages/admin/RevistaINPI.tsx` para garantir sincronização bidirecional:

### Alteracao 1: `handleDispatchTypeChange` (linha 205)

Depois de atualizar `publicacoes_marcas.status`, adicionar a atualizacao de `brand_processes.pipeline_stage` com o mesmo valor, caso exista um processo vinculado (`entry.matched_process_id`).

```text
Antes:
  1. Atualiza rpi_entries.dispatch_type
  2. Atualiza publicacoes_marcas.status

Depois:
  1. Atualiza rpi_entries.dispatch_type
  2. Atualiza publicacoes_marcas.status
  3. [NOVO] Se entry.matched_process_id existe -> atualiza brand_processes.pipeline_stage com o mesmo valor
```

### Alteracao 2: `handleUpdateProcess` (linha 417)

Depois de atualizar `brand_processes.pipeline_stage`, adicionar a atualizacao de `publicacoes_marcas.status` com o mesmo valor, caso exista uma publicacao vinculada ao `rpi_entry_id`.

```text
Antes:
  1. Atualiza brand_processes.pipeline_stage
  2. Atualiza rpi_entries.update_status

Depois:
  1. Atualiza brand_processes.pipeline_stage
  2. Atualiza rpi_entries.update_status
  3. [NOVO] Busca publicacoes_marcas com rpi_entry_id = entry.id -> atualiza status com o valor do newStage
```

### Alteracao 3: `handleAssignClient` (linha 470)

Apos vincular o cliente, sincronizar o dispatch_type atual do entry com o `pipeline_stage` do processo vinculado e com o `status` da publicacao.

```text
Antes:
  1. Atualiza rpi_entries.matched_client_id
  2. Propaga client_id para publicacoes_marcas

Depois:
  1. Atualiza rpi_entries.matched_client_id
  2. Propaga client_id para publicacoes_marcas
  3. [NOVO] Se dispatch_type definido e matched_process_id existe -> atualiza brand_processes.pipeline_stage
```

### Mapeamento de Valores

Os valores do despacho (dispatch_type) mapeiam diretamente para as etapas do pipeline (pipeline_stage) pois usam a mesma nomenclatura: `003`, `oposicao`, `indeferimento`, `deferimento`, `certificados`/`certificado`, `renovacao`, `arquivado`.

### Ficheiro Alterado

- `src/pages/admin/RevistaINPI.tsx` (unico ficheiro)

### Resultado

Ao alterar o tipo do despacho na Revista INPI, o card do cliente move automaticamente no Kanban da aba Publicacoes E no Kanban da aba Clientes Juridico, mantendo os 3 modulos 100% sincronizados.


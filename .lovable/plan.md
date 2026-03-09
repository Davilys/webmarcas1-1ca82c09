

## Plano: Botão "Add Marca" + Seletor de Marca nos Serviços + Cards por Marca no Kanban

### Contexto
Atualmente:
- O botão "Adicionar Processo" só aparece quando o cliente não tem nenhuma marca (empty state)
- Na aba Serviços, o sistema sempre usa a primeira marca do cliente (hardcoded `clientBrands[0]`)
- No Kanban, clientes com múltiplas marcas são agrupados em um único card

### Mudanças

#### 1. Aba Marcas — Botão "Adicionar Marca" sempre visível
- Mover o Dialog de criação de processo para fora do `EmptyState`
- Adicionar botão `+ Adicionar Marca` no header da aba, ao lado do contador "X marcas registradas"
- Reutilizar o mesmo `handleCreateProcess` existente

#### 2. Aba Serviços — Seletor de Marca
- Quando o cliente tem mais de uma marca, exibir um `Select` no topo da aba para o admin escolher qual marca receberá o serviço
- O `ServiceActionPanel` receberá os dados da marca selecionada (não mais `clientBrands[0]`)
- O pipeline_stage será atualizado apenas no `brand_processes` da marca selecionada

#### 3. Kanban — Um card por marca/processo
- Na função `fetchClients` em `Clientes.tsx`, ao invés de agrupar todos os processos em um único `ClientWithProcess`, criar um entry separado para cada processo
- Cada card mostra o nome do cliente + nome da marca específica
- O `process_id` e `pipeline_stage` de cada card correspondem ao processo individual
- Ao clicar no card, o `ClientDetailSheet` abre com `focusProcessId` da marca clicada

### Arquivos a modificar
- `src/components/admin/clients/ClientDetailSheet.tsx` — botão add marca + seletor de marca nos serviços
- `src/pages/admin/Clientes.tsx` — lógica de cards por marca no fetchClients


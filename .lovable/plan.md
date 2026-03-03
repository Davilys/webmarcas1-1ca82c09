
## Problema

Quando um cliente tem mais de uma marca/processo, ao clicar em qualquer card no Kanban de Publicações, o ficheiro do cliente sempre abre mostrando o **primeiro processo** encontrado (`userProcesses[0]`). Isso significa que todas as publicações do mesmo cliente abrem exatamente a mesma informação, independente de qual marca foi clicada.

## Solução

Passar o `process_id` da publicação clicada para o `ClientDetailSheet`, para que o ficheiro foque na marca/processo correto.

### Alterações

#### 1. `ClientDetailSheet.tsx` — Aceitar `focusProcessId`

Adicionar uma nova prop opcional `focusProcessId?: string` ao componente. Quando fornecida:
- O `mainProcess` usado no cabeçalho (nome da marca, pipeline_stage) será o processo correspondente ao `focusProcessId`, e não o primeiro da lista
- As queries de publicações, eventos e documentos usarão esse `process_id` específico
- A aba "Serviços" selecionará o serviço correspondente a esse processo

```typescript
interface ClientDetailSheetProps {
  client: ClientWithProcess | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  extraActions?: React.ReactNode;
  initialShowProcessDetails?: boolean;
  focusProcessId?: string; // NOVO
}
```

Na lógica interna, onde hoje se usa `client.process_id`, será feito:
```typescript
const activeProcessId = focusProcessId || client.process_id;
```

#### 2. `PublicacaoTab.tsx` — Passar `process_id` da publicação clicada

Na função `fetchClientForSheet`, em vez de usar `mainProcess = userProcesses[0]`, definir o `process_id` como o da publicação clicada (via `sheetPub.process_id`).

Além disso, passar `focusProcessId={sheetPub?.process_id}` ao `ClientDetailSheet`:

```typescript
<ClientDetailSheet
  client={fetchedClientForSheet}
  open={showClientSheet}
  focusProcessId={sheetPub?.process_id || undefined}
  ...
/>
```

### Resultado

- Clicar no card "MINI CHICLE TATTOO" abre o ficheiro com foco nessa marca
- Clicar no card "Outra Marca" do mesmo cliente abre o ficheiro com foco na outra marca
- Aba Serviços mostra a fase do pipeline do processo correto
- Publicações e eventos mostram os dados do processo correto
- Funciona para clientes com 1 ou N marcas

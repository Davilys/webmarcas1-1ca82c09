

## Plano de Upgrade: Fluxo Revista INPI → Publicações

### Visão Geral do Fluxo Atual
1. **Aba Revista**: Busca XML da RPI do INPI → parseia entradas → tenta match automático por `process_number` com `brand_processes` → exibe lista de entradas
2. **Atribuição**: Admin clica "Atribuir" para vincular `client_id` a uma entrada não matched, ou altera o `dispatch_type` (status)
3. **Aba Publicações**: Exibe publicações já criadas em `publicacoes_marcas` (agora filtradas por `client_id IS NOT NULL`)

### Problemas Identificados

1. **Fluxo de edição incompleto na Revista**: Ao atribuir um cliente, os dados da RPI (nome da marca, nº processo, classe NCL, titular) podem estar incompletos ou incorretos. Não há etapa de revisão/complementação antes de enviar para Publicações.

2. **Dados duplicados e inconsistentes**: `brand_name_rpi`, `process_number_rpi`, `ncl_class` na `publicacoes_marcas` podem divergir dos dados em `brand_processes` — sem validação cruzada.

3. **Sem workflow de "rascunho"**: Entradas da RPI vão direto para Publicações ao atribuir. Não há estado intermediário de "em preparação" para o admin revisar todos os campos.

4. **Cards na Publicação sem informações visuais completas**: Falta destaque para marca, cliente, classe NCL, e indicação clara de prazo/atraso.

5. **Falta de checklist de completude**: Nenhuma validação se todos os campos obrigatórios (cliente, processo, classe, status) estão preenchidos antes de publicar.

6. **Aba Revista sem indicador de quais entradas já foram enviadas vs pendentes**: Difícil distinguir visualmente.

---

### Upgrade Proposto (6 Fases)

#### FASE 1: Workflow de Preparação na Aba Revista
**Objetivo**: Criar um fluxo de "edição e validação" antes de enviar para Publicações.

**Alterações**:
- Adicionar status `preparation` (em preparação) às entradas RPI — campo `update_status` na tabela `rpi_entries`
- Criar um **Dialog/Sheet de Edição Completa** que abre ao clicar "Preparar para Publicação" em cada entrada:
  - Campos editáveis: Nome da Marca, Nº Processo, Classe NCL, Titular, Status/Despacho, Cliente atribuído, Prazo crítico, Descrição do prazo
  - Auto-preenchimento inteligente: quando o admin seleciona um cliente, buscar automaticamente os `brand_processes` desse cliente para sugerir o processo correto
  - **Checklist visual** de campos obrigatórios (✅ ou ❌ ao lado de cada campo)
  - Botão "Enviar para Publicações" só habilitado quando todos os campos obrigatórios estiverem preenchidos

**Campos obrigatórios para envio**:
- ✅ Cliente atribuído (`client_id`)
- ✅ Processo vinculado (`process_id`)
- ✅ Nome da marca
- ✅ Número do processo
- ✅ Classe NCL
- ✅ Status/etapa do despacho

#### FASE 2: Indicadores Visuais na Aba Revista
**Objetivo**: Facilitar a gestão visual das entradas.

**Alterações**:
- Badge de status em cada entrada: 🟡 Pendente | 🔵 Em preparação | 🟢 Publicada | ⚪ Ignorada
- Filtro por status de workflow: Todas | Pendentes | Em preparação | Publicadas
- Contador no header: "12 pendentes · 3 em preparação · 45 publicadas"
- Highlight visual para entradas com match automático (contorno verde) vs sem match (contorno amarelo)
- Indicador de completude: barra de progresso mini mostrando % de campos preenchidos

#### FASE 3: Cards Aprimorados na Aba Publicações
**Objetivo**: Cards informativos e acionáveis com todas as informações críticas.

**Layout do Card** (já parcialmente implementado, melhorar):
```
┌─────────────────────────────────┐
│ 🏷️ NOME DA MARCA (bold, grande) │
│ 👤 Nome do Cliente (destaque)    │
│ ─────────────────────────────── │
│ 📋 935442847  NCL 35  RPI 2878  │
│ ─────────────────────────────── │
│ ⏰ 23 dias restantes    👨‍💼 Admin│
│    ou                           │
│ 🚨 9d atrasado         👨‍💼 Admin│
└─────────────────────────────────┘
```

**Melhorias específicas**:
- Nome da marca em **negrito e tamanho maior**
- Nome do cliente em **destaque** (cor primária)
- Badge da classe NCL (já implementado na última correção ✅)
- Número da RPI como badge (já implementado ✅)
- Dias restantes com cor contextual: verde (>15d), amarelo (≤15d), vermelho (≤3d), pulsante (atrasado)
- Ao clicar: abrir ficheiro do cliente com `focusProcessId`

#### FASE 4: Auto-Arquivamento e Transições Inteligentes
**Objetivo**: Automatizar movimentações e alertas.

**Alterações**:
- ✅ Auto-arquivamento usa `pipeline_stage: 'arquivado'` (já corrigido)
- Adicionar **confirmação visual** antes do auto-arquivamento: toast com opção "Desfazer" (5 segundos)
- Quando uma nova RPI é importada e detecta um processo que estava em "arquivado", **reverter automaticamente** para o novo status (ex: se uma marca arquivada aparece com despacho "deferimento", mover para deferimento)
- Log de todas as transições automáticas com motivo

#### FASE 5: Painel de Importação Inteligente (Banner Melhorado)
**Objetivo**: Melhorar o banner "X entradas prontas para importar" que aparece na aba Publicações.

**Alterações**:
- O banner atual mostra entradas da RPI com `matched_client_id` que ainda não foram importadas para `publicacoes_marcas`
- Melhorar para mostrar: nome da marca, cliente, tipo de despacho, e um botão de **preview** antes de importar
- Opção de "Importar todas" com revisão em lote
- Opção de "Ignorar" entradas que não devem ir para Publicações (ex: despachos informativos)

#### FASE 6: Sincronização Bidirecional Robusta
**Objetivo**: Garantir consistência total entre Revista, Publicações e Processos.

**Alterações**:
- Quando o admin altera o status no ficheiro do cliente (aba Serviços), sincronizar para `publicacoes_marcas` E para `rpi_entries` (dispatch_type)
- Quando o admin move um card no Kanban de Publicações, sincronizar para `brand_processes.pipeline_stage`
- Quando uma nova RPI sai com despacho diferente para um processo existente, criar alerta: "O processo X mudou de status 003 para Deferimento na RPI 2879"
- Dashboard de inconsistências: listar processos onde `brand_processes.pipeline_stage` ≠ `publicacoes_marcas.status`

---

### Alterações no Banco de Dados

1. Adicionar campo `workflow_status` na tabela `rpi_entries`: `'pending' | 'preparation' | 'published' | 'ignored'` (default: 'pending')
2. Adicionar campo `preparation_notes` na tabela `rpi_entries`: texto livre para notas do admin durante preparação
3. Adicionar campo `completeness_score` na tabela `rpi_entries`: inteiro 0-100 calculado automaticamente

### Prioridade de Implementação

| Fase | Prioridade | Esforço | Impacto |
|------|-----------|---------|---------|
| Fase 1 | 🔴 Alta | Médio | Alto - Resolve o problema principal |
| Fase 2 | 🔴 Alta | Baixo | Alto - Melhora gestão visual |
| Fase 3 | 🟡 Média | Baixo | Médio - Já parcialmente feito |
| Fase 4 | 🟡 Média | Médio | Alto - Automação |
| Fase 5 | 🟢 Baixa | Médio | Médio - Refinamento |
| Fase 6 | 🟢 Baixa | Alto | Alto - Integridade de dados |

### Resultado Esperado
- Fluxo claro: RPI → Revisão/Edição → Validação → Publicação
- Zero publicações incompletas (sem cliente, sem processo)
- Visibilidade total do pipeline em todas as abas
- Sincronização automática entre Revista ↔ Publicações ↔ Processos ↔ Ficheiro do Cliente

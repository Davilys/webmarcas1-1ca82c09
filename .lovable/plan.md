

## Edicao de Dados do Processo + Notificacoes Recorrentes a Cada 5 Dias

### Contexto

Na aba Revista INPI, quando o painel de detalhes de um processo e expandido, os campos (Marca, N. Processo, Classe NCL, Titular) sao exibidos como texto estatico. Quando a IA nao identifica corretamente (ex: "Marca nao identificada"), o admin nao consegue corrigir. Alem disso, ao vincular um cliente, nao existe lembrete recorrente ate a publicacao ser resolvida.

### Funcionalidade 1: Campos Editaveis no Painel Expandido

**O que muda visualmente:**
- Na coluna "Dados do Processo" do painel expandido, os campos Marca, N. Processo, Classe NCL e Titular passam a ter um botao de edicao (icone de lapis)
- Ao clicar, o campo vira um input editavel inline
- Botoes "Salvar" e "Cancelar" aparecem abaixo dos campos
- Ao salvar, os dados sao atualizados diretamente na tabela `rpi_entries`

**Arquivo:** `src/pages/admin/RevistaINPI.tsx`

Alteracoes:
1. Adicionar estados para controlar o modo de edicao:
   - `editingEntryId` (string | null) - qual entrada esta em edicao
   - `editForm` (objeto com brand_name, process_number, ncl_classes, holder_name)

2. Criar funcao `handleSaveEntryEdit` que faz UPDATE na tabela `rpi_entries` com os campos editados

3. Na secao "Dados do Processo" (linhas 811-825), substituir os `DetailRow` estaticos por campos condicionais:
   - Se `editingEntryId === entry.id`: renderiza Inputs editaveis
   - Senao: mantem o DetailRow atual com um botao de editar

4. Adicionar botao "Editar" (icone Pencil) no cabecalho da coluna "Dados do Processo"

### Funcionalidade 2: Notificacoes Recorrentes a Cada 5 Dias

**Logica:**
- Quando um processo e vinculado a um cliente (handleAssignClient), salvar a data de vinculacao como referencia
- Uma funcao agendada (cron job) roda diariamente verificando entradas com `matched_client_id` preenchido e `tag` diferente de `resolvido`
- A cada 5 dias desde a vinculacao (ou ultima notificacao), envia notificacao para o cliente E para o admin

**Alteracoes:**

1. **Nova coluna na tabela `rpi_entries`:**
   - `last_reminder_sent_at` (timestamp) - quando o ultimo lembrete foi enviado
   - `linked_at` (timestamp) - quando foi vinculado ao cliente

2. **Atualizar `handleAssignClient`** para salvar `linked_at` ao vincular

3. **Nova Edge Function: `check-rpi-reminders/index.ts`**
   - Consulta `rpi_entries` onde:
     - `matched_client_id IS NOT NULL`
     - `tag NOT IN ('resolvido', 'arquivado', 'prazo_encerrado')`
     - `last_reminder_sent_at IS NULL OR last_reminder_sent_at < now() - interval '5 days'`
   - Para cada entrada encontrada:
     - Insere notificacao para o cliente: "Lembrete: A publicacao do processo X ainda aguarda regularizacao. Prazo em andamento."
     - Insere notificacao para os admins: "Lembrete: Publicacao RPI do processo X vinculada ao cliente Y ainda nao foi resolvida."
     - Atualiza `last_reminder_sent_at = now()`

4. **Cron job** agendado para rodar diariamente chamando a Edge Function

### Detalhes Tecnicos

**Migracao SQL:**
```text
ALTER TABLE rpi_entries
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS linked_at timestamptz;
```

**Edge Function `check-rpi-reminders`:**
- Busca entries pendentes com intervalo > 5 dias
- Insere em `notifications` para cliente e admin
- Atualiza `last_reminder_sent_at`

**Cron job (via pg_cron):**
- Executa diariamente as 09:00 (horario de Brasilia)
- Chama `check-rpi-reminders` via HTTP POST

### Arquivos a Criar/Editar

| Arquivo | Tipo | Alteracao |
|---------|------|-----------|
| `src/pages/admin/RevistaINPI.tsx` | Editar | Adicionar edicao inline dos campos do processo |
| `supabase/functions/check-rpi-reminders/index.ts` | Criar | Edge Function para verificar e enviar lembretes |
| Migracao SQL | Criar | Adicionar colunas `last_reminder_sent_at` e `linked_at` |
| Cron job SQL | Inserir | Agendar execucao diaria |

### Seguranca

- Nenhuma tabela existente e alterada estruturalmente (apenas 2 colunas novas nullable adicionadas)
- RLS existente da `rpi_entries` continua intacta (apenas admins podem editar)
- Notificacoes usam a tabela `notifications` existente
- Nenhum fluxo existente e quebrado
- A edicao so funciona para admins autenticados (mesma permissao do update de TAG)


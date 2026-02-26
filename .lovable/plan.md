
# Leads CRM Premium - Kanban + Funil de Vendas + Remarketing Automatico

## Visao Geral

Transformar a aba Leads em um CRM completo e premium com modo Kanban drag-and-drop, funil de vendas visual, ficha detalhada do lead e sistema de remarketing automatico (individual e em massa).

---

## 1. Banco de Dados - Novas Colunas e Tabelas

### Tabela `leads` - Novas colunas:
- `lead_score` (integer, default 0) - Pontuacao do lead (0-100)
- `lead_temperature` (text, default 'frio') - frio/morno/quente
- `last_activity_at` (timestamptz) - Ultima atividade
- `remarketing_count` (integer, default 0) - Quantas vezes recebeu remarketing
- `tags` (text[], default '{}') - Tags personalizadas

### Nova tabela `lead_activities`:
- `id`, `lead_id` (FK leads), `admin_id`, `activity_type` (text: nota/email/ligacao/whatsapp/remarketing), `content` (text), `created_at`
- RLS: apenas admins

### Nova tabela `lead_remarketing_campaigns`:
- `id`, `name`, `type` (text: abandono_carrinho/promocao/reengajamento/personalizado), `subject`, `body` (html), `target_status` (text[]), `target_origin` (text[]), `scheduled_at`, `sent_at`, `total_sent` (int), `total_opened` (int), `created_by`, `status` (rascunho/agendada/enviando/enviada), `created_at`
- RLS: apenas admins

---

## 2. Componentes Novos

### `LeadKanbanBoard.tsx`
- Board Kanban com colunas por status: Novo > Em Contato > Qualificado > Proposta > Negociacao > Convertido > Perdido
- Drag-and-drop via HTML5 drag API (sem lib extra)
- Cards com: avatar, nome, empresa, valor estimado, temperatura (icone fogo), tags, origem
- Ao arrastar entre colunas: atualiza status no banco automaticamente
- Contagem e valor total por coluna

### `LeadDetailSheet.tsx` (Sheet lateral)
- Abre ao clicar no card/linha do lead
- Abas: **Dados** | **Atividades** | **Remarketing**
- **Dados**: Todos os campos editaveis inline, score, temperatura, tags
- **Atividades**: Timeline de interacoes (notas, emails enviados, ligacoes registradas)
- **Remarketing Individual**: Botao "Enviar Remarketing" com selector de template, preview do email e envio direto via `trigger-email-automation`
- Botao "Converter em Cliente" em destaque

### `LeadSalesFunnel.tsx`
- Funil visual (trapezio/piramide invertida) mostrando a conversao entre cada estagio
- Percentuais de conversao entre etapas
- Animacao com framer-motion
- Cores gradientes por estagio

### `LeadRemarketingPanel.tsx`
- Painel para disparo em massa de remarketing
- Filtros: por status, origem, temperatura, data de criacao, tags
- Opcoes de campanha: Abandono de Carrinho, Promocao, Reengajamento
- Editor de mensagem com variaveis (nome, marca, link)
- Preview antes do envio
- Historico de campanhas enviadas com metricas

---

## 3. Pagina Leads Atualizada (`Leads.tsx`)

### Layout com Tabs:
- **Lista** (tabela atual melhorada)
- **Kanban** (novo board drag-and-drop)
- **Funil** (funil de vendas visual)
- **Remarketing** (painel de campanhas)

### Header mantido com KPIs + Pipeline Bar existente

### Melhorias na tabela:
- Coluna de temperatura (emoji fogo)
- Coluna de score
- Ao clicar na linha, abre `LeadDetailSheet`

---

## 4. Automacao de Captura de Leads

### Formulario do site (Registrar.tsx / Index.tsx):
- Ao preencher dados pessoais e NAO seguir ate assinatura, o lead ja e criado (isso ja funciona via `trigger-email-automation` com evento `form_started`)
- Verificar que o status permanece "novo" e o lead aparece corretamente no Kanban

---

## 5. Edge Function: `send-lead-remarketing`

Nova funcao para enviar remarketing:
- Recebe: `lead_ids[]`, `campaign_id` ou `subject + body` customizado
- Para cada lead: substitui variaveis, envia via Resend, loga em `email_logs`
- Atualiza `remarketing_count` no lead
- Registra atividade em `lead_activities`
- Rate limit: 5 emails/segundo para evitar spam

---

## 6. Arquivos a Criar

| Arquivo | Descricao |
|---|---|
| `src/components/admin/leads/LeadKanbanBoard.tsx` | Board Kanban drag-and-drop |
| `src/components/admin/leads/LeadDetailSheet.tsx` | Ficha detalhada do lead (Sheet) |
| `src/components/admin/leads/LeadSalesFunnel.tsx` | Funil de vendas visual |
| `src/components/admin/leads/LeadRemarketingPanel.tsx` | Painel de remarketing em massa |
| `supabase/functions/send-lead-remarketing/index.ts` | Edge function de disparo |

## 7. Arquivos a Editar

| Arquivo | Mudanca |
|---|---|
| `src/pages/admin/Leads.tsx` | Refatorar com Tabs (Lista/Kanban/Funil/Remarketing), integrar novos componentes, sheet de detalhes |
| `src/components/admin/leads/LeadImportExportDialog.tsx` | Adicionar campo de tags na importacao |

## 8. Migracao SQL

- Adicionar colunas na tabela `leads`
- Criar tabela `lead_activities` com RLS
- Criar tabela `lead_remarketing_campaigns` com RLS
- Sem alteracao em tabelas existentes (aditivo apenas)

---

## Resultado Final

- CRM de Leads completo com 4 visualizacoes (Lista, Kanban, Funil, Remarketing)
- Drag-and-drop no Kanban atualiza status em tempo real
- Ficha do lead com timeline de atividades e remarketing individual
- Campanhas de remarketing em massa com filtros inteligentes
- Automacao de abandono de carrinho (ja existe, sera integrada na UI)
- Import/Export mantido e melhorado
- Tudo funcional, premium e moderno com animacoes framer-motion

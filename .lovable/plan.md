

## Diagnóstico Completo — Marketing Intelligence

Após análise detalhada de todos os 20 componentes, edge functions, tabelas e integrações, aqui está o que está faltando, precisa de upgrade ou refinamento para o módulo ficar **100% funcional**.

---

### PROBLEMAS ENCONTRADOS

#### 1. Arquivos órfãos (criados mas nunca usados)
- **`AIOptimization.tsx`** — componente duplicado do `OptimizationAgent.tsx`, nunca importado
- **`MetaAIAgent.tsx`** — componente duplicado, análise local (sem IA real), nunca importado na página atual

**Ação:** Deletar ambos. Funcionalidade já coberta pelo `OptimizationAgent.tsx`.

#### 2. UTM Capture não salva no banco
O hook `useUTMCapture` captura UTMs e salva no `localStorage`, mas **nunca grava na tabela `marketing_attribution`**. Isso significa que a aba "Atribuição de Leads" e toda a lógica de origem de campanha está sempre vazia.

**Ação:** Quando um lead é criado (formulário do site), gravar automaticamente os UTMs capturados na tabela `marketing_attribution` vinculando ao `lead_id`.

#### 3. Conversões nunca são registradas automaticamente
A tabela `marketing_conversions` existe mas **nenhum fluxo do CRM grava nela**. Os eventos (LeadCreated, ContractSigned, PaymentCompleted) são apenas conceituais — não há trigger nem código que popule essa tabela.

**Ação:** Criar triggers de banco de dados que inserem automaticamente em `marketing_conversions` quando:
- Um lead é criado → evento `LeadCreated`
- Um contrato é assinado (`signature_status` muda para `signed`) → evento `ContractSigned`
- Uma fatura é paga (`status` muda para `paid`) → evento `PaymentCompleted`

#### 4. Funil usa "Visitantes Estimados" como leads × 10
O `ConversionFunnelModule` estima visitantes multiplicando leads por 10. Sem dados reais de visitantes.

**Ação:** Manter a estimativa mas deixar claro no UI que é uma projeção, e adicionar tooltip explicativo.

#### 5. Pixel Event Tracking está desconectado
O `PixelEventTracking` tem botão "Testar" que chama `send-meta-conversion`, mas os eventos **nunca são disparados automaticamente** nos momentos reais do CRM.

**Ação:** Os triggers de conversão (item 3) também devem chamar a Meta Conversions API automaticamente via webhook/trigger.

#### 6. Referência a "Google Ads" residual
O `MetaAIAgent.tsx` (linha 285) e `OptimizationAgent.tsx` (linha 284) ainda mencionam "Google Ads" no disclaimer. O `LeadScoringModule` dá +25 pontos para "Google Ads" (linha 61).

**Ação:** Remover todas as referências residuais a Google Ads.

#### 7. MetaAdsConfig não salva o Access Token
A config salva Pixel ID e Business ID, mas o `META_ACCESS_TOKEN` precisa ser configurado como secret separadamente. O usuário não tem orientação clara no UI.

**Ação:** Adicionar campo para o Access Token na config que salva como secret via o mecanismo adequado, ou pelo menos melhorar o texto explicativo.

---

### UPGRADES PROPOSTOS

#### A. Auto-population do Data Warehouse (CRÍTICO)
Criar 3 triggers SQL que populam `marketing_conversions` automaticamente:
- `ON INSERT` em `leads` → registra `LeadCreated`
- `ON UPDATE` em `contracts` quando `signature_status = 'signed'` → registra `ContractSigned`
- `ON UPDATE` em `invoices` quando `status = 'paid'` → registra `PaymentCompleted` com valor

Isso faz **todo o módulo de Análise funcionar com dados reais**.

#### B. Gravar UTMs na atribuição ao criar lead
No fluxo de criação de lead (formulário do site), ler `localStorage` UTM params e gravar em `marketing_attribution` com o `lead_id`.

Isso faz o **Dashboard de origem, Funil por campanha e Attribution Panel** funcionarem.

#### C. Limpeza de código morto
Deletar `AIOptimization.tsx` e `MetaAIAgent.tsx` (órfãos). Remover referências Google Ads residuais do `LeadScoringModule` e disclaimers.

#### D. Refinar o Agente IA — Resumo Executivo Automático
O `OptimizationAgent` já chama a edge function, mas só quando o usuário clica. Adicionar um mini-resumo automático no Dashboard que mostra o status geral (ROI, alertas pendentes) sem precisar ir à aba do agente.

---

### PLANO DE IMPLEMENTAÇÃO

| Prioridade | Tarefa | Impacto |
|-----------|--------|---------|
| 1 | Criar 3 triggers SQL para auto-popular `marketing_conversions` | Análise e Conversões funcionam com dados reais |
| 2 | Gravar UTMs em `marketing_attribution` no fluxo de criação de lead | Atribuição e Dashboard de origem funcionam |
| 3 | Deletar `AIOptimization.tsx` e `MetaAIAgent.tsx` | Limpeza de código morto |
| 4 | Remover referências Google Ads residuais | Consistência |
| 5 | Adicionar mini-resumo de status no Dashboard | UX melhorada |
| 6 | Melhorar texto do MetaAdsConfig sobre Access Token | Clareza para o usuário |

### O QUE NÃO SERÁ ALTERADO
- Nenhuma tabela existente do CRM
- Nenhum fluxo de leads, contratos ou financeiro
- Nenhuma edge function existente (exceto marketing-ai-agent se necessário)
- Estrutura de 7 abas mantida




## Relatório: Modelos de IA por Função

| # | Função (Edge Function) | Modelo Atual | API | Uso |
|---|------------------------|-------------|-----|-----|
| 1 | `email-ai-assistant` | **gpt-4o-mini** | OpenAI direta | Assistente de e-mail |
| 2 | `process-rpi` | **gpt-4o-mini** | OpenAI direta | Processamento da Revista INPI |
| 3 | `adjust-inpi-resource` | **gpt-4o-mini** | OpenAI direta | Ajuste de recurso INPI |
| 4 | `sync-inpi-knowledge` | **gpt-4o-mini** | OpenAI direta | Sincronização base INPI |
| 5 | `chat-support` | **gpt-4o** ⚠️ | OpenAI direta | Chat de suporte (Fernanda) |
| 6 | `chat-inpi-legal` | **gpt-4o** ⚠️ | OpenAI direta | Chat jurídico INPI (Fernanda) |
| 7 | `process-inpi-resource` | **gpt-4o** ⚠️ | OpenAI direta | Geração de recursos INPI |
| 8 | `inpi-viability-check` | **openai/gpt-5.2** ⚠️ | Lovable Gateway | Viabilidade de marca |
| 9 | `extract-document-content` | **google/gemini-3-flash-preview** ⚠️ | Lovable Gateway | Extração de documentos |
| 10 | `process-inpi-document` | **google/gemini-2.5-flash** ⚠️ | Lovable Gateway | Processamento docs INPI |
| 11 | `send-multichannel-notification` | **google/gemini-2.5-flash-lite** ⚠️ | Lovable Gateway | Notificações multicanal |
| 12 | `process-remarketing-queue` | **google/gemini-2.5-flash-lite** ⚠️ | Lovable Gateway | Fila de remarketing |
| 13 | `send-lead-remarketing` | **google/gemini-2.5-flash-lite** ⚠️ | Lovable Gateway | Remarketing de leads |
| 14 | `send-client-remarketing` | **google/gemini-2.5-flash-lite** ⚠️ | Lovable Gateway | Remarketing de clientes |
| 15 | `ai-engine` | **dinâmico** (tabela ai_providers) | Múltiplas | Motor central configurável |

⚠️ = precisa ser alterado

---

## Plano de Alterações

**Regra solicitada:**
- **Tudo** → `gpt-4o-mini` (via OpenAI direta)
- **Exceção**: `process-inpi-resource` (Recursos INPI) → `openai/gpt-5-mini` (via Lovable Gateway)

### Alterações necessárias (10 arquivos):

| Arquivo | De | Para |
|---------|-----|------|
| `chat-support/index.ts` | `gpt-4o` | `gpt-4o-mini` |
| `chat-inpi-legal/index.ts` | `gpt-4o` | `gpt-4o-mini` |
| `process-inpi-resource/index.ts` | `gpt-4o` | `openai/gpt-5-mini` + migrar para Lovable Gateway |
| `inpi-viability-check/index.ts` | `openai/gpt-5.2` | `gpt-4o-mini` + migrar para OpenAI direta |
| `extract-document-content/index.ts` | `google/gemini-3-flash-preview` | `gpt-4o-mini` + migrar para OpenAI direta |
| `process-inpi-document/index.ts` | `google/gemini-2.5-flash` | `gpt-4o-mini` + migrar para OpenAI direta |
| `send-multichannel-notification/index.ts` | `google/gemini-2.5-flash-lite` | `gpt-4o-mini` + migrar para OpenAI direta |
| `process-remarketing-queue/index.ts` | `google/gemini-2.5-flash-lite` | `gpt-4o-mini` + migrar para OpenAI direta |
| `send-lead-remarketing/index.ts` | `google/gemini-2.5-flash-lite` | `gpt-4o-mini` + migrar para OpenAI direta |
| `send-client-remarketing/index.ts` | `google/gemini-2.5-flash-lite` | `gpt-4o-mini` + migrar para OpenAI direta |

### Sem alteração (já corretos):
- `email-ai-assistant` ✅
- `process-rpi` ✅
- `adjust-inpi-resource` ✅
- `sync-inpi-knowledge` ✅

### Detalhes técnicos

Para as funções que hoje usam o **Lovable Gateway**, será necessário trocar o endpoint de `ai.gateway.lovable.dev` para `api.openai.com` e usar `OPENAI_API_KEY` em vez de `LOVABLE_API_KEY`. A exceção é `process-inpi-resource` que fará o caminho inverso: migrará para o Lovable Gateway com modelo `openai/gpt-5-mini`.


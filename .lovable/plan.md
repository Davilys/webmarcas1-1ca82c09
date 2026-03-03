

## Plano: Migrar todas as funções para GPT-4.1-mini (exceto Recursos INPI e Consultora Jurídica → GPT-5-mini)

### Resumo

O modelo `gpt-4o-mini` será substituído por `gpt-4.1-mini` em 12 funções. As 2 funções jurídicas INPI (`process-inpi-resource` e `chat-inpi-legal` / Fernanda) usarão `openai/gpt-5-mini` via Lovable Gateway.

### Alterações

| # | Função | Modelo Atual | Novo Modelo | API |
|---|--------|-------------|-------------|-----|
| 1 | `email-ai-assistant` | gpt-4o-mini | **gpt-4.1-mini** | OpenAI direta |
| 2 | `process-rpi` | gpt-4o-mini | **gpt-4.1-mini** | OpenAI direta |
| 3 | `adjust-inpi-resource` | gpt-4o-mini | **gpt-4.1-mini** | OpenAI direta |
| 4 | `sync-inpi-knowledge` | gpt-4o-mini | **gpt-4.1-mini** | OpenAI direta |
| 5 | `chat-support` | gpt-4o-mini | **gpt-4.1-mini** | OpenAI direta |
| 6 | `inpi-viability-check` | gpt-4o-mini (4x) | **gpt-4.1-mini** | OpenAI direta |
| 7 | `extract-document-content` | gpt-4o-mini | **gpt-4.1-mini** | OpenAI direta |
| 8 | `process-inpi-document` | gpt-4o-mini | **gpt-4.1-mini** | OpenAI direta |
| 9 | `send-multichannel-notification` | gpt-4o-mini | **gpt-4.1-mini** | OpenAI direta |
| 10 | `process-remarketing-queue` | gpt-4o-mini | **gpt-4.1-mini** | OpenAI direta |
| 11 | `send-lead-remarketing` | gpt-4o-mini | **gpt-4.1-mini** | OpenAI direta |
| 12 | `send-client-remarketing` | gpt-4o-mini | **gpt-4.1-mini** | OpenAI direta |
| 13 | `process-inpi-resource` | openai/gpt-5-mini | **openai/gpt-5-mini** ✅ (já correto) | Lovable Gateway |
| 14 | `chat-inpi-legal` | gpt-4o-mini | **openai/gpt-5-mini** | Migrar para Lovable Gateway |

### Detalhes técnicos

- **12 funções**: Trocar apenas a string do modelo de `gpt-4o-mini` para `gpt-4.1-mini`. Endpoint e chave permanecem iguais (OpenAI direta).
- **`chat-inpi-legal`**: Além de trocar o modelo, migrar o endpoint de `api.openai.com` para `ai.gateway.lovable.dev` e a chave de `OPENAI_API_KEY` para `LOVABLE_API_KEY` (mesmo padrão do `process-inpi-resource`).
- **`process-inpi-resource`**: Já está correto com `openai/gpt-5-mini` via Lovable Gateway. Nenhuma alteração necessária.
- **`ai-engine`**: Usa modelo dinâmico da tabela `ai_providers` — sem alteração no código.


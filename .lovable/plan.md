
# Botao de Teste do Webhook BotConversa

## Objetivo
Adicionar um botao "Enviar Teste" na pagina de configuracoes do WhatsApp Automatico (AutomatedWhatsAppSettings) que dispara uma requisicao POST real ao webhook do BotConversa com os campos `telefone`, `nome` e `mensagem`. Isso permitira que o BotConversa detecte os campos e possibilite o mapeamento na interface deles.

## O que sera feito

1. **Modificar `src/components/admin/settings/AutomatedWhatsAppSettings.tsx`**:
   - Adicionar um Card "Teste de Webhook" acima das tabs existentes
   - Campos editaveis: telefone (pre-preenchido com o `test_phone` salvo), nome (pre-preenchido "Cliente Teste"), mensagem (pre-preenchida "Teste de integracao WebMarcas")
   - Botao "Enviar Requisicao de Teste"
   - Ao clicar, busca as configuracoes do BotConversa da tabela `system_settings` (key: `botconversa`) e faz um POST direto ao `webhook_url` com o payload `{ telefone, nome, mensagem }`
   - Exibe toast de sucesso ou erro com o status HTTP retornado

## Detalhes Tecnicos

- A chamada sera feita via a edge function `send-multichannel-notification` com `event_type: "teste_webhook"` e `channels: ["whatsapp"]`, reaproveitando toda a logica existente de envio (normalizacao de telefone, headers, retry, logging)
- Alternativamente, para garantir que o payload chegue exatamente com os 3 campos esperados (`telefone`, `nome`, `mensagem`), a chamada pode ir direto ao webhook usando `fetch` no lado do cliente -- porem isso pode causar CORS. Portanto, a abordagem mais segura e invocar a edge function existente passando `mensagem_custom` no campo `data`
- O componente usara `supabase.functions.invoke('send-multichannel-notification', ...)` com o payload de teste
- Nenhuma alteracao no banco de dados ou edge functions necessaria

## Arquivos Modificados
- `src/components/admin/settings/AutomatedWhatsAppSettings.tsx` -- adicionar card de teste com formulario e botao


Objetivo: fazer a Central de E-mails funcionar como cliente real (Gmail/Outlook): conteúdo completo, anexos, atualização automática e sem travar.

Diagnóstico (causa do erro)
1) A sincronização IMAP salva só cabeçalhos (From/To/Subject/Date/Message-ID), então body_text/body_html ficam nulos (“Sem conteúdo”).
2) Não existe estrutura de anexos no inbox (nem no backend nem na UI da leitura).
3) A função de sync está estourando tempo (vários 504 em ~150s), porque varre caixas grandes inteiras em toda execução.
4) A listagem atual não é paginada (limite padrão de consulta), então não escala para caixas muito grandes.

Plano de correção
1) Reestruturar dados de e-mail (migração)
- email_inbox: adicionar campos para `imap_uid`, `snippet`, `has_attachments`, `attachments` (json), `body_fetched_at`, `sync_status`.
- Ajustar unicidade para evitar conflito global por `message_id` (usar chave por conta/pasta/uid).
- Adicionar índices por `account_id + folder + received_at` para performance.
- email_accounts: adicionar campos de controle de sync incremental (último UID inbox/sent, lock de sincronização, última sync).

2) Reescrever a sync IMAP para modo incremental e resiliente
- Sincronizar por UID (não por varredura completa toda vez).
- Processar do mais novo para o mais antigo.
- Usar lock por conta para impedir execuções concorrentes.
- Limitar janela por execução para não atingir timeout e retornar cursor de continuidade.
- Para mensagens novas (ou antigas sem corpo), buscar RFC822 completo e parsear corpo texto/html + anexos.

3) Implementar suporte real a anexos
- Extrair anexos no parser MIME.
- Salvar metadados no `email_inbox.attachments`.
- Armazenar arquivo em storage privado de e-mails e entregar download por URL assinada.
- Exibir seção “Anexos” na leitura do e-mail (nome, tamanho, tipo, baixar/abrir).

4) Ajustes de frontend (experiência tipo Gmail/Outlook)
- `EmailView`: se e-mail estiver sem corpo, acionar hidratação automática do conteúdo ao abrir (sem clique manual em sincronizar).
- Mostrar estado “Sincronizando conteúdo...” e depois renderizar corpo/anexos.
- `EmailList`: usar `snippet` real e paginação/infinite scroll para caixas grandes.
- Manter sincronização automática em background, com prevenção de chamadas sobrepostas.

5) Backfill dos e-mails já existentes
- Rodar hidratação em lote dos e-mails que já estão no banco sem conteúdo (priorizando os mais recentes), até zerar “sem conteúdo”.
- Não apagar histórico; atualizar registros existentes progressivamente.

Detalhes técnicos (implementação)
Fluxo alvo:
`IMAP incremental (UID) -> parse MIME completo -> persistir body/snippet/anexos -> UI auto-atualiza`
Com isso:
- novos e-mails entram com conteúdo completo;
- e-mails antigos sem body são corrigidos no backfill;
- anexos passam a aparecer como no Outlook/Gmail.

Critérios de aceite
- Abrir um e-mail recebido e ver conteúdo completo (texto/HTML) sem clicar “Sincronizar”.
- Ver anexos do e-mail e conseguir baixar/abrir.
- Receber e-mail novo e ele aparecer automaticamente na Central.
- Taxa de erro de sync cair (sem 504 recorrente).
- Caixa com grande volume carregar com paginação sem travar.

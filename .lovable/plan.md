

## Dump SQL Completo do Banco de Dados — Plano

### Situação
Estamos em modo somente leitura. Para gerar o dump SQL completo (schema + dados), preciso mudar para o modo de implementação para executar o comando `pg_dump`.

### O que será feito
1. Executar `pg_dump --schema=public --no-owner --no-privileges` usando as variáveis de conexão já configuradas no ambiente
2. O arquivo será salvo em `/mnt/documents/webmarcas_full_dump.sql`
3. Incluirá:
   - **Schema completo**: todas as 73 tabelas, tipos (enums), índices, constraints, funções e triggers
   - **Dados completos**: todos os registros de todas as tabelas
4. Disponibilizar o arquivo para download

### Tabelas incluídas (73 tabelas)
Profiles, leads, contracts, invoices, brand_processes, documents, chat_messages, notifications, user_roles, admin_permissions, email_inbox, marketing_campaigns, e todas as demais.

### Como usar no Supabase externo
```sql
-- No Supabase externo, execute no SQL Editor:
-- 1. Cole o conteúdo do arquivo .sql
-- 2. Execute
```

### Importante
- O dump NÃO inclui dados da tabela `auth.users` (schema reservado do Supabase) — os usuários precisam ser recriados no projeto externo
- Edge Functions e Secrets precisam ser configurados manualmente
- Storage buckets (`documents`, `email-attachments`) e seus arquivos não são incluídos no dump SQL


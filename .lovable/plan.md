

## Plano: Importação Assíncrona via Edge Function (restore-backup)

### Problema
Com 31k+ registros, a importação client-side falha por:
- Memória do navegador esgotada ao parsear o JSON inteiro
- Milhares de requests sequenciais causam timeout
- RLS bloqueia inserções em certas tabelas

### Solução
Criar uma Edge Function `restore-backup` que recebe lotes de dados e faz upsert com `service_role_key` (bypassa RLS). O frontend envia chunks de 200 registros por request, tabela por tabela, com retry automático.

### Arquitetura

```text
Frontend (BackupImportSection)          Edge Function (restore-backup)
─────────────────────────────           ──────────────────────────────
1. Parse JSON (streaming)               
2. Agrupa por _type                     
3. Para cada tabela:                    
   Divide em chunks de 200 ──────────► Recebe { table, rows }
                                        Valida tabela na whitelist
                                        supabaseAdmin.from(table)
                                          .upsert(rows, onConflict:'id')
                                        Retorna { imported, failed }
4. Atualiza barra de progresso ◄──────  
5. Retry automático (até 3x)           
6. Loga em import_logs                 
```

### Alterações

#### 1. `supabase/functions/restore-backup/index.ts` (novo)
- Recebe POST com `{ table: string, rows: object[] }`
- Whitelist de tabelas válidas (importada de constante)
- Verifica autenticação JWT e role admin
- Usa `createClient` com `SUPABASE_SERVICE_ROLE_KEY` para bypass de RLS
- Faz `.upsert(rows, { onConflict: 'id', ignoreDuplicates: false })` (estratégia: atualizar)
- Retorna `{ imported: number, failed: number, errors: string[] }`

#### 2. `src/lib/backupTables.ts` (atualizar)
- Exportar array simples `TABLE_WHITELIST` com todos os nomes de tabelas para validação na Edge Function

#### 3. `src/components/admin/settings/BackupImportSection.tsx` (atualizar)
- Substituir upsert client-side por `supabase.functions.invoke('restore-backup', { body: { table, rows } })`
- Chunks de 200 registros por request (cabe no timeout de 150s)
- Retry automático com backoff exponencial (1s, 2s, 4s) até 3 tentativas
- Progresso granular: tabela atual + registros importados/total
- Manter fallback client-side caso a Edge Function não esteja disponível

### Fluxo no Projeto de Destino
O outro projeto precisa ter o **mesmo código** (Edge Function + frontend). Como ambos são projetos Lovable com a mesma base de código, basta replicar o código para que a interface de Configurações → Importar funcione identicamente.

### Arquivos
- `supabase/functions/restore-backup/index.ts` — novo
- `src/lib/backupTables.ts` — adicionar whitelist export  
- `src/components/admin/settings/BackupImportSection.tsx` — usar Edge Function com retry


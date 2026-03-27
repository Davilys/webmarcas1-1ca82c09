

## Plano: Exportar SQL em Partes (Arquivos Separados por Tabela)

### Problema
O SQL Editor do Supabase tem limite de tamanho de query. Um dump com 31k+ registros gera um arquivo SQL enorme que não pode ser executado de uma vez.

### Solução
Alterar a exportação SQL para gerar **um arquivo ZIP contendo um arquivo `.sql` por tabela**, numerados na ordem correta de dependência. Cada arquivo terá no máximo ~500 INSERTs, e tabelas grandes serão divididas em partes (ex: `03_chat_messages_part1.sql`, `03_chat_messages_part2.sql`).

Além disso, incluir um arquivo `00_README.txt` com instruções de execução na ordem correta.

### Como o usuário vai usar
1. Clica em "Exportar SQL (em partes)"
2. Recebe um ZIP com arquivos numerados
3. No SQL Editor do destino, executa cada arquivo na ordem (01, 02, 03...)
4. Tabelas independentes primeiro, tabelas com FK depois

### Detalhes técnicos

**Arquivo modificado:** `src/components/admin/settings/BackupSettings.tsx`

- Nova função `exportSQLParts` que:
  - Itera por cada tabela
  - Gera INSERTs em lotes de no máximo **500 registros por arquivo** (bem abaixo do limite do SQL Editor)
  - Usa a lib `JSZip` para empacotar tudo em um `.zip`
  - Numera os arquivos na ordem de dependência (tabelas sem FK primeiro)
  - Cada arquivo tem `BEGIN;` / `COMMIT;` próprio
  - Inclui `ON CONFLICT (id) DO UPDATE` para permitir re-execução segura

- Novo botão na UI: "Exportar SQL em Partes (ZIP)" ao lado do botão SQL existente

**Nova dependência:** `jszip` (para gerar o ZIP no navegador)

### Ordem de execução sugerida nos arquivos
1. `system_settings`, `user_roles`, `admin_permissions`, `ai_providers`
2. `profiles`, `leads`
3. `contracts`, `brand_processes`, `invoices`, `documents`
4. Tabelas dependentes (notas, atividades, mensagens, logs)


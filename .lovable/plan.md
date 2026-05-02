## Importação Perfex CRM → Webmarcas (somente acréscimo, zero alteração)

### Diagnóstico do dump (`u973561543_perfexcrm.sql`, 70 MB)

| Tabela origem | Registros | Destino |
|---|---|---|
| `tblwebmarcas_customers` | **168** (CPF/CNPJ, marca, ramo, endereço completo) | `profiles` + `brand_processes` |
| `tblcontacts` + `tblclients` | **16/18** | mescla com profiles (por email/CPF/CNPJ) |
| `tblcontracts` (assinados) | **~? de 1.683** (filtro `signed=1`) | `contracts` |
| `tblwebmarcas_contracts` | **186** (templates customizados) | `contracts` (vinculados aos profiles) |
| `tblfiles` (metadados) | **30** (binários em `crm.webmarcas.net/uploads/`) | `documents` + storage `documents` |

### Estratégia (4 fases — script Node executado pela edge function)

#### Fase 1 — Parse e normalização (offline, 1 vez)
Script `scripts/perfex-import.ts` lê `/tmp/perfex.sql` localmente, extrai apenas as 5 tabelas relevantes via regex, gera 4 NDJSON em `/tmp/`:
- `customers.ndjson` (168 + 16 mesclados)
- `contracts.ndjson` (somente `signed=1`)
- `files.ndjson` (30 metadados)
- `mapping.json` (perfex_id → email para resolver vínculos)

Faz upload do NDJSON para o storage `documents/_imports/perfex-2026-05-02/`.

#### Fase 2 — Edge function `import-perfex-customers`
- Validação JWT + role `admin` (apenas Master pode disparar)
- Lê o NDJSON do storage
- Para cada cliente: dedup em cascata **email → CPF → CNPJ → nome**
  - **Existe** → SKIP completamente (preserva edições atuais — conforme escolha "Pular o duplicado")
  - **Novo** → cria auth user (senha `123Mudar@`) + profile (origin=`'import_perfex'`, `client_funnel_type='juridico'`, `created_by`=master) + role `user` + `brand_process` em `protocolado`
- Lote de 5, retorna `{ imported, skipped, errors[] }`

#### Fase 3 — Edge function `import-perfex-contracts`
- Lê `contracts.ndjson` (filtra `signed=1`)
- Resolve `user_id` via `mapping.json` (perfex client → email → profile.id)
- Se cliente não existir no Webmarcas → registra em `errors[]` e pula
- INSERT em `contracts` com:
  - `subject`, `contract_html` ← `content` (HTML do Perfex)
  - `contract_value`, `start_date`, `end_date`
  - `signature_status`='signed', `signed_at`=`acceptance_date`
  - `signature_ip`=`acceptance_ip`, `signatory_name`=`acceptance_firstname+lastname`
  - `created_by`=master, `contract_type`='registro_marca'
  - **NÃO** preenche `blockchain_hash` (legado, não tem prova)
- Idempotência: hash do `(perfex_id, client_email)` em descrição → segundo run não duplica

#### Fase 4 — Edge function `import-perfex-files`
- Para cada um dos 30 arquivos em `tblfiles`:
  - Constrói URL: `https://crm.webmarcas.net/uploads/{rel_type}/{rel_id}/{file_name}`
  - `fetch()` com timeout 30s
  - Se OK → upload para `storage/documents/imported/perfex/{rel_type}/{rel_id}/{file_name}`
  - INSERT em `documents` vinculando ao `user_id` (e `contract_id` se `rel_type='contract'`)
  - `uploaded_by`='import_perfex'
  - Se 404/erro → registra em `errors[]` (não falha o lote)

#### UI — botão único em Configurações → Backup/Restauração
Adiciona card "Importar Perfex CRM (legado)" com:
- Botão "1. Importar Clientes" → chama `import-perfex-customers` → mostra `{imported, skipped, errors}`
- Botão "2. Importar Contratos Assinados" (habilitado após fase 1)
- Botão "3. Baixar Arquivos do Servidor Antigo" (habilitado após fase 1)
- Cada fase mostra progresso e modal com lista detalhada de erros
- Visível **apenas para Master Admin** (`davillys@gmail.com`)

### Garantias de segurança ("não alterar nada")

1. **Schema**: zero migration. Usa apenas tabelas/colunas existentes.
2. **Funis**: novos clientes entram em `protocolado` (mesma regra do bulk import atual).
3. **Conflitos**: SKIP total — registros existentes ficam intactos.
4. **Auth**: senha `123Mudar@` (já é o padrão do projeto).
5. **RLS**: respeitado — service role só usado para criar auth users.
6. **Rastreabilidade**: `origin='import_perfex'` em todos os profiles + `import_logs` registra cada run.
7. **Idempotência**: rodar 2x não duplica nada.
8. **Arquivos**: se servidor antigo cair, importação continua (apenas registra erro).

### Arquivos a criar
- `scripts/perfex-import.ts` (parser local, roda 1 vez no build)
- `supabase/functions/import-perfex-customers/index.ts`
- `supabase/functions/import-perfex-contracts/index.ts`
- `supabase/functions/import-perfex-files/index.ts`
- Edição: `src/components/admin/settings/BackupRestoreSettings.tsx` (adiciona o card)

### Resultado esperado
- ~150-160 novos clientes no CRM (descontando duplicatas)
- ~100-300 contratos assinados históricos vinculados
- ~25 arquivos no storage permanente
- Logs detalhados de tudo que falhou
- Zero impacto em clientes/contratos/funis existentes
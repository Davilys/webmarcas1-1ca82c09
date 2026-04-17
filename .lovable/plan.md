

## Auditoria Completa — Resultados

### 🔴 CRÍTICO — quebra a importação

**1. `documents.uploaded_by` é `text`, NÃO `uuid`**
Schema real: `uploaded_by | text | Default: 'system'::text`. O código atual envia `adminUserId` (uuid) → vai funcionar (uuid é string), mas o comentário "FIX: column is uuid" está errado e perdemos a semântica `'import_zip'` para auditoria.

**2. RLS bloqueia inserção em `documents` para outros usuários**
Política `Users can upload documents`: `auth.uid() = user_id`. A política admin `Admins can insert documents` permite — mas só se `has_role(admin)`. Isso funciona se o usuário logado for admin. ✅ OK para uso pretendido.

**3. RLS bloqueia inserção em `contracts` com `user_id` de outro usuário**
Política `Users can insert own contracts`: `(auth.uid() = user_id) OR has_role(admin)`. Como admin existe via `Admins can insert contracts`, ✅ funciona.

**4. Storage upload pode falhar silenciosamente em PDFs de contrato**
Se `pdf.storage_path` vier `null` (manifest antigo/dado faltante), usa `'signed-contracts'`. Mas se existir conflito de path (`upsert: false`), o erro é IGNORADO — o registro em `documents` nem é criado e nada é logado. Sem feedback ao usuário.

**5. Re-upload do `.ots` perde o vínculo se falhar**
Se o upload do `.ots` falhar, mantém `entry.ots_file_url` (URL do projeto A) — que NÃO existe no projeto B. Resultado: hash blockchain válido, mas link `.ots` quebrado, e `/verificar-contrato` mostra erro ao baixar prova.

### 🟡 MÉDIO — funciona mas não ideal

**6. Sem callback `phase: 'uploading'` para PDFs anexos durante import**
O usuário vê só "creating contract X" mas o upload de N PDFs por contrato pode levar minutos sem feedback.

**7. Documentos com `contract_id` são exportados DUAS vezes**
- Uma vez no export de Documentos (em `files/`)
- Outra vez no export de Contratos (em `contract_pdfs/`)

Se o usuário importar AMBOS os ZIPs no projeto B, cria duplicatas. Não é bug do código, mas falta aviso.

**8. Sem validação de integridade do ZIP**
Se o manifest referenciar `zip_filename` que não está no ZIP (corrompido/truncado), o código pula silenciosamente sem reportar.

### ✅ O que está correto
- Manifest de contratos COMPLETO (todos os campos blockchain/assinatura)
- Hash blockchain preservado → `/verificar-contrato` funciona no destino
- Lookup por email/brand_name (não depende de UUIDs do projeto A)
- Tratamento de colisão de `contract_number` com sufixo `_imp_<timestamp>`
- Limite de 400MB com aviso `SIZE_WARNING`
- Compressão DEFLATE nível 6 (bom equilíbrio)

---

## Plano de Correção

**`src/lib/zipDocumentExporter.ts`:**

1. **Logar falhas de upload de PDFs anexados a contratos** (problema #4): adicionar ao array `errors[]` quando `uploadError` ocorre, assim o usuário vê no toast.

2. **Tratar falha de re-upload do `.ots`** (problema #5): se falhar, definir `otsFileUrl = null` em vez de manter URL órfã do projeto A. Adicionar warning aos `errors[]`.

3. **Adicionar callback `phase: 'uploading'` para cada PDF anexado** (problema #6) durante o loop de attached_pdfs.

4. **Validar integridade do manifest** (problema #8): contar arquivos esperados vs encontrados no início do import e reportar discrepância.

5. **Corrigir comentário enganoso** (problema #1): trocar `// FIX: was string 'import_zip', column is uuid` por nota correta sobre o tipo `text`.

**`src/pages/admin/Documentos.tsx` + `Contratos.tsx`:**

6. **Aviso ao usuário sobre duplicação** (problema #7): adicionar texto no botão "Importar ZIP" alertando que se importar AMBOS (Documentos + Contratos), os PDFs anexos a contratos virão em duplicata. Sugestão: importar SÓ Contratos (que já inclui os PDFs anexos), e depois SÓ os documentos sem `contract_id` via filtro no manifest.

7. **Mostrar `errors[]` em modal/toast detalhado** após import: hoje só aparece no `console.warn`, mas o usuário precisa ver as falhas para tomar ação.

### Resultado pós-correção
- Erros de upload de PDFs/`.ots` ficam visíveis ao usuário
- Sem URLs órfãs apontando para projeto A
- Feedback completo durante todo o processo
- Usuário ciente sobre risco de duplicação ao usar ambos os exports
- Prova blockchain 100% íntegra entre projetos


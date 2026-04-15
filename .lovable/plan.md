

## Plano: Importar/Exportar Documentos e Contratos com Arquivos (ZIP)

### Problema
O objetivo é transferir documentos e contratos entre duas instâncias CRM idênticas, mantendo arquivos, metadados e ordem. A exportação atual de Documentos é apenas JSON (metadados + URLs), sem os arquivos reais. Contratos não têm import/export.

### Viabilidade e Limitações

**Realidade técnica**: Os arquivos estão no Supabase Storage com URLs públicas. Baixar centenas de arquivos e compactá-los no browser tem limitações de memória. A abordagem viável é:

- **Exportar**: Gera um ZIP contendo um `manifest.json` (todos os metadados) + os arquivos reais baixados via `fetch` das URLs públicas. Usa a biblioteca `JSZip` no browser.
- **Importar**: Lê o ZIP, faz upload de cada arquivo para o Storage do novo projeto e cria os registros no banco com os novos URLs.
- **Limite prático**: ~500MB total (limite do browser). Para volumes maiores, exportar em lotes.

### Alterações

**1. Instalar dependência**
- `jszip` (já disponível ou instalar via npm)

**2. `src/pages/admin/Documentos.tsx`** — Substituir export/import atual
- **Exportar**: Botão "Exportar ZIP" que:
  1. Busca todos os documentos
  2. Baixa cada `file_url` via fetch
  3. Adiciona ao ZIP com nome `{protocol}_{name}` ou fallback
  4. Inclui `manifest.json` com metadados (name, document_type, mime_type, file_size, protocol, user_id, process_id, created_at, client_email, brand_name)
  5. Gera download do ZIP
- **Importar**: Botão "Importar ZIP" que:
  1. Lê o ZIP
  2. Para cada entrada no manifest: faz upload do arquivo para Storage, cria registro na tabela `documents` com o novo URL
  3. Associa `user_id` via email do cliente (busca profiles por email)
  4. Associa `process_id` via brand_name (busca brand_processes)
- Barra de progresso durante export/import

**3. `src/pages/admin/Contratos.tsx`** — Adicionar export/import
- **Exportar**: Botão "Exportar Contratos" que:
  1. Busca todos os contratos com `contract_html`, dados de perfil, tipo
  2. Gera `contracts_manifest.json` com todos os campos
  3. Para contratos com documentos PDF associados (tabela `documents` onde `contract_id`), inclui os PDFs no ZIP
  4. Download do ZIP
- **Importar**: Botão "Importar Contratos" que:
  1. Lê o manifest
  2. Associa `user_id` via email do cliente
  3. Cria contratos na tabela `contracts`
  4. Faz upload dos PDFs associados e cria registros em `documents`

### Fluxo do Usuário
1. No projeto A: clica "Exportar ZIP" → aguarda download
2. No projeto B: clica "Importar ZIP" → seleciona arquivo → aguarda processamento
3. Documentos aparecem na mesma ordem com os mesmos tipos e associações

### Segurança
- Import usa service role via edge function para bypass de RLS ao criar registros com user_ids de outros usuários
- Edge function `import-documents-zip` processa o manifest e faz upsert


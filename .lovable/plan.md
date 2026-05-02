## Diagnóstico (auditoria concluída)

Auditei toda a cadeia de exportação de contratos. O download individual (botão "Baixar PDF" em `Contratos.tsx` e `ContractDetailSheet.tsx`) já chama `generateDocumentPrintHTML(...)` passando `client_signature_image` e o objeto `blockchainSignature` corretamente — esses PDFs saem com assinatura e certificado.

**O bug está na exportação em massa (botão "Exportar ZIP")** em `src/lib/zipDocumentExporter.ts` → função `exportContractsZip`:

| O que o ZIP contém hoje | O que falta |
|---|---|
| `contracts_manifest.json` (metadados, inclui hash/imagem em base64 cru) | — |
| `contract_pdfs/...` (apenas PDFs anexados manualmente como `documents`) | — |
| `ots_proofs/*.ots` (prova OpenTimestamps) | — |
| ❌ **Nenhum PDF renderizado por contrato** | **PDF gerado com a assinatura desenhada + página de certificação blockchain** |

Como a maioria dos contratos não tem PDF anexado em `documents`, o usuário abre o ZIP e não encontra nada visualmente assinado — os dados estão lá no JSON, mas não há um documento legível com assinatura + certificado.

Confirmei via DB que os contratos assinados têm `blockchain_hash` e `client_signature_image` populados — a renderização funciona, só não está sendo chamada no export ZIP.

## Plano de correção

### 1. Criar gerador de PDF puro (sem `window.open`)
Novo arquivo `src/lib/contractPdfRenderer.ts` que:
- Recebe os dados do contrato (mesmos campos já usados em `generateDocumentPrintHTML`)
- Renderiza o HTML em um iframe oculto (offscreen)
- Usa `html2canvas` + `jspdf` para gerar um `Blob` PDF multi-página (A4)
- Inclui: assinatura do cliente (img), assinatura "✓ Digitalmente" da WebMarcas, e a página/seção de **certificação blockchain** (hash, timestamp, txId, rede, IP, QR de verificação)

### 2. Adaptar `exportContractsZip`
Em `src/lib/zipDocumentExporter.ts` → para cada contrato no loop:
- Chamar `renderContractPDF(contract)` → obter `Blob`
- Adicionar ao ZIP em `contracts_pdfs_renderizados/{numero_ou_id}.pdf`
- Atualizar a manifest entry com o campo `rendered_pdf_filename`
- Tratar erro silenciosamente (registra em `errors[]` no manifest, não trava o lote)
- Atualizar a label do progresso para "Renderizando PDF..."

### 3. Procedimento de teste (antes de entregar)
Antes de marcar como pronto, vou:
1. Buscar via `read_query` 3 contratos reais variados:
   - Um com `client_signature_image` + `blockchain_hash`
   - Um só com `blockchain_hash` (sem imagem)
   - Um sem nenhum dos dois (não assinado)
2. Rodar o script de renderização localmente em `/tmp` simulando os dados
3. Converter o PDF para imagens e inspecionar visualmente cada um:
   - Assinatura aparece no quadro do "Contratante"
   - Página/bloco "CERTIFICAÇÃO DIGITAL E VALIDADE JURÍDICA" presente com hash, data, txId, rede e QR
   - Layout sem cortes, sem caixas pretas, sem texto sobreposto
4. Só depois de confirmar visualmente os 3 cenários, aplico a correção no `exportContractsZip` e faço deploy

### Arquivos a alterar
- ✏️ Criar `src/lib/contractPdfRenderer.ts`
- ✏️ Editar `src/lib/zipDocumentExporter.ts` (adicionar render no loop de `exportContractsZip`)

### Garantias de segurança
- **Zero alteração de schema** — só leitura
- **Não toca em** `generateDocumentPrintHTML`, no fluxo de assinatura, no download individual, ou no import
- Falhas de renderização não interrompem o ZIP (graceful)
- Manifest mantém compatibilidade total com `importContractsZip`

### Resultado esperado
ZIP exportado passa a conter, para cada contrato assinado, um PDF visualmente idêntico ao que o cliente assinou — com a imagem da assinatura no campo do Contratante e a página de Certificação Blockchain (hash SHA-256, timestamp, txId, rede, IP, QR de verificação).

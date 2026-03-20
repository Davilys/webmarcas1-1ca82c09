

## Problema

No PDF gerado ("PDF timbrado"), o título aparece como um badge marinho centralizado, e a marca/processo também ficam centralizados. A imagem de referência (image-650) mostra que devem ser **texto bold alinhado à esquerda**, sem badge. O corpo do texto também precisa estar alinhado à esquerda.

## Alterações

**Arquivo**: `src/components/admin/INPIResourcePDFPreview.tsx`

### 1. Substituir badge centralizado por título left-aligned (PDF — linhas 256-295)

Remover o `roundedRect` centralizado e substituir por:
- `RECURSO ADMINISTRATIVO – MANIFESTAÇÃO À OPOSIÇÃO` — bold, font 12, cor navy (#1e3a5f), alinhado à esquerda (`margin`)
- `MARCA: ASTROELETIVA` — bold, font 11, cor navy, alinhado à esquerda (`margin`)

Remover as linhas de "Marca:" e "Processo INPI nº" centralizadas (linhas 278-294), pois esses dados já aparecem no bloco de metadados do conteúdo.

### 2. Garantir alinhamento à esquerda no corpo

O corpo do texto (linhas 368-384) já usa `pdf.text(line, indent/margin, yPos)` — ou seja, já é left-aligned. Apenas confirmar que nenhum parágrafo usa `{ align: 'center' }` no corpo. Os únicos centrados legítimos são o bloco de fechamento (Termos em que / Pede deferimento / assinatura).

### Escopo restrito

- **Só** alterar a renderização do título/badge no PDF (linhas ~256-295)
- **Não** alterar o preview web, header, footer, assinatura ou qualquer outra parte


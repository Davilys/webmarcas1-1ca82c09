

## Problem

Comparing image 646 (correct) vs image 647 (current):

1. **Title block**: Currently rendered as a centered navy badge. Should be **bold left-aligned text**: `RECURSO ADMINISTRATIVO – MANIFESTAÇÃO À OPOSIÇÃO` and `MARCA: ASTROELETIVA`
2. **All body text**: Currently mixed centered/justified. Should be **left-aligned** throughout (except paragraphs which use justify with indent)
3. **Metadata and addressing block**: Currently centered under badge. Should be **left-aligned**

## Root Cause

The component renders the document type in a centered `<div>` badge (lines 506-522) and centers brand/process info. The `stripOpeningMarkers` function also removes the specific resource type line from the AI content.

## Changes

**File**: `src/components/admin/INPIResourcePDFPreview.tsx`

### 1. Build the specific resource type label

Add a helper to map `resourceType` to the correct full label (e.g., `oposicao` → `MANIFESTAÇÃO À OPOSIÇÃO`), then construct the title as `RECURSO ADMINISTRATIVO – {LABEL}`.

### 2. Replace centered badge with left-aligned title block (web preview)

Replace the centered badge div (lines 506-522) with:
- `RECURSO ADMINISTRATIVO – MANIFESTAÇÃO À OPOSIÇÃO` — bold, left-aligned, navy color
- `MARCA: {BRAND_NAME}` — bold, left-aligned, navy color

### 3. Replace centered badge with left-aligned title block (PDF generator)

In `handleDownloadPDF` (lines 224-248), replace the centered badge rendering with left-aligned bold text at the same position.

### 4. Ensure addressing and metadata stay left-aligned

The addressing block ("EXCELENTÍSSIMO SENHOR...") and metadata lines (Processo, Marca, Classe, etc.) are already in the AI content and rendered by `renderContent()`. They just need to remain left-aligned — no changes needed there since `isMetadataLine` and `isHeadingLine` already handle them.

### Resource Type Label Map

```typescript
const RESOURCE_TYPE_LABELS: Record<string, string> = {
  oposicao: 'MANIFESTAÇÃO À OPOSIÇÃO',
  indeferimento: 'RECURSO CONTRA INDEFERIMENTO',
  exigencia_merito: 'CUMPRIMENTO DE EXIGÊNCIA DE MÉRITO',
  notificacao_extrajudicial: 'NOTIFICAÇÃO EXTRAJUDICIAL',
  troca_procurador: 'PETIÇÃO DE TROCA DE PROCURADOR',
  nomeacao_procurador: 'PETIÇÃO DE NOMEAÇÃO DE PROCURADOR',
};
```


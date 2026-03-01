

# Corrigir Importacao com Atualizacao de Clientes Existentes

## Problema Atual
Quando o usuario ativa "Atualizar clientes existentes", os clientes duplicados (que ja existem no sistema) continuam **desmarcados** na tabela de preview. Isso acontece porque a logica de pre-selecao em `handleMappingConfirm` exclui todos os emails duplicados antes mesmo do usuario ver o toggle. Resultado: o toggle nao tem efeito pratico.

## Arquivos a Modificar

### 1. `src/components/admin/clients/ClientImportExportDialog.tsx`

**Mover o toggle "Atualizar clientes existentes" para ANTES do preview (etapa mapping ou inicio do preview):**
- Quando `updateExisting = true`: incluir clientes duplicados na selecao automatica (nao excluir da pre-selecao)
- Quando `updateExisting = false`: manter comportamento atual (duplicados ficam desmarcados)

**Reprocessar selecao quando o toggle mudar:**
- Adicionar um `useEffect` ou callback que reprocessa `selectedRows` quando `updateExisting` muda, incluindo/excluindo os duplicados conforme o valor

### 2. `src/components/admin/clients/ImportPreviewTable.tsx`

**Melhorar a indicacao visual de clientes que serao atualizados:**
- Quando `updateExisting = true` e o email ja existe: mostrar badge "Sera atualizado" (azul) em vez de "Ja existe" (amarelo/warning)
- Quando `updateExisting = false` e o email ja existe: manter badge "Ja existe" (amarelo) com tom de aviso
- Passar nova prop `updateExisting: boolean` para o componente

## Detalhes Tecnicos

**ClientImportExportDialog.tsx - handleMappingConfirm (linhas 130-141):**
```text
// Logica atual exclui duplicados sempre:
.filter(({ client }) => !isDuplicate)

// Nova logica:
.filter(({ client }) => {
  const isDuplicate = existingEmails.includes(email);
  // Se updateExisting, incluir duplicados (serao atualizados)
  return rowErrors.length === 0 && (updateExisting || !isDuplicate);
})
```

**ClientImportExportDialog.tsx - useEffect para reagir ao toggle:**
```text
useEffect(() => {
  if (importStep !== 'preview') return;
  // Recalcular selectedRows baseado no novo valor de updateExisting
}, [updateExisting]);
```

**ImportPreviewTable.tsx - badge condicional:**
- Receber prop `updateExisting`
- Se `updateExisting && isDuplicate`: Badge azul "Sera atualizado"
- Se `!updateExisting && isDuplicate`: Badge amarelo "Ja existe"

## Impacto
- Nenhuma tabela ou coluna nova
- Nenhuma alteracao na Edge Function (ja suporta `updateExisting`)
- Apenas correcao de logica no frontend para que o toggle funcione corretamente

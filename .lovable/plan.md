
# Fase 7 -- Botao "Gerar Classes Sugeridas" no Admin (CreateContractDialog)

## Resumo
Adicionar um botao "Gerar Classes Sugeridas" na aba "Dados da Marca" do dialog de novo contrato no painel admin. Ao clicar, a IA analisa o nome da marca e ramo de atividade e retorna 3 classes NCL sugeridas com descricoes. O admin pode selecionar 1, 2 ou 3 classes manualmente. O valor do contrato e multiplicado pela quantidade de classes selecionadas. As classes selecionadas sao salvas no campo `suggested_classes` (jsonb) do contrato.

## Alteracoes no arquivo

**Arquivo:** `src/components/admin/contracts/CreateContractDialog.tsx`

### 1. Novos estados
- `suggestedClasses: { classes: number[], descriptions: string[] } | null` -- resultado da IA
- `selectedClasses: number[]` -- classes marcadas pelo admin (inicialmente vazio, NUNCA pre-selecionadas)
- `loadingClasses: boolean` -- loading do botao IA

### 2. Botao "Gerar Classes Sugeridas"
- Localizado logo abaixo do campo "Ramo de Atividade" na secao de marca unica (single brand, linhas ~1505)
- Icone de cerebro/IA + texto "Gerar Classes Sugeridas"
- Habilitado apenas quando `brandData.brandName` e `brandData.businessArea` estiverem preenchidos
- Ao clicar: chama `supabase.functions.invoke('inpi-viability-check', { body: { brandName, businessArea } })`
- Usa apenas os campos `classes` e `classDescriptions` da resposta
- Renderiza card com checkboxes (NENHUMA pre-marcada):
  - Classe principal (indice 0) com badge "Classe Principal"
  - Descricao resumida de cada classe
  - Botao "Selecionar Todas"

### 3. Calculo de valor multiplicado por classes
- Modificar `getContractValue()` e `getUnitValue()`: quando `selectedClasses.length > 0`, usar `selectedClasses.length` como multiplicador em vez de `brandQuantity`
- Atualizar `getPaymentDescription()` para refletir a quantidade de classes
- Na aba pagamento, os valores exibidos (R$ 699, 6x R$ 199, 3x R$ 399) serao multiplicados pela quantidade de classes selecionadas
- Se nenhuma classe selecionada e suggestedClasses existe, bloquear com minimo de 1 classe

### 4. Contrato salva com classes
- No `handleSubmit`, ao inserir o contrato, adicionar `suggested_classes: suggestedClasses` no insert
- Passar `selectedClasses` para `replaceContractVariables` (sera usado nas fases seguintes para formatacao da clausula 1.1)

### 5. Reset
- Adicionar `setSuggestedClasses(null)`, `setSelectedClasses([])`, `setLoadingClasses(false)` no `resetForm()`

## O que NAO sera alterado
- Nenhuma tabela (campo `suggested_classes` ja existe como jsonb)
- Nenhuma edge function
- Fluxo de marcas multiplas (`brandQuantity > 1`) permanece inalterado
- Fluxo de cliente existente (legacy) permanece inalterado
- Valores unitarios base (699/1194/1197) permanecem os mesmos
- Nenhum outro componente ou pagina

## Prevencao de tela branca
- O botao IA e os checkboxes sao renderizados condicionalmente e isolados do formulario principal
- Nenhuma alteracao no DialogContent ou na estrutura de tabs
- Nenhum useEffect que dependa dos novos estados (evita loops)
- fallback gracioso se a edge function falhar (toast de erro, sem crash)

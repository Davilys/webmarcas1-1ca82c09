
# Correcao de 2 Bugs no Sistema de Classes NCL

## Problema 1: Auto-selecao automatica no Admin
**Onde:** `CreateContractDialog.tsx`, linha 955
**Bug:** Quando a IA sugere as classes, o codigo faz `setSelectedSuggestedClasses(classes.map(...))`, selecionando TODAS automaticamente. O admin deveria ver as sugestoes e escolher manualmente quais incluir.

**Correcao:** Remover a auto-selecao. Apos a IA retornar as classes, apenas exibi-las sem nenhuma pre-selecionada. O admin clica nas que deseja incluir no contrato. As nao selecionadas pelo admin ficam como sugestoes de upsell para o cliente na pagina de assinatura.

## Problema 2: Pagina de assinatura com layout diferente do formulario do site
**Onde:** `NCLClassSuggestionCard.tsx` e `AssinarDocumento.tsx`
**Bug:** O card de classes na pagina de assinatura (/assinar/:token) usa um layout diferente (estilo amber/amarelo) do formulario de registro do site (estilo azul/primary com secoes "Selecionadas" e "Protecao Complementar" separadas).

**Correcao:** Atualizar o `NCLClassSuggestionCard` para replicar o layout do formulario de registro (imagem de referencia 343):
- Secao "SELECIONADAS NO FORMULARIO" mostrando as classes ja incluidas (selected: true) com check, sem possibilidade de desmarcar
- Secao "PROTECAO COMPLEMENTAR RECOMENDADA" mostrando as classes nao selecionadas (selected: false) com preco unitario ao lado, para o cliente selecionar
- Visual azul/primary consistente com o restante do site

---

## Detalhes Tecnicos

### Arquivo 1: `src/components/admin/contracts/CreateContractDialog.tsx`
- Linha 955: Trocar `setSelectedSuggestedClasses(classes.map((c: any) => c.number))` por `setSelectedSuggestedClasses([])` — nenhuma classe pre-selecionada

### Arquivo 2: `src/components/signature/NCLClassSuggestionCard.tsx`
- Redesenhar o componente para seguir o layout do `BrandDataStep.tsx`:
  - Titulo: "Classes NCL de Protecao" com subtitulo "Classes selecionadas e sugestoes complementares do departamento juridico."
  - Secao superior: classes ja selecionadas pelo admin (selected: true), exibidas com check, sem acao
  - Secao inferior "PROTECAO COMPLEMENTAR RECOMENDADA": classes nao selecionadas (selected: false), com checkbox interativo e preco "+ R$ XXX" ao lado
  - Resumo de valor e botao de confirmacao ao final
  - Cores: azul/primary em vez de amber

### Seguranca
- Nenhuma tabela, schema ou API sera alterada
- Nenhuma logica de calculo de preco sera modificada
- A edge function `update-contract-classes` permanece intacta
- Apenas mudancas visuais no frontend (2 arquivos)

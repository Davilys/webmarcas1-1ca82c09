
Objetivo validado: corrigir o fluxo para que **não exista etapa extra de Classes NCL no checkout**, as sugestões apareçam **dentro da etapa “Dados da Marca”**, usem exatamente as classes vindas da viabilidade, e no momento de assinatura o cliente veja as classes sugeridas não escolhidas para poder mudar de ideia (igual ao comportamento do painel admin).

1) Diagnóstico dos erros atuais (confirmado no código)
- O checkout foi alterado para 6 etapas com `NclClassSelectionStep`, contrariando o requisito.
- Na navegação da landing para `/registro`, `ViabilitySearchSection` salva no `sessionStorage` apenas `brandName`, `businessArea` e `level` (não salva `classes`/`classDescriptions`), então a tela seguinte perde as sugestões e mostra “Nenhuma classe sugerida”.
- Em `create-asaas-payment`, o campo `suggested_classes` só é salvo quando `selectedClasses.length > 0`.  
  Efeito: se nada foi selecionado no checkout, na assinatura não aparece upsell de classes.
- Ainda em `create-asaas-payment`, `descriptions` está sendo persistido com base em `classDescriptions` (que hoje é da seleção), e não no conjunto completo sugerido, gerando inconsistência para exibir classes não selecionadas depois.

2) Estratégia de correção (sem criar nova etapa)
Implementar um fluxo de 5 etapas:
1. Viabilidade
2. Dados Pessoais
3. Dados da Marca (com bloco de seleção NCL embutido)
4. Pagamento
5. Contrato

A seleção NCL será movida para dentro de `BrandDataStep`, mantendo a regra:
- nenhuma pré-seleção automática;
- usuário pode escolher manualmente;
- se não escolher alguma classe, elas permanecem disponíveis no upsell da assinatura.

3) Alterações planejadas por arquivo

A) `src/components/cliente/checkout/BrandDataStep.tsx`
- Adicionar props para receber dados de NCL vindos da viabilidade:
  - `suggestedClasses: number[]`
  - `suggestedClassDescriptions: string[]`
  - `selectedClasses: number[]`
  - `onSelectedClassesChange: (classes: number[]) => void`
- Embutir card/lista de classes no mesmo passo (estilo já usado no admin):
  - checkboxes por classe
  - sem pré-seleção
  - fallback visual quando não houver sugestões
- Manter os campos atuais de marca/CNPJ intactos (evitar regressão de validação).

B) `src/components/sections/RegistrationFormSection.tsx`
- Remover import/uso de `NclClassSelectionStep`.
- Voltar a orquestração para 5 etapas.
- Continuar capturando classes da viabilidade em `handleViabilityNext`.
- Passar `suggestedClasses`, `suggestedClassDescriptions`, `selectedClasses` e callback para `BrandDataStep`.
- Ajustar navegação `onBack` entre passos.
- Calcular `classCount` para pagamento com base em `selectedClasses.length` (mínimo 1).
- Ao enviar para `create-asaas-payment`, enviar:
  - `selectedClasses`
  - `selectedClassDescriptions` (derivado por índice de `suggestedClasses`, igual ao admin)
  - `suggestedClasses`
  - `suggestedClassDescriptions` (lista completa da viabilidade)

C) `src/pages/cliente/RegistrarMarca.tsx`
- Mesmo ajuste estrutural do item B:
  - remover etapa dedicada NCL
  - voltar para 5 etapas e atualizar `STEP_TITLES`
  - renderizar seleção NCL dentro de `BrandDataStep`
  - enviar payload completo (selecionadas + sugeridas completas) para backend.

D) `src/components/cliente/checkout/CheckoutProgress.tsx`
- Remover passo “Classes NCL”.
- Voltar visual para 5 passos, preservando animação/estilo atual.

E) `src/components/sections/ViabilitySearchSection.tsx`
- Corrigir `handleRegisterClick` para salvar no `sessionStorage` também:
  - `classes: result?.classes`
  - `classDescriptions: result?.classDescriptions`
- Isso garante que ao chegar em `/registro` as sugestões sejam as mesmas da busca de viabilidade já feita.

F) `supabase/functions/create-asaas-payment/index.ts`
- Expandir `PaymentRequest` para suportar claramente:
  - `selectedClassDescriptions?: string[]`
  - `suggestedClassDescriptions?: string[]`
- Persistir `suggested_classes` sempre que houver sugestões (mesmo com seleção vazia):
  - `{ classes, descriptions, selected }`
  - `classes` = sugestões completas
  - `descriptions` = descrições completas alinhadas às sugestões
  - `selected` = classes escolhidas no checkout (pode ser array vazio)
- Na geração do HTML contratual:
  - usar descrições das classes selecionadas corretamente mapeadas por índice da lista sugerida (mesmo padrão do admin), para evitar desalinhamento.
- Resultado esperado: assinatura consegue listar corretamente as classes “não selecionadas” para upsell.

G) `src/components/cliente/checkout/PaymentStep.tsx` e `src/components/cliente/checkout/ContractStep.tsx`
- Ajustes mínimos de navegação/contagem de etapas após remoção da etapa NCL.
- Manter cálculo de valor por `classCount`.
- Garantir que o contrato continue recebendo apenas as classes efetivamente selecionadas para cláusulas 1.1 e 5.1 no checkout.

4) Comportamento final esperado
- `/registro` e área do cliente voltam para 5 etapas.
- As classes sugeridas aparecem no passo “Dados da Marca”.
- As classes exibidas são exatamente as vindas da viabilidade.
- Se o cliente não selecionar todas, as não selecionadas aparecem na assinatura para upsell (igual admin).
- Contrato e valor no checkout refletem apenas as classes escolhidas naquele momento; assinatura permite ampliar antes de concluir.

5) Sequência de execução segura
1. Corrigir persistência de viabilidade (`ViabilitySearchSection`)  
2. Refatorar fluxo frontend para 5 etapas (`RegistrationFormSection`, `RegistrarMarca`, `CheckoutProgress`)  
3. Embutir UI NCL em `BrandDataStep`  
4. Ajustar payload frontend para backend  
5. Corrigir persistência/normalização no `create-asaas-payment`  
6. Validar assinatura upsell ponta a ponta.

6) Validação (critério de aceite)
- Cenário A: busca viabilidade na landing → clicar registrar → em “Dados da Marca” aparecem classes corretas (não “Nenhuma classe sugerida”).
- Cenário B: selecionar subset (ex.: 1 de 3) → contrato checkout com 1 classe → na assinatura aparecem as 2 restantes para upsell.
- Cenário C: selecionar 0 classes no checkout → assinatura mostra todas sugeridas para possível escolha.
- Cenário D: após escolher classe extra na assinatura, contrato/valor final atualizam corretamente e seguem para cobrança.
- Cenário E: fluxo da área do cliente (`/cliente/registrar-marca`) com o mesmo comportamento, sem divergência do site público.

7) Risco principal e mitigação
- Risco: desalinhamento entre `classes` e `descriptions`.
- Mitigação: usar mapeamento por índice da lista sugerida (mesmo padrão do admin) em todos os pontos críticos (frontend e backend), e persistir sempre o objeto completo `{ classes, descriptions, selected }`.

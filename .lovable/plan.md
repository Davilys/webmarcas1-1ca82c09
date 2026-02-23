
# Classes NCL Sugeridas no Formulario de Dados da Marca

## Resumo

Adicionar a selecao de classes NCL sugeridas pelo laudo de viabilidade no passo "Dados da Marca" (BrandDataStep). As classes aparecem como checkboxes com descricao do que protegem. O valor no passo de pagamento multiplica automaticamente pela quantidade de classes selecionadas. Isso sera implementado em 3 locais: landing page (/registro), portal do cliente (/cliente/registrar-marca) e painel admin (criar contrato).

## O que o usuario ve

No formulario "Informacoes da Marca", abaixo do campo "Ramo de Atividade" e acima do CNPJ:

- Secao "Classes NCL Sugeridas pelo Laudo"
- Classe principal ja pre-selecionada (obrigatoria)
- Classes complementares como checkboxes com descricao (ex: "Classe 35 - Protege atividades comerciais, franquias e publicidade")
- Opcao de destaque "Registrar todas as classes" com badge de recomendacao
- Ao selecionar mais classes, o passo de pagamento calcula automaticamente (699 x N classes no PIX, etc.)

## Detalhes Tecnicos

### 1. Atualizar interface BrandData

**Arquivo: `src/components/cliente/checkout/BrandDataStep.tsx`**
- Adicionar `selectedClasses: number[]` e `classDescriptions: string[]` ao tipo `BrandData`
- Valores default: arrays vazios

### 2. Atualizar BrandDataStep - UI de selecao de classes

**Arquivo: `src/components/cliente/checkout/BrandDataStep.tsx`**
- Receber nova prop `suggestedClasses: { number: number; description: string }[]`
- Abaixo do campo "Ramo de Atividade", renderizar secao com:
  - Titulo "Classes NCL Sugeridas"
  - Subtitulo "Selecione as classes de protecao para sua marca"
  - Checkboxes para cada classe (numero + descricao)
  - Primeira classe pre-selecionada
  - Botao/badge "Selecionar todas" com destaque
- Ao submeter, incluir `selectedClasses` e `classDescriptions` no objeto BrandData

### 3. Propagar classes sugeridas - Portal do Cliente

**Arquivo: `src/pages/cliente/RegistrarMarca.tsx`**
- No `handleViabilityNext`, extrair `result.classes` e `result.classDescriptions` do resultado da viabilidade
- Armazenar em estado `suggestedClasses`
- Passar como prop para `BrandDataStep`
- Pre-selecionar a primeira classe no `brandData.selectedClasses`

### 4. Propagar classes sugeridas - Landing Page

**Arquivo: `src/components/sections/RegistrationFormSection.tsx`**
- Mesma logica: extrair classes do resultado de viabilidade
- Passar para `BrandDataStep` como prop
- Funciona identicamente ao portal do cliente

### 5. PaymentStep - Valores dinamicos por quantidade de classes

**Arquivo: `src/components/cliente/checkout/PaymentStep.tsx`**
- Receber nova prop `classCount: number` (default 1)
- Multiplicar valores do `usePricing()` pela quantidade:
  - PIX: valor avista x classCount
  - Cartao: valor cartao x classCount
  - Boleto: valor boleto x classCount
- Exibir indicador "X classes selecionadas" no topo

### 6. RegistrarMarca e RegistrationFormSection - Passar classCount

- Ambos os arquivos passam `brandData.selectedClasses.length || 1` para `PaymentStep`

### 7. Admin CreateContractDialog - Campo de classes sugeridas

**Arquivo: `src/components/admin/contracts/CreateContractDialog.tsx`**
- Adicionar campo de input para classes sugeridas (numeros separados por virgula)
- Campo de descricao para cada classe
- Mesma logica de selecao para o admin poder definir as classes ao gerar contrato

## O que NAO muda

- Banco de dados (nenhuma tabela nova)
- Edge functions
- Layout principal ou fluxo de assinatura
- APIs externas
- A coluna `suggested_classes` na tabela contracts (ja criada anteriormente) sera populada com as classes NAO selecionadas para o upsell na pagina de assinatura

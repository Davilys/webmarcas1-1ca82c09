

# Correcao: Razao Social para "WebMarcas Intelligence PI"

## Resumo

Corrigir o nome da nova razao social de "WebMarcas Intelligence OS™" para **"WebMarcas Intelligence PI"** em todos os modelos de contrato e pontos de branding do sistema.

## Arquivos e Alteracoes

### 1. Templates de Documentos Juridicos (`src/lib/documentTemplates.ts`)
- Distrato com multa: `WEB MARCAS PATENTES EIRELI` --> `WebMarcas Intelligence PI`
- Distrato sem multa: `WEB MARCAS PATENTES EIRELI` --> `WebMarcas Intelligence PI`

### 2. Template de Contrato (`src/hooks/useContractTemplate.ts`)
- Cabecalho do contrato: razao social da contratada
- Bloco de assinatura: nome da contratada

### 3. Renderizadores (condicoes `.includes()` para formatacao)
- `src/components/contracts/ContractRenderer.tsx`: atualizar deteccao do nome
- `src/hooks/useContractPdfGenerator.ts`: atualizar deteccao do nome
- `src/hooks/useUnifiedContractDownload.ts`: atualizar deteccao do nome
- `supabase/functions/create-asaas-payment/index.ts`: atualizar referencia

### 4. Editor de Templates (`src/components/admin/contracts/ContractTemplateEditor.tsx`)
- Preview do cabecalho

### 5. Branding do Sistema (site + paineis)
- `index.html`: title e meta tags
- `src/components/layout/Header.tsx`: texto do logo
- `src/components/layout/Footer.tsx`: copyright
- `src/components/admin/AdminLayout.tsx`: sidebar e header
- `src/components/cliente/ClientLayout.tsx`: alt text
- `src/contexts/LanguageContext.tsx`: strings i18n
- `src/pages/AssinarDocumento.tsx`: footer
- `src/components/admin/email/AIEmailAssistant.tsx`: footer de email
- `src/components/cliente/checkout/ContractStep.tsx`: texto de aceite
- `src/pages/admin/Configuracoes.tsx`: texto
- `src/pages/cliente/RegistrarMarca.tsx`: footer

### Nos renderizadores, manter suporte ao nome antigo para contratos ja salvos no banco (condicao com OR para `WEB MARCAS PATENTES EIRELI` e `WebMarcas Intelligence PI`).

## O que NAO muda

- CNPJ, endereco, dados juridicos do representante
- Contratos ja assinados no banco de dados
- Rotas, permissoes, integracoes, APIs
- Nenhuma tabela do banco de dados
- Edge functions (logica)
- Arquivos de assets (imagens/logos)
- Nomes de variaveis internas


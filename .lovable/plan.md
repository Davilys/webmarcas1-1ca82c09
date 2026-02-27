

# Criar Modelo de Contrato - Plano de Monitoramento e Manutencao Pos-Certificado

## Objetivo

Inserir um novo modelo de contrato na aba "Modelos de Contrato" para o servico continuo de monitoramento e manutencao de marca apos a entrega do certificado de registro. Este contrato cobre o acompanhamento ate a renovacao (10 anos), com cobranca mensal de R$ 59,00 e anuidade de R$ 398,00 em dezembro.

## O que sera feito

### 1. Criar novo tipo de contrato no banco de dados

Inserir um registro na tabela `contract_types` com o nome **"MONITORAMENTO E MANUTENCAO"** para categorizar este novo modelo.

### 2. Inserir o modelo de contrato completo

Criar o template na tabela `contract_templates` com:

- **Nome**: "Plano de Monitoramento e Manutencao - Pos Certificado"
- **Tipo**: vinculado ao novo tipo criado
- **Status**: ativo
- **Variaveis dinamicas**: `{{nome_cliente}}`, `{{cpf_cnpj}}`, `{{endereco_cliente}}`, `{{marca}}`, `{{dia_vencimento}}`, `{{data_assinatura}}`, `{{email}}`, `{{telefone}}`

O conteudo do contrato inclui todas as 9 clausulas fornecidas:
- Objeto (monitoramento, vigilancia, alertas de renovacao)
- Vigencia (ate renovacao, ~10 anos)
- Remuneracao (R$ 59,00/mes + R$ 398,00/ano em dezembro)
- Obrigacoes da contratada e do contratante
- Limitacao de responsabilidade
- Rescisao (aviso previo 30 dias)
- Validade juridica (Lei 14.063/2020, MP 2.200-2/2001)
- Foro (Comarca de Sao Paulo)

### 3. Adicionar variaveis ao preview

Atualizar a funcao `renderPreviewContent` em `ModelosContrato.tsx` para incluir as novas variaveis (`{{dia_vencimento}}`, `{{endereco_cliente}}`, `{{data_assinatura}}`).

## Arquivos a alterar

| Arquivo | Alteracao |
|---------|-----------|
| Banco de dados | INSERT em `contract_types` e `contract_templates` |
| src/pages/admin/ModelosContrato.tsx | Adicionar variaveis de preview |

## Importante

- Nenhum contrato existente sera alterado
- Nenhuma tabela sera modificada estruturalmente
- Apenas insercao de dados novos e ajuste cosmetic no preview

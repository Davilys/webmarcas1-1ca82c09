
# Adicionar Modulo "Analise Inteligente da Marca" no Formulario do Cliente

## Situacao Atual

- O formulario do cliente (`ViabilityStep.tsx`) ja possui a animacao de pesquisa com as 6 etapas (Conectando ao INPI, Varrendo base, etc.) -- igual a imagem 1. Isso ja esta implementado.
- O que FALTA e o modulo de score duplo "Analise Inteligente da Marca" (imagem 2) que ja existe no site (`ViabilitySearchSection.tsx`) mas NAO existe no formulario do cliente.

## O que sera feito

Copiar o modulo `CommercialIntelligenceModule` (com os 2 scores: Potencial de Deferimento + Risco de Concorrente Registrar) para dentro do `ViabilityStep.tsx`, posicionando-o nos resultados da consulta, logo antes dos botoes de acao ("Continuar com o Registro" / "Fazer nova consulta").

## Detalhes da implementacao

### Arquivo: `src/components/cliente/checkout/ViabilityStep.tsx`

1. Adicionar o componente `CommercialIntelligenceModule` internamente (igual ao do site), incluindo:
   - Score 1: Potencial de Deferimento (gauge animado + barra de progresso)
   - Score 2: Risco de Concorrente Registrar (gauge animado + barra de progresso)
   - Mensagens dinamicas por faixa de score
   - Logica de risco: 1 sinal = 73%, mais de 3 = 91%
   - Aviso legal

2. Inserir o modulo na secao de resultados (apos o aviso "Aja rapido!" e antes dos botoes), passando os dados reais do resultado da consulta (`result.inpiData`, `result.cnpjData`, `result.internetData`).

3. Adicionar imports necessarios: `Brain`, `Target`, `BarChart3`.

### O que NAO muda

- Animacao de pesquisa (ja existe e permanece igual)
- Formulario de busca
- Botoes de acao
- Impressao de laudo
- Fluxo de checkout
- Banco de dados
- Nenhum outro arquivo

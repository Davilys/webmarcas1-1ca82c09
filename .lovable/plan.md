
# Correcao Completa do Rebrand para "WebMarcas Intelligence PI"

## Problema

Ainda existem ocorrencias do nome antigo em 2 lugares:

1. **No banco de dados** -- Os templates de contrato salvos na tabela `contract_templates` ainda contem "WEB MARCAS PATENTES EIRELI" e "Web Marcas e Patentes Eireli". E por isso que a pre-visualizacao na pagina de modelos mostra o nome antigo (a imagem enviada confirma isso).

2. **No codigo** -- Alguns arquivos ainda usam "WebMarcas Patentes" em vez de "WebMarcas Intelligence PI".

---

## Alteracoes

### 1. Banco de Dados (Migration SQL)

Atualizar os 4 templates ativos na tabela `contract_templates`:
- Substituir `WEB MARCAS PATENTES EIRELI` por `WebMarcas Intelligence PI`
- Substituir `Web Marcas e Patentes Eireli` por `WebMarcas Intelligence PI`
- Substituir `Web Marcas Patentes EIRELI` por `WebMarcas Intelligence PI`

Isso resolve o problema mostrado na imagem -- o preview carrega o conteudo do banco.

**Nota**: Isso NAO altera contratos ja assinados (tabela `contracts`), apenas os modelos/templates.

### 2. Codigo -- Arquivos com nome antigo restante

**`src/pages/AssinarDocumento.tsx`** (linha 525)
- `"WebMarcas Patentes"` --> `"WebMarcas Intelligence PI"`

**`src/components/contracts/DocumentRenderer.tsx`** (linhas 302, 396, 619)
- 3 ocorrencias de `"WebMarcas Patentes"` --> `"WebMarcas Intelligence PI"`

**`supabase/functions/check-signature-expiration/index.ts`** (linha 226)
- `"WebMarcas Patentes"` --> `"WebMarcas Intelligence PI"`

### 3. O que NAO muda

- CNPJ permanece identico em todos os lugares
- Endereco permanece identico
- Contratos ja assinados na tabela `contracts` -- nao serao tocados
- Rotas, permissoes, integracoes, APIs
- Logica dos renderizadores (as condicoes `.includes()` ja suportam ambos os nomes)

---

## Detalhes Tecnicos

- 1 migration SQL para atualizar conteudo dos templates no banco
- 3 arquivos de codigo editados (apenas texto)
- 1 edge function editada e re-deployada
- Impacto zero em logica ou funcionalidades

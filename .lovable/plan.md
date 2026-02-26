
# Auto-vinculacao de Clientes por Nome da Marca

## Analise dos Dados

Foram encontradas **719 publicacoes sem cliente vinculado**. Desses:
- 428 possuem nome da marca (`brand_name_rpi`)
- 291 nao possuem nome da marca
- 719 possuem numero de processo (`process_number_rpi`)

A correspondencia atual por numero de processo resulta em **0 matches** (formatos diferentes ou processos nao cadastrados). Ja a correspondencia por **nome da marca** encontrou **6 matches** imediatos (ex: "BRITTO STUDIO" na publicacao corresponde a "Britto studio" no processo cadastrado).

O numero e baixo porque a maioria das marcas da RPI nao sao clientes do escritorio -- sao publicacoes de terceiros. Porem, o mecanismo e valido e deve ser implementado para vincular automaticamente sempre que possivel.

## Plano de Implementacao

### Alteracao unica: `src/components/admin/PublicacaoTab.tsx`

Modificar a funcao `handleAutoLinkClients` (linhas 1072-1104) para adicionar uma segunda etapa de matching por nome da marca:

**Logica atual (manter):**
1. Busca orfas com `process_number_rpi`
2. Tenta localizar em `brand_processes` pelo numero de processo
3. Se encontrar, vincula `client_id` e `process_id`

**Nova logica (adicionar apos a etapa 1):**
4. Para publicacoes que **ainda nao foram vinculadas**, tentar match por nome da marca:
   - Limpar o `brand_name_rpi` removendo tags XML (`<nome>...</nome>`) e espaços extras
   - Comparar (case-insensitive) com `brand_name` de todos os `brand_processes` que possuem `user_id`
   - Se encontrar match, vincular `client_id` (user_id do processo) e `process_id`
5. Atualizar o toast para mostrar quantos foram vinculados por processo vs por marca

**Detalhes tecnicos:**
- Criar um Map invertido: `brandNameNormalized -> process` para busca O(1)
- Normalizar ambos os lados: `trim().toUpperCase()` + `replace(/<[^>]+>/g, '')`
- Quando multiplos processos tiverem o mesmo nome de marca, usar o primeiro encontrado (ou o que tiver `user_id`)
- A funcao continua sendo acionada pelo mesmo botao "Auto-vincular"

Nenhuma alteracao de banco de dados e necessaria -- a coluna `client_id` e `process_id` ja existem na tabela `publicacoes_marcas`.

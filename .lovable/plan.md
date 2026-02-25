

## Plano: Sincronizar Publicacoes e Documentos com a Area do Cliente

### Contexto
Atualmente, quando o admin atribui um `client_id` a uma publicacao na aba Publicacoes, ela ja aparece no componente `PublicacoesCliente` (que filtra por `client_id = userId`). Porem:

1. Os **documentos anexados** (`documento_rpi_url`) na publicacao nao aparecem na aba Documentos do processo do cliente
2. A aba **Publicacoes RPI** no detalhe do processo do cliente (`ProcessoDetalhe.tsx`) busca apenas da tabela `rpi_entries` e ignora os dados da `publicacoes_marcas`
3. O **status/fase** da publicacao nao e refletido na area do cliente de forma completa

### Mudancas Planejadas

#### 1. Sincronizar documentos da publicacao para a area do cliente

**Arquivo:** `src/pages/cliente/ProcessoDetalhe.tsx`

Na funcao `fetchProcessData`, alem de buscar documentos da tabela `documents`, tambem buscar documentos anexados nas `publicacoes_marcas` (campo `documento_rpi_url`) vinculadas ao processo. Esses documentos serao mesclados na lista de documentos exibida na aba "Documentos".

- Buscar `publicacoes_marcas` onde `process_id = id` AND `client_id = user.id`
- Para cada publicacao com `documento_rpi_url` preenchido, criar um item virtual de documento para exibicao
- Mesclar com os documentos existentes, sem duplicatas

#### 2. Sincronizar publicacoes da tabela `publicacoes_marcas` na aba "Publicacoes RPI"

**Arquivo:** `src/pages/cliente/ProcessoDetalhe.tsx`

A aba "Publicacoes RPI" atualmente so mostra dados de `rpi_entries`. Vamos adicionar uma secao que mostra os dados de `publicacoes_marcas` vinculadas ao processo, incluindo:

- Status atual da publicacao (depositada, publicada, oposicao, deferida, certificada, etc.)
- Timeline visual (mini timeline igual ao `PublicacoesCliente`)
- Prazos criticos
- Numero RPI e link oficial
- Documento RPI anexado (com botao de download)

Isso sera exibido acima da tabela de `rpi_entries`, como um card de resumo da situacao atual.

#### 3. Atualizar `PublicacoesCliente` com status "certificada"

**Arquivo:** `src/components/cliente/PublicacoesCliente.tsx`

Adicionar o status `certificada` que foi adicionado no admin mas ainda nao existe no componente do cliente.

#### 4. Garantir que a fase do processo no Kanban do cliente reflita a publicacao

**Arquivo:** `src/components/cliente/ClientProcessKanban.tsx`

O Kanban do cliente usa o campo `status` de `brand_processes`. Nenhuma mudanca estrutural necessaria aqui -- o status do processo ja e independente. A sincronizacao visual sera feita pela presenca dos dados de `publicacoes_marcas` nas telas de detalhe.

### Detalhes Tecnicos

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/cliente/ProcessoDetalhe.tsx` | Buscar `publicacoes_marcas` por `process_id` + `client_id`, mesclar documentos anexados na aba Documentos, exibir resumo de publicacao na aba Publicacoes RPI |
| `src/components/cliente/PublicacoesCliente.tsx` | Adicionar status `certificada` ao `STATUS_CONFIG` |
| `src/pages/cliente/Processos.tsx` | Sem mudanca (ja usa `PublicacoesCliente` que filtra por `client_id`) |

### Fluxo Resultante

1. Admin cria/edita publicacao e atribui `client_id` -> aparece em "Publicacoes de Marcas" na pagina Processos do cliente
2. Admin anexa documento RPI na publicacao -> documento aparece na aba Documentos do detalhe do processo do cliente
3. Admin altera status da publicacao (ex: publicada -> deferida -> certificada) -> refletido na aba Publicacoes RPI do detalhe do processo e no card de PublicacoesCliente
4. Prazos criticos sao exibidos para o cliente com indicadores visuais de urgencia

Nenhuma migracao SQL necessaria -- todos os dados ja existem na tabela `publicacoes_marcas` e a RLS ja permite leitura pelo cliente (`client_id = auth.uid()`).


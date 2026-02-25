

## Plano: Adicionar Etapa "Certificado" ao Funil + Logica de Renovacao Correta

### Problema Atual
1. O funil do Kanban pula de "Deferida" direto para "Renovacao" -- falta a etapa **Certificado**
2. A renovacao esta calculada como 10 anos apos o certificado, mas a regra correta do INPI e: **9 anos** para inicio do prazo ordinario + **6 meses** ordinario + **6 meses** extraordinario

### Mudancas

#### 1. Novo Status "certificada" no Funil

Adicionar o status `certificada` entre `deferida` e `indeferida` no Kanban e no PublicacaoTab:

```text
Depositada -> Publicada -> Oposicao -> Deferida -> Certificada -> Indeferida -> Arquivada -> Renovacao
```

**Arquivos afetados:**
- `PublicacaoKanban.tsx` -- adicionar `certificada` no type `PubStatus` e no `STATUS_CONFIG` (icone: diploma/selo, cor: from-purple-500 to-purple-600)
- `PublicacaoTab.tsx` -- adicionar `certificada` no type `PubStatus`, nos selects de status e em toda logica de filtro

#### 2. Logica de Renovacao Correta (9 anos + prazos)

Alterar `calcAutoFields` e `calcDeadlineFromDispatch`:

- Quando sai o **certificado de registro** na revista:
  - `data_certificado` = data da publicacao
  - `data_renovacao` = data_certificado + **9 anos** (inicio do prazo ordinario)
  - `proximo_prazo_critico` = data_certificado + 9 anos (para lembrar que precisa renovar)
  - `descricao_prazo` = "Renovacao ordinaria - 9 anos (+ 6m ord. + 6m extra)"
  - Status automatico = `certificada`

- Na `calcDeadlineFromDispatch`, adicionar regra:
  - Se dispatch_text contem "certificado de registro", "concessao", "registro concedido":
    - `days` = 3285 (9 anos = 365 * 9)
    - `desc` = "Prazo para renovacao ordinaria"
    - Status = `certificada`

- Na `calcAutoFields`, corrigir:
  - `data_renovacao` = data_certificado + **9 anos** (nao 10)

#### 3. Detalhes dos Prazos de Renovacao

Para referencia visual no card/dialog de edicao:
- **Prazo ordinario**: de 9 anos ate 9 anos e 6 meses apos o certificado
- **Prazo extraordinario**: de 9 anos e 6 meses ate 10 anos apos o certificado (com taxa extra)
- Apos 10 anos sem renovacao: arquivamento

### Detalhes Tecnicos

| Arquivo | Mudanca |
|---------|---------|
| `src/components/admin/publicacao/PublicacaoKanban.tsx` | Adicionar `certificada` ao type e STATUS_CONFIG, reordenar colunas |
| `src/components/admin/PublicacaoTab.tsx` | Adicionar `certificada` ao type, corrigir calcAutoFields (9 anos), adicionar regra de certificado no calcDeadlineFromDispatch, atualizar selects de status |

Nenhuma migracao SQL necessaria -- o campo `status` e do tipo `text` e aceita qualquer valor.


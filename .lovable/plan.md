

## Plano: Melhorias nos cards do Kanban de Publicações

### Problemas restantes

1. **Classe NCL ausente nos cards** — Os cards do Kanban mostram marca, cliente, processo e RPI, mas não exibem a classe NCL.
2. **Auto-arquivamento usa `pipeline_stage: 'distrato'`** — Quando o prazo vence e o sistema arquiva automaticamente, o `brand_processes.pipeline_stage` é atualizado para `'distrato'` (linha 490) ao invés de `'arquivado'`.
3. **Cards sem cliente já foram filtrados** — A correção anterior (linha 906: `if (!pub.client_id) return false`) já resolve este ponto. Nenhuma alteração adicional necessária.

### Alterações

**Arquivo: `src/components/admin/publicacao/PublicacaoKanban.tsx`**
- Adicionar exibição da classe NCL no card (via `proc?.ncl_classes` ou `pub.ncl_class` direto da tabela `publicacoes_marcas`)
- Exibir badge com a classe NCL junto ao número do processo e RPI

**Arquivo: `src/components/admin/PublicacaoTab.tsx`**
- Linha 490: Alterar `pipeline_stage: 'distrato'` para `pipeline_stage: 'arquivado'` no auto-archive

### Resultado
- Cards mostram: marca (destaque), cliente (destaque), processo, classe NCL, revista RPI, dias restantes/atraso
- Auto-arquivamento sincroniza corretamente o pipeline_stage para `'arquivado'`


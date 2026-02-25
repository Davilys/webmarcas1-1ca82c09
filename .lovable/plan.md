

## Correcao: Identificacao de Dados dos Processos na Revista INPI

### Problema Identificado

Ha um **bug critico** na funcao `extractAttorneyBlocks` no arquivo `supabase/functions/process-rpi/index.ts` que causa perda de dados dos processos.

### Causa Raiz

Na linha 90-98 do `process-rpi/index.ts`, o codigo faz o seguinte:

```text
const normalized = normalizeText(text);   // texto modificado (sem acentos, espacos colapsados)
// ...
const start = Math.max(0, idx - 5000);
const end = Math.min(text.length, idx + ...);
const block = text.slice(start, end);     // usa indices do NORMALIZED no TEXT ORIGINAL
```

O `idx` e calculado sobre o texto **normalizado** (sem acentos, espacos colapsados), mas o `text.slice(start, end)` e aplicado sobre o texto **original**. Como a normalizacao muda o comprimento do texto (remove acentos compostos, colapsa espacos e quebras de linha), os indices ficam **desalinhados**. Resultado: os blocos enviados para a IA contem texto cortado no lugar errado, perdendo numeros de processo, marca, titular etc.

Alem disso:
- O **max_tokens: 6000** na chamada da IA e baixo demais quando ha muitos processos num unico lote, causando respostas truncadas (JSON incompleto que e descartado)
- A **deduplicacao de blocos** (linha 100) pode pular blocos validos por coincidencia de substring

### Solucao

Alterar a funcao `extractAttorneyBlocks` para usar os indices no texto **normalizado** e tambem fatiar o texto **normalizado** (ja que a IA nao precisa de acentos para identificar dados). Alternativamente, buscar no texto original em lowercase. Vou usar a segunda abordagem para manter fidelidade dos dados.

### Alteracoes no Arquivo

**Arquivo:** `supabase/functions/process-rpi/index.ts`

#### 1. Corrigir `extractAttorneyBlocks` - Alinhar indices

Em vez de buscar no texto normalizado e fatiar o original, buscar diretamente no texto original convertido para lowercase (sem remover acentos nem colapsar espacos). Assim os indices correspondem exatamente:

```text
function extractAttorneyBlocks(text: string): string[] {
  const blocks: string[] = [];
  const lower = text.toLowerCase();
  let idx = 0;

  while ((idx = lower.indexOf(ATTORNEY_SEARCH_TERM, idx)) !== -1) {
    const start = Math.max(0, idx - 5000);
    const end = Math.min(text.length, idx + ATTORNEY_SEARCH_TERM.length + 5000);
    const block = text.slice(start, end);

    // Deduplicacao melhorada: verificar se o indice central ja esta coberto
    const isDuplicate = blocks.some((b) => {
      const overlap = block.substring(4900, 5100);
      return overlap.length > 50 && b.includes(overlap);
    });

    if (!isDuplicate) {
      blocks.push(block);
    }
    idx += ATTORNEY_SEARCH_TERM.length;
  }

  return blocks;
}
```

#### 2. Aumentar max_tokens da IA

Mudar `max_tokens` de **6000** para **16000** para evitar respostas truncadas quando ha muitos processos num unico lote.

#### 3. Melhorar o prompt da IA

Adicionar instrucao mais enfatica para a IA preencher TODOS os campos, especialmente `process_number`, `brand_name`, `ncl_classes` e `holder_name`, mesmo que precise inferir do contexto. Adicionar instrucao para nunca retornar campos vazios se a informacao estiver presente no texto.

#### 4. Reduzir batch size

Mudar `batchSize` de **10** para **5** para dar mais contexto por processo e reduzir risco de truncamento.

### Resumo das Mudancas

| O que | Antes | Depois |
|-------|-------|--------|
| Indices de fatiamento | Calculados no texto normalizado, aplicados no original (BUG) | Calculados e aplicados no mesmo texto (lowercase) |
| max_tokens | 6000 | 16000 |
| batchSize | 10 | 5 |
| Prompt IA | Generico | Instrucoes explicitas para preencher todos os campos |
| Deduplicacao | Substring fragil (100-200) | Verificacao central mais robusta |

### Seguranca

- Nenhuma tabela e alterada
- Nenhum fluxo existente e quebrado
- A funcionalidade de edicao inline recentemente adicionada continua intacta
- Apenas a logica de extracao de texto e melhorada


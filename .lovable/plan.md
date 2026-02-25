

## Correcao: Dados Faltantes nos Processos da Revista INPI

### Problemas Identificados (com evidencia no banco de dados)

Analisando os 30 registros mais recentes da tabela `rpi_entries`:

1. **~60% dos registros tem `brand_name` vazio (null)** - A IA nao esta extraindo o nome da marca
2. **~100% dos registros tem `holder_name` vazio (null)** - Titular nunca esta sendo preenchido
3. **~40% dos registros tem `ncl_classes` vazio (null)** - Classes NCL faltando
4. **100% dos registros tem `dispatch_code` vazio (null)** - Codigo do despacho nunca preenchido
5. **Processos duplicados** - Numeros como 942644468 e 935405593 aparecem 2 vezes cada
6. **Processos com "NI" descartados** - Quando a IA retorna "NI" como process_number, o `replace(/\D/g, "")` transforma em string vazia e o processo e ignorado

### Causa Raiz

Tres problemas no codigo:

**A) Janela de contexto pequena (5000 chars)**
Em documentos XML/PDF da RPI, o nome do procurador pode estar a milhares de caracteres de distancia dos dados do processo. 5000 caracteres antes/depois nao e suficiente.

**B) Busca apenas por "davilys"**
Se o documento contiver apenas "Danques" ou "Cunha" sem "Davilys", esses processos sao perdidos.

**C) Deduplicacao fragil**
A deduplicacao por substring no centro do bloco (linhas 99-103) falha quando blocos tem conteudo similar mas nao identico, e a deduplicacao final por process_number (linhas 351-357) descarta entradas onde o numero e "NI" ou vazio.

### Solucao

**Arquivo:** `supabase/functions/process-rpi/index.ts`

#### 1. Adicionar termos de busca multiplos

Alterar de um unico termo para uma lista de termos:

```text
const ATTORNEY_SEARCH_TERMS = ["davilys", "danques"];
```

Atualizar `containsAttorney` e `extractAttorneyBlocks` para buscar por QUALQUER um dos termos.

#### 2. Aumentar janela de contexto de 5000 para 8000

Capturar mais texto ao redor do nome do procurador para garantir que os dados do processo (marca, titular, NCL) estejam incluidos no bloco.

#### 3. Corrigir descarte de processos com "NI"

Na deduplicacao final (linha 354), nao descartar processos cujo process_number seja "NI" ou vazio. Em vez disso, gerar um ID unico temporario para mante-los no resultado.

#### 4. Melhorar deduplicacao de blocos

Usar os indices de posicao no texto para verificar sobreposicao em vez de comparacao de substring fragil.

#### 5. Refinar prompt da IA com instrucoes especificas para XML

Adicionar instrucoes mais claras sobre a estrutura dos documentos XML da RPI (tags como `<processo>`, `<marca>`, `<titular>`, `<procurador>`).

### Alteracoes Detalhadas

```text
// ANTES (linha 13):
const ATTORNEY_SEARCH_TERM = "davilys";

// DEPOIS:
const ATTORNEY_SEARCH_TERMS = ["davilys", "danques"];
```

```text
// ANTES (containsAttorney):
return normalized.includes(ATTORNEY_SEARCH_TERM);

// DEPOIS:
return ATTORNEY_SEARCH_TERMS.some(term => normalized.includes(term));
```

```text
// ANTES (extractAttorneyBlocks): busca 1 termo, janela 5000
while ((idx = lower.indexOf(ATTORNEY_SEARCH_TERM, idx)) !== -1) {
  const start = Math.max(0, idx - 5000);
  const end = Math.min(text.length, idx + ATTORNEY_SEARCH_TERM.length + 5000);

// DEPOIS: busca multiplos termos, janela 8000, deduplicacao por posicao
function extractAttorneyBlocks(text: string): string[] {
  const blocks: { start: number; end: number; text: string }[] = [];
  const lower = text.toLowerCase();

  for (const term of ATTORNEY_SEARCH_TERMS) {
    let idx = 0;
    while ((idx = lower.indexOf(term, idx)) !== -1) {
      const start = Math.max(0, idx - 8000);
      const end = Math.min(text.length, idx + term.length + 8000);

      // Verificar sobreposicao com blocos existentes
      const overlaps = blocks.some(b =>
        (start >= b.start && start <= b.end) || (end >= b.start && end <= b.end)
      );

      if (!overlaps) {
        blocks.push({ start, end, text: text.slice(start, end) });
      } else {
        // Expandir bloco existente se necessario
        const existing = blocks.find(b =>
          (start >= b.start && start <= b.end) || (end >= b.start && end <= b.end)
        );
        if (existing) {
          existing.start = Math.min(existing.start, start);
          existing.end = Math.max(existing.end, end);
          existing.text = text.slice(existing.start, existing.end);
        }
      }
      idx += term.length;
    }
  }
  return blocks.map(b => b.text);
}
```

```text
// ANTES (deduplicacao final, linha 354):
const clean = (p.process_number || "").toString().replace(/\D/g, "");
if (!clean) continue;

// DEPOIS: manter processos mesmo sem numero claro
const clean = (p.process_number || "").toString().replace(/\D/g, "");
const key = clean || `unknown_${unknownCounter++}`;
if (clean && byProcess.has(clean)) continue; // dedup apenas se tem numero
byProcess.set(key, { ...p, process_number: clean || p.process_number || "NI" });
```

```text
// ANTES (prompt da IA):
// Prompt generico

// DEPOIS: instrucoes especificas para XML
content: `...
IMPORTANTE para XML da RPI:
- Em XML, os dados aparecem em tags como <processo>, <numero>, <marca>, <nome>, <titular>, <procurador>, <classe-nice>, <despacho>
- O numero do processo geralmente tem 9 digitos
- Procure tambem por "Classe de Nice" ou "NCL" seguido de numeros
- O titular pode aparecer como "Titular:", "Requerente:", ou dentro de tags XML
- Se houver multiplos processos num bloco, extraia TODOS eles
...`
```

### Resumo das Mudancas

| O que | Antes | Depois |
|-------|-------|--------|
| Termos de busca | Apenas "davilys" | "davilys" + "danques" |
| Janela de contexto | 5000 chars | 8000 chars |
| Processos sem numero | Descartados silenciosamente | Mantidos com "NI" |
| Deduplicacao blocos | Substring fragil | Posicao no texto (merge de blocos) |
| Prompt IA | Generico | Instrucoes XML especificas |

### Seguranca

- Nenhuma tabela alterada
- Nenhum fluxo existente quebrado
- Funcionalidade de edicao inline continua intacta
- Apenas logica de extracao melhorada
- Mais processos serao capturados (nenhum sera perdido)



# Correcao Critica: Tela Preta na Pagina de Assinatura

## Causa Raiz
O campo `suggested_classes` no banco tem esta estrutura:
```json
{
  "classes": [35, 41, 42],
  "descriptions": ["Classe 35 – Publicidade...", "Classe 41 – ...", "Classe 42 – ..."],
  "selected": [35]
}
```

O codigo em `AssinarDocumento.tsx` trata como se fosse um array de objetos `[{ classNumber, className, selected }]`, causando `suggested.filter is not a function` (porque e um objeto, nao array).

Isso causa crash imediato ao carregar a pagina.

## Correcao

**Arquivo:** `src/pages/AssinarDocumento.tsx`

### 1. `availableUpsellClasses` (linha 186-191)
Adaptar para ler o formato real:
- `contract.suggested_classes.classes` = array de numeros
- `contract.suggested_classes.selected` = array de numeros selecionados pelo admin
- Classes disponiveis = `classes` que NAO estao em `selected`
- Retornar array de `{ classNumber, className }` para o card de upsell

### 2. `originalClassCount` (linha 194-199)
Adaptar para usar `contract.suggested_classes.selected.length`

### 3. `displayContractHtml` (linha 222-268)
Adaptar para montar `allClasses` usando `suggested_classes.selected` + `extraSelectedClasses` em vez de filtrar por `sc.selected`

### 4. Descricoes das classes
Usar `suggested_classes.descriptions` mapeado por indice do array `classes`, com fallback para `NCL_CLASS_DESCRIPTIONS`

## Arquivos Modificados
| Arquivo | Alteracao |
|---|---|
| `src/pages/AssinarDocumento.tsx` | Adaptar 3 useMemo para ler formato correto de `suggested_classes` |

## O que NAO sera alterado
- Nenhuma edge function
- Nenhuma tabela
- Nenhum outro componente
- Layout visual do upsell card (permanece identico)
- Logica de assinatura e pagamento

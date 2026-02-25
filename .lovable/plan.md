
# Plano: Corrigir Lentidao na Troca de Abas e Busca no Kanban

## Problemas Identificados

1. **Troca lenta entre Comercial/Juridico**: Ao mudar o `funnelType`, 4 `useMemo` em cascata recalculam sequencialmente sobre 2300+ registros, e o Kanban re-renderiza todas as colunas com animacoes pesadas (`AnimatePresence` + `motion.div` com stagger delay em cada card).

2. **Busca nao aparece no Kanban**: Cada tecla digitada dispara re-render imediato de todo o Kanban com 2300+ cards. As animacoes de entrada (`initial`, `animate`, `transition` com delay) em cada card causam travamento visual -- os resultados existem mas demoram a aparecer por causa das animacoes em cascata.

3. **Animacoes excessivas**: Cada card do Kanban tem `motion.div` com `initial={{ opacity: 0, y: 8 }}` e `transition={{ delay: index * 0.03 }}`. Com 15+ cards por coluna e 9 colunas, sao 135+ animacoes simultaneas.

---

## Solucao

### 1. Debounce na busca (Clientes.tsx)
- Adicionar estado `debouncedSearch` com `setTimeout` de 300ms.
- O `useMemo` de `filteredClients` usa `debouncedSearch` em vez de `search` direto.
- Isso evita re-render do Kanban a cada tecla.

### 2. Remover animacoes pesadas dos cards (ClientKanbanBoard.tsx)
- Substituir `motion.div` por `div` nos cards individuais (linhas ~390-500).
- Remover `AnimatePresence` do wrapper de cards.
- Manter apenas animacao no header das colunas (leve).
- Remover `transition={{ delay: stageIndex * 0.05 }}` das colunas -- renderizar tudo imediatamente.

### 3. Limitar cards visiveis por coluna
- Mostrar no maximo 20 cards por coluna inicialmente.
- Adicionar botao "Ver mais X clientes" para expandir.
- Isso reduz o DOM de ~2300 cards para ~60-180 cards visiveis.

### 4. Otimizar cascata de useMemo (Clientes.tsx)
- Consolidar `dateFilteredClients` + `ownFilteredClients` + `funnelFilteredClients` em um unico `useMemo` para evitar 3 recalculos em cascata.

---

## Detalhes Tecnicos

### Arquivo: `src/pages/admin/Clientes.tsx`

**Debounce na busca:**
```typescript
const [debouncedSearch, setDebouncedSearch] = useState('');

useEffect(() => {
  const timer = setTimeout(() => setDebouncedSearch(search), 300);
  return () => clearTimeout(timer);
}, [search]);
```

**Consolidar filtros em um unico useMemo:**
```typescript
const filteredClients = useMemo(() => {
  let result = clients;
  
  // Funnel filter
  result = result.filter(c => (c.client_funnel_type || 'juridico') === funnelType);
  
  // Own filter
  if (viewOwnOnly && currentUserId) {
    result = result.filter(c => c.created_by === currentUserId || c.assigned_to === currentUserId);
  }
  
  // Date filter
  if (dateFilter !== 'all') { /* ... */ }
  
  // Search filter
  if (debouncedSearch.trim()) { /* ... */ }
  
  return result;
}, [clients, funnelType, viewOwnOnly, currentUserId, dateFilter, selectedMonth, debouncedSearch]);
```

### Arquivo: `src/components/admin/clients/ClientKanbanBoard.tsx`

**Remover animacoes dos cards:**
- Trocar `<motion.div>` por `<div>` nos cards (linhas ~390-500).
- Remover `<AnimatePresence>` (linha 367).
- Manter `<motion.div>` apenas nas colunas mas sem delay.

**Limitar cards por coluna:**
```typescript
const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
const MAX_VISIBLE = 20;

// No render:
const visibleClients = isExpanded ? stageClients : stageClients.slice(0, MAX_VISIBLE);
const hiddenCount = stageClients.length - MAX_VISIBLE;
```

---

## Arquivos Modificados

| Arquivo | Alteracao |
|---|---|
| `src/pages/admin/Clientes.tsx` | Debounce na busca, consolidar filtros em unico useMemo |
| `src/components/admin/clients/ClientKanbanBoard.tsx` | Remover animacoes pesadas, limitar cards por coluna |

## Resultado Esperado
- Troca entre Comercial/Juridico instantanea (sem animacoes em cascata)
- Busca responsiva com resultado aparecendo apos 300ms de pausa na digitacao
- Kanban renderiza imediatamente sem atrasos visuais

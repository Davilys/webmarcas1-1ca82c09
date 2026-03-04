

## Diagnóstico: "2 entrada(s) da RPI prontas para importar"

### O que está acontecendo

O banner mostra entradas da Revista INPI (VR.TEC.BR e TUDO BEM CONTÁBIL) que foram **vinculadas a processos** na aba Revista INPI (`matched_process_id` preenchido), mas que **não foram convertidas** em registros na tabela `publicacoes_marcas`. Sem esse registro, elas não aparecem no Kanban.

A sincronização automática (`doSync`) roda apenas **uma vez** por sessão (`hasSyncedRef`). Se na primeira execução essas entradas não tinham `matched_process_id`, elas foram ignoradas. Agora que foram vinculadas manualmente, a sincronização não roda novamente.

### Causa raiz

1. **`hasSyncedRef` impede re-sync**: A flag `hasSyncedRef.current = true` é definida na primeira execução e nunca reseta, então vinculações feitas depois da carga inicial nunca são sincronizadas automaticamente.
2. **O botão de importação manual funciona**, mas o usuário espera que isso seja automático.

### Solução

**Arquivo: `src/components/admin/PublicacaoTab.tsx`**

1. **Importação automática**: Quando `availableRpiEntries` muda e tem itens, executar automaticamente `handleAutoPopulateFromRPI` para cada entrada pendente, eliminando a necessidade do banner de importação manual.

2. **Manter banner como fallback**: Se a importação automática falhar para alguma entrada (ex: processo não encontrado no `processMap`), manter o banner para importação manual apenas dessas.

3. **Usar dispatch_text para determinar status**: Atualmente `handleAutoPopulateFromRPI` usa status `'003'` fixo. Aplicar a mesma lógica de detecção de status do `doSync` (linhas 580-587) para que o card apareça na coluna correta do Kanban.

4. **Resetar `hasSyncedRef` quando `rpiEntries` mudam**: Adicionar lógica para que, quando novas vinculações são feitas na Revista INPI, a sincronização rode novamente.

### Mudanças técnicas

- Adicionar um `useEffect` que observa `availableRpiEntries` e chama `createMutation` para cada entrada pendente automaticamente
- Atualizar `handleAutoPopulateFromRPI` para usar a lógica de detecção de status por `dispatch_text` em vez de `'003'` fixo
- Remover o `hasSyncedRef` ou resetá-lo quando `rpiEntries.length` muda


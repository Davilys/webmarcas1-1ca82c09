

## Importacao Inteligente: Sempre Atualizar + Funil Juridico/Protocolado

### O que muda

1. **Sempre atualizar clientes existentes** - o toggle "Atualizar clientes existentes" sera removido; todo cliente encontrado no banco sera atualizado automaticamente
2. **Identificacao multi-criterio** - busca por Email, CPF, CNPJ ou Nome (nessa ordem de prioridade)
3. **Clientes novos vao direto para Juridico > Protocolado** (ja funciona assim, sera mantido)
4. **Clientes existentes sao atualizados** sem criar duplicatas, mesmo que o email seja diferente
5. **Merge inteligente** - campos vazios no arquivo nao apagam dados existentes

### Alteracoes Tecnicas

#### 1. Edge Function `import-clients/index.ts`

Substituir a busca simples por email por uma busca em cascata:

```text
1. Email (eq)
2. CPF (eq, somente digitos)
3. CNPJ (eq, somente digitos)
4. full_name (ilike, case-insensitive)
```

Se encontrar por qualquer criterio: atualiza o perfil existente (merge - so campos preenchidos sobrescrevem).
Se nao encontrar: cria novo usuario Auth + perfil + processo juridico/protocolado (logica atual mantida).

Remover o parametro `updateExisting` - agora sempre atualiza.

No update, usar logica de merge:
```typescript
full_name: client.full_name || existingProfile.full_name,
phone: client.phone || existingProfile.phone,
// etc - so sobrescreve se o valor novo nao for vazio
```

#### 2. Frontend `ClientImportExportDialog.tsx`

- Remover o state `updateExisting` e o toggle Switch do preview
- Forcar `updateExisting: true` no payload enviado ao edge function
- Ampliar detecao de duplicatas no preview: buscar `email, cpf, cnpj, full_name` dos profiles para mostrar badge "Sera atualizado" corretamente
- Selecionar todos os registros validos (incluindo duplicatas) por padrao

#### 3. `ImportPreviewTable.tsx`

- Atualizar para aceitar listas de CPFs, CNPJs e nomes existentes alem de emails
- Verificar duplicatas por qualquer um dos 4 criterios
- Remover a prop `updateExisting` (agora sempre true)

### Resultado

- Importar arquivo nunca da erro por duplicata
- Clientes existentes sao identificados por email, CPF, CNPJ ou nome
- Dados sao atualizados automaticamente (merge inteligente)
- Novos clientes entram no funil Juridico > Protocolado
- Preview mostra quais serao atualizados vs criados


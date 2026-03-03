

## Correcao: Clientes importados nao aparecem no Kanban

### Problema identificado

A cliente **Sonia Aparecida Morais** (sam.moraes0@gmail.com) existe na tabela `auth.users` (id: `931c2303-978c-4d67-b44c-5420fac12382`) mas **NAO existe na tabela `profiles`**. Isso acontece com pelo menos 3 clientes do arquivo (sam.moraes0, romeiropeterson, felipeferaf).

**Fluxo do erro:**
1. O edge function busca o perfil em `profiles` por email/cpf/cnpj/nome → nao encontra
2. Tenta criar um novo usuario em `auth.users` → falha com "A user with this email address has already been registered"
3. Retorna erro e **nao cria o perfil nem o processo** → cliente nunca aparece no Kanban

**Causa raiz:** Usuarios que existem no Auth mas nao tem perfil (possivelmente criados anteriormente com erro no trigger `handle_new_user`, ou perfil deletado manualmente).

### Solucao

Alterar o edge function `import-clients/index.ts` para tratar o caso em que `createUser` falha com "already been registered":

1. Quando o `createUser` falhar com essa mensagem, buscar o usuario existente via `auth.admin.listUsers` filtrando por email
2. Usar o ID do usuario Auth existente para criar/atualizar o perfil normalmente
3. Continuar o fluxo normal (upsert profile, assign role, create brand_process)

### Alteracoes Tecnicas

#### Ficheiro: `supabase/functions/import-clients/index.ts`

Na funcao `processClient`, na secao "New client" (linha ~156), apos o `createUser` falhar:

```text
Antes:
  if (authError) → return error

Depois:
  if (authError && mensagem contém "already been registered") →
    buscar usuario existente via admin.listUsers({ filter: email })
    usar o ID encontrado como userId
    continuar o fluxo normal (upsert profile + role + brand_process)
  else if (authError) →
    return error (outros erros reais)
```

Logica especifica:
```typescript
if (authError) {
  if (authError.message?.includes('already been registered')) {
    // Buscar usuario existente no Auth
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = listData?.users?.find(u => u.email === email);
    if (!existingAuthUser) {
      return { status: 'error', email, message: 'Usuario existe no Auth mas nao foi encontrado' };
    }
    userId = existingAuthUser.id;
    // Continuar com upsert profile...
  } else {
    return { status: 'error', email, message: `Erro auth: ${authError.message}` };
  }
}
```

**Nota:** Em vez de `listUsers()` (que lista TODOS), usar a API correta: `supabaseAdmin.auth.admin.getUserByEmail(email)` se disponivel, ou buscar diretamente na tabela `auth.users` via SQL. A forma mais eficiente sera buscar o ID do auth.users via query direta:

```typescript
const { data: authUser } = await supabaseAdmin
  .from('auth.users')  // ou rpc
  ...
```

Como o Supabase JS client nao permite query em `auth.users` diretamente, a melhor abordagem e usar `listUsers` com filtro por pagina ou simplesmente fazer o `getUserById` apos extrair o email. Na pratica, a forma mais limpa e:

```typescript
// Tentar getUserByEmail (disponivel no admin API)
const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ 
  page: 1, 
  perPage: 1 
});
// Filtrar... ou melhor, usar getUserByEmail diretamente
```

A implementacao final usara o metodo mais eficiente disponivel na versao do SDK.

### Resultado esperado

- Clientes que ja existem no Auth mas nao tem perfil serao importados corretamente
- O perfil sera criado com todos os dados do arquivo
- O processo `brand_process` sera criado no funil Juridico > Protocolado
- O cliente aparecera no Kanban na coluna "Protocolado"
- Nenhum erro "already been registered" sera exibido


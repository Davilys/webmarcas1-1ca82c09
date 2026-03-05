

## Correcao: Separacao de contas Admin e Cliente

### Problemas identificados

1. **Excluir cliente remove acesso Admin**: Em `ClientDetailSheet.tsx` (linha 642), ao excluir um cliente, o codigo deleta TODAS as `user_roles` do usuario, incluindo a role `admin`. Isso faz o admin perder acesso ao CRM.

2. **Criar Admin cria conta de cliente**: O edge function `create-admin-user` cria um usuario no `auth.users`, e o trigger `handle_new_user` automaticamente cria um perfil na tabela `profiles`. Isso faz o admin aparecer na area de clientes.

3. **Excluir Admin exclui tudo**: Se o perfil do admin for excluido como cliente, ele perde acesso ao CRM tambem (porque perfil e conta auth sao compartilhados).

### Solucao

#### 1. Corrigir exclusao de cliente para preservar role admin

No `ClientDetailSheet.tsx`, ao excluir um cliente, verificar se o usuario tem role `admin` antes de deletar. Se tiver, manter a role admin e apenas remover dados de cliente (processos, contratos, etc.) sem deletar o perfil.

```text
Antes:
  supabase.from('user_roles').delete().eq('user_id', client.id)
  supabase.from('profiles').delete().eq('id', client.id)

Depois:
  // Verificar se e admin
  const { data: adminRole } = await supabase
    .from('user_roles').select('id').eq('user_id', client.id).eq('role', 'admin').maybeSingle();
  
  // Se e admin: deletar apenas role 'client' (se existir), manter perfil e admin role
  // Se NAO e admin: deletar tudo (roles, perfil)
  if (adminRole) {
    // Apenas remover role client, manter perfil e admin role
    supabase.from('user_roles').delete().eq('user_id', client.id).eq('role', 'client');
    // Limpar dados de cliente no perfil (client_funnel_type = null, etc.)
  } else {
    // Remover tudo incluindo perfil
    supabase.from('user_roles').delete().eq('user_id', client.id);
    supabase.from('profiles').delete().eq('id', client.id);
  }
```

#### 2. Corrigir criacao de Admin para nao criar perfil de cliente

No `create-admin-user` edge function, apos criar o usuario (que gera perfil via trigger), marcar o perfil como admin-only para que nao apareca na listagem de clientes.

O perfil ja e criado pelo trigger `handle_new_user` e nao podemos evitar isso. A solucao e garantir que a query de clientes no Kanban filtre admins-only (usuarios que tem role admin mas nao tem `brand_processes`).

Na pratica, como o Kanban de clientes ja filtra por `brand_processes` (processo de marca), admins sem processos ja nao aparecem. Preciso verificar se a listagem de clientes tambem filtra corretamente.

#### 3. Corrigir exclusao de Admin para nao afetar perfil

A exclusao de admin (`removeAdminMutation` no SecuritySettings.tsx) ja esta correta -- so remove role e permissions, nao toca no perfil. Nenhuma alteracao necessaria aqui.

### Alteracoes tecnicas

**Ficheiro: `src/components/admin/clients/ClientDetailSheet.tsx`**
- Modificar `handleDeleteClient` para verificar se o usuario tem role `admin`
- Se tiver role admin: deletar dados de cliente (processos, contratos, faturas, etc.) mas MANTER o perfil e a role admin
- Se nao tiver role admin: comportamento atual (deletar tudo)

**Ficheiro: `supabase/functions/create-admin-user/index.ts`**
- Nenhuma alteracao necessaria no edge function. O trigger `handle_new_user` cria o perfil automaticamente, mas admins sem `brand_processes` nao aparecem no Kanban de clientes.

### Resultado esperado

- Excluir um cliente que tambem e admin: remove dados de cliente, mas admin continua com acesso ao CRM
- Excluir um admin: remove acesso admin, mas se tiver conta de cliente, continua com acesso a area do cliente
- Criar um admin: cria apenas acesso admin, sem processos de marca (nao aparece no Kanban de clientes)
- Unico com conta dupla (admin + cliente): Administrador Master (davillys@gmail.com)


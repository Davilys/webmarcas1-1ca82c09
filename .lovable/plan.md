## Plano: Botão "Resetar Senha" para Administradores (apenas Master)

### Objetivo
Adicionar, na aba **Configurações → Segurança → Usuários Administradores**, um botão para resetar a senha de qualquer admin (exceto o próprio Master) para a senha padrão `123Mudar@`. Apenas o Master Admin (`davillys@gmail.com`) pode usar essa ação.

### Mudanças

**1. Nova edge function: `supabase/functions/reset-admin-password/index.ts`**
- Recebe `{ userId }` no body
- Valida JWT do chamador via `supabase.auth.getUser(token)`
- Verifica se o caller é o Master Admin (email === `davillys@gmail.com`) — caso contrário retorna 403
- Verifica se o `userId` alvo possui role `admin` (não permite usar essa rota para clientes)
- Bloqueia reset do próprio Master (segurança extra)
- Executa `supabaseAdmin.auth.admin.updateUserById(userId, { password: '123Mudar@' })`
- Retorna `{ success: true }`
- Usa service role key + CORS padrão (mesmo padrão de `delete-auth-user`)
- Sem necessidade de config.toml (verify_jwt default já serve, validamos manualmente)

**2. `src/components/admin/settings/SecuritySettings.tsx`**
- Importar ícone `KeyRound` do lucide-react
- Adicionar mutation `resetPasswordMutation` que invoca a edge function `reset-admin-password`
- No bloco de ações do admin (linhas 233-261), adicionar — **somente quando `isMasterAdmin === true` e `!isMasterAdminUser`** — um novo botão `Ghost` com ícone `KeyRound` antes do botão de editar permissões:
  - `title="Resetar Senha"`
  - `onClick`: abre `confirm()` "Resetar a senha de {nome} para a senha padrão (123Mudar@)? O administrador deverá alterá-la no próximo login."
  - Em sucesso: `toast.success('Senha resetada para 123Mudar@. Informe ao administrador.')`
  - Em erro: `toast.error(error.message)`
  - `disabled={resetPasswordMutation.isPending}`

### Segurança
- Dupla validação: front-end só mostra o botão para Master; edge function revalida via JWT no backend (defesa em profundidade)
- Master não consegue resetar a própria senha por essa rota
- Apenas usuários com role `admin` podem ter senha resetada por aqui (não é rota genérica)

### UX
- Botão visível apenas para Master Admin logado
- Confirmação obrigatória antes da ação
- Feedback claro via toast indicando a senha aplicada


## Plan: Separate Admin and Client Login Access

### Problem
Currently, the client login page (`/cliente/login`) allows admin users to log in and redirects them to the admin panel. The user wants strict separation:
- **Client login** (`/cliente/login`): Only users with the `user` role can log in. Admins must be blocked with an error message.
- **Admin login** (`/admin/login`): Remains admin-only (already works correctly).
- **Header link "Área do Cliente"**: Should go exclusively to `/cliente/login` (already correct, just confirming).

### Changes

**1. `src/pages/cliente/Login.tsx` — Block admin-only accounts**
- After successful `signInWithPassword`, check for the `user` role instead of the `admin` role.
- If the user has the `user` role, proceed to `/cliente/dashboard`.
- If the user does NOT have the `user` role (admin-only accounts), sign them out and show an error: "Esta área é exclusiva para clientes. Administradores devem acessar pelo painel admin."
- **Exception**: The master admin (`davillys@gmail.com`) keeps dual access since they have both roles.

**2. No changes to `src/pages/admin/Login.tsx`** — Already blocks non-admins correctly.

**3. No changes to `Header.tsx`** — "Área do Cliente" already links to `/cliente/login`.

### Summary
Single file change in `src/pages/cliente/Login.tsx`: replace the admin-redirect logic with a block that signs out admin-only users and shows an appropriate error message.


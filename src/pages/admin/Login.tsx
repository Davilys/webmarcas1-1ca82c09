import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mail, Lock, Loader2, Shield } from 'lucide-react';
import logo from '@/assets/webmarcas-logo.png';

const MAX_NETWORK_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 700;
const REQUEST_TIMEOUT_MS = 12000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = async <T,>(promise: Promise<T> | PromiseLike<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('request timeout')), timeoutMs);
    }),
  ]);
};

const isFetchConnectivityError = (message?: string) => {
  const normalized = (message || '').toLowerCase();
  return (
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('load failed') ||
    normalized.includes('network request failed') ||
    normalized.includes('timeout')
  );
};

export default function AdminLogin() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        toast.error('Você está sem internet. Verifique sua conexão e tente novamente.');
        return;
      }

      let data: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>['data'] | null = null;
      let error: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>['error'] | null = null;

      for (let attempt = 1; attempt <= MAX_NETWORK_RETRIES; attempt++) {
        const result = await withTimeout(
          supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          }),
          REQUEST_TIMEOUT_MS
        );

        data = result.data;
        error = result.error;

        if (!error || !isFetchConnectivityError(error.message) || attempt === MAX_NETWORK_RETRIES) {
          break;
        }

        await wait(BASE_RETRY_DELAY_MS * attempt);
      }

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Email ou senha incorretos');
        } else if (isFetchConnectivityError(error.message)) {
          toast.error('Falha de conexão com o servidor. Tente novamente em alguns segundos.');
        } else {
          toast.error(error.message);
        }
        return;
      }

      // Check if user is admin
      if (data.user) {
        let roleData: { role: string } | null = null;
        let roleError: { message: string } | null = null;

        for (let attempt = 1; attempt <= MAX_NETWORK_RETRIES; attempt++) {
          const roleResult = await withTimeout(
            Promise.resolve(
              supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', data.user.id)
                .eq('role', 'admin')
                .maybeSingle()
            ),
            REQUEST_TIMEOUT_MS
          );

          roleData = roleResult.data;
          roleError = roleResult.error;

          if (!roleError || !isFetchConnectivityError(roleError.message) || attempt === MAX_NETWORK_RETRIES) {
            break;
          }

          await wait(BASE_RETRY_DELAY_MS * attempt);
        }

        if (roleError) {
          await supabase.auth.signOut();
          toast.error(
            isFetchConnectivityError(roleError.message)
              ? 'Instabilidade de conexão ao validar seu acesso. Tente novamente.'
              : 'Não foi possível validar suas permissões de administrador.'
          );
          return;
        }

        if (roleData) {
          // Master admin goes to dashboard directly
          const MASTER_ADMIN_EMAIL = 'davillys@gmail.com';
          if (data.user.email === MASTER_ADMIN_EMAIL) {
            toast.success('Login de administrador realizado!');
            navigate('/admin/dashboard');
          } else {
            // Fetch permissions to find first allowed route
            let perms: { permission_key: string; can_view: boolean }[] | null = null;
            let permsError: { message: string } | null = null;

            for (let attempt = 1; attempt <= MAX_NETWORK_RETRIES; attempt++) {
              const permsResult = await withTimeout(
                Promise.resolve(
                  supabase
                    .from('admin_permissions')
                    .select('permission_key, can_view')
                    .eq('user_id', data.user.id)
                    .eq('can_view', true)
                ),
                REQUEST_TIMEOUT_MS
              );

              perms = permsResult.data;
              permsError = permsResult.error;

              if (!permsError || !isFetchConnectivityError(permsError.message) || attempt === MAX_NETWORK_RETRIES) {
                break;
              }

              await wait(BASE_RETRY_DELAY_MS * attempt);
            }

            if (permsError) {
              toast.error(
                isFetchConnectivityError(permsError.message)
                  ? 'Login realizado, mas houve instabilidade ao carregar permissões. Tente novamente.'
                  : 'Login realizado, mas não foi possível carregar permissões de acesso.'
              );
              navigate('/admin/configuracoes');
              return;
            }

            const PATH_MAP: Record<string, string> = {
              dashboard: '/admin/dashboard',
              leads: '/admin/leads',
              clients: '/admin/clientes',
              contracts: '/admin/contratos',
              contract_templates: '/admin/modelos-contrato',
              documents: '/admin/documentos',
              financial: '/admin/financeiro',
              emails: '/admin/emails',
              live_chat: '/admin/chat-ao-vivo',
              notifications: '/admin/notificacoes',
              inpi_magazine: '/admin/revista-inpi',
              publications: '/admin/publicacao',
              inpi_resources: '/admin/recursos-inpi',
              awards: '/admin/premiacao',
              settings: '/admin/configuracoes',
            };

            // Ordered keys matching menu order
            const orderedKeys = ['dashboard','leads','clients','contracts','contract_templates','documents','financial','emails','live_chat','notifications','inpi_magazine','publications','inpi_resources','awards','settings'];
            const permSet = new Set(perms?.map(p => p.permission_key) || []);
            const firstAllowed = orderedKeys.find(k => permSet.has(k));
            const targetRoute = firstAllowed ? PATH_MAP[firstAllowed] : '/admin/configuracoes';

            toast.success('Login de administrador realizado!');
            navigate(targetRoute);
          }
        } else {
          // Not an admin - sign out and show error
          await supabase.auth.signOut();
          toast.error('Acesso negado. Esta área é restrita a administradores.');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '';
      toast.error(
        isFetchConnectivityError(errorMessage)
          ? 'Falha de conexão com o servidor. Tente novamente em alguns segundos.'
          : 'Erro ao fazer login'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-primary/20">
        <CardHeader className="text-center">
          <Link to="/">
            <img src={logo} alt="WebMarcas" className="h-12 mx-auto mb-4" />
          </Link>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-2xl">Painel Administrativo</CardTitle>
          </div>
          <CardDescription>
            Acesso restrito a administradores do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@webmarcas.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Acessar Painel
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>
              <Link to="/cliente/login" className="text-primary hover:underline">
                Área do Cliente →
              </Link>
            </p>
            <p className="mt-2">
              <Link to="/" className="hover:underline">
                ← Voltar ao site
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

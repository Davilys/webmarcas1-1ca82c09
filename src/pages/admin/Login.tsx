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

export default function AdminLogin() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Email ou senha incorretos');
        } else {
          toast.error(error.message);
        }
        return;
      }

      // Check if user is admin
      if (data.user) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (roleData) {
          // Master admin goes to dashboard directly
          const MASTER_ADMIN_EMAIL = 'davillys@gmail.com';
          if (data.user.email === MASTER_ADMIN_EMAIL) {
            toast.success('Login de administrador realizado!');
            navigate('/admin/dashboard');
          } else {
            // Fetch permissions to find first allowed route
            const { data: perms } = await supabase
              .from('admin_permissions')
              .select('permission_key, can_view')
              .eq('user_id', data.user.id)
              .eq('can_view', true);

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
      toast.error('Erro ao fazer login');
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

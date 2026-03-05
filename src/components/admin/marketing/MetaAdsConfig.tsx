import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Settings, RefreshCw, CheckCircle2, XCircle, Loader2, Wifi } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function MetaAdsConfig() {
  const queryClient = useQueryClient();
  const [pixelId, setPixelId] = useState('');
  const [businessId, setBusinessId] = useState('');

  const { data: config, isLoading } = useQuery({
    queryKey: ['marketing-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_config')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setPixelId(data.meta_pixel_id || '');
        setBusinessId(data.meta_business_id || '');
      }
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (config) {
        const { error } = await supabase
          .from('marketing_config')
          .update({
            meta_pixel_id: pixelId || null,
            meta_business_id: businessId || null,
            is_connected: !!(pixelId && businessId),
            updated_at: new Date().toISOString(),
          })
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('marketing_config').insert({
          meta_pixel_id: pixelId || null,
          meta_business_id: businessId || null,
          is_connected: !!(pixelId && businessId),
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-config'] });
      toast.success('Configuração salva com sucesso');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-meta-campaigns');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      toast.success(`${data.synced} campanhas sincronizadas`);
    },
    onError: (err: any) => toast.error(`Erro ao sincronizar: ${err.message}`),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuração Meta Ads
              </CardTitle>
              <CardDescription className="mt-1">
                Conecte sua conta do Meta Business para sincronizar campanhas e enviar eventos de conversão
              </CardDescription>
            </div>
            <Badge variant={config?.is_connected ? 'default' : 'secondary'} className="gap-1">
              {config?.is_connected ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {config?.is_connected ? 'Conectado' : 'Desconectado'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pixel-id">Meta Pixel ID</Label>
              <Input
                id="pixel-id"
                placeholder="Ex: 123456789012345"
                value={pixelId}
                onChange={(e) => setPixelId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Encontre em: Meta Events Manager → Pixel → Configurações
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="business-id">Meta Ad Account ID</Label>
              <Input
                id="business-id"
                placeholder="Ex: 123456789012345"
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Encontre em: Meta Business Suite → Configurações → Conta de anúncios
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar Configuração
            </Button>
            {config?.is_connected && (
              <Button variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
                {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Sincronizar Campanhas
              </Button>
            )}
          </div>

          {config?.last_sync && (
            <p className="text-xs text-muted-foreground">
              Última sincronização: {format(new Date(config.last_sync), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wifi className="h-4 w-4" />
            Como configurar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Acesse o <strong>Meta Business Suite</strong> e copie o ID da conta de anúncios</li>
            <li>Acesse o <strong>Meta Events Manager</strong> e copie o ID do Pixel</li>
            <li>Gere um <strong>Access Token</strong> de longa duração no Meta Business Settings</li>
            <li>O Access Token deve ser configurado nas <strong>variáveis de ambiente</strong> do backend (META_ACCESS_TOKEN)</li>
            <li>Após configurar, clique em <strong>Sincronizar Campanhas</strong> para importar dados</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

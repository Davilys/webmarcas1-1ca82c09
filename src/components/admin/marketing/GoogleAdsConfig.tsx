import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Settings, CheckCircle2, XCircle, Loader2, Wifi } from 'lucide-react';

export default function GoogleAdsConfig() {
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = useState('');

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
        setCustomerId((data as any).google_ads_customer_id || '');
      }
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updateData = {
        google_ads_customer_id: customerId || null,
        google_ads_connected: !!customerId,
        updated_at: new Date().toISOString(),
      };
      if (config) {
        const { error } = await supabase
          .from('marketing_config')
          .update(updateData as any)
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('marketing_config').insert(updateData as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-config'] });
      toast.success('Configuração Google Ads salva');
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const isConnected = !!(config as any)?.google_ads_connected;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuração Google Ads
              </CardTitle>
              <CardDescription className="mt-1">
                Conecte sua conta do Google Ads para sincronizar campanhas, palavras-chave e conversões
              </CardDescription>
            </div>
            <Badge variant={isConnected ? 'default' : 'secondary'} className="gap-1">
              {isConnected ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {isConnected ? 'Conectado' : 'Desconectado'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="google-customer-id">Google Ads Customer ID</Label>
            <Input
              id="google-customer-id"
              placeholder="Ex: 123-456-7890"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Encontre em: Google Ads → Configurações → ID do cliente
            </p>
          </div>

          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar Configuração
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wifi className="h-4 w-4" />
            Como configurar Google Ads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Acesse o <strong>Google Ads</strong> e copie o Customer ID (formato XXX-XXX-XXXX)</li>
            <li>Gere um <strong>Access Token</strong> via Google API Console</li>
            <li>Configure o <strong>GOOGLE_ADS_TOKEN</strong> nas variáveis de ambiente do backend</li>
            <li>As conversões serão enviadas automaticamente via Google Ads Conversion API</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

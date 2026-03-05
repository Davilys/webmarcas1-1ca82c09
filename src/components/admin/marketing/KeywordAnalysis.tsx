import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Key } from 'lucide-react';
import { useMemo } from 'react';

export default function KeywordAnalysis() {
  const { data: attributions = [] } = useQuery({
    queryKey: ['keyword-attributions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_attribution')
        .select('*')
        .not('utm_term', 'is', null);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allAttributions = [] } = useQuery({
    queryKey: ['keyword-all-attributions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_attribution')
        .select('*')
        .not('utm_campaign', 'is', null);
      if (error) throw error;
      return data || [];
    },
  });

  const keywordStats = useMemo(() => {
    const map = new Map<string, { leads: number; revenue: number; clients: number }>();

    for (const a of attributions) {
      const kw = a.utm_term || '';
      if (!kw) continue;
      const existing = map.get(kw) || { leads: 0, revenue: 0, clients: 0 };
      existing.leads++;
      existing.revenue += Number(a.revenue || 0);
      if (Number(a.revenue || 0) > 0) existing.clients++;
      map.set(kw, existing);
    }

    return Array.from(map.entries())
      .map(([keyword, stats]) => ({ keyword, ...stats }))
      .sort((a, b) => b.leads - a.leads);
  }, [attributions]);

  const campaignStats = useMemo(() => {
    const map = new Map<string, { leads: number; revenue: number; clients: number }>();

    for (const a of allAttributions) {
      const camp = a.utm_campaign || '';
      if (!camp) continue;
      const existing = map.get(camp) || { leads: 0, revenue: 0, clients: 0 };
      existing.leads++;
      existing.revenue += Number(a.revenue || 0);
      if (Number(a.revenue || 0) > 0) existing.clients++;
      map.set(camp, existing);
    }

    return Array.from(map.entries())
      .map(([campaign, stats]) => ({ campaign, ...stats }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [allAttributions]);

  return (
    <div className="space-y-6">
      {/* Keywords */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Palavras-Chave (Google Ads)
          </CardTitle>
          <CardDescription>
            Palavras-chave que geraram leads e vendas (via utm_term)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {keywordStats.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma palavra-chave rastreada</p>
              <p className="text-sm mt-1">
                Adicione <code className="bg-muted px-1 py-0.5 rounded text-xs">utm_term</code> nos seus anúncios do Google Ads
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Palavra-Chave</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Clientes</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Conversão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keywordStats.slice(0, 20).map(kw => (
                  <TableRow key={kw.keyword}>
                    <TableCell className="font-medium">{kw.keyword}</TableCell>
                    <TableCell className="text-right">{kw.leads}</TableCell>
                    <TableCell className="text-right">{kw.clients}</TableCell>
                    <TableCell className="text-right font-medium text-emerald-600">
                      R$ {kw.revenue.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={kw.clients > 0 ? 'default' : 'secondary'} className="text-xs">
                        {kw.leads > 0 ? ((kw.clients / kw.leads) * 100).toFixed(0) : 0}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Campaign Attribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Atribuição por Campanha
          </CardTitle>
          <CardDescription>
            Receita gerada por cada campanha rastreada via UTM
          </CardDescription>
        </CardHeader>
        <CardContent>
          {campaignStats.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma campanha atribuída</p>
              <p className="text-sm mt-1">Leads com utm_campaign aparecerão aqui</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campanha</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Clientes</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaignStats.slice(0, 15).map(c => (
                  <TableRow key={c.campaign}>
                    <TableCell className="font-medium max-w-[200px] truncate">{c.campaign}</TableCell>
                    <TableCell className="text-right">{c.leads}</TableCell>
                    <TableCell className="text-right">{c.clients}</TableCell>
                    <TableCell className="text-right font-medium text-emerald-600">
                      R$ {c.revenue.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={c.revenue > 0 ? 'default' : 'outline'} className="text-xs">
                        {c.revenue > 0 ? 'Positivo' : 'Sem receita'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

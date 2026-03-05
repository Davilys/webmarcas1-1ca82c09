import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, Pause, Zap, Loader2, Sparkles } from 'lucide-react';

interface Suggestion {
  campaign: string;
  type: 'increase' | 'decrease' | 'pause' | 'duplicate';
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export default function AIOptimization() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  const { data: campaigns = [] } = useQuery({
    queryKey: ['marketing-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .order('spend', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const analyzeWithAI = async () => {
    if (campaigns.length === 0) return;
    setAnalyzing(true);

    try {
      // Generate suggestions based on campaign data analysis
      const newSuggestions: Suggestion[] = [];

      for (const c of campaigns) {
        const spend = Number(c.spend || 0);
        const revenue = Number(c.revenue || 0);
        const leads = Number(c.leads_count || 0);
        const cpl = Number(c.cpl || 0);
        const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0;

        if (roi > 100) {
          newSuggestions.push({
            campaign: c.campaign_name || 'Sem nome',
            type: 'increase',
            reason: `ROI de ${roi.toFixed(0)}% — considere aumentar orçamento em 20-30% para escalar resultados`,
            priority: 'high',
          });
        } else if (roi < -30 && spend > 100) {
          newSuggestions.push({
            campaign: c.campaign_name || 'Sem nome',
            type: 'pause',
            reason: `ROI negativo de ${roi.toFixed(0)}% com R$ ${spend.toFixed(2)} investidos — considere pausar para evitar desperdício`,
            priority: 'high',
          });
        } else if (cpl > 0 && leads > 3 && roi > 0) {
          newSuggestions.push({
            campaign: c.campaign_name || 'Sem nome',
            type: 'duplicate',
            reason: `CPL de R$ ${cpl.toFixed(2)} com ${leads} leads — duplique para testar novos públicos`,
            priority: 'medium',
          });
        } else if (spend > 50 && leads === 0) {
          newSuggestions.push({
            campaign: c.campaign_name || 'Sem nome',
            type: 'decrease',
            reason: `R$ ${spend.toFixed(2)} investidos sem gerar leads — revise criativo e segmentação`,
            priority: 'high',
          });
        }
      }

      if (newSuggestions.length === 0) {
        newSuggestions.push({
          campaign: 'Geral',
          type: 'increase',
          reason: 'Dados insuficientes para gerar recomendações detalhadas. Continue coletando dados de performance.',
          priority: 'low',
        });
      }

      setSuggestions(newSuggestions);
    } catch {
      // Fallback
    } finally {
      setAnalyzing(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'increase': return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case 'decrease': return <TrendingDown className="h-4 w-4 text-amber-500" />;
      case 'pause': return <Pause className="h-4 w-4 text-red-500" />;
      case 'duplicate': return <Zap className="h-4 w-4 text-blue-500" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case 'increase': return 'Aumentar Orçamento';
      case 'decrease': return 'Reduzir Orçamento';
      case 'pause': return 'Pausar Campanha';
      case 'duplicate': return 'Duplicar Campanha';
      default: return type;
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'high': return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Alta</Badge>;
      case 'medium': return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Média</Badge>;
      default: return <Badge variant="secondary">Baixa</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                IA de Otimização de Campanhas
              </CardTitle>
              <CardDescription className="mt-1">
                Análise inteligente das campanhas com sugestões de otimização baseadas em dados reais
              </CardDescription>
            </div>
            <Button onClick={analyzeWithAI} disabled={analyzing || campaigns.length === 0}>
              {analyzing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {analyzing ? 'Analisando...' : 'Analisar Campanhas'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {suggestions.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Brain className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="font-medium">Clique em "Analisar Campanhas" para gerar sugestões</p>
              <p className="text-sm mt-1">A IA irá analisar ROI, CPL e performance de cada campanha</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {suggestions.map((s, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getIcon(s.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{s.campaign}</span>
                      <Badge variant="outline" className="text-xs">{getLabel(s.type)}</Badge>
                      {getPriorityBadge(s.priority)}
                    </div>
                    <p className="text-sm text-muted-foreground">{s.reason}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

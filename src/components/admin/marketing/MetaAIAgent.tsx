import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Brain, Loader2, Sparkles, TrendingUp, TrendingDown, Pause, Zap,
  Users, Target, Copy, Lightbulb, BarChart3, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface AgentInsight {
  category: 'winner' | 'loser' | 'budget' | 'audience' | 'creative' | 'general';
  title: string;
  description: string;
  action: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  campaignName?: string;
}

export default function MetaAIAgent() {
  const [insights, setInsights] = useState<AgentInsight[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiSummary, setAiSummary] = useState('');

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

  const { data: conversions = [] } = useQuery({
    queryKey: ['marketing-conversions-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_conversions')
        .select('*')
        .limit(500);
      if (error) return [];
      return data || [];
    },
  });

  const runAgentAnalysis = async () => {
    setAnalyzing(true);
    setInsights([]);
    setAiSummary('');

    try {
      const newInsights: AgentInsight[] = [];
      const totalSpend = campaigns.reduce((s, c) => s + Number(c.spend || 0), 0);
      const totalRevenue = campaigns.reduce((s, c) => s + Number(c.revenue || 0), 0);
      const totalLeads = campaigns.reduce((s, c) => s + Number(c.leads_count || 0), 0);

      // 1. Identify winners
      const winners = campaigns.filter(c => {
        const roi = Number(c.spend) > 0 ? ((Number(c.revenue || 0) - Number(c.spend)) / Number(c.spend)) * 100 : 0;
        return roi > 50 && Number(c.leads_count || 0) > 2;
      });

      for (const w of winners.slice(0, 3)) {
        const roi = ((Number(w.revenue || 0) - Number(w.spend)) / Number(w.spend)) * 100;
        newInsights.push({
          category: 'winner',
          title: `🏆 Campanha Vencedora Detectada`,
          description: `"${w.campaign_name}" tem ROI de ${roi.toFixed(0)}% com ${w.leads_count} leads.`,
          action: 'Aumente o orçamento em 20-30% e duplique para testar novos públicos.',
          priority: 'high',
          campaignName: w.campaign_name || undefined,
        });
      }

      // 2. Identify losers
      const losers = campaigns.filter(c => {
        const spend = Number(c.spend || 0);
        return spend > 50 && Number(c.leads_count || 0) === 0;
      });

      for (const l of losers.slice(0, 3)) {
        newInsights.push({
          category: 'loser',
          title: `⚠️ Campanha com Baixa Performance`,
          description: `"${l.campaign_name}" gastou R$ ${Number(l.spend).toFixed(2)} sem gerar leads.`,
          action: 'Pause esta campanha e redistribua o orçamento para campanhas vencedoras.',
          priority: 'critical',
          campaignName: l.campaign_name || undefined,
        });
      }

      // 3. Budget suggestions
      if (totalSpend > 0 && totalLeads > 0) {
        const avgCPL = totalSpend / totalLeads;
        if (avgCPL > 80) {
          newInsights.push({
            category: 'budget',
            title: '💰 CPL Elevado',
            description: `CPL médio de R$ ${avgCPL.toFixed(2)} — acima do ideal para registro de marcas.`,
            action: 'Refine a segmentação, teste novos criativos e concentre budget nas campanhas com melhor CPA.',
            priority: 'high',
          });
        }
      }

      // 4. Audience suggestions
      if (totalLeads > 10) {
        newInsights.push({
          category: 'audience',
          title: '👥 Oportunidade de Público',
          description: `Com ${totalLeads} leads, você tem dados suficientes para criar Lookalike Audiences.`,
          action: 'Exporte a lista de leads convertidos e crie um Lookalike 1% no Meta Ads Manager.',
          priority: 'medium',
        });
      }

      // 5. Creative suggestions
      const highCTR = campaigns.filter(c => Number((c as any).ctr || 0) > 2);
      const lowCTR = campaigns.filter(c => Number((c as any).ctr || 0) < 0.5 && Number(c.impressions || 0) > 1000);
      
      if (lowCTR.length > 0) {
        newInsights.push({
          category: 'creative',
          title: '🎨 Criativos Precisam de Atenção',
          description: `${lowCTR.length} campanha(s) com CTR abaixo de 0.5%.`,
          action: 'Teste novos formatos: carrossel, vídeo curto ou imagem com prova social.',
          priority: 'medium',
        });
      }

      // 6. General ROI insight
      if (totalSpend > 0) {
        const overallROI = ((totalRevenue - totalSpend) / totalSpend) * 100;
        newInsights.push({
          category: 'general',
          title: overallROI > 0 ? '📈 Performance Geral Positiva' : '📉 Performance Geral Negativa',
          description: `ROI geral: ${overallROI.toFixed(1)}% | Investido: R$ ${totalSpend.toFixed(2)} | Receita: R$ ${totalRevenue.toFixed(2)}`,
          action: overallROI > 0
            ? 'Continue escalando investimento focando nas campanhas vencedoras.'
            : 'Revise toda a estratégia: segmentação, criativos e landing pages.',
          priority: overallROI < -20 ? 'critical' : 'low',
        });
      }

      if (newInsights.length === 0) {
        newInsights.push({
          category: 'general',
          title: '📊 Dados Insuficientes',
          description: 'Não há dados de campanhas suficientes para gerar insights detalhados.',
          action: 'Sincronize suas campanhas do Meta Ads na aba de configuração.',
          priority: 'low',
        });
      }

      // Generate AI summary
      const summary = totalSpend > 0
        ? `Análise completa: ${campaigns.length} campanhas analisadas. ` +
          `${winners.length} vencedoras, ${losers.length} com baixa performance. ` +
          `CPL médio: R$ ${totalLeads > 0 ? (totalSpend / totalLeads).toFixed(2) : '—'}. ` +
          `ROI geral: ${((totalRevenue - totalSpend) / totalSpend * 100).toFixed(1)}%.`
        : 'Aguardando dados de campanhas para gerar análise completa.';

      setAiSummary(summary);
      setInsights(newInsights);
    } catch (err) {
      toast.error('Erro ao analisar campanhas');
    } finally {
      setAnalyzing(false);
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'winner': return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case 'loser': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'budget': return <Target className="h-4 w-4 text-amber-500" />;
      case 'audience': return <Users className="h-4 w-4 text-blue-500" />;
      case 'creative': return <Lightbulb className="h-4 w-4 text-violet-500" />;
      default: return <BarChart3 className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'critical': return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px]">Crítico</Badge>;
      case 'high': return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px]">Alta</Badge>;
      case 'medium': return <Badge variant="secondary" className="text-[10px]">Média</Badge>;
      default: return <Badge variant="outline" className="text-[10px]">Info</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Agent Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Meta Ads Optimization Agent
              </CardTitle>
              <CardDescription className="mt-1">
                Agente de IA que analisa campanhas, identifica padrões de performance e sugere otimizações baseadas em dados reais do CRM.
              </CardDescription>
            </div>
            <Button onClick={runAgentAnalysis} disabled={analyzing} size="lg">
              {analyzing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {analyzing ? 'Analisando...' : 'Executar Análise'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* AI Summary */}
      {aiSummary && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Brain className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm text-foreground">Resumo do Agente</p>
                <p className="text-sm text-muted-foreground mt-1">{aiSummary}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      {insights.length === 0 && !analyzing ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Brain className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="font-medium">Clique em "Executar Análise" para ativar o agente</p>
              <p className="text-sm mt-1">O agente analisará campanhas, ROI, CPL, públicos e criativos</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {insights.map((insight, i) => (
            <Card key={i} className="border-border/50 hover:border-border transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getCategoryIcon(insight.category)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-sm">{insight.title}</span>
                      {getPriorityBadge(insight.priority)}
                      {insight.campaignName && (
                        <Badge variant="outline" className="text-[10px] font-mono">{insight.campaignName}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                    <div className="mt-2 p-2 rounded bg-muted/50">
                      <p className="text-xs font-medium text-foreground flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        Ação recomendada:
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{insight.action}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <Card className="border-border/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
            <div>
              <p className="font-medium text-xs text-foreground">Aviso Importante</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                O agente analisa padrões de performance e sugere otimizações. Ele <strong>não altera campanhas automaticamente</strong>.
                Todas as ações devem ser executadas manualmente no Meta Ads Manager ou Google Ads após avaliação.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

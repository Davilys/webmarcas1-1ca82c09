import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3, Settings, Link2, Users, Brain, AlertTriangle,
  Megaphone, TrendingDown, Clock, Sparkles, Key, Activity, Zap,
} from 'lucide-react';
import MarketingOverview from '@/components/admin/marketing/MarketingOverview';
import MetaAdsConfig from '@/components/admin/marketing/MetaAdsConfig';
import CampaignTable from '@/components/admin/marketing/CampaignTable';
import AttributionPanel from '@/components/admin/marketing/AttributionPanel';
import AudienceExport from '@/components/admin/marketing/AudienceExport';
import AIOptimization from '@/components/admin/marketing/AIOptimization';
import MarketingAlerts from '@/components/admin/marketing/MarketingAlerts';
import ConversionFunnelModule from '@/components/admin/marketing/ConversionFunnelModule';
import HeatmapModule from '@/components/admin/marketing/HeatmapModule';
import CampaignPrediction from '@/components/admin/marketing/CampaignPrediction';
import KeywordAnalysis from '@/components/admin/marketing/KeywordAnalysis';
import LeadScoringModule from '@/components/admin/marketing/LeadScoringModule';
import PixelEventTracking from '@/components/admin/marketing/PixelEventTracking';

export default function MarketingIntelligence() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Marketing Intelligence</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Análise de campanhas, atribuição de leads, otimização de ROI e inteligência de Growth Marketing
          </p>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="overview" className="gap-1.5 text-xs">
              <BarChart3 className="h-3 w-3" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="funnel" className="gap-1.5 text-xs">
              <TrendingDown className="h-3 w-3" />
              Funil
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-1.5 text-xs">
              <Megaphone className="h-3 w-3" />
              Campanhas
            </TabsTrigger>
            <TabsTrigger value="attribution" className="gap-1.5 text-xs">
              <Link2 className="h-3 w-3" />
              Atribuição
            </TabsTrigger>
            <TabsTrigger value="pixels" className="gap-1.5 text-xs">
              <Zap className="h-3 w-3" />
              Eventos
            </TabsTrigger>
            <TabsTrigger value="scoring" className="gap-1.5 text-xs">
              <Activity className="h-3 w-3" />
              Lead Score
            </TabsTrigger>
            <TabsTrigger value="keywords" className="gap-1.5 text-xs">
              <Key className="h-3 w-3" />
              Keywords
            </TabsTrigger>
            <TabsTrigger value="heatmap" className="gap-1.5 text-xs">
              <Clock className="h-3 w-3" />
              Heatmap
            </TabsTrigger>
            <TabsTrigger value="audiences" className="gap-1.5 text-xs">
              <Users className="h-3 w-3" />
              Públicos
            </TabsTrigger>
            <TabsTrigger value="prediction" className="gap-1.5 text-xs">
              <Sparkles className="h-3 w-3" />
              Previsão
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-1.5 text-xs">
              <Brain className="h-3 w-3" />
              IA
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-1.5 text-xs">
              <AlertTriangle className="h-3 w-3" />
              Alertas
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-1.5 text-xs">
              <Settings className="h-3 w-3" />
              Config
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><MarketingOverview /></TabsContent>
          <TabsContent value="funnel"><ConversionFunnelModule /></TabsContent>
          <TabsContent value="campaigns"><CampaignTable /></TabsContent>
          <TabsContent value="attribution"><AttributionPanel /></TabsContent>
          <TabsContent value="pixels"><PixelEventTracking /></TabsContent>
          <TabsContent value="scoring"><LeadScoringModule /></TabsContent>
          <TabsContent value="keywords"><KeywordAnalysis /></TabsContent>
          <TabsContent value="heatmap"><HeatmapModule /></TabsContent>
          <TabsContent value="audiences"><AudienceExport /></TabsContent>
          <TabsContent value="prediction"><CampaignPrediction /></TabsContent>
          <TabsContent value="ai"><AIOptimization /></TabsContent>
          <TabsContent value="alerts"><MarketingAlerts /></TabsContent>
          <TabsContent value="config"><MetaAdsConfig /></TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

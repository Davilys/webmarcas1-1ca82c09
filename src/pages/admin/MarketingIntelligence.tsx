import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3, Settings, Link2, Users, Brain, AlertTriangle,
  Megaphone, TrendingDown, Clock, Sparkles, Key, Activity, Zap,
  DollarSign, ArrowRight, TrendingUp, Search, Wand2, FlaskConical, Target,
} from 'lucide-react';
import MarketingOverview from '@/components/admin/marketing/MarketingOverview';
import MetaAdsConfig from '@/components/admin/marketing/MetaAdsConfig';
import GoogleAdsConfig from '@/components/admin/marketing/GoogleAdsConfig';
import CampaignTable from '@/components/admin/marketing/CampaignTable';
import AttributionPanel from '@/components/admin/marketing/AttributionPanel';
import AudienceExport from '@/components/admin/marketing/AudienceExport';
import MarketingAlerts from '@/components/admin/marketing/MarketingAlerts';
import ConversionFunnelModule from '@/components/admin/marketing/ConversionFunnelModule';
import HeatmapModule from '@/components/admin/marketing/HeatmapModule';
import CampaignPrediction from '@/components/admin/marketing/CampaignPrediction';
import KeywordAnalysis from '@/components/admin/marketing/KeywordAnalysis';
import LeadScoringModule from '@/components/admin/marketing/LeadScoringModule';
import PixelEventTracking from '@/components/admin/marketing/PixelEventTracking';
import BudgetControl from '@/components/admin/marketing/BudgetControl';
import ConversionsTracker from '@/components/admin/marketing/ConversionsTracker';
import AdPerformanceHistory from '@/components/admin/marketing/AdPerformanceHistory';
import AdCopyGenerator from '@/components/admin/marketing/AdCopyGenerator';
import ABTestManager from '@/components/admin/marketing/ABTestManager';
import AudienceSuggester from '@/components/admin/marketing/AudienceSuggester';
import OptimizationAgent from '@/components/admin/marketing/OptimizationAgent';

export default function MarketingIntelligence() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Marketing Intelligence</h1>
          <p className="text-muted-foreground text-sm mt-1">
            CRM + Growth Marketing + BI de Anúncios — Análise, geração de anúncios com IA e otimização completa
          </p>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="overview" className="gap-1.5 text-xs">
              <BarChart3 className="h-3 w-3" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-1.5 text-xs">
              <Megaphone className="h-3 w-3" />
              Campanhas
            </TabsTrigger>
            <TabsTrigger value="conversions" className="gap-1.5 text-xs">
              <ArrowRight className="h-3 w-3" />
              Conversões
            </TabsTrigger>
            <TabsTrigger value="funnel" className="gap-1.5 text-xs">
              <TrendingDown className="h-3 w-3" />
              Funil
            </TabsTrigger>
            <TabsTrigger value="attribution" className="gap-1.5 text-xs">
              <Link2 className="h-3 w-3" />
              Atribuição
            </TabsTrigger>
            <TabsTrigger value="pixels" className="gap-1.5 text-xs">
              <Zap className="h-3 w-3" />
              Eventos
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-1.5 text-xs">
              <TrendingUp className="h-3 w-3" />
              Histórico
            </TabsTrigger>
            <TabsTrigger value="scoring" className="gap-1.5 text-xs">
              <Activity className="h-3 w-3" />
              Lead Score
            </TabsTrigger>
            <TabsTrigger value="keywords" className="gap-1.5 text-xs">
              <Key className="h-3 w-3" />
              Keywords
            </TabsTrigger>
            <TabsTrigger value="budget" className="gap-1.5 text-xs">
              <DollarSign className="h-3 w-3" />
              Orçamento
            </TabsTrigger>
            <TabsTrigger value="heatmap" className="gap-1.5 text-xs">
              <Clock className="h-3 w-3" />
              Heatmap
            </TabsTrigger>
            <TabsTrigger value="audiences" className="gap-1.5 text-xs">
              <Users className="h-3 w-3" />
              Públicos
            </TabsTrigger>
            <TabsTrigger value="audience-ai" className="gap-1.5 text-xs">
              <Target className="h-3 w-3" />
              Público IA
            </TabsTrigger>
            <TabsTrigger value="prediction" className="gap-1.5 text-xs">
              <Sparkles className="h-3 w-3" />
              Previsão
            </TabsTrigger>
            <TabsTrigger value="ad-generator" className="gap-1.5 text-xs">
              <Wand2 className="h-3 w-3" />
              Gerador IA
            </TabsTrigger>
            <TabsTrigger value="ab-test" className="gap-1.5 text-xs">
              <FlaskConical className="h-3 w-3" />
              Teste A/B
            </TabsTrigger>
            <TabsTrigger value="agent" className="gap-1.5 text-xs">
              <Brain className="h-3 w-3" />
              Agente IA
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-1.5 text-xs">
              <AlertTriangle className="h-3 w-3" />
              Alertas
            </TabsTrigger>
            <TabsTrigger value="config-meta" className="gap-1.5 text-xs">
              <Settings className="h-3 w-3" />
              Meta
            </TabsTrigger>
            <TabsTrigger value="config-google" className="gap-1.5 text-xs">
              <Search className="h-3 w-3" />
              Google
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><MarketingOverview /></TabsContent>
          <TabsContent value="campaigns"><CampaignTable /></TabsContent>
          <TabsContent value="conversions"><ConversionsTracker /></TabsContent>
          <TabsContent value="funnel"><ConversionFunnelModule /></TabsContent>
          <TabsContent value="attribution"><AttributionPanel /></TabsContent>
          <TabsContent value="pixels"><PixelEventTracking /></TabsContent>
          <TabsContent value="performance"><AdPerformanceHistory /></TabsContent>
          <TabsContent value="scoring"><LeadScoringModule /></TabsContent>
          <TabsContent value="keywords"><KeywordAnalysis /></TabsContent>
          <TabsContent value="budget"><BudgetControl /></TabsContent>
          <TabsContent value="heatmap"><HeatmapModule /></TabsContent>
          <TabsContent value="audiences"><AudienceExport /></TabsContent>
          <TabsContent value="audience-ai"><AudienceSuggester /></TabsContent>
          <TabsContent value="prediction"><CampaignPrediction /></TabsContent>
          <TabsContent value="ad-generator"><AdCopyGenerator /></TabsContent>
          <TabsContent value="ab-test"><ABTestManager /></TabsContent>
          <TabsContent value="agent"><OptimizationAgent /></TabsContent>
          <TabsContent value="alerts"><MarketingAlerts /></TabsContent>
          <TabsContent value="config-meta"><MetaAdsConfig /></TabsContent>
          <TabsContent value="config-google"><GoogleAdsConfig /></TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Settings, Link2, Users, Brain, AlertTriangle, Megaphone } from 'lucide-react';
import MarketingOverview from '@/components/admin/marketing/MarketingOverview';
import MetaAdsConfig from '@/components/admin/marketing/MetaAdsConfig';
import CampaignTable from '@/components/admin/marketing/CampaignTable';
import AttributionPanel from '@/components/admin/marketing/AttributionPanel';
import AudienceExport from '@/components/admin/marketing/AudienceExport';
import AIOptimization from '@/components/admin/marketing/AIOptimization';
import MarketingAlerts from '@/components/admin/marketing/MarketingAlerts';

export default function MarketingIntelligence() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Marketing Intelligence</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Análise de campanhas, atribuição de leads e otimização de ROI
          </p>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="h-3.5 w-3.5" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-1.5 text-xs sm:text-sm">
              <Megaphone className="h-3.5 w-3.5" />
              Campanhas
            </TabsTrigger>
            <TabsTrigger value="attribution" className="gap-1.5 text-xs sm:text-sm">
              <Link2 className="h-3.5 w-3.5" />
              Atribuição
            </TabsTrigger>
            <TabsTrigger value="audiences" className="gap-1.5 text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5" />
              Públicos
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-1.5 text-xs sm:text-sm">
              <Brain className="h-3.5 w-3.5" />
              IA
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-1.5 text-xs sm:text-sm">
              <AlertTriangle className="h-3.5 w-3.5" />
              Alertas
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-1.5 text-xs sm:text-sm">
              <Settings className="h-3.5 w-3.5" />
              Configuração
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><MarketingOverview /></TabsContent>
          <TabsContent value="campaigns"><CampaignTable /></TabsContent>
          <TabsContent value="attribution"><AttributionPanel /></TabsContent>
          <TabsContent value="audiences"><AudienceExport /></TabsContent>
          <TabsContent value="ai"><AIOptimization /></TabsContent>
          <TabsContent value="alerts"><MarketingAlerts /></TabsContent>
          <TabsContent value="config"><MetaAdsConfig /></TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

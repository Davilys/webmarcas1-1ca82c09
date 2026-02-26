import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Send, Rocket, Filter, Eye, Users, Mail,
  Loader2, CheckCircle2, Clock, AlertCircle,
  ShoppingCart, Megaphone, RefreshCw, Flame
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Lead {
  id: string;
  full_name: string;
  email: string | null;
  status: string;
  origin: string | null;
  lead_temperature?: string | null;
  tags?: string[] | null;
  created_at: string;
}

interface Campaign {
  id: string;
  name: string;
  type: string;
  subject: string | null;
  status: string;
  total_sent: number;
  total_opened: number;
  sent_at: string | null;
  created_at: string;
}

interface LeadRemarketingPanelProps {
  leads: Lead[];
  onRefresh: () => void;
}

const CAMPAIGN_TYPES = [
  { value: 'abandono_carrinho', label: 'Abandono de Carrinho', icon: ShoppingCart, color: 'text-orange-500' },
  { value: 'promocao', label: 'Promoção', icon: Megaphone, color: 'text-violet-500' },
  { value: 'reengajamento', label: 'Reengajamento', icon: RefreshCw, color: 'text-blue-500' },
  { value: 'personalizado', label: 'Personalizado', icon: Mail, color: 'text-emerald-500' },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'novo', label: 'Novo' },
  { value: 'contato', label: 'Em Contato' },
  { value: 'qualificado', label: 'Qualificado' },
  { value: 'proposta', label: 'Proposta' },
  { value: 'negociacao', label: 'Negociação' },
  { value: 'perdido', label: 'Perdido' },
];

const TEMPLATE_VARS = ['{{nome}}', '{{email}}', '{{empresa}}'];

export function LeadRemarketingPanel({ leads, onRefresh }: LeadRemarketingPanelProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  // New campaign form
  const [campaignName, setCampaignName] = useState('');
  const [campaignType, setCampaignType] = useState('personalizado');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterTemp, setFilterTemp] = useState('all');
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => { fetchCampaigns(); }, []);

  const fetchCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const { data } = await supabase
        .from('lead_remarketing_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      setCampaigns((data as any[]) || []);
    } catch { /* ignore */ }
    finally { setLoadingCampaigns(false); }
  };

  const filteredLeads = leads.filter(l => {
    if (!l.email) return false;
    if (filterStatus.length > 0 && !filterStatus.includes(l.status)) return false;
    if (filterTemp !== 'all' && l.lead_temperature !== filterTemp) return false;
    return true;
  });

  const toggleStatusFilter = (status: string) => {
    setFilterStatus(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const handleSendCampaign = async () => {
    if (!campaignName || !subject || !body) {
      toast.error('Preencha todos os campos da campanha');
      return;
    }
    if (filteredLeads.length === 0) {
      toast.error('Nenhum lead com e-mail encontrado para os filtros selecionados');
      return;
    }

    setSending(true);
    try {
      // Create campaign record
      const { data: campaign, error: cErr } = await supabase
        .from('lead_remarketing_campaigns')
        .insert({
          name: campaignName,
          type: campaignType,
          subject,
          body,
          target_status: filterStatus,
          status: 'enviando',
          total_sent: 0,
        } as any)
        .select()
        .single();
      if (cErr) throw cErr;

      // Send via edge function
      const { error } = await supabase.functions.invoke('send-lead-remarketing', {
        body: {
          lead_ids: filteredLeads.map(l => l.id),
          campaign_id: (campaign as any).id,
          subject,
          body,
        },
      });
      if (error) throw error;

      toast.success(`Campanha enviada para ${filteredLeads.length} leads!`);
      setCampaignName('');
      setSubject('');
      setBody('');
      fetchCampaigns();
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar campanha');
    } finally {
      setSending(false);
    }
  };

  const previewBody = body
    .replace(/\{\{nome\}\}/g, 'João Silva')
    .replace(/\{\{email\}\}/g, 'joao@exemplo.com')
    .replace(/\{\{empresa\}\}/g, 'Empresa XYZ');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* LEFT: New Campaign */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-5 space-y-4"
      >
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-black text-foreground">Nova Campanha</h3>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Nome da Campanha</label>
            <Input
              value={campaignName}
              onChange={e => setCampaignName(e.target.value)}
              placeholder="Ex: Reengajamento Fevereiro"
              className="h-9 text-sm rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Tipo</label>
            <Select value={campaignType} onValueChange={setCampaignType}>
              <SelectTrigger className="h-9 text-sm rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CAMPAIGN_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Assunto do E-mail</label>
            <Input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Assunto..."
              className="h-9 text-sm rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Corpo da Mensagem
              <span className="ml-2 text-[10px] text-muted-foreground/60">
                Variáveis: {TEMPLATE_VARS.join(', ')}
              </span>
            </label>
            <Textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={5}
              placeholder="Olá {{nome}}, temos uma oferta especial..."
              className="text-sm rounded-xl resize-none"
            />
          </div>

          {/* Filters */}
          <div className="space-y-2 p-3 rounded-xl bg-muted/30 border border-border/30">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-bold text-muted-foreground">Filtros de Audiência</span>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-muted-foreground">Status:</label>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_FILTER_OPTIONS.map(s => (
                  <Badge
                    key={s.value}
                    variant={filterStatus.includes(s.value) ? 'default' : 'outline'}
                    className="cursor-pointer text-[10px]"
                    onClick={() => toggleStatusFilter(s.value)}
                  >
                    {s.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">Temperatura:</label>
              <Select value={filterTemp} onValueChange={setFilterTemp}>
                <SelectTrigger className="h-8 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="quente">🔥 Quente</SelectItem>
                  <SelectItem value="morno">🌡️ Morno</SelectItem>
                  <SelectItem value="frio">❄️ Frio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-bold text-primary">
                {filteredLeads.length} leads selecionados
              </span>
            </div>
          </div>

          {/* Preview toggle */}
          {body && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="w-full rounded-xl gap-2 text-xs"
            >
              <Eye className="h-3.5 w-3.5" />
              {showPreview ? 'Ocultar Preview' : 'Visualizar Preview'}
            </Button>
          )}

          {showPreview && body && (
            <div className="p-4 rounded-xl bg-background border border-border/50">
              <p className="text-xs font-bold text-muted-foreground mb-2">Preview:</p>
              <p className="text-xs font-semibold mb-1">{subject}</p>
              <div className="text-sm text-foreground whitespace-pre-wrap">{previewBody}</div>
            </div>
          )}

          <Button
            onClick={handleSendCampaign}
            disabled={sending || filteredLeads.length === 0}
            className="w-full rounded-xl gap-2 bg-gradient-to-r from-violet-600 to-purple-500 border-0"
          >
            {sending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
            ) : (
              <><Send className="h-4 w-4" /> Enviar para {filteredLeads.length} Leads</>
            )}
          </Button>
        </div>
      </motion.div>

      {/* RIGHT: Campaign History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-5 space-y-4"
      >
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-black text-foreground">Histórico de Campanhas</h3>
        </div>

        {loadingCampaigns ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Nenhuma campanha enviada ainda
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {campaigns.map(c => {
              const typeConfig = CAMPAIGN_TYPES.find(t => t.value === c.type);
              const TypeIcon = typeConfig?.icon || Mail;
              const statusIcon = c.status === 'enviada' ? CheckCircle2
                : c.status === 'enviando' ? Loader2 : AlertCircle;
              const statusColor = c.status === 'enviada' ? 'text-emerald-500'
                : c.status === 'enviando' ? 'text-amber-500' : 'text-muted-foreground';

              return (
                <div key={c.id} className="p-3 rounded-xl border border-border/30 bg-muted/20">
                  <div className="flex items-center gap-2 mb-2">
                    <TypeIcon className={cn('h-4 w-4', typeConfig?.color)} />
                    <span className="text-sm font-bold text-foreground truncate">{c.name}</span>
                    <span className={cn('ml-auto flex items-center gap-1 text-[10px] font-bold', statusColor)}>
                      {statusIcon === Loader2 ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3" />
                      )}
                      {c.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Send className="h-3 w-3" /> {c.total_sent} enviados
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {c.total_opened} abertos
                    </span>
                    <span className="ml-auto">
                      {format(new Date(c.created_at), 'dd/MM/yy', { locale: ptBR })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}

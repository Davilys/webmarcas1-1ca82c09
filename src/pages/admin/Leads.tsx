import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import {
  Search, Plus, RefreshCw, UserPlus, MoreHorizontal,
  UserCheck, Trash2, Edit, Filter, Upload,
  Target, TrendingUp, Zap, Star, ArrowUpRight,
  Phone, Mail, Building2, Calendar, ChevronRight,
  Tag, X, Loader2, Activity, CheckCircle2, AlertCircle,
  Sparkles, BarChart3, Globe, LayoutGrid, List, TrendingDown, Megaphone
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LeadImportExportDialog } from '@/components/admin/leads/LeadImportExportDialog';
import { LeadKanbanBoard } from '@/components/admin/leads/LeadKanbanBoard';
import { LeadSalesFunnel } from '@/components/admin/leads/LeadSalesFunnel';
import { LeadDetailSheet } from '@/components/admin/leads/LeadDetailSheet';
import { LeadRemarketingPanel } from '@/components/admin/leads/LeadRemarketingPanel';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────
interface Lead {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  cpf_cnpj: string | null;
  status: string;
  origin: string | null;
  estimated_value: number | null;
  notes: string | null;
  created_at: string;
  converted_at: string | null;
}

// ─── Config ───────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; glow: string; accent: string; icon: React.ElementType; order: number }> = {
  novo:        { label: 'Novo',            color: 'from-blue-500 to-cyan-400',      glow: '#3b82f6', accent: '#60a5fa', icon: Sparkles,    order: 0 },
  contato:     { label: 'Em Contato',      color: 'from-yellow-500 to-amber-400',   glow: '#eab308', accent: '#fbbf24', icon: Phone,       order: 1 },
  qualificado: { label: 'Qualificado',     color: 'from-violet-500 to-purple-400',  glow: '#8b5cf6', accent: '#a78bfa', icon: Star,        order: 2 },
  proposta:    { label: 'Proposta',        color: 'from-indigo-500 to-blue-400',    glow: '#6366f1', accent: '#818cf8', icon: Target,      order: 3 },
  negociacao:  { label: 'Negociação',      color: 'from-orange-500 to-amber-400',   glow: '#f97316', accent: '#fb923c', icon: Activity,    order: 4 },
  perdido:     { label: 'Perdido',         color: 'from-rose-500 to-red-400',       glow: '#f43f5e', accent: '#fb7185', icon: AlertCircle, order: 5 },
  convertido:  { label: 'Convertido',      color: 'from-emerald-500 to-green-400',  glow: '#10b981', accent: '#34d399', icon: CheckCircle2,order: 6 },
};

const ORIGIN_OPTIONS = [
  { value: 'site', label: 'Site', icon: Globe },
  { value: 'whatsapp', label: 'WhatsApp', icon: Phone },
  { value: 'indicacao', label: 'Indicação', icon: Star },
  { value: 'import', label: 'Importação', icon: Upload },
  { value: 'outro', label: 'Outro', icon: Tag },
];

// ─── Fixed particles ──────────────────────────────
const PARTICLES = Array.from({ length: 30 }).map((_, i) => ({
  id: i,
  x: (i * 37.3 + 11) % 100,
  y: (i * 53.7 + 7) % 100,
  size: 1 + (i % 5) * 0.35,
  dur: 8 + (i % 7),
  delay: (i * 0.33) % 6,
  op: 0.04 + (i % 4) * 0.02,
}));

// ─── Animated counter ─────────────────────────────
function AnimCount({ to, prefix = '' }: { to: number; prefix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (to === 0) { setVal(0); return; }
    let start = 0;
    const step = to / 50;
    const raf = () => {
      start = Math.min(start + step, to);
      setVal(start);
      if (start < to) requestAnimationFrame(raf);
    };
    const t = setTimeout(() => requestAnimationFrame(raf), 120);
    return () => clearTimeout(t);
  }, [to]);
  return <>{prefix}{Math.round(val).toLocaleString('pt-BR')}</>;
}

// ─── Status Badge ────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['novo'];
  const Icon = cfg.icon;
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider')}
      style={{
        background: `${cfg.glow}18`,
        border: `1px solid ${cfg.glow}35`,
        color: cfg.accent,
      }}
    >
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  );
}

// ─── KPI Card ────────────────────────────────────
function KpiCard({ title, value, prefix = '', icon: Icon, gradient, glow, accent, trend, index }: {
  title: string; value: number; prefix?: string;
  icon: React.ElementType; gradient: string; glow: string; accent: string;
  trend?: number; index: number;
}) {
  const isPos = (trend ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.93 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="group relative"
    >
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
        style={{ background: `radial-gradient(ellipse at center, ${glow}22 0%, transparent 70%)` }}
      />
      <div className="relative rounded-2xl overflow-hidden border bg-card/60 backdrop-blur-xl border-border/50 shadow-[0_4px_24px_hsl(var(--foreground)/0.05)]">
        <div className={cn('absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r', gradient)} />
        <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-10" style={{ background: glow }} />
        <div className="relative p-4">
          <div className="flex items-start justify-between mb-3">
            <motion.div
              className={cn('w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg', gradient)}
              whileHover={{ rotate: 12, scale: 1.15 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              <Icon className="h-5 w-5 text-white" />
            </motion.div>
            {trend !== undefined && (
              <span className={cn('text-[10px] font-bold flex items-center gap-0.5', isPos ? 'text-emerald-500' : 'text-rose-500')}>
                <ArrowUpRight className={cn('h-3 w-3', !isPos && 'rotate-90')} />
                {isPos && '+'}{trend}%
              </span>
            )}
          </div>
          <p className="text-2xl font-black tracking-tight text-foreground leading-none">
            <AnimCount to={value} prefix={prefix} />
          </p>
          <p className="text-[11px] font-medium text-muted-foreground mt-1">{title}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Pipeline funnel bar ──────────────────────────
function PipelineBar({ leads }: { leads: Lead[] }) {
  const total = leads.length || 1;
  const stages = Object.entries(STATUS_CONFIG)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([key, cfg]) => ({
      key, cfg,
      count: leads.filter(l => l.status === key).length,
    }))
    .filter(s => s.count > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.35 }}
      className="rounded-2xl border bg-card/60 backdrop-blur-xl border-border/50 p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="h-4 w-4 text-primary" />
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Pipeline de Leads</span>
        <span className="ml-auto text-[11px] text-muted-foreground">{leads.length} total</span>
      </div>

      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden gap-px mb-3">
        {stages.map(({ key, cfg, count }) => (
          <motion.div
            key={key}
            className={cn('h-full bg-gradient-to-r', cfg.color)}
            initial={{ flex: 0 }}
            animate={{ flex: count / total }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            title={`${cfg.label}: ${count}`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {stages.map(({ key, cfg, count }) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={cn('w-2 h-2 rounded-full bg-gradient-to-br', cfg.color)} />
            <span className="text-[10px] text-muted-foreground">{cfg.label}</span>
            <span className="text-[10px] font-bold text-foreground">{count}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Lead Row ────────────────────────────────────
function LeadRow({ lead, selected, onSelect, onEdit, onDelete, onConvert, index }: {
  lead: Lead; selected: boolean; index: number;
  onSelect: (id: string, checked: boolean) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (id: string) => void;
  onConvert: (lead: Lead) => void;
}) {
  const cfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG['novo'];

  return (
    <motion.tr
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: index * 0.03, ease: 'easeOut' }}
      className={cn(
        'group border-b border-border/30 transition-colors duration-150',
        selected ? 'bg-primary/5' : 'hover:bg-muted/30'
      )}
    >
      {/* Checkbox */}
      <td className="px-3 py-3 w-10">
        <Checkbox
          checked={selected}
          onCheckedChange={(c) => onSelect(lead.id, !!c)}
          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
      </td>

      {/* Name + avatar */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className={cn('w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0 bg-gradient-to-br', cfg.color)}
            style={{ boxShadow: `0 0 10px ${cfg.glow}30` }}
          >
            {lead.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{lead.full_name}</p>
            {lead.email && <p className="text-[11px] text-muted-foreground truncate">{lead.email}</p>}
          </div>
        </div>
      </td>

      {/* Phone */}
      <td className="px-3 py-3 hidden md:table-cell">
        {lead.phone ? (
          <span className="text-sm text-foreground/80 flex items-center gap-1.5">
            <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            {lead.phone}
          </span>
        ) : <span className="text-muted-foreground/40 text-sm">—</span>}
      </td>

      {/* Company */}
      <td className="px-3 py-3 hidden lg:table-cell">
        {lead.company_name ? (
          <span className="text-sm text-foreground/80 flex items-center gap-1.5">
            <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            {lead.company_name}
          </span>
        ) : <span className="text-muted-foreground/40 text-sm">—</span>}
      </td>

      {/* Status */}
      <td className="px-3 py-3">
        <StatusBadge status={lead.status} />
      </td>

      {/* Origin */}
      <td className="px-3 py-3 hidden xl:table-cell">
        <span className="text-[11px] font-medium text-muted-foreground px-2 py-0.5 rounded-full border border-border/50 bg-muted/40">
          {ORIGIN_OPTIONS.find(o => o.value === lead.origin)?.label || lead.origin || '—'}
        </span>
      </td>

      {/* Value */}
      <td className="px-3 py-3 hidden lg:table-cell">
        {lead.estimated_value ? (
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
            R$ {lead.estimated_value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
          </span>
        ) : <span className="text-muted-foreground/40 text-sm">—</span>}
      </td>

      {/* Date */}
      <td className="px-3 py-3 hidden xl:table-cell">
        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {format(new Date(lead.created_at), 'dd/MM/yy', { locale: ptBR })}
        </span>
      </td>

      {/* Actions */}
      <td className="px-3 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 border-border/50 bg-card/90 backdrop-blur-xl">
            <DropdownMenuItem onClick={() => onEdit(lead)} className="gap-2 text-sm cursor-pointer">
              <Edit className="h-3.5 w-3.5 text-primary" /> Editar
            </DropdownMenuItem>
            {lead.status !== 'convertido' && (
              <DropdownMenuItem onClick={() => onConvert(lead)} className="gap-2 text-sm cursor-pointer">
                <UserCheck className="h-3.5 w-3.5 text-emerald-500" /> Converter em Cliente
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onDelete(lead.id)} className="gap-2 text-sm cursor-pointer text-destructive focus:text-destructive">
              <Trash2 className="h-3.5 w-3.5" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </motion.tr>
  );
}

// ─── Bulk Action Bar ──────────────────────────────
function BulkBar({ selectedIds, leads, onClear, onComplete }: {
  selectedIds: string[]; leads: Lead[];
  onClear: () => void; onComplete: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const bulkStatus = async (status: string) => {
    setLoading(true);
    try {
      await supabase.from('leads').update({ status }).in('id', selectedIds);
      toast.success(`Status atualizado para ${selectedIds.length} leads`);
      onClear(); onComplete();
    } catch { toast.error('Erro ao atualizar'); }
    finally { setLoading(false); }
  };

  const bulkDelete = async () => {
    if (!confirm(`Excluir ${selectedIds.length} leads?`)) return;
    setLoading(true);
    try {
      await supabase.from('email_logs').delete().in('related_lead_id', selectedIds);
      await supabase.from('leads').delete().in('id', selectedIds);
      toast.success(`${selectedIds.length} leads excluídos`);
      onClear(); onComplete();
    } catch { toast.error('Erro ao excluir'); }
    finally { setLoading(false); }
  };

  if (selectedIds.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 60, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl border border-primary/25 bg-card/90 backdrop-blur-2xl shadow-[0_8px_40px_hsl(var(--primary)/0.2)]"
    >
      <div className="flex items-center gap-2 pr-3 border-r border-border/50">
        <span
          className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black text-white bg-gradient-to-br from-primary to-primary/70"
        >
          {selectedIds.length}
        </span>
        <span className="text-sm text-muted-foreground">selecionados</span>
        <button onClick={onClear} className="ml-1 text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <Select onValueChange={bulkStatus} disabled={loading}>
        <SelectTrigger className="h-8 text-xs border-border/50 bg-muted/40 w-[150px] rounded-xl">
          <Tag className="h-3 w-3 mr-1.5" />
          <SelectValue placeholder="Mudar status" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(STATUS_CONFIG).filter(([k]) => k !== 'convertido').map(([val, cfg]) => (
            <SelectItem key={val} value={val} className="text-xs">{cfg.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button size="sm" variant="destructive" onClick={bulkDelete} disabled={loading} className="h-8 rounded-xl text-xs gap-1.5">
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        Excluir
      </Button>
    </motion.div>
  );
}

// ─── Lead Form Dialog ────────────────────────────
function LeadFormDialog({ open, onOpenChange, editingLead, onSave }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  editingLead: Lead | null; onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    full_name: '', email: '', phone: '', company_name: '',
    cpf_cnpj: '', status: 'novo', origin: 'site', estimated_value: '', notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingLead) {
      setFormData({
        full_name: editingLead.full_name, email: editingLead.email || '',
        phone: editingLead.phone || '', company_name: editingLead.company_name || '',
        cpf_cnpj: editingLead.cpf_cnpj || '', status: editingLead.status,
        origin: editingLead.origin || 'site',
        estimated_value: editingLead.estimated_value?.toString() || '', notes: editingLead.notes || '',
      });
    } else {
      setFormData({ full_name: '', email: '', phone: '', company_name: '', cpf_cnpj: '', status: 'novo', origin: 'site', estimated_value: '', notes: '' });
    }
  }, [editingLead, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        full_name: formData.full_name, email: formData.email || null,
        phone: formData.phone || null, company_name: formData.company_name || null,
        cpf_cnpj: formData.cpf_cnpj || null, status: formData.status,
        origin: formData.origin,
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
        notes: formData.notes || null,
      };
      if (editingLead) {
        const { error } = await supabase.from('leads').update(payload).eq('id', editingLead.id);
        if (error) throw error;
        toast.success('Lead atualizado!');
      } else {
        const { error } = await supabase.from('leads').insert(payload);
        if (error) throw error;
        toast.success('Lead criado!');
      }
      onOpenChange(false);
      onSave();
    } catch { toast.error('Erro ao salvar lead'); }
    finally { setSaving(false); }
  };

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFormData(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-border/50 bg-card/95 backdrop-blur-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-black">
            <span className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-400 shadow-lg">
              {editingLead ? <Edit className="h-4 w-4 text-white" /> : <Plus className="h-4 w-4 text-white" />}
            </span>
            {editingLead ? 'Editar Lead' : 'Novo Lead'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'full_name', label: 'Nome Completo *', type: 'text', required: true },
              { id: 'email', label: 'E-mail', type: 'email', required: false },
              { id: 'phone', label: 'Telefone', type: 'text', required: false },
              { id: 'company_name', label: 'Empresa', type: 'text', required: false },
              { id: 'cpf_cnpj', label: 'CPF/CNPJ', type: 'text', required: false },
              { id: 'estimated_value', label: 'Valor Estimado (R$)', type: 'number', required: false },
            ].map(field => (
              <div key={field.id} className="space-y-1.5">
                <Label htmlFor={field.id} className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{field.label}</Label>
                <Input
                  id={field.id}
                  type={field.type}
                  value={(formData as any)[field.id]}
                  onChange={f(field.id)}
                  required={field.required}
                  className="h-9 text-sm border-border/50 bg-background/50 focus:border-primary/50 rounded-xl"
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</Label>
              <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v }))}>
                <SelectTrigger className="h-9 text-sm border-border/50 bg-background/50 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                    <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Origem</Label>
              <Select value={formData.origin} onValueChange={v => setFormData(p => ({ ...p, origin: v }))}>
                <SelectTrigger className="h-9 text-sm border-border/50 bg-background/50 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORIGIN_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={f('notes')}
              rows={3}
              className="text-sm border-border/50 bg-background/50 focus:border-primary/50 rounded-xl resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl border-border/50">
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="rounded-xl gap-2 bg-gradient-to-r from-violet-600 to-purple-500 hover:from-violet-700 hover:to-purple-600 border-0">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingLead ? 'Salvar Alterações' : 'Criar Lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────
export default function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importExportOpen, setImportExportOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [activeTab, setActiveTab] = useState('lista');
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => { fetchLeads(); }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setLeads((data as any[]) || []);
    } catch { toast.error('Erro ao carregar leads'); }
    finally { setLoading(false); }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLeads();
    setRefreshing(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este lead?')) return;
    try {
      await supabase.from('email_logs').delete().eq('related_lead_id', id);
      const { data, error } = await supabase.from('leads').delete().eq('id', id).select('id');
      if (error) throw error;
      if (!data?.length) { toast.error('Não foi possível excluir. Verifique permissões.'); return; }
      toast.success('Lead excluído');
      fetchLeads();
    } catch (e: any) { toast.error(e.message || 'Erro ao excluir'); }
  };

  const handleConvert = async (lead: Lead) => {
    try {
      const { data: profile, error: pErr } = await supabase.from('profiles').insert({
        id: crypto.randomUUID(), email: lead.email || `lead_${lead.id}@temp.com`,
        full_name: lead.full_name, phone: lead.phone,
        company_name: lead.company_name, cpf_cnpj: lead.cpf_cnpj,
        origin: lead.origin, contract_value: lead.estimated_value,
      }).select().single();
      if (pErr) throw pErr;
      await supabase.from('leads').update({ status: 'convertido', converted_at: new Date().toISOString(), converted_to_client_id: profile.id }).eq('id', lead.id);
      toast.success('Lead convertido em cliente!');
      fetchLeads();
    } catch { toast.error('Erro ao converter lead'); }
  };

  const filteredLeads = useMemo(() => leads.filter(lead => {
    const q = search.toLowerCase();
    const matchQ = !q || lead.full_name?.toLowerCase().includes(q) || lead.email?.toLowerCase().includes(q) || lead.company_name?.toLowerCase().includes(q) || lead.phone?.includes(q);
    const matchS = statusFilter === 'all' || lead.status === statusFilter;
    return matchQ && matchS;
  }), [leads, search, statusFilter]);

  // KPI data
  const kpis = [
    { title: 'Total de Leads', value: leads.length, icon: Target, gradient: 'from-blue-500 to-cyan-400', glow: '#3b82f6', accent: '#60a5fa', index: 0 },
    { title: 'Leads Novos', value: leads.filter(l => l.status === 'novo').length, icon: Sparkles, gradient: 'from-violet-500 to-purple-400', glow: '#8b5cf6', accent: '#a78bfa', index: 1 },
    { title: 'Em Negociação', value: leads.filter(l => l.status === 'negociacao').length, icon: Activity, gradient: 'from-orange-500 to-amber-400', glow: '#f97316', accent: '#fb923c', index: 2 },
    { title: 'Convertidos', value: leads.filter(l => l.status === 'convertido').length, icon: CheckCircle2, gradient: 'from-emerald-500 to-green-400', glow: '#10b981', accent: '#34d399', index: 3 },
    {
      title: 'Receita Potencial', value: Math.round(leads.reduce((s, l) => s + (l.estimated_value || 0), 0)),
      prefix: 'R$ ', icon: TrendingUp, gradient: 'from-emerald-600 to-teal-400', glow: '#059669', accent: '#10b981', index: 4
    },
    {
      title: 'Taxa de Conversão', value: leads.length > 0 ? Math.round((leads.filter(l => l.status === 'convertido').length / leads.length) * 100) : 0,
      icon: Zap, gradient: 'from-rose-500 to-pink-400', glow: '#f43f5e', accent: '#fb7185', index: 5
    },
  ];

  return (
    <AdminLayout>
      {/* Outer HUD wrapper */}
      <div className="relative rounded-2xl overflow-hidden bg-background">
        {/* Subtle particle field */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {PARTICLES.map(p => (
            <motion.div
              key={p.id}
              className="absolute rounded-full"
              style={{
                left: `${p.x}%`, top: `${p.y}%`,
                width: p.size, height: p.size,
                background: `radial-gradient(circle, hsl(var(--primary) / ${p.op}) 0%, transparent 100%)`,
              }}
              animate={{ y: [0, -18, 0], opacity: [p.op, p.op * 2.5, p.op] }}
              transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
          {/* Scan line */}
          <motion.div
            className="absolute left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary)/0.2), transparent)' }}
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        <div className="relative z-10 space-y-5">

          {/* ── HERO HEADER ─────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-2xl overflow-hidden border border-primary/15 bg-card/60 backdrop-blur-xl"
            style={{ boxShadow: '0 0 50px hsl(var(--primary)/0.05), inset 0 1px 0 hsl(var(--background)/0.8)' }}
          >
            {/* Corner HUD lines */}
            <div className="absolute top-0 left-0 w-12 h-12 border-l-2 border-t-2 border-primary/20 rounded-tl-2xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-12 h-12 border-r-2 border-b-2 border-primary/20 rounded-br-2xl pointer-events-none" />
            <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full blur-3xl bg-violet-500/10 pointer-events-none" />

            <div className="relative p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Left */}
              <div className="flex items-center gap-4">
                <motion.div
                  className="relative w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-400 shadow-[0_0_24px_rgba(139,92,246,0.35)] flex-shrink-0"
                  animate={{ boxShadow: ['0 0 20px rgba(139,92,246,0.3)', '0 0 36px rgba(139,92,246,0.5)', '0 0 20px rgba(139,92,246,0.3)'] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <UserPlus className="h-7 w-7 text-white" />
                  <motion.div
                    className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-background"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </motion.div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">Leads</h1>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/15 border border-primary/25 text-primary uppercase tracking-widest">
                      Pipeline
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Gerencie e converta leads em clientes ·{' '}
                    <span className="text-primary font-semibold">{filteredLeads.length}</span> exibindo
                  </p>
                </div>
              </div>

              {/* Right — actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRefresh}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/50 bg-muted/40 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
                  Atualizar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setImportExportOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/50 bg-muted/40 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Importar/Exportar</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setEditingLead(null); setDialogOpen(true); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-purple-500 shadow-[0_4px_16px_rgba(139,92,246,0.35)] hover:shadow-[0_6px_24px_rgba(139,92,246,0.5)] transition-shadow"
                >
                  <Plus className="h-4 w-4" />
                  Novo Lead
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* ── KPI CARDS ─────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {kpis.map(kpi => <KpiCard key={kpi.title} {...kpi} />)}
          </div>

          {/* ── PIPELINE BAR ─────────────────── */}
          <PipelineBar leads={leads} />

          {/* ── TABS ─────────────────────────── */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-4 h-11 rounded-xl bg-muted/40 border border-border/30">
              <TabsTrigger value="lista" className="gap-1.5 text-xs font-bold rounded-lg">
                <List className="h-3.5 w-3.5" /> Lista
              </TabsTrigger>
              <TabsTrigger value="kanban" className="gap-1.5 text-xs font-bold rounded-lg">
                <LayoutGrid className="h-3.5 w-3.5" /> Kanban
              </TabsTrigger>
              <TabsTrigger value="funil" className="gap-1.5 text-xs font-bold rounded-lg">
                <TrendingDown className="h-3.5 w-3.5" /> Funil
              </TabsTrigger>
              <TabsTrigger value="remarketing" className="gap-1.5 text-xs font-bold rounded-lg">
                <Megaphone className="h-3.5 w-3.5" /> Remarketing
              </TabsTrigger>
            </TabsList>

            {/* ── TAB: LISTA ── */}
            <TabsContent value="lista" className="space-y-4 mt-4">
              {/* Search + Filter */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, email, empresa ou telefone..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-10 h-10 border-border/50 bg-card/60 backdrop-blur-sm rounded-xl focus:border-primary/50 text-sm"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48 h-10 border-border/50 bg-card/60 backdrop-blur-sm rounded-xl text-sm">
                    <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Filtrar status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                      <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border/40 bg-muted/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Leads</span>
                    <span className="text-[11px] text-muted-foreground/60">
                      · {filteredLeads.length} {filteredLeads.length !== leads.length && `de ${leads.length}`}
                    </span>
                  </div>
                  {selectedIds.length > 0 && (
                    <span className="text-[11px] font-semibold text-primary">{selectedIds.length} selecionados</span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30 bg-muted/10">
                        <th className="px-3 py-2.5 w-10">
                          <Checkbox
                            checked={selectedIds.length === filteredLeads.length && filteredLeads.length > 0}
                            onCheckedChange={c => {
                              if (c) setSelectedIds(filteredLeads.map(l => l.id));
                              else setSelectedIds([]);
                            }}
                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                        </th>
                        {['Nome / Email', 'Telefone', 'Empresa', 'Status', 'Origem', 'Valor', 'Data', ''].map(h => (
                          <th key={h} className={cn(
                            'px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground',
                            h === 'Telefone' && 'hidden md:table-cell',
                            h === 'Empresa' && 'hidden lg:table-cell',
                            h === 'Origem' && 'hidden xl:table-cell',
                            h === 'Valor' && 'hidden lg:table-cell',
                            h === 'Data' && 'hidden xl:table-cell',
                          )}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i} className="border-b border-border/20">
                            <td colSpan={9} className="px-3 py-3">
                              <div className="h-4 rounded-lg bg-muted/60 animate-pulse" style={{ width: `${60 + (i * 7) % 30}%` }} />
                            </td>
                          </tr>
                        ))
                      ) : filteredLeads.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-20 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-muted/40 border border-border/40">
                                <Target className="h-8 w-8 text-muted-foreground/40" />
                              </div>
                              <p className="text-muted-foreground text-sm font-medium">
                                {search || statusFilter !== 'all' ? 'Nenhum lead encontrado' : 'Nenhum lead cadastrado ainda'}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <AnimatePresence>
                          {filteredLeads.map((lead, i) => (
                            <LeadRow
                              key={lead.id}
                              lead={lead}
                              index={i}
                              selected={selectedIds.includes(lead.id)}
                              onSelect={(id, c) => {
                                if (c) setSelectedIds(p => [...p, id]);
                                else setSelectedIds(p => p.filter(x => x !== id));
                              }}
                              onEdit={lead => { setDetailLead(lead); setDetailOpen(true); }}
                              onDelete={handleDelete}
                              onConvert={handleConvert}
                            />
                          ))}
                        </AnimatePresence>
                      )}
                    </tbody>
                  </table>
                </div>

                {!loading && filteredLeads.length > 0 && (
                  <div className="px-4 py-2.5 border-t border-border/30 bg-muted/10 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Mostrando {filteredLeads.length} leads</span>
                    <div className="flex items-center gap-1.5">
                      <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[10px] text-muted-foreground font-mono">Dados em tempo real</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {Object.entries(STATUS_CONFIG).map(([key, cfg], i) => {
                  const count = leads.filter(l => l.status === key).length;
                  const Icon = cfg.icon;
                  return (
                    <motion.button
                      key={key}
                      whileHover={{ y: -3 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
                      className={cn(
                        'relative flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all duration-200 text-center',
                        statusFilter === key ? 'border-primary/40 bg-card/80 shadow-lg' : 'border-border/40 bg-card/40 hover:bg-card/60'
                      )}
                    >
                      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br', cfg.color)}>
                        <Icon className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className="text-base font-black text-foreground leading-none">
                        <AnimCount to={count} />
                      </span>
                      <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide leading-tight">
                        {cfg.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </TabsContent>

            {/* ── TAB: KANBAN ── */}
            <TabsContent value="kanban" className="mt-4">
              <LeadKanbanBoard
                leads={leads as any}
                onRefresh={fetchLeads}
                onLeadClick={(lead) => { setDetailLead(lead as any); setDetailOpen(true); }}
              />
            </TabsContent>

            {/* ── TAB: FUNIL ── */}
            <TabsContent value="funil" className="mt-4">
              <LeadSalesFunnel leads={leads} />
            </TabsContent>

            {/* ── TAB: REMARKETING ── */}
            <TabsContent value="remarketing" className="mt-4">
              <LeadRemarketingPanel leads={leads as any} onRefresh={fetchLeads} />
            </TabsContent>
          </Tabs>

        </div>
      </div>

      {/* Dialogs */}
      <LeadFormDialog
        open={dialogOpen}
        onOpenChange={open => { setDialogOpen(open); if (!open) setEditingLead(null); }}
        editingLead={editingLead}
        onSave={fetchLeads}
      />

      <LeadImportExportDialog
        open={importExportOpen}
        onOpenChange={setImportExportOpen}
        leads={leads}
        onImportComplete={fetchLeads}
      />

      <LeadDetailSheet
        lead={detailLead}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onRefresh={fetchLeads}
      />

      <AnimatePresence>
        <BulkBar
          selectedIds={selectedIds}
          leads={leads}
          onClear={() => setSelectedIds([])}
          onComplete={fetchLeads}
        />
      </AnimatePresence>
    </AdminLayout>
  );
}

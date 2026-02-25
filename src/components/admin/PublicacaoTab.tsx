import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, differenceInDays, addDays, addYears, isAfter, isBefore, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Newspaper, Search, Filter, Download, Plus, ChevronRight, Clock, AlertTriangle,
  CheckCircle2, Circle, Calendar, Edit3, MessageSquare, Bell, Upload, X,
  FileText, Eye, ArrowRight, RotateCcw, Shield, Gavel, Award, RefreshCw,
  ExternalLink, Trash2, Users, Zap, BellRing, Hash, Paperclip,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { StatsCard } from '@/components/admin/dashboard/StatsCard';

// ─── Types ───────────────────────────────────────────────────────────────────
type PubStatus = 'depositada' | 'publicada' | 'oposicao' | 'deferida' | 'indeferida' | 'arquivada' | 'renovacao_pendente';
type PubTipo = 'publicacao_rpi' | 'decisao' | 'certificado' | 'renovacao';
type PrazoFilter = 'todos' | 'hoje' | '7dias' | '30dias' | 'atrasados';

interface Publicacao {
  id: string;
  process_id: string;
  client_id: string;
  admin_id: string | null;
  status: PubStatus;
  tipo_publicacao: PubTipo;
  data_deposito: string | null;
  data_publicacao_rpi: string | null;
  prazo_oposicao: string | null;
  data_decisao: string | null;
  data_certificado: string | null;
  data_renovacao: string | null;
  proximo_prazo_critico: string | null;
  descricao_prazo: string | null;
  oposicao_protocolada: boolean;
  oposicao_data: string | null;
  comentarios_internos: string | null;
  documento_rpi_url: string | null;
  rpi_number: string | null;
  rpi_link: string | null;
  created_at: string;
  updated_at: string;
}

interface LogEntry {
  id: string;
  admin_email: string | null;
  campo_alterado: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  created_at: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<PubStatus, { label: string; color: string; bg: string }> = {
  depositada: { label: 'Depositada', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/40' },
  publicada: { label: 'Publicada', color: 'text-cyan-700 dark:text-cyan-400', bg: 'bg-cyan-100 dark:bg-cyan-900/40' },
  oposicao: { label: 'Oposição', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/40' },
  deferida: { label: 'Deferida', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
  indeferida: { label: 'Indeferida', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/40' },
  arquivada: { label: 'Arquivada', color: 'text-zinc-700 dark:text-zinc-400', bg: 'bg-zinc-100 dark:bg-zinc-900/40' },
  renovacao_pendente: { label: 'Renovação Pendente', color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/40' },
};

const TIPO_CONFIG: Record<PubTipo, string> = {
  publicacao_rpi: 'Publicação RPI',
  decisao: 'Decisão',
  certificado: 'Certificado',
  renovacao: 'Renovação',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getDaysLeft(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return differenceInDays(parseISO(dateStr), new Date());
}

function getUrgencyBadge(days: number | null) {
  if (days === null) return { label: '—', variant: 'outline' as const, className: '' };
  if (days < 0) return { label: `${Math.abs(days)}d atrasado`, variant: 'destructive' as const, className: 'animate-pulse' };
  if (days === 0) return { label: 'Vence hoje', variant: 'destructive' as const, className: '' };
  if (days <= 7) return { label: `${days}d restantes`, variant: 'destructive' as const, className: '' };
  if (days <= 30) return { label: `${days}d restantes`, variant: 'secondary' as const, className: 'border-amber-500/50 text-amber-700 dark:text-amber-400' };
  return { label: `${days}d restantes`, variant: 'outline' as const, className: 'text-emerald-700 dark:text-emerald-400' };
}

function calcAutoFields(pub: Partial<Publicacao>): Partial<Publicacao> {
  const out = { ...pub };
  if (out.data_publicacao_rpi) {
    out.prazo_oposicao = format(addDays(parseISO(out.data_publicacao_rpi), 60), 'yyyy-MM-dd');
  }
  if (out.data_certificado) {
    out.data_renovacao = format(addYears(parseISO(out.data_certificado), 10), 'yyyy-MM-dd');
  }
  const futureDates = [out.prazo_oposicao, out.data_renovacao, out.proximo_prazo_critico]
    .filter(Boolean)
    .map(d => parseISO(d!))
    .filter(d => isAfter(d, new Date()));
  if (futureDates.length > 0) {
    futureDates.sort((a, b) => a.getTime() - b.getTime());
    out.proximo_prazo_critico = format(futureDates[0], 'yyyy-MM-dd');
  }
  return out;
}

function getScheduledAlerts(prazoCritico: string | null): { label: string; date: Date; days: number }[] {
  if (!prazoCritico) return [];
  const prazoDate = parseISO(prazoCritico);
  return [30, 15, 7].map(d => {
    const alertDate = subDays(prazoDate, d);
    return { label: `${d} dias antes`, date: alertDate, days: differenceInDays(alertDate, new Date()) };
  }).filter(a => a.days >= 0);
}

// ─── Timeline step component ────────────────────────────────────────────────
const TIMELINE_STEPS = [
  { key: 'data_deposito', label: 'Depósito', icon: FileText, description: 'Pedido protocolado no INPI' },
  { key: 'data_publicacao_rpi', label: 'Publicação RPI', icon: Newspaper, description: 'Publicado na Revista da PI' },
  { key: 'prazo_oposicao', label: 'Prazo Oposição (60d)', icon: Gavel, description: 'Período para manifestações' },
  { key: 'data_decisao', label: 'Decisão', icon: Shield, description: 'Deferimento ou indeferimento' },
  { key: 'data_certificado', label: 'Certificado', icon: Award, description: 'Emissão do certificado' },
  { key: 'data_renovacao', label: 'Renovação (10 anos)', icon: RefreshCw, description: 'Prazo para renovação' },
] as const;

function TimelineStep({ step, date, isCompleted, isOverdue }: {
  step: typeof TIMELINE_STEPS[number];
  date: string | null;
  isCompleted: boolean;
  isOverdue: boolean;
}) {
  const Icon = step.icon;
  return (
    <div className="flex gap-3 relative">
      <div className="flex flex-col items-center">
        <div className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all',
          isCompleted ? 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-500 text-emerald-600 dark:text-emerald-400'
            : isOverdue ? 'bg-red-100 dark:bg-red-900/40 border-red-500 text-red-600 dark:text-red-400 animate-pulse'
            : 'bg-muted border-border text-muted-foreground'
        )}>
          {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
        </div>
        <div className="w-0.5 flex-1 bg-border min-h-[24px]" />
      </div>
      <div className="pb-6 flex-1">
        <p className={cn('text-sm font-semibold', isCompleted ? 'text-foreground' : 'text-muted-foreground')}>
          {step.label}
        </p>
        <p className="text-xs text-muted-foreground">{step.description}</p>
        {date && (
          <p className={cn('text-xs mt-1 font-medium', isOverdue ? 'text-red-600 dark:text-red-400' : 'text-primary')}>
            {format(parseISO(date), "dd/MM/yyyy", { locale: ptBR })}
            {!isCompleted && getDaysLeft(date) !== null && (
              <span className="ml-1 text-muted-foreground">
                ({getDaysLeft(date)! < 0 ? `${Math.abs(getDaysLeft(date)!)}d atrasado` : `em ${getDaysLeft(date)}d`})
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function PublicacaoTab() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterPrazo, setFilterPrazo] = useState<string>('todos');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editData, setEditData] = useState<Partial<Publicacao>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Create dialog state ────
  const [createProcessId, setCreateProcessId] = useState('');
  const [createDataDeposito, setCreateDataDeposito] = useState('');
  const [createDataPubRpi, setCreateDataPubRpi] = useState('');
  const [createTipo, setCreateTipo] = useState<PubTipo>('publicacao_rpi');
  const [createAdminId, setCreateAdminId] = useState('');

  // ─── Queries ────
  const { data: publicacoes = [], isLoading } = useQuery({
    queryKey: ['publicacoes-marcas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('publicacoes_marcas').select('*').order('proximo_prazo_critico', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data || []) as Publicacao[];
    },
  });

  const { data: processes = [] } = useQuery({
    queryKey: ['brand-processes-pub'],
    queryFn: async () => {
      const { data, error } = await supabase.from('brand_processes').select('id, brand_name, process_number, user_id, deposit_date, ncl_classes');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['profiles-pub'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, email');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: admins = [] } = useQuery({
    queryKey: ['admin-profiles-pub'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
      if (error) return [];
      const adminIds = (data || []).map(r => r.user_id);
      if (adminIds.length === 0) return [];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', adminIds);
      return profiles || [];
    },
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['publicacao-logs', selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const { data, error } = await supabase.from('publicacao_logs').select('*').eq('publicacao_id', selectedId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as LogEntry[];
    },
    enabled: !!selectedId,
  });

  // Fetch rpi_entries with matched_process_id for auto-populate (#8)
  const { data: rpiEntries = [] } = useQuery({
    queryKey: ['rpi-entries-matched'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rpi_entries')
        .select('id, matched_process_id, matched_client_id, publication_date, dispatch_code, dispatch_text, process_number, brand_name')
        .not('matched_process_id', 'is', null);
      if (error) return [];
      return data || [];
    },
  });

  const currentUserQuery = useQuery({
    queryKey: ['current-user-pub'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    staleTime: 60000,
  });

  // ─── Mutations ────
  const createMutation = useMutation({
    mutationFn: async (data: Partial<Publicacao>) => {
      const computed = calcAutoFields(data);
      const { error } = await supabase.from('publicacoes_marcas').insert(computed as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publicacoes-marcas'] });
      toast.success('Publicação criada com sucesso');
      setShowCreate(false);
      resetCreateForm();
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao criar'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, changes, original }: { id: string; changes: Partial<Publicacao>; original: Publicacao }) => {
      const computed = calcAutoFields(changes);
      const { error } = await supabase.from('publicacoes_marcas').update(computed as any).eq('id', id);
      if (error) throw error;
      const user = currentUserQuery.data;
      const logEntries = Object.entries(computed)
        .filter(([k, v]) => (original as any)[k] !== v && !['updated_at', 'created_at'].includes(k))
        .map(([k, v]) => ({
          publicacao_id: id,
          admin_id: user?.id,
          admin_email: user?.email,
          campo_alterado: k,
          valor_anterior: String((original as any)[k] ?? ''),
          valor_novo: String(v ?? ''),
        }));
      if (logEntries.length > 0) {
        await supabase.from('publicacao_logs').insert(logEntries);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publicacoes-marcas'] });
      queryClient.invalidateQueries({ queryKey: ['publicacao-logs'] });
      toast.success('Publicação atualizada');
      setShowEdit(false);
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao atualizar'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete logs first
      await supabase.from('publicacao_logs').delete().eq('publicacao_id', id);
      const { error } = await supabase.from('publicacoes_marcas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publicacoes-marcas'] });
      toast.success('Publicação excluída');
      setSelectedId(null);
      setShowDelete(false);
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao excluir'),
  });

  // ─── Maps ────
  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
  const processMap = useMemo(() => new Map(processes.map(p => [p.id, p])), [processes]);
  const adminMap = useMemo(() => new Map(admins.map(a => [a.id, a])), [admins]);

  // ─── KPI Stats (#1) ────
  const kpiStats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const total = publicacoes.length;
    const urgentes = publicacoes.filter(p => {
      const d = getDaysLeft(p.proximo_prazo_critico);
      return d !== null && d >= 0 && d <= 7;
    }).length;
    const atrasados = publicacoes.filter(p => {
      const d = getDaysLeft(p.proximo_prazo_critico);
      return d !== null && d < 0;
    }).length;
    const deferidosMes = publicacoes.filter(p =>
      p.status === 'deferida' && p.data_decisao && isAfter(parseISO(p.data_decisao), startOfMonth)
    ).length;
    return { total, urgentes, atrasados, deferidosMes };
  }, [publicacoes]);

  // ─── Status counts for sidebar (#13) ────
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    publicacoes.forEach(p => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return counts;
  }, [publicacoes]);

  // ─── Filtering ────
  const filtered = useMemo(() => {
    return publicacoes.filter(pub => {
      const proc = processMap.get(pub.process_id);
      const client = clientMap.get(pub.client_id);
      if (search) {
        const q = search.toLowerCase();
        const matchName = proc?.brand_name?.toLowerCase().includes(q);
        const matchProc = proc?.process_number?.toLowerCase().includes(q);
        const matchClient = client?.full_name?.toLowerCase().includes(q);
        if (!matchName && !matchProc && !matchClient) return false;
      }
      if (filterClient !== 'todos' && pub.client_id !== filterClient) return false;
      if (filterStatus !== 'todos' && pub.status !== filterStatus) return false;
      if (filterTipo !== 'todos' && pub.tipo_publicacao !== filterTipo) return false;
      if (filterPrazo !== 'todos') {
        const days = getDaysLeft(pub.proximo_prazo_critico);
        if (days === null) return filterPrazo === 'todos';
        if (filterPrazo === 'hoje' && days !== 0) return false;
        if (filterPrazo === '7dias' && (days < 0 || days > 7)) return false;
        if (filterPrazo === '30dias' && (days < 0 || days > 30)) return false;
        if (filterPrazo === 'atrasados' && days >= 0) return false;
      }
      return true;
    });
  }, [publicacoes, search, filterClient, filterStatus, filterPrazo, filterTipo, processMap, clientMap]);

  const selected = useMemo(() => publicacoes.find(p => p.id === selectedId) || null, [publicacoes, selectedId]);

  // ─── Alert toast on mount (#existing) ────
  useEffect(() => {
    const urgentes = publicacoes.filter(p => {
      const d = getDaysLeft(p.proximo_prazo_critico);
      return d !== null && d >= 0 && d <= 7;
    });
    if (urgentes.length > 0) {
      toast.warning(`⚠️ ${urgentes.length} processo(s) com prazo crítico nos próximos 7 dias!`, { duration: 6000 });
    }
  }, [publicacoes.length]);

  // ─── CSV Export ────
  const exportCSV = useCallback(() => {
    const rows = filtered.map(pub => {
      const proc = processMap.get(pub.process_id);
      const client = clientMap.get(pub.client_id);
      const admin = pub.admin_id ? adminMap.get(pub.admin_id) : null;
      return {
        Cliente: client?.full_name || '',
        Marca: proc?.brand_name || '',
        'N. Processo': proc?.process_number || '',
        Responsável: admin?.full_name || '',
        Status: STATUS_CONFIG[pub.status as PubStatus]?.label || pub.status,
        'Data Depósito': pub.data_deposito || '',
        'Data Publicação RPI': pub.data_publicacao_rpi || '',
        'Prazo Oposição': pub.prazo_oposicao || '',
        'Data Decisão': pub.data_decisao || '',
        'Data Certificado': pub.data_certificado || '',
        'Data Renovação': pub.data_renovacao || '',
        'Próximo Prazo': pub.proximo_prazo_critico || '',
      };
    });
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${(r as any)[h]}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `publicacoes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado');
  }, [filtered, processMap, clientMap, adminMap]);

  // ─── Create helpers ────
  const linkedProcessIds = useMemo(() => new Set(publicacoes.map(p => p.process_id)), [publicacoes]);

  const resetCreateForm = () => {
    setCreateProcessId('');
    setCreateDataDeposito('');
    setCreateDataPubRpi('');
    setCreateTipo('publicacao_rpi');
    setCreateAdminId('');
  };

  // Pre-fill deposit date when process is selected (#6)
  useEffect(() => {
    if (createProcessId) {
      const proc = processMap.get(createProcessId);
      if (proc?.deposit_date) setCreateDataDeposito(proc.deposit_date);
    }
  }, [createProcessId, processMap]);

  const handleCreate = () => {
    const proc = processMap.get(createProcessId);
    if (!proc) { toast.error('Selecione um processo'); return; }
    createMutation.mutate({
      process_id: createProcessId,
      client_id: proc.user_id!,
      admin_id: createAdminId || currentUserQuery.data?.id || null,
      status: 'depositada',
      tipo_publicacao: createTipo,
      data_deposito: createDataDeposito || proc.deposit_date || null,
      data_publicacao_rpi: createDataPubRpi || null,
    });
  };

  // ─── Real notification insert (#2 + #9) ────
  const handleGenerateReminder = async (pub: Publicacao) => {
    const proc = processMap.get(pub.process_id);
    const brandName = proc?.brand_name || 'Marca';
    const prazoStr = pub.proximo_prazo_critico ? format(parseISO(pub.proximo_prazo_critico), 'dd/MM/yyyy') : 'N/A';
    const user = currentUserQuery.data;

    const notifications: any[] = [];

    // Notification for admin
    if (user?.id) {
      notifications.push({
        user_id: user.id,
        title: `🔔 Prazo crítico: ${brandName}`,
        message: `O processo "${brandName}" tem prazo crítico em ${prazoStr}. Verifique a aba Publicações.`,
        type: 'warning',
        link: '/admin/revista-inpi',
      });
    }

    // Notification for client
    if (pub.client_id) {
      notifications.push({
        user_id: pub.client_id,
        title: `📋 Atualização do processo: ${brandName}`,
        message: `Seu processo "${brandName}" possui um prazo importante em ${prazoStr}.`,
        type: 'info',
        link: '/cliente/processos',
      });
    }

    // Scheduled alerts: 30d, 15d, 7d before (#9)
    const alerts = getScheduledAlerts(pub.proximo_prazo_critico);
    alerts.forEach(alert => {
      if (user?.id) {
        notifications.push({
          user_id: user.id,
          title: `⏰ Alerta ${alert.label}: ${brandName}`,
          message: `O prazo de "${brandName}" vence em ${prazoStr}. Alerta programado para ${format(alert.date, 'dd/MM/yyyy')}.`,
          type: 'warning',
          link: '/admin/revista-inpi',
        });
      }
    });

    if (notifications.length > 0) {
      const { error } = await supabase.from('notifications').insert(notifications);
      if (error) {
        toast.error('Erro ao gerar lembrete');
        return;
      }
    }
    toast.success(`🔔 ${notifications.length} lembrete(s) gerado(s) para "${brandName}"`);
  };

  // ─── Upload document (#3) ────
  const handleUploadDocument = async (file: File) => {
    if (!selected) return;
    const ext = file.name.split('.').pop();
    const path = `publicacoes/${selected.id}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage.from('documents').upload(path, file);
    if (uploadErr) { toast.error('Erro no upload'); return; }

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    const { error: updateErr } = await supabase
      .from('publicacoes_marcas')
      .update({ documento_rpi_url: publicUrl } as any)
      .eq('id', selected.id);
    if (updateErr) { toast.error('Erro ao vincular documento'); return; }

    queryClient.invalidateQueries({ queryKey: ['publicacoes-marcas'] });
    toast.success('Documento RPI enviado');
  };

  // ─── Auto-populate from RPI entry (#8) ────
  const handleAutoPopulateFromRPI = (entry: any) => {
    if (linkedProcessIds.has(entry.matched_process_id)) {
      toast.error('Este processo já possui uma publicação vinculada');
      return;
    }
    const proc = processMap.get(entry.matched_process_id);
    if (!proc) return;

    createMutation.mutate({
      process_id: entry.matched_process_id,
      client_id: entry.matched_client_id || proc.user_id!,
      admin_id: currentUserQuery.data?.id || null,
      status: 'publicada',
      tipo_publicacao: 'publicacao_rpi',
      data_deposito: proc.deposit_date || null,
      data_publicacao_rpi: entry.publication_date || null,
      rpi_number: entry.dispatch_code || null,
      descricao_prazo: entry.dispatch_text || null,
    });
  };

  // Available RPI entries that can auto-populate
  const availableRpiEntries = useMemo(() => {
    return rpiEntries.filter(e => e.matched_process_id && !linkedProcessIds.has(e.matched_process_id));
  }, [rpiEntries, linkedProcessIds]);

  return (
    <>
      {/* ─── KPI DASHBOARD (#1) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatsCard
          title="Total de Processos"
          value={kpiStats.total}
          icon={Newspaper}
          gradient="from-blue-500 to-cyan-500"
          index={0}
        />
        <StatsCard
          title="Prazos Urgentes (< 7d)"
          value={kpiStats.urgentes}
          icon={AlertTriangle}
          gradient="from-amber-500 to-orange-500"
          index={1}
        />
        <StatsCard
          title="Atrasados"
          value={kpiStats.atrasados}
          icon={Clock}
          gradient="from-red-500 to-rose-500"
          index={2}
        />
        <StatsCard
          title="Deferidos este mês"
          value={kpiStats.deferidosMes}
          icon={CheckCircle2}
          gradient="from-emerald-500 to-green-500"
          index={3}
        />
      </div>

      {/* ─── Auto-populate banner (#8) ─── */}
      {availableRpiEntries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-900/20"
        >
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-600" />
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {availableRpiEntries.length} entrada(s) da RPI prontas para importar
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableRpiEntries.slice(0, 5).map(entry => (
              <Button
                key={entry.id}
                size="sm"
                variant="outline"
                className="text-xs border-amber-400 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                onClick={() => handleAutoPopulateFromRPI(entry)}
              >
                <Plus className="w-3 h-3 mr-1" />
                {entry.brand_name || entry.process_number || 'Importar'}
              </Button>
            ))}
          </div>
        </motion.div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 min-h-[calc(100vh-380px)]">
        {/* ─── SIDEBAR FILTROS ─── */}
        <Card className="lg:w-64 xl:w-72 flex-shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="w-4 h-4 text-rose-500" /> Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar marca, processo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Cliente</Label>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os clientes</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name || c.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos ({publicacoes.length})</SelectItem>
                  {/* #13 - Status counts */}
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.label} ({statusCounts[k] || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Prazo Crítico</Label>
              <Select value={filterPrazo} onValueChange={v => setFilterPrazo(v as PrazoFilter)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="hoje">Vence hoje</SelectItem>
                  <SelectItem value="7dias">Próximos 7 dias</SelectItem>
                  <SelectItem value="30dias">Próximos 30 dias</SelectItem>
                  <SelectItem value="atrasados">Atrasados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {Object.entries(TIPO_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => { setSearch(''); setFilterClient('todos'); setFilterStatus('todos'); setFilterPrazo('todos'); setFilterTipo('todos'); }}>
              <RotateCcw className="w-3 h-3 mr-1" /> Limpar Filtros
            </Button>
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={exportCSV} disabled={filtered.length === 0}>
              <Download className="w-3 h-3 mr-1" /> Exportar CSV
            </Button>
            <Button size="sm" className="w-full text-xs" onClick={() => { resetCreateForm(); setShowCreate(true); }}>
              <Plus className="w-3 h-3 mr-1" /> Nova Publicação
            </Button>
          </CardContent>
        </Card>

        {/* ─── LISTA DE PROCESSOS ─── */}
        <Card className="flex-1 min-w-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-rose-500" />
              Processos de Publicação
              <Badge variant="secondary" className="ml-auto text-xs">{filtered.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-440px)]">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Newspaper className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma publicação encontrada</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Cliente</TableHead>
                      <TableHead className="text-xs">Marca</TableHead>
                      <TableHead className="text-xs hidden md:table-cell">N. Processo</TableHead>
                      <TableHead className="text-xs hidden lg:table-cell">Pub. RPI</TableHead>
                      <TableHead className="text-xs">Prazo</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      {/* #10 - Responsável column */}
                      <TableHead className="text-xs hidden xl:table-cell">Responsável</TableHead>
                      <TableHead className="text-xs w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(pub => {
                      const proc = processMap.get(pub.process_id);
                      const client = clientMap.get(pub.client_id);
                      const admin = pub.admin_id ? adminMap.get(pub.admin_id) : null;
                      const days = getDaysLeft(pub.proximo_prazo_critico);
                      const urgency = getUrgencyBadge(days);
                      const stCfg = STATUS_CONFIG[pub.status as PubStatus] || STATUS_CONFIG.depositada;
                      const isSelected = selectedId === pub.id;
                      return (
                        <TableRow
                          key={pub.id}
                          className={cn('cursor-pointer transition-colors', isSelected && 'bg-accent')}
                          onClick={() => setSelectedId(isSelected ? null : pub.id)}
                        >
                          <TableCell className="text-xs font-medium max-w-[120px] truncate">{client?.full_name || '—'}</TableCell>
                          <TableCell className="text-xs font-semibold max-w-[140px] truncate">{proc?.brand_name || '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{proc?.process_number || '—'}</TableCell>
                          <TableCell className="text-xs hidden lg:table-cell">
                            {pub.data_publicacao_rpi ? format(parseISO(pub.data_publicacao_rpi), 'dd/MM/yy') : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={urgency.variant} className={cn('text-[10px]', urgency.className)}>
                              {urgency.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', stCfg.bg, stCfg.color)}>
                              {stCfg.label}
                            </span>
                          </TableCell>
                          {/* #10 */}
                          <TableCell className="text-xs text-muted-foreground hidden xl:table-cell truncate max-w-[100px]">
                            {admin?.full_name || '—'}
                          </TableCell>
                          <TableCell>
                            <ChevronRight className={cn('w-4 h-4 text-muted-foreground transition-transform', isSelected && 'rotate-90')} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* ─── DETALHES / TIMELINE ─── */}
        <AnimatePresence mode="wait">
          {selected && (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="lg:w-80 xl:w-96 flex-shrink-0"
            >
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Detalhes do Processo</CardTitle>
                    <button onClick={() => setSelectedId(null)} className="p-1 rounded-lg hover:bg-muted">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="mt-2">
                    <p className="font-bold text-base">{processMap.get(selected.process_id)?.brand_name || '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      {processMap.get(selected.process_id)?.process_number || 'Sem número'} · {clientMap.get(selected.client_id)?.full_name || '—'}
                    </p>
                    {/* #5 - Show responsible admin */}
                    {selected.admin_id && adminMap.get(selected.admin_id) && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Users className="w-3 h-3" /> Resp: {adminMap.get(selected.admin_id)?.full_name}
                      </p>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-520px)]">
                    {/* #12 - RPI Number & Document indicator */}
                    {(selected.rpi_number || selected.documento_rpi_url) && (
                      <div className="mb-4 p-2 rounded-lg bg-muted/50 space-y-1">
                        {selected.rpi_number && (
                          <p className="text-xs flex items-center gap-1.5">
                            <Hash className="w-3 h-3 text-primary" />
                            <span className="font-medium">RPI N°:</span> {selected.rpi_number}
                          </p>
                        )}
                        {selected.documento_rpi_url && (
                          <a href={selected.documento_rpi_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs flex items-center gap-1.5 text-primary hover:underline">
                            <Paperclip className="w-3 h-3" /> Documento RPI anexado
                          </a>
                        )}
                      </div>
                    )}

                    {/* Timeline */}
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Timeline</p>
                      {TIMELINE_STEPS.map(step => {
                        const date = (selected as any)[step.key] as string | null;
                        const isCompleted = !!date && isBefore(parseISO(date), new Date());
                        const isOverdue = !!date && isBefore(parseISO(date), new Date()) && !isCompleted && step.key !== 'data_deposito';
                        return <TimelineStep key={step.key} step={step} date={date} isCompleted={isCompleted} isOverdue={isOverdue && getDaysLeft(date)! < 0} />;
                      })}
                    </div>

                    <Separator className="my-4" />

                    {/* #9 - Scheduled Alerts */}
                    {selected.proximo_prazo_critico && getScheduledAlerts(selected.proximo_prazo_critico).length > 0 && (
                      <>
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                            <BellRing className="w-3 h-3" /> Alertas Programados
                          </p>
                          <div className="space-y-1">
                            {getScheduledAlerts(selected.proximo_prazo_critico).map((alert, i) => (
                              <div key={i} className="text-[10px] flex items-center gap-2 p-1.5 rounded bg-muted/50">
                                <Bell className="w-3 h-3 text-amber-500" />
                                <span>{alert.label}</span>
                                <span className="text-muted-foreground ml-auto">{format(alert.date, 'dd/MM/yyyy')}</span>
                                <span className="text-muted-foreground">(em {alert.days}d)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <Separator className="my-4" />
                      </>
                    )}

                    {/* Actions */}
                    <div className="space-y-2">
                      <Button size="sm" variant="outline" className="w-full text-xs justify-start" onClick={() => { setEditData(selected); setShowEdit(true); }}>
                        <Edit3 className="w-3 h-3 mr-2" /> Editar Datas e Status
                      </Button>
                      {/* #2 - Real notification */}
                      <Button size="sm" variant="outline" className="w-full text-xs justify-start" onClick={() => handleGenerateReminder(selected)}>
                        <Bell className="w-3 h-3 mr-2" /> Gerar Lembrete
                      </Button>
                      {/* #4 - RPI official link */}
                      {selected.rpi_link && (
                        <Button size="sm" variant="outline" className="w-full text-xs justify-start" asChild>
                          <a href={selected.rpi_link} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3 mr-2" /> Abrir RPI Oficial
                          </a>
                        </Button>
                      )}
                      {/* #3 - Upload document */}
                      <Button size="sm" variant="outline" className="w-full text-xs justify-start" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-3 h-3 mr-2" /> Upload Documento RPI
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadDocument(file);
                          e.target.value = '';
                        }}
                      />
                      {!selected.oposicao_protocolada && selected.status === 'oposicao' && (
                        <Button size="sm" variant="outline" className="w-full text-xs justify-start" onClick={() => {
                          updateMutation.mutate({
                            id: selected.id,
                            changes: { oposicao_protocolada: true, oposicao_data: format(new Date(), 'yyyy-MM-dd') },
                            original: selected,
                          });
                        }}>
                          <Gavel className="w-3 h-3 mr-2" /> Marcar Oposição Protocolada
                        </Button>
                      )}
                      {/* #7 - Delete */}
                      <Button size="sm" variant="outline" className="w-full text-xs justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setShowDelete(true)}>
                        <Trash2 className="w-3 h-3 mr-2" /> Excluir Publicação
                      </Button>
                    </div>

                    {/* Comentários */}
                    {selected.comentarios_internos && (
                      <>
                        <Separator className="my-4" />
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Comentários</p>
                          <p className="text-xs text-foreground whitespace-pre-wrap">{selected.comentarios_internos}</p>
                        </div>
                      </>
                    )}

                    {/* Logs */}
                    {logs.length > 0 && (
                      <>
                        <Separator className="my-4" />
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Histórico de Alterações</p>
                          <div className="space-y-2">
                            {logs.slice(0, 10).map(log => (
                              <div key={log.id} className="text-[10px] p-2 rounded-lg bg-muted/50">
                                <span className="font-medium">{log.admin_email || 'Sistema'}</span>
                                {' alterou '}
                                <span className="font-semibold text-primary">{log.campo_alterado}</span>
                                {log.valor_anterior && <> de <span className="line-through text-muted-foreground">{log.valor_anterior}</span></>}
                                {log.valor_novo && <> para <span className="font-medium">{log.valor_novo}</span></>}
                                <p className="text-muted-foreground mt-0.5">
                                  {format(parseISO(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── CREATE DIALOG (#6 - Enhanced) ─── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Publicação</DialogTitle>
            <DialogDescription>Vincule um processo existente e preencha os dados iniciais.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Processo (marca)</Label>
              <Select value={createProcessId} onValueChange={setCreateProcessId}>
                <SelectTrigger><SelectValue placeholder="Selecione um processo" /></SelectTrigger>
                <SelectContent>
                  {processes.filter(p => !linkedProcessIds.has(p.id)).map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.brand_name} {p.process_number ? `(${p.process_number})` : ''} — {clientMap.get(p.user_id!)?.full_name || 'Sem cliente'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Data de Depósito</Label>
              <Input type="date" value={createDataDeposito} onChange={e => setCreateDataDeposito(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Data Publicação RPI (opcional)</Label>
              <Input type="date" value={createDataPubRpi} onChange={e => setCreateDataPubRpi(e.target.value)} className="h-9" />
              {createDataPubRpi && (
                <p className="text-[10px] text-muted-foreground mt-1">Prazo oposição auto: {format(addDays(parseISO(createDataPubRpi), 60), 'dd/MM/yyyy')}</p>
              )}
            </div>
            <div>
              <Label className="text-xs">Tipo de Publicação</Label>
              <Select value={createTipo} onValueChange={v => setCreateTipo(v as PubTipo)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* #5 - Admin responsible */}
            <div>
              <Label className="text-xs">Admin Responsável</Label>
              <Select value={createAdminId} onValueChange={setCreateAdminId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                <SelectContent>
                  {admins.map(a => <SelectItem key={a.id} value={a.id}>{a.full_name || a.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!createProcessId || createMutation.isPending}>
              {createMutation.isPending ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── EDIT DIALOG (#14 - tipo_publicacao + #5 admin) ─── */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Publicação</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 pr-4">
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={editData.status || ''} onValueChange={v => setEditData(d => ({ ...d, status: v as PubStatus }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {/* #14 - tipo_publicacao */}
              <div>
                <Label className="text-xs">Tipo de Publicação</Label>
                <Select value={editData.tipo_publicacao || ''} onValueChange={v => setEditData(d => ({ ...d, tipo_publicacao: v as PubTipo }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {/* #5 - Admin responsible in edit */}
              <div>
                <Label className="text-xs">Admin Responsável</Label>
                <Select value={editData.admin_id || ''} onValueChange={v => setEditData(d => ({ ...d, admin_id: v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {admins.map(a => <SelectItem key={a.id} value={a.id}>{a.full_name || a.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Data Publicação RPI</Label>
                <Input type="date" value={editData.data_publicacao_rpi || ''} onChange={e => setEditData(d => ({ ...d, data_publicacao_rpi: e.target.value || null }))} className="h-9" />
                {editData.data_publicacao_rpi && (
                  <p className="text-[10px] text-muted-foreground mt-1">Prazo oposição auto: {format(addDays(parseISO(editData.data_publicacao_rpi), 60), 'dd/MM/yyyy')}</p>
                )}
              </div>
              <div>
                <Label className="text-xs">Data Decisão</Label>
                <Input type="date" value={editData.data_decisao || ''} onChange={e => setEditData(d => ({ ...d, data_decisao: e.target.value || null }))} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Data Certificado</Label>
                <Input type="date" value={editData.data_certificado || ''} onChange={e => setEditData(d => ({ ...d, data_certificado: e.target.value || null }))} className="h-9" />
                {editData.data_certificado && (
                  <p className="text-[10px] text-muted-foreground mt-1">Renovação auto: {format(addYears(parseISO(editData.data_certificado), 10), 'dd/MM/yyyy')}</p>
                )}
              </div>
              <div>
                <Label className="text-xs">Próximo Prazo Crítico</Label>
                <Input type="date" value={editData.proximo_prazo_critico || ''} onChange={e => setEditData(d => ({ ...d, proximo_prazo_critico: e.target.value || null }))} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Descrição do Prazo</Label>
                <Input value={editData.descricao_prazo || ''} onChange={e => setEditData(d => ({ ...d, descricao_prazo: e.target.value }))} className="h-9" placeholder="Ex.: Prazo de oposição" />
              </div>
              <div>
                <Label className="text-xs">N° RPI</Label>
                <Input value={editData.rpi_number || ''} onChange={e => setEditData(d => ({ ...d, rpi_number: e.target.value }))} className="h-9" placeholder="Ex.: 2800" />
              </div>
              <div>
                <Label className="text-xs">Link RPI Oficial</Label>
                <Input value={editData.rpi_link || ''} onChange={e => setEditData(d => ({ ...d, rpi_link: e.target.value }))} className="h-9" placeholder="https://..." />
              </div>
              <div>
                <Label className="text-xs">Comentários Internos</Label>
                <Textarea value={editData.comentarios_internos || ''} onChange={e => setEditData(d => ({ ...d, comentarios_internos: e.target.value }))} rows={3} className="text-sm" />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (!selected) return;
              updateMutation.mutate({ id: selected.id, changes: editData, original: selected });
            }} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── DELETE CONFIRMATION (#7) ─── */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Publicação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta publicação? Esta ação não pode ser desfeita.
              Todos os logs de auditoria associados também serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => selected && deleteMutation.mutate(selected.id)}
            >
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

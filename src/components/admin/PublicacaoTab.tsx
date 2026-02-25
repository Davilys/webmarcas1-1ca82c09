import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, differenceInDays, addDays, addYears, isAfter, isBefore, parseISO, subDays, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Newspaper, Search, Filter, Download, Plus, ChevronRight, Clock, AlertTriangle,
  CheckCircle2, Circle, Calendar, Edit3, MessageSquare, Bell, Upload, X,
  FileText, Eye, ArrowRight, RotateCcw, Shield, Gavel, Award, RefreshCw,
  ExternalLink, Trash2, Users, Zap, BellRing, Hash, Paperclip,
  ArrowUpDown, ArrowUp, ArrowDown, List, LayoutGrid, FileDown,
  ChevronLeft,
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { StatsCard } from '@/components/admin/dashboard/StatsCard';
import { PublicacaoCharts } from '@/components/admin/publicacao/PublicacaoCharts';
import { PublicacaoKanban } from '@/components/admin/publicacao/PublicacaoKanban';
import { BulkActionsBar } from '@/components/admin/publicacao/BulkActionsBar';
import { exportPublicacaoPDF } from '@/components/admin/publicacao/PublicacaoPDFExport';

// ─── Types ───────────────────────────────────────────────────────────────────
type PubStatus = 'depositada' | 'publicada' | 'oposicao' | 'deferida' | 'indeferida' | 'arquivada' | 'renovacao_pendente';
type PubTipo = 'publicacao_rpi' | 'decisao' | 'certificado' | 'renovacao';
type PrazoFilter = 'todos' | 'hoje' | '7dias' | '30dias' | 'atrasados';
type SortKey = 'cliente' | 'marca' | 'data_pub' | 'prazo' | 'status';
type SortDir = 'asc' | 'desc';
type ViewMode = 'lista' | 'kanban';

interface Publicacao {
  id: string;
  process_id: string | null;
  client_id: string | null;
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
  rpi_entry_id: string | null;
  brand_name_rpi: string | null;
  process_number_rpi: string | null;
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

const ITEMS_PER_PAGE = 20;

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

function calcDeadlineFromDispatch(dispatchText: string | null, publicationDate: string | null): { days: number | null; desc: string } | null {
  if (!publicationDate || !dispatchText) return null;
  const text = dispatchText.toLowerCase();

  if (text.includes('arquiv') || text.includes('art. 219'))
    return { days: null, desc: 'Processo encerrado' };
  if (text.includes('5 dias') || text.includes('cinco dias'))
    return { days: 5, desc: 'Exigência formal - 5 dias' };
  if (text.includes('oposição') || text.includes('oposicao'))
    return { days: 60, desc: 'Prazo para oposição' };
  if (text.includes('exigência') || text.includes('exigencia') || text.includes('cumpra'))
    return { days: 60, desc: 'Cumprimento de exigência' };
  if (text.includes('recurso'))
    return { days: 60, desc: 'Prazo para recurso' };
  if (text.includes('deferido') || text.includes('deferimento'))
    return { days: 60, desc: 'Pagamento de taxas (deferimento)' };
  if (text.includes('indeferido') || text.includes('indeferimento'))
    return { days: 60, desc: 'Prazo para recurso (indeferimento)' };

  return { days: 30, desc: 'Prazo padrão - 30 dias' };
}

function calcAutoFields(pub: Partial<Publicacao>, dispatchText?: string | null): Partial<Publicacao> {
  const out = { ...pub };
  if (out.data_publicacao_rpi) {
    out.prazo_oposicao = format(addDays(parseISO(out.data_publicacao_rpi), 60), 'yyyy-MM-dd');
  }
  if (out.data_certificado) {
    out.data_renovacao = format(addYears(parseISO(out.data_certificado), 10), 'yyyy-MM-dd');
  }

  // Auto-calculate deadline from dispatch_text if not manually set
  if (!out.proximo_prazo_critico && out.data_publicacao_rpi && dispatchText) {
    const deadline = calcDeadlineFromDispatch(dispatchText, out.data_publicacao_rpi);
    if (deadline) {
      if (deadline.days !== null) {
        out.proximo_prazo_critico = format(addDays(parseISO(out.data_publicacao_rpi), deadline.days), 'yyyy-MM-dd');
      }
      out.descricao_prazo = deadline.desc;
    }
  }

  // Fallback: if still no proximo_prazo_critico but has publication date, use 30 days
  if (!out.proximo_prazo_critico && out.data_publicacao_rpi) {
    out.proximo_prazo_critico = format(addDays(parseISO(out.data_publicacao_rpi), 30), 'yyyy-MM-dd');
    if (!out.descricao_prazo) out.descricao_prazo = 'Prazo padrão - 30 dias';
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

// Highlight search term in text
function HighlightText({ text, search }: { text: string; search: string }) {
  if (!search || !text) return <>{text}</>;
  const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
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
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editData, setEditData] = useState<Partial<Publicacao>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasSyncedRef = useRef(false);

  // New state for premium features
  const [viewMode, setViewMode] = useState<ViewMode>('lista');
  const [sortKey, setSortKey] = useState<SortKey>('prazo');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

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
      const { data, error } = await supabase.from('profiles').select('id, full_name, email, cpf');
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

  const { data: rpiEntries = [] } = useQuery({
    queryKey: ['rpi-entries-matched'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rpi_entries')
        .select('id, matched_process_id, matched_client_id, publication_date, dispatch_code, dispatch_text, process_number, brand_name');
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

  // ─── Realtime (#8) ────
  useEffect(() => {
    const channel = supabase
      .channel('publicacoes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'publicacoes_marcas' }, () => {
        queryClient.invalidateQueries({ queryKey: ['publicacoes-marcas'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // ─── Auto-sync RPI entries → Publicações ────
  useEffect(() => {
    if (hasSyncedRef.current) return;
    if (isLoading || rpiEntries.length === 0) return;

    const doSync = async () => {
      hasSyncedRef.current = true;

      // Build lookup maps
      const existingRpiIds = new Set(
        publicacoes.filter(p => (p as any).rpi_entry_id).map(p => (p as any).rpi_entry_id)
      );
      const clientByCpf = new Map<string, string>();
      const clientByEmail = new Map<string, string>();
      clients.forEach((c: any) => {
        if (c.cpf) clientByCpf.set(c.cpf, c.id);
        if (c.email) clientByEmail.set(c.email.toLowerCase(), c.id);
      });

      const processesByUserId = new Map<string, typeof processes>();
      processes.forEach(p => {
        if (p.user_id) {
          const existing = processesByUserId.get(p.user_id) || [];
          existing.push(p);
          processesByUserId.set(p.user_id, existing);
        }
      });

      const processMap = new Map(processes.map(p => [p.id, p]));
      const processByNumber = new Map(processes.filter(p => p.process_number).map(p => [p.process_number!, p]));

      // Build lookup: existing publicações by process_number_rpi for update matching
      const existingPubByProcessNumber = new Map<string, Publicacao>();
      publicacoes.forEach(p => {
        if (p.process_number_rpi) existingPubByProcessNumber.set(p.process_number_rpi, p);
      });

      const toInsert: any[] = [];
      const toUpdate: { id: string; data: any }[] = [];
      let skipped = 0;

      for (const entry of rpiEntries) {
        // Skip if already synced via rpi_entry_id
        if (existingRpiIds.has(entry.id)) {
          skipped++;
          continue;
        }

        // Try to resolve process_id
        let processId = entry.matched_process_id || null;
        let clientId = entry.matched_client_id || null;

        if (!processId && entry.process_number) {
          const proc = processByNumber.get(entry.process_number);
          if (proc) {
            processId = proc.id;
            if (!clientId) clientId = proc.user_id || null;
          }
        }

        if (!processId && clientId) {
          const clientProcesses = processesByUserId.get(clientId) || [];
          if (entry.process_number) {
            const match = clientProcesses.find(p => p.process_number === entry.process_number);
            if (match) processId = match.id;
          }
          if (!processId && clientProcesses.length > 0) {
            processId = clientProcesses[0].id;
          }
        }

        // Resolve client_id from process if possible
        if (!clientId && processId) {
          const proc = processMap.get(processId);
          clientId = proc?.user_id || null;
        }

        // Determine status from dispatch
        let status: PubStatus = 'publicada';
        const dispatchText = (entry.dispatch_text || '').toLowerCase();
        if (dispatchText.includes('deferido') || dispatchText.includes('deferimento')) status = 'deferida';
        else if (dispatchText.includes('indeferido') || dispatchText.includes('indeferimento')) status = 'indeferida';
        else if (dispatchText.includes('oposição') || dispatchText.includes('oposicao')) status = 'oposicao';
        else if (dispatchText.includes('arquiv')) status = 'arquivada';

        const pubData = calcAutoFields({
          process_id: processId,
          client_id: clientId,
          status,
          tipo_publicacao: 'publicacao_rpi' as PubTipo,
          rpi_number: entry.dispatch_code || null,
          data_publicacao_rpi: entry.publication_date || null,
          rpi_entry_id: entry.id,
          brand_name_rpi: entry.brand_name || null,
          process_number_rpi: entry.process_number || null,
        } as any, entry.dispatch_text);

        // Check if there's an existing publicação with the same process number → UPDATE
        if (entry.process_number && existingPubByProcessNumber.has(entry.process_number)) {
          const existingPub = existingPubByProcessNumber.get(entry.process_number)!;
          // Only update if the RPI entry is newer (has publication date)
          const updateData: any = { ...pubData };
          delete updateData.process_number_rpi; // keep original
          toUpdate.push({ id: existingPub.id, data: updateData });
        } else {
          toInsert.push(pubData);
        }
      }

      // Process updates
      let updated = 0;
      for (const { id, data } of toUpdate) {
        const { error } = await supabase.from('publicacoes_marcas').update(data).eq('id', id);
        if (!error) updated++;
      }

      if (toInsert.length > 0) {
        // Insert in batches of 50 to avoid payload limits
        const batchSize = 50;
        let inserted = 0;
        for (let i = 0; i < toInsert.length; i += batchSize) {
          const batch = toInsert.slice(i, i + batchSize);
          const { error } = await supabase.from('publicacoes_marcas').insert(batch);
          if (error) {
            console.error('Auto-sync error:', error);
            toast.error(`Erro na sincronização (lote ${Math.floor(i / batchSize) + 1})`);
            continue;
          }
          inserted += batch.length;
        }
        queryClient.invalidateQueries({ queryKey: ['publicacoes-marcas'] });
        const parts = [];
        if (inserted > 0) parts.push(`${inserted} criada(s)`);
        if (updated > 0) parts.push(`${updated} atualizada(s)`);
        if (skipped > 0) parts.push(`${skipped} já existiam`);
        toast.success(`✅ Sincronização: ${parts.join(', ')}`, { duration: 5000 });
      } else if (updated > 0) {
        queryClient.invalidateQueries({ queryKey: ['publicacoes-marcas'] });
        toast.success(`✅ ${updated} publicação(ões) atualizada(s) da revista`, { duration: 5000 });
      }
    };

    doSync();
  }, [isLoading, rpiEntries, publicacoes, processes, clients, queryClient]);

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

  // ─── KPI Stats ────
  const kpiStats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const total = publicacoes.length;
    const urgentes = publicacoes.filter(p => { const d = getDaysLeft(p.proximo_prazo_critico); return d !== null && d >= 0 && d <= 7; }).length;
    const atrasados = publicacoes.filter(p => { const d = getDaysLeft(p.proximo_prazo_critico); return d !== null && d < 0; }).length;
    const deferidosMes = publicacoes.filter(p => p.status === 'deferida' && p.data_decisao && isAfter(parseISO(p.data_decisao), startOfMonth)).length;
    return { total, urgentes, atrasados, deferidosMes };
  }, [publicacoes]);

  // ─── Status counts ────
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    publicacoes.forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1; });
    return counts;
  }, [publicacoes]);

  // ─── Filtering + Sorting + Pagination ────
  const filtered = useMemo(() => {
    let result = publicacoes.filter(pub => {
      const proc = pub.process_id ? processMap.get(pub.process_id) : null;
      const client = pub.client_id ? clientMap.get(pub.client_id) : null;
      if (search) {
        const q = search.toLowerCase();
        const matchName = proc?.brand_name?.toLowerCase().includes(q) || (pub as any).brand_name_rpi?.toLowerCase().includes(q);
        const matchProc = proc?.process_number?.toLowerCase().includes(q) || (pub as any).process_number_rpi?.toLowerCase().includes(q);
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
      // Date range filter (#3)
      if (filterDateFrom || filterDateTo) {
        const pubDate = pub.data_publicacao_rpi || pub.data_deposito;
        if (!pubDate) return false;
        const d = parseISO(pubDate);
        if (filterDateFrom && isBefore(d, parseISO(filterDateFrom))) return false;
        if (filterDateTo && isAfter(d, parseISO(filterDateTo))) return false;
      }
      return true;
    });

    // Sorting (#1)
    result.sort((a, b) => {
      let cmp = 0;
      const procA = a.process_id ? processMap.get(a.process_id) : null;
      const procB = b.process_id ? processMap.get(b.process_id) : null;
      const clientA = a.client_id ? clientMap.get(a.client_id) : null;
      const clientB = b.client_id ? clientMap.get(b.client_id) : null;

      switch (sortKey) {
        case 'cliente':
          cmp = (clientA?.full_name || '').localeCompare(clientB?.full_name || '');
          break;
        case 'marca':
          cmp = (procA?.brand_name || (a as any).brand_name_rpi || '').localeCompare(procB?.brand_name || (b as any).brand_name_rpi || '');
          break;
        case 'data_pub':
          cmp = (a.data_publicacao_rpi || '').localeCompare(b.data_publicacao_rpi || '');
          break;
        case 'prazo': {
          const dA = getDaysLeft(a.proximo_prazo_critico) ?? 99999;
          const dB = getDaysLeft(b.proximo_prazo_critico) ?? 99999;
          cmp = dA - dB;
          break;
        }
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [publicacoes, search, filterClient, filterStatus, filterPrazo, filterTipo, filterDateFrom, filterDateTo, processMap, clientMap, sortKey, sortDir]);

  // Pagination (#10)
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [search, filterClient, filterStatus, filterPrazo, filterTipo, filterDateFrom, filterDateTo]);

  const selected = useMemo(() => publicacoes.find(p => p.id === selectedId) || null, [publicacoes, selectedId]);

  // ─── Alert toast on mount ────
  useEffect(() => {
    const urgentes = publicacoes.filter(p => {
      const d = getDaysLeft(p.proximo_prazo_critico);
      return d !== null && d >= 0 && d <= 7;
    });
    if (urgentes.length > 0) {
      toast.warning(`⚠️ ${urgentes.length} processo(s) com prazo crítico nos próximos 7 dias!`, { duration: 6000 });
    }
  }, [publicacoes.length]);

  // ─── Sort handler (#1) ────
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ colKey }: { colKey: SortKey }) => {
    if (sortKey !== colKey) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 text-primary" /> : <ArrowDown className="w-3 h-3 ml-1 text-primary" />;
  };

  // ─── Bulk selection (#4) ────
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedData.map(p => p.id)));
    }
  };

  const handleBulkStatusChange = async (newStatus: PubStatus) => {
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from('publicacoes_marcas').update({ status: newStatus } as any).in('id', ids);
    if (error) { toast.error('Erro ao atualizar em lote'); return; }
    queryClient.invalidateQueries({ queryKey: ['publicacoes-marcas'] });
    toast.success(`${ids.length} publicação(ões) atualizadas para ${STATUS_CONFIG[newStatus]?.label}`);
    setSelectedIds(new Set());
  };

  const handleBulkReminder = async () => {
    const user = currentUserQuery.data;
    if (!user) return;
    const pubs = publicacoes.filter(p => selectedIds.has(p.id));
    const notifications: any[] = [];
    pubs.forEach(pub => {
      const proc = pub.process_id ? processMap.get(pub.process_id) : null;
      const brandName = proc?.brand_name || (pub as any).brand_name_rpi || 'Marca';
      notifications.push({
        user_id: user.id,
        title: `🔔 Lembrete: ${brandName}`,
        message: `Lembrete gerado em lote para o processo "${brandName}".`,
        type: 'warning',
        link: '/admin/revista-inpi',
      });
    });
    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }
    toast.success(`${notifications.length} lembrete(s) gerado(s)`);
    setSelectedIds(new Set());
  };

  const handleBulkExport = () => {
    const selectedPubs = filtered.filter(p => selectedIds.has(p.id));
    const exportData = selectedPubs.map(pub => {
      const proc = processMap.get(pub.process_id);
      const client = clientMap.get(pub.client_id);
      const admin = pub.admin_id ? adminMap.get(pub.admin_id) : null;
      return {
        cliente: client?.full_name || '',
        marca: proc?.brand_name || '',
        processo: proc?.process_number || '',
        responsavel: admin?.full_name || '',
        status: pub.status,
        dataDeposito: pub.data_deposito || '',
        dataPubRpi: pub.data_publicacao_rpi || '',
        prazoOposicao: pub.prazo_oposicao || '',
        proximoPrazo: pub.proximo_prazo_critico || '',
      };
    });
    exportPublicacaoPDF(exportData, { status: filterStatus, cliente: filterClient, prazo: filterPrazo });
  };

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

  // ─── PDF Export (#6) ────
  const exportPDF = useCallback(() => {
    const exportData = filtered.map(pub => {
      const proc = processMap.get(pub.process_id);
      const client = clientMap.get(pub.client_id);
      const admin = pub.admin_id ? adminMap.get(pub.admin_id) : null;
      return {
        cliente: client?.full_name || '',
        marca: proc?.brand_name || '',
        processo: proc?.process_number || '',
        responsavel: admin?.full_name || '',
        status: pub.status,
        dataDeposito: pub.data_deposito || '',
        dataPubRpi: pub.data_publicacao_rpi || '',
        prazoOposicao: pub.prazo_oposicao || '',
        proximoPrazo: pub.proximo_prazo_critico || '',
      };
    });
    exportPublicacaoPDF(exportData, { status: filterStatus, cliente: filterClient, prazo: filterPrazo });
  }, [filtered, processMap, clientMap, adminMap, filterStatus, filterClient, filterPrazo]);

  // ─── Create helpers ────
  const linkedProcessIds = useMemo(() => new Set(publicacoes.map(p => p.process_id)), [publicacoes]);

  const resetCreateForm = () => {
    setCreateProcessId('');
    setCreateDataDeposito('');
    setCreateDataPubRpi('');
    setCreateTipo('publicacao_rpi');
    setCreateAdminId('');
  };

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

  // ─── Real notification insert ────
  const handleGenerateReminder = async (pub: Publicacao) => {
    const proc = pub.process_id ? processMap.get(pub.process_id) : null;
    const brandName = proc?.brand_name || (pub as any).brand_name_rpi || 'Marca';
    const prazoStr = pub.proximo_prazo_critico ? format(parseISO(pub.proximo_prazo_critico), 'dd/MM/yyyy') : 'N/A';
    const user = currentUserQuery.data;
    const notifications: any[] = [];
    if (user?.id) {
      notifications.push({ user_id: user.id, title: `🔔 Prazo crítico: ${brandName}`, message: `O processo "${brandName}" tem prazo crítico em ${prazoStr}.`, type: 'warning', link: '/admin/revista-inpi' });
    }
    if (pub.client_id) {
      notifications.push({ user_id: pub.client_id, title: `📋 Atualização: ${brandName}`, message: `Seu processo "${brandName}" possui prazo importante em ${prazoStr}.`, type: 'info', link: '/cliente/processos' });
    }
    const alerts = getScheduledAlerts(pub.proximo_prazo_critico);
    alerts.forEach(alert => {
      if (user?.id) {
        notifications.push({ user_id: user.id, title: `⏰ Alerta ${alert.label}: ${brandName}`, message: `Prazo de "${brandName}" vence em ${prazoStr}. Alerta: ${format(alert.date, 'dd/MM/yyyy')}.`, type: 'warning', link: '/admin/revista-inpi' });
      }
    });
    if (notifications.length > 0) {
      const { error } = await supabase.from('notifications').insert(notifications);
      if (error) { toast.error('Erro ao gerar lembrete'); return; }
    }
    toast.success(`🔔 ${notifications.length} lembrete(s) gerado(s)`);
  };

  // ─── Upload document ────
  const handleUploadDocument = async (file: File) => {
    if (!selected) return;
    const ext = file.name.split('.').pop();
    const path = `publicacoes/${selected.id}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('documents').upload(path, file);
    if (uploadErr) { toast.error('Erro no upload'); return; }
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
    const { error: updateErr } = await supabase.from('publicacoes_marcas').update({ documento_rpi_url: urlData.publicUrl } as any).eq('id', selected.id);
    if (updateErr) { toast.error('Erro ao vincular documento'); return; }
    queryClient.invalidateQueries({ queryKey: ['publicacoes-marcas'] });
    toast.success('Documento RPI enviado');
  };

  // ─── Auto-populate from RPI ────
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

  const availableRpiEntries = useMemo(() => {
    return rpiEntries.filter(e => e.matched_process_id && !linkedProcessIds.has(e.matched_process_id));
  }, [rpiEntries, linkedProcessIds]);

  // Kanban status change handler
  const handleKanbanStatusChange = (id: string, newStatus: PubStatus, pub: any) => {
    updateMutation.mutate({ id, changes: { status: newStatus }, original: pub });
  };

  const clearAllFilters = () => {
    setSearch(''); setFilterClient('todos'); setFilterStatus('todos'); setFilterPrazo('todos'); setFilterTipo('todos');
    setFilterDateFrom(''); setFilterDateTo('');
  };

  return (
    <>
      {/* ─── KPI DASHBOARD ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatsCard title="Total de Processos" value={kpiStats.total} icon={Newspaper} gradient="from-blue-500 to-cyan-500" index={0} />
        <StatsCard title="Prazos Urgentes (< 7d)" value={kpiStats.urgentes} icon={AlertTriangle} gradient="from-amber-500 to-orange-500" index={1} />
        <StatsCard title="Atrasados" value={kpiStats.atrasados} icon={Clock} gradient="from-red-500 to-rose-500" index={2} />
        <StatsCard title="Deferidos este mês" value={kpiStats.deferidosMes} icon={CheckCircle2} gradient="from-emerald-500 to-green-500" index={3} />
      </div>

      {/* ─── CHARTS (#2) ─── */}
      <PublicacaoCharts publicacoes={publicacoes} />

      {/* ─── Auto-populate banner ─── */}
      {availableRpiEntries.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-3 rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-600" />
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {availableRpiEntries.length} entrada(s) da RPI prontas para importar
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableRpiEntries.slice(0, 5).map(entry => (
              <Button key={entry.id} size="sm" variant="outline" className="text-xs border-amber-400 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40" onClick={() => handleAutoPopulateFromRPI(entry)}>
                <Plus className="w-3 h-3 mr-1" />
                {entry.brand_name || entry.process_number || 'Importar'}
              </Button>
            ))}
          </div>
        </motion.div>
      )}

      {/* ─── Bulk Actions Bar (#4) ─── */}
      <AnimatePresence>
        <BulkActionsBar
          selectedCount={selectedIds.size}
          onClearSelection={() => setSelectedIds(new Set())}
          onBulkStatusChange={handleBulkStatusChange}
          onBulkReminder={handleBulkReminder}
          onBulkExport={handleBulkExport}
        />
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row gap-4 flex-1">
        {/* ─── FILTERS SHEET ─── */}
        <Sheet open={showFilters} onOpenChange={setShowFilters}>
          <SheetContent side="left" className="w-80 sm:w-96">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 text-sm">
                <Filter className="w-4 h-4 text-primary" /> Filtros
              </SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-4">
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
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label} ({statusCounts[k] || 0})</SelectItem>
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
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Período
                </Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="h-8 text-xs" />
                  <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="h-8 text-xs" />
                </div>
              </div>
              <Separator />
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => { clearAllFilters(); setShowFilters(false); }}>
                <RotateCcw className="w-3 h-3 mr-1" /> Limpar Filtros
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={exportCSV} disabled={filtered.length === 0}>
                  <Download className="w-3 h-3 mr-1" /> CSV
                </Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={exportPDF} disabled={filtered.length === 0}>
                  <FileDown className="w-3 h-3 mr-1" /> PDF
                </Button>
              </div>
              <Button size="sm" className="w-full text-xs" onClick={() => { resetCreateForm(); setShowCreate(true); setShowFilters(false); }}>
                <Plus className="w-3 h-3 mr-1" /> Nova Publicação
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* ─── LISTA / KANBAN ─── */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Header bar */}
          <div className="flex items-center justify-between px-1 mb-3">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setShowFilters(true)}>
                <Filter className="w-3.5 h-3.5" />
                Filtros
                {(filterClient !== 'todos' || filterStatus !== 'todos' || filterPrazo !== 'todos' || filterTipo !== 'todos' || search || filterDateFrom || filterDateTo) && (
                  <Badge variant="default" className="h-4 w-4 p-0 text-[9px] rounded-full flex items-center justify-center ml-0.5">
                    !
                  </Badge>
                )}
              </Button>
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Newspaper className="w-4 h-4 text-primary" />
                Publicações
                <Badge variant="secondary" className="text-xs">{filtered.length}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => { resetCreateForm(); setShowCreate(true); }}>
                <Plus className="w-3.5 h-3.5" /> Nova
              </Button>
              <div className="flex border rounded-md overflow-hidden">
                <Button variant={viewMode === 'lista' ? 'default' : 'ghost'} size="sm" className="h-8 px-2.5 rounded-none" onClick={() => setViewMode('lista')}>
                  <List className="w-3.5 h-3.5" />
                </Button>
                <Button variant={viewMode === 'kanban' ? 'default' : 'ghost'} size="sm" className="h-8 px-2.5 rounded-none" onClick={() => setViewMode('kanban')}>
                  <LayoutGrid className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Newspaper className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">Nenhuma publicação encontrada</p>
            </div>
          ) : viewMode === 'kanban' ? (
            <PublicacaoKanban
              publicacoes={filtered as any}
              processMap={processMap}
              clientMap={clientMap}
              adminMap={adminMap}
              onSelect={id => setSelectedId(selectedId === id ? null : id)}
              selectedId={selectedId}
              onStatusChange={handleKanbanStatusChange}
            />
          ) : (
            <Card className="border">
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-520px)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {/* Bulk checkbox (#4) */}
                        <TableHead className="w-8">
                          <Checkbox
                            checked={paginatedData.length > 0 && selectedIds.size === paginatedData.length}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        {(['marca', 'cliente', 'status', 'data_pub', 'prazo'] as SortKey[]).map(key => {
                          const labels: Record<SortKey, string> = { marca: 'Marca', cliente: 'Cliente', status: 'Status', data_pub: 'Publicação', prazo: 'Prazo' };
                          return (
                            <TableHead key={key} className="cursor-pointer select-none text-xs" onClick={() => handleSort(key)}>
                              <div className="flex items-center gap-1">
                                {labels[key]}
                                {sortKey === key ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                              </div>
                            </TableHead>
                          );
                        })}
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.map(pub => {
                        const proc = pub.process_id ? processMap.get(pub.process_id) : null;
                        const client = pub.client_id ? clientMap.get(pub.client_id) : null;
                        const days = pub.proximo_prazo_critico ? differenceInDays(parseISO(pub.proximo_prazo_critico), new Date()) : null;
                        const brandName = proc?.brand_name || pub.brand_name_rpi || '—';
                        const processNumber = proc?.process_number || pub.process_number_rpi || null;
                        return (
                          <TableRow
                            key={pub.id}
                            className={cn('cursor-pointer', selectedId === pub.id && 'bg-accent')}
                            onClick={() => setSelectedId(selectedId === pub.id ? null : pub.id)}
                          >
                            <TableCell onClick={e => e.stopPropagation()}>
                              <Checkbox checked={selectedIds.has(pub.id)} onCheckedChange={() => toggleSelect(pub.id)} />
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-xs font-bold">{brandName}</p>
                                {processNumber && <p className="text-[10px] text-muted-foreground">{processNumber}</p>}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              {client?.full_name || <span className="text-amber-600 dark:text-amber-400 text-[10px]">Sem cliente</span>}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn('text-[10px]', STATUS_CONFIG[pub.status]?.bg, STATUS_CONFIG[pub.status]?.color)}>
                                {STATUS_CONFIG[pub.status]?.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-[10px] text-muted-foreground">
                              {pub.data_publicacao_rpi ? format(parseISO(pub.data_publicacao_rpi), 'dd/MM/yy') : '—'}
                            </TableCell>
                            <TableCell>
                              {days !== null ? (
                                <span className={cn('text-[10px] font-semibold', days < 0 ? 'text-red-600' : days <= 7 ? 'text-amber-600' : 'text-muted-foreground')}>
                                  {days < 0 ? `${Math.abs(days)}d atrasado` : `${days}d`}
                                </span>
                              ) : '—'}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <Eye className="w-3 h-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-2 border-t">
                    <span className="text-[10px] text-muted-foreground">{filtered.length} processos</span>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="h-7 px-2" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                        <ChevronLeft className="w-3 h-3" />
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, currentPage - 3), currentPage + 2).map(page => {
                        return (
                          <Button key={page} variant={currentPage === page ? 'default' : 'outline'} size="sm" className="h-7 w-7 px-0 text-[10px]" onClick={() => setCurrentPage(page)}>
                            {page}
                          </Button>
                        );
                      })}
                      <Button variant="outline" size="sm" className="h-7 px-2" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                        <ChevronRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

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
                    <p className="font-bold text-base">
                      {(selected.process_id ? processMap.get(selected.process_id)?.brand_name : null) || (selected as any).brand_name_rpi || '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(selected.process_id ? processMap.get(selected.process_id)?.process_number : null) || (selected as any).process_number_rpi || 'Sem número'}
                      {' · '}
                      {selected.client_id ? (clientMap.get(selected.client_id)?.full_name || '—') : (
                        <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-600 dark:text-amber-400 ml-1">Sem cliente</Badge>
                      )}
                    </p>
                    {selected.descricao_prazo && (
                      <p className="text-xs text-primary font-medium mt-1">{selected.descricao_prazo}</p>
                    )}
                    {selected.admin_id && adminMap.get(selected.admin_id) && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Users className="w-3 h-3" /> Resp: {adminMap.get(selected.admin_id)?.full_name}
                      </p>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-520px)]">
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

                    <div className="space-y-2">
                      <Button size="sm" variant="outline" className="w-full text-xs justify-start" onClick={() => { setEditData(selected); setShowEdit(true); }}>
                        <Edit3 className="w-3 h-3 mr-2" /> Editar Datas e Status
                      </Button>
                      <Button size="sm" variant="outline" className="w-full text-xs justify-start" onClick={() => handleGenerateReminder(selected)}>
                        <Bell className="w-3 h-3 mr-2" /> Gerar Lembrete
                      </Button>
                      {selected.rpi_link && (
                        <Button size="sm" variant="outline" className="w-full text-xs justify-start" asChild>
                          <a href={selected.rpi_link} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3 mr-2" /> Abrir RPI Oficial
                          </a>
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="w-full text-xs justify-start" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-3 h-3 mr-2" /> Upload Documento RPI
                      </Button>
                      <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUploadDocument(file); e.target.value = ''; }}
                      />
                      {!selected.oposicao_protocolada && selected.status === 'oposicao' && (
                        <Button size="sm" variant="outline" className="w-full text-xs justify-start" onClick={() => {
                          updateMutation.mutate({ id: selected.id, changes: { oposicao_protocolada: true, oposicao_data: format(new Date(), 'yyyy-MM-dd') }, original: selected });
                        }}>
                          <Gavel className="w-3 h-3 mr-2" /> Marcar Oposição Protocolada
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="w-full text-xs justify-start text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setShowDelete(true)}>
                        <Trash2 className="w-3 h-3 mr-2" /> Excluir Publicação
                      </Button>
                    </div>

                    {selected.comentarios_internos && (
                      <>
                        <Separator className="my-4" />
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Comentários</p>
                          <p className="text-xs text-foreground whitespace-pre-wrap">{selected.comentarios_internos}</p>
                        </div>
                      </>
                    )}

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

      {/* ─── CREATE DIALOG ─── */}
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

      {/* ─── EDIT DIALOG ─── */}
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
              <div>
                <Label className="text-xs">Tipo de Publicação</Label>
                <Select value={editData.tipo_publicacao || ''} onValueChange={v => setEditData(d => ({ ...d, tipo_publicacao: v as PubTipo }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {/* Manual client assignment */}
              <div>
                <Label className="text-xs">Cliente (vincular manualmente)</Label>
                <Select value={editData.client_id || ''} onValueChange={v => setEditData(d => ({ ...d, client_id: v || null }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name || c.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {/* Manual process assignment */}
              <div>
                <Label className="text-xs">Processo (vincular manualmente)</Label>
                <Select value={editData.process_id || ''} onValueChange={v => setEditData(d => ({ ...d, process_id: v || null }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecione um processo" /></SelectTrigger>
                  <SelectContent>
                    {processes.map(p => <SelectItem key={p.id} value={p.id}>{p.brand_name} {p.process_number ? `(${p.process_number})` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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

      {/* ─── DELETE CONFIRMATION ─── */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Publicação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta publicação? Esta ação não pode ser desfeita.
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

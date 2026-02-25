import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, AlertTriangle, User } from 'lucide-react';

type PubStatus = 'depositada' | 'publicada' | 'oposicao' | 'deferida' | 'indeferida' | 'arquivada' | 'renovacao_pendente';

const STATUS_CONFIG: Record<PubStatus, { label: string; color: string; bg: string; border: string }> = {
  depositada: { label: 'Depositada', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-300 dark:border-blue-700' },
  publicada: { label: 'Publicada', color: 'text-cyan-700 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-300 dark:border-cyan-700' },
  oposicao: { label: 'Oposição', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-300 dark:border-amber-700' },
  deferida: { label: 'Deferida', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-300 dark:border-emerald-700' },
  indeferida: { label: 'Indeferida', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-300 dark:border-red-700' },
  arquivada: { label: 'Arquivada', color: 'text-zinc-700 dark:text-zinc-400', bg: 'bg-zinc-50 dark:bg-zinc-900/20', border: 'border-zinc-300 dark:border-zinc-700' },
  renovacao_pendente: { label: 'Renovação', color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-300 dark:border-orange-700' },
};

interface Publicacao {
  id: string;
  process_id: string | null;
  client_id: string | null;
  admin_id: string | null;
  status: PubStatus;
  proximo_prazo_critico: string | null;
  data_publicacao_rpi: string | null;
  brand_name_rpi?: string | null;
  process_number_rpi?: string | null;
}

interface Props {
  publicacoes: Publicacao[];
  processMap: Map<string, any>;
  clientMap: Map<string, any>;
  adminMap: Map<string, any>;
  onSelect: (id: string) => void;
  selectedId: string | null;
  onStatusChange: (id: string, newStatus: PubStatus, pub: Publicacao) => void;
}

export function PublicacaoKanban({ publicacoes, processMap, clientMap, adminMap, onSelect, selectedId, onStatusChange }: Props) {
  const columns = useMemo(() => {
    const cols: Record<PubStatus, Publicacao[]> = {
      depositada: [], publicada: [], oposicao: [], deferida: [], indeferida: [], arquivada: [], renovacao_pendente: [],
    };
    publicacoes.forEach(p => {
      if (cols[p.status as PubStatus]) cols[p.status as PubStatus].push(p);
    });
    return cols;
  }, [publicacoes]);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {(Object.entries(STATUS_CONFIG) as [PubStatus, typeof STATUS_CONFIG[PubStatus]][]).map(([status, cfg]) => (
        <div key={status} className="min-w-[240px] max-w-[280px] flex-shrink-0">
          <div className={cn('rounded-t-lg px-3 py-2 border-b-2', cfg.bg, cfg.border)}>
            <div className="flex items-center justify-between">
              <span className={cn('text-xs font-bold uppercase tracking-wide', cfg.color)}>{cfg.label}</span>
              <Badge variant="secondary" className="text-[10px] h-5">{columns[status].length}</Badge>
            </div>
          </div>
          <ScrollArea className="h-[calc(100vh-500px)]">
            <div className="space-y-2 p-2">
              {columns[status].map(pub => {
                const proc = pub.process_id ? processMap.get(pub.process_id) : null;
                const client = pub.client_id ? clientMap.get(pub.client_id) : null;
                const admin = pub.admin_id ? adminMap.get(pub.admin_id) : null;
                const days = pub.proximo_prazo_critico ? differenceInDays(parseISO(pub.proximo_prazo_critico), new Date()) : null;
                const brandName = proc?.brand_name || pub.brand_name_rpi || '—';
                const processNumber = proc?.process_number || pub.process_number_rpi || null;

                return (
                  <Card
                    key={pub.id}
                    className={cn(
                      'p-3 cursor-pointer hover:shadow-md transition-shadow border',
                      selectedId === pub.id && 'ring-2 ring-primary'
                    )}
                    onClick={() => onSelect(pub.id)}
                  >
                    <p className="text-xs font-bold truncate">{brandName}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {client?.full_name || <span className="text-amber-600 dark:text-amber-400">Sem cliente</span>}
                    </p>
                    {processNumber && (
                      <p className="text-[10px] text-muted-foreground">{processNumber}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      {days !== null && (
                        <div className={cn('flex items-center gap-1 text-[10px]',
                          days < 0 ? 'text-red-600' : days <= 7 ? 'text-amber-600' : 'text-muted-foreground'
                        )}>
                          {days < 0 ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {days < 0 ? `${Math.abs(days)}d atrasado` : `${days}d`}
                        </div>
                      )}
                      {admin && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span className="truncate max-w-[60px]">{admin.full_name?.split(' ')[0]}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
              {columns[status].length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center py-8">Nenhum processo</p>
              )}
            </div>
          </ScrollArea>
        </div>
      ))}
    </div>
  );
}

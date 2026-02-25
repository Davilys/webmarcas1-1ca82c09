import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { differenceInDays, parseISO } from 'date-fns';
import { Clock, AlertTriangle, User, Flame } from 'lucide-react';

type PubStatus = 'depositada' | 'publicada' | 'oposicao' | 'deferida' | 'indeferida' | 'arquivada' | 'renovacao_pendente';

const STATUS_CONFIG: Record<PubStatus, { label: string; accent: string; icon: string }> = {
  depositada: { label: 'Depositada', accent: 'from-blue-500 to-blue-600', icon: '📥' },
  publicada: { label: 'Publicada', accent: 'from-cyan-500 to-teal-600', icon: '📰' },
  oposicao: { label: 'Oposição', accent: 'from-amber-500 to-orange-600', icon: '⚔️' },
  deferida: { label: 'Deferida', accent: 'from-emerald-500 to-green-600', icon: '✅' },
  indeferida: { label: 'Indeferida', accent: 'from-red-500 to-rose-600', icon: '❌' },
  arquivada: { label: 'Arquivada', accent: 'from-zinc-400 to-zinc-500', icon: '📦' },
  renovacao_pendente: { label: 'Renovação', accent: 'from-orange-500 to-amber-600', icon: '🔄' },
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

export function PublicacaoKanban({ publicacoes, processMap, clientMap, adminMap, onSelect, selectedId }: Props) {
  const columns = useMemo(() => {
    const cols: Record<PubStatus, Publicacao[]> = {
      depositada: [], publicada: [], oposicao: [], deferida: [], indeferida: [], arquivada: [], renovacao_pendente: [],
    };
    publicacoes.forEach(p => {
      if (cols[p.status as PubStatus]) cols[p.status as PubStatus].push(p);
    });
    return cols;
  }, [publicacoes]);

  // Show ALL columns (full funnel) even when empty
  const allColumns = useMemo(() => {
    return Object.entries(STATUS_CONFIG) as [PubStatus, typeof STATUS_CONFIG[PubStatus]][];
  }, []);

  return (
    <div className="flex gap-2.5 overflow-x-auto pb-2 px-1 h-[calc(100vh-350px)]">
      {allColumns.map(([status, cfg]) => {
        const items = columns[status];
        const overdueCount = items.filter(p => {
          if (!p.proximo_prazo_critico) return false;
          return differenceInDays(parseISO(p.proximo_prazo_critico), new Date()) < 0;
        }).length;

        return (
          <div key={status} className="min-w-[180px] flex-1 flex-shrink-0 flex flex-col">
            {/* Column header */}
            <div className={cn('rounded-xl px-3 py-2.5 bg-gradient-to-r text-white shadow-md', cfg.accent)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{cfg.icon}</span>
                  <span className="text-xs font-bold uppercase tracking-wider">{cfg.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {overdueCount > 0 && (
                    <Badge className="bg-white/25 text-white border-0 text-[10px] h-5 px-1.5 backdrop-blur-sm">
                      <Flame className="w-3 h-3 mr-0.5" />{overdueCount}
                    </Badge>
                  )}
                  <Badge className="bg-white/30 text-white border-0 text-[10px] h-5 min-w-[20px] justify-center backdrop-blur-sm">
                    {items.length}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Cards */}
            <ScrollArea className="flex-1 mt-2">
              <div className="space-y-1.5 pr-1">
                {items.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/50">
                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/20 flex items-center justify-center mb-2">
                      <span className="text-xs">{cfg.icon}</span>
                    </div>
                    <p className="text-[10px]">Nenhuma publicação</p>
                  </div>
                )}
                {items.map(pub => {
                  const proc = pub.process_id ? processMap.get(pub.process_id) : null;
                  const client = pub.client_id ? clientMap.get(pub.client_id) : null;
                  const admin = pub.admin_id ? adminMap.get(pub.admin_id) : null;
                  const days = pub.proximo_prazo_critico ? differenceInDays(parseISO(pub.proximo_prazo_critico), new Date()) : null;
                  const brandName = proc?.brand_name || pub.brand_name_rpi || '—';
                  const processNumber = proc?.process_number || pub.process_number_rpi || null;
                  const isOverdue = days !== null && days < 0;
                  const isUrgent = days !== null && days >= 0 && days <= 7;

                  return (
                    <div
                      key={pub.id}
                      className={cn(
                        'group relative rounded-lg p-2.5 cursor-pointer transition-all duration-200',
                        'bg-card border border-border/60 hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5',
                        selectedId === pub.id && 'ring-2 ring-primary border-primary shadow-lg',
                        isOverdue && 'border-l-[3px] border-l-destructive',
                        isUrgent && !isOverdue && 'border-l-[3px] border-l-amber-500'
                      )}
                      onClick={() => onSelect(pub.id)}
                    >
                      <p className="text-xs font-bold truncate text-foreground leading-tight">{brandName}</p>
                      <p className="text-[10px] truncate mt-0.5 leading-tight">
                        {client?.full_name
                          ? <span className="text-muted-foreground">{client.full_name}</span>
                          : <span className="text-amber-600 dark:text-amber-400 font-medium">Sem cliente</span>
                        }
                      </p>
                      {processNumber && (
                        <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">{processNumber}</p>
                      )}
                      <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-border/40">
                        {days !== null ? (
                          <div className={cn('flex items-center gap-1 text-[10px] font-semibold',
                            isOverdue ? 'text-destructive' : isUrgent ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
                          )}>
                            {isOverdue ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {isOverdue ? `${Math.abs(days)}d atrasado` : `${days}d`}
                          </div>
                        ) : <span />}
                        {admin && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <User className="w-3 h-3" />
                            <span className="truncate max-w-[50px]">{admin.full_name?.split(' ')[0]}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        );
      })}

      {allColumns.length === 0 && (
        <div className="flex-1 flex items-center justify-center py-20 text-muted-foreground text-sm">
          Nenhuma publicação encontrada
        </div>
      )}
    </div>
  );
}

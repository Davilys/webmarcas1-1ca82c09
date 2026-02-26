export type PubStatus = 'depositada' | 'publicada' | 'oposicao' | 'deferida' | 'certificada' | 'indeferida' | 'arquivada' | 'renovacao_pendente';
export type PubTipo = 'publicacao_rpi' | 'decisao' | 'certificado' | 'renovacao';
export type PrazoFilter = 'todos' | 'hoje' | '7dias' | '30dias' | 'atrasados';
export type SmartFilter = 'todos' | 'orfas' | 'incompletas' | 'sem_prazo';
export type SortKey = 'cliente' | 'marca' | 'data_pub' | 'prazo' | 'status';
export type SortDir = 'asc' | 'desc';
export type ViewMode = 'lista' | 'kanban';

export interface Publicacao {
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
  ncl_class?: string | null;
  linking_method?: string | null;
  stale_since?: string | null;
  last_notification_sent_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LogEntry {
  id: string;
  admin_email: string | null;
  campo_alterado: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  created_at: string;
}

export const STATUS_CONFIG: Record<PubStatus, { label: string; color: string; bg: string }> = {
  depositada: { label: 'Depositada', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/40' },
  publicada: { label: 'Publicada', color: 'text-cyan-700 dark:text-cyan-400', bg: 'bg-cyan-100 dark:bg-cyan-900/40' },
  oposicao: { label: 'Oposição', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/40' },
  deferida: { label: 'Deferida', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
  certificada: { label: 'Certificada', color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/40' },
  indeferida: { label: 'Indeferida', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/40' },
  arquivada: { label: 'Arquivada', color: 'text-zinc-700 dark:text-zinc-400', bg: 'bg-zinc-100 dark:bg-zinc-900/40' },
  renovacao_pendente: { label: 'Renovação Pendente', color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/40' },
};

export const TIPO_CONFIG: Record<PubTipo, string> = {
  publicacao_rpi: 'Publicação RPI',
  decisao: 'Decisão',
  certificado: 'Certificado',
  renovacao: 'Renovação',
};

export const ITEMS_PER_PAGE = 20;

import JSZip from 'jszip';
import { ALL_BACKUP_TABLES, fetchAllFromTable } from './backupTables';

/**
 * Tables ordered by dependency (independent first, dependent last)
 */
const TABLE_ORDER: string[] = [
  // 1. System/Config (no FK)
  'system_settings', 'user_roles', 'admin_permissions', 'ai_providers',
  'ai_usage_logs', 'login_history', 'import_logs', 'notification_templates',
  'email_templates', 'channel_notification_templates', 'contract_types',
  'inpi_knowledge_base', 'inpi_sync_logs', 'marketing_config',
  'upsell_engine_config', 'upsell_engine_weights', 'promotion_expiration_logs',
  
  // 2. Core entities (profiles/leads have no FK to other public tables)
  'profiles', 'leads',
  
  // 3. Entities that reference profiles/leads
  'brand_processes', 'contracts', 'invoices', 'documents',
  'email_accounts', 'email_inbox', 'email_logs',
  'chat_messages', 'notifications', 'notification_logs',
  'award_entries', 'viability_searches', 'inpi_resources',
  'conversations', 'signature_audit_log',
  
  // 4. Entities with deeper FK
  'contract_templates', 'contract_attachments', 'contract_comments',
  'contract_notes', 'contract_tasks', 'contract_renewal_history',
  'client_activities', 'client_notes', 'client_appointments',
  'lead_activities', 'process_events', 'publicacoes_marcas',
  'rpi_uploads', 'rpi_entries',
  
  // 5. Marketing (may reference leads/campaigns)
  'marketing_campaigns', 'marketing_attribution', 'marketing_ab_tests',
  'marketing_ab_variants', 'marketing_audience_suggestions', 'marketing_budget_alerts',
  'client_remarketing_campaigns', 'client_remarketing_queue',
  'lead_remarketing_campaigns', 'lead_remarketing_queue',
  
  // 6. Conversation details (FK to conversations)
  'conversation_participants', 'conversation_messages', 'call_signals',
];

const ROWS_PER_FILE = 2000;
const MAX_BYTES_PER_FILE = 900 * 1024; // 900 KB

function sqlValue(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (Array.isArray(val)) {
    if (val.length === 0) return "'{}'";
    // Check if it's a simple array (text[]/int[]) vs complex objects (jsonb)
    const isSimple = val.every(item => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean');
    if (isSimple) {
      const items = val.map(item => `'${String(item).replace(/'/g, "''")}'`).join(', ');
      return `ARRAY[${items}]`;
    }
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

function generateInserts(tableName: string, rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const columns = Object.keys(rows[0]);
  const colList = columns.map(c => `"${c}"`).join(', ');
  const updateSet = columns
    .filter(c => c !== 'id')
    .map(c => `"${c}" = EXCLUDED."${c}"`)
    .join(', ');

  const lines: string[] = [];
  for (const row of rows) {
    const values = columns.map(col => sqlValue(row[col]));
    const conflict = updateSet
      ? `ON CONFLICT (id) DO UPDATE SET ${updateSet}`
      : `ON CONFLICT (id) DO NOTHING`;
    lines.push(`INSERT INTO public."${tableName}" (${colList}) VALUES (${values.join(', ')}) ${conflict};`);
  }
  return lines.join('\n');
}

export interface ExportProgress {
  currentTable: string;
  tableIndex: number;
  totalTables: number;
  filesGenerated: number;
}

export async function exportSQLPartsZip(
  supabaseClient: any,
  onProgress?: (p: ExportProgress) => void
): Promise<{ blob: Blob; totalFiles: number; totalRecords: number }> {
  const zip = new JSZip();
  let fileIndex = 0;
  let totalRecords = 0;

  // Get ordered list of tables that exist in our backup list
  const backupNames = new Set(ALL_BACKUP_TABLES.map(t => t.name));
  const orderedTables = TABLE_ORDER.filter(n => backupNames.has(n));
  // Add any tables not in the order list at the end
  ALL_BACKUP_TABLES.forEach(t => {
    if (!orderedTables.includes(t.name)) orderedTables.push(t.name);
  });

  const tableLabels = Object.fromEntries(ALL_BACKUP_TABLES.map(t => [t.name, t.label]));

  for (let ti = 0; ti < orderedTables.length; ti++) {
    const tableName = orderedTables[ti];
    const label = tableLabels[tableName] || tableName;

    onProgress?.({
      currentTable: label,
      tableIndex: ti + 1,
      totalTables: orderedTables.length,
      filesGenerated: fileIndex,
    });

    let rows: Record<string, unknown>[];
    try {
      rows = await fetchAllFromTable(supabaseClient, tableName);
    } catch {
      continue;
    }

    if (rows.length === 0) continue;

    totalRecords += rows.length;

    // Split into chunks respecting both row count and byte size limits
    const encoder = new TextEncoder();
    const chunks: Record<string, unknown>[][] = [];
    let currentChunk: Record<string, unknown>[] = [];
    let currentBytes = 0;

    for (const row of rows) {
      const stmt = generateInserts(tableName, [row]);
      const stmtBytes = encoder.encode(stmt).length;

      if (currentChunk.length >= ROWS_PER_FILE || (currentBytes + stmtBytes > MAX_BYTES_PER_FILE && currentChunk.length > 0)) {
        chunks.push(currentChunk);
        currentChunk = [];
        currentBytes = 0;
      }

      currentChunk.push(row);
      currentBytes += stmtBytes;
    }
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    for (let ci = 0; ci < chunks.length; ci++) {
      fileIndex++;
      const partSuffix = chunks.length > 1 ? `_part${ci + 1}` : '';
      const fileName = `${String(fileIndex).padStart(3, '0')}_${tableName}${partSuffix}.sql`;

      // Tables that reference auth.users need FK dropped temporarily
      const fkConstraints: Record<string, string> = {
        profiles: 'profiles_id_fkey',
      };
      const fkConstraint = fkConstraints[tableName];

      const headerLines = [
        `-- Tabela: ${tableName} (${label})`,
        `-- Registros: ${chunks[ci].length} de ${rows.length}`,
        `-- Gerado em: ${new Date().toISOString()}`,
        '',
        'BEGIN;',
        '',
      ];

      if (fkConstraint && ci === 0) {
        headerLines.push(`-- Remover FK temporariamente (tabela referencia auth.users)`);
        headerLines.push(`ALTER TABLE public."${tableName}" DROP CONSTRAINT IF EXISTS ${fkConstraint};`);
        headerLines.push('');
      }

      // Add TRUNCATE only on the first part of each table
      if (ci === 0) {
        headerLines.push(`-- Limpar tabela antes de inserir para evitar duplicidade`);
        headerLines.push(`TRUNCATE TABLE public."${tableName}" CASCADE;`);
        headerLines.push('');
      }

      const header = headerLines.join('\n');

      const body = generateInserts(tableName, chunks[ci]);
      
      // Re-add FK on the last part of the table
      const isLastPart = ci === chunks.length - 1;
      let footer = '';
      if (fkConstraint && isLastPart) {
        footer += `\n\n-- Recriar FK (registros sem auth.users correspondente ficarão órfãos mas funcionais)`;
        footer += `\nALTER TABLE public."${tableName}" ADD CONSTRAINT ${fkConstraint} FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;`;
      }
      footer += '\n\nCOMMIT;\n';

      zip.file(fileName, header + body + footer);
    }
  }

  // Add README
  const readme = [
    '=== WebMarcas SQL Migration ===',
    `Gerado em: ${new Date().toISOString()}`,
    `Total de arquivos: ${fileIndex}`,
    `Total de registros: ${totalRecords}`,
    '',
    'INSTRUÇÕES:',
    '1. Abra o SQL Editor do Supabase de destino',
    '2. Execute cada arquivo na ORDEM NUMÉRICA (001, 002, 003...)',
    '3. Tabelas independentes vêm primeiro, tabelas com FK depois',
    '4. Cada arquivo é autocontido (BEGIN/COMMIT)',
    '5. A primeira parte de cada tabela faz TRUNCATE CASCADE antes de inserir',
    '6. É seguro re-executar — limpa e reinsere os dados',
    '',
    'IMPORTANTE:',
    '- NÃO altere a ordem de execução',
    '- O TRUNCATE CASCADE remove dados dependentes — por isso a ordem importa',
    '- Se um arquivo falhar, corrija e re-execute antes de continuar',
    '- Usuários (auth.users) NÃO são migrados — precisam se recadastrar',
    '- Arquivos do Storage NÃO são migrados',
  ].join('\n');

  zip.file('00_README.txt', readme);

  const blob = await zip.generateAsync({ type: 'blob' });
  return { blob, totalFiles: fileIndex, totalRecords };
}

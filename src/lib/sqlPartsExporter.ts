import JSZip from 'jszip';
import { ALL_BACKUP_TABLES, fetchAllFromTable } from './backupTables';

/**
 * Tables ordered by dependency (independent first, dependent last)
 */
const TABLE_ORDER: string[] = [
  'system_settings', 'user_roles', 'admin_permissions', 'ai_providers',
  'ai_usage_logs', 'login_history', 'import_logs', 'notification_templates',
  'email_templates', 'channel_notification_templates', 'contract_types',
  'inpi_knowledge_base', 'inpi_sync_logs', 'marketing_config',
  'upsell_engine_config', 'upsell_engine_weights', 'promotion_expiration_logs',
  'profiles', 'leads',
  'brand_processes', 'contracts', 'invoices', 'documents',
  'email_accounts', 'email_inbox', 'email_logs',
  'chat_messages', 'notifications', 'notification_logs',
  'award_entries', 'viability_searches', 'inpi_resources',
  'conversations', 'signature_audit_log',
  'contract_templates', 'contract_attachments', 'contract_comments',
  'contract_notes', 'contract_tasks', 'contract_renewal_history',
  'client_activities', 'client_notes', 'client_appointments',
  'lead_activities', 'process_events', 'publicacoes_marcas',
  'rpi_uploads', 'rpi_entries',
  'marketing_campaigns', 'marketing_attribution', 'marketing_ab_tests',
  'marketing_ab_variants', 'marketing_audience_suggestions', 'marketing_budget_alerts',
  'client_remarketing_campaigns', 'client_remarketing_queue',
  'lead_remarketing_campaigns', 'lead_remarketing_queue',
  'conversation_participants', 'conversation_messages', 'call_signals',
];

const MAX_FILES = 25;
const MAX_BYTES_PER_FILE = 950 * 1024; // 950 KB — just under Supabase ~1MB limit

const FK_CONSTRAINTS: Record<string, string> = {
  profiles: 'profiles_id_fkey',
};

function sqlValue(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (Array.isArray(val)) {
    if (val.length === 0) return "'{}'";
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

/** Generate the full SQL block for a single table (TRUNCATE + DROP FK + INSERTs + ADD FK) */
function generateTableBlock(tableName: string, label: string, rows: Record<string, unknown>[]): string {
  const parts: string[] = [];
  parts.push(`-- ════════════════════════════════════════`);
  parts.push(`-- Tabela: ${tableName} (${label}) — ${rows.length} registros`);
  parts.push(`-- ════════════════════════════════════════`);
  parts.push('');

  const fk = FK_CONSTRAINTS[tableName];
  if (fk) {
    parts.push(`ALTER TABLE public."${tableName}" DROP CONSTRAINT IF EXISTS ${fk};`);
  }

  parts.push(`TRUNCATE TABLE public."${tableName}" CASCADE;`);
  parts.push('');
  parts.push(generateInserts(tableName, rows));

  if (fk) {
    parts.push('');
    parts.push(`ALTER TABLE public."${tableName}" ADD CONSTRAINT ${fk} FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;`);
  }

  parts.push('');
  return parts.join('\n');
}

export interface ExportProgress {
  currentTable: string;
  tableIndex: number;
  totalTables: number;
  filesGenerated: number;
}

interface TableData {
  name: string;
  label: string;
  rows: Record<string, unknown>[];
  sqlBlock: string;
  byteSize: number;
}

export async function exportSQLPartsZip(
  supabaseClient: any,
  onProgress?: (p: ExportProgress) => void
): Promise<{ blob: Blob; totalFiles: number; totalRecords: number }> {
  const zip = new JSZip();
  let totalRecords = 0;

  // Get ordered list
  const backupNames = new Set(ALL_BACKUP_TABLES.map(t => t.name));
  const orderedTables = TABLE_ORDER.filter(n => backupNames.has(n));
  ALL_BACKUP_TABLES.forEach(t => {
    if (!orderedTables.includes(t.name)) orderedTables.push(t.name);
  });
  const tableLabels = Object.fromEntries(ALL_BACKUP_TABLES.map(t => [t.name, t.label]));

  // 1. Fetch all data and generate SQL blocks
  const encoder = new TextEncoder();
  const tableDataList: TableData[] = [];

  for (let ti = 0; ti < orderedTables.length; ti++) {
    const tableName = orderedTables[ti];
    const label = tableLabels[tableName] || tableName;

    onProgress?.({
      currentTable: label,
      tableIndex: ti + 1,
      totalTables: orderedTables.length,
      filesGenerated: 0,
    });

    let rows: Record<string, unknown>[];
    try {
      rows = await fetchAllFromTable(supabaseClient, tableName);
    } catch {
      continue;
    }
    if (rows.length === 0) continue;

    totalRecords += rows.length;
    const sqlBlock = generateTableBlock(tableName, label, rows);
    const byteSize = encoder.encode(sqlBlock).length;

    tableDataList.push({ name: tableName, label, rows, sqlBlock, byteSize });
  }

  // 2. Pack tables into files, respecting MAX_BYTES_PER_FILE and MAX_FILES
  // Strategy: greedily combine tables into files; if a single table exceeds the limit, split its rows
  const files: { name: string; content: string }[] = [];

  let currentContent = '';
  let currentBytes = 0;
  let currentTables: string[] = [];

  function flushFile() {
    if (!currentContent) return;
    const idx = files.length + 1;
    const namePart = currentTables.length <= 3
      ? currentTables.join('_')
      : `${currentTables[0]}_and_${currentTables.length - 1}_more`;
    const fileName = `${String(idx).padStart(2, '0')}_${namePart}.sql`;
    const wrapped = `BEGIN;\n\n${currentContent}\nCOMMIT;\n`;
    files.push({ name: fileName, content: wrapped });
    currentContent = '';
    currentBytes = 0;
    currentTables = [];
  }

  for (const td of tableDataList) {
    // If this single table is too big, it needs its own file(s)
    if (td.byteSize > MAX_BYTES_PER_FILE) {
      // Flush any accumulated content first
      flushFile();

      // Split this large table into multiple files by rows
      const fk = FK_CONSTRAINTS[td.name];
      const chunkRows: Record<string, unknown>[][] = [];
      let chunk: Record<string, unknown>[] = [];
      let chunkBytes = 0;

      for (const row of td.rows) {
        const stmt = generateInserts(td.name, [row]);
        const stmtBytes = encoder.encode(stmt).length;

        if (chunkBytes + stmtBytes > MAX_BYTES_PER_FILE && chunk.length > 0) {
          chunkRows.push(chunk);
          chunk = [];
          chunkBytes = 0;
        }
        chunk.push(row);
        chunkBytes += stmtBytes;
      }
      if (chunk.length > 0) chunkRows.push(chunk);

      for (let ci = 0; ci < chunkRows.length; ci++) {
        const idx = files.length + 1;
        const partSuffix = chunkRows.length > 1 ? `_p${ci + 1}` : '';
        const fileName = `${String(idx).padStart(2, '0')}_${td.name}${partSuffix}.sql`;

        const parts: string[] = ['BEGIN;', ''];

        if (ci === 0) {
          parts.push(`-- Tabela: ${td.name} (${td.label}) — ${td.rows.length} registros total`);
          if (fk) parts.push(`ALTER TABLE public."${td.name}" DROP CONSTRAINT IF EXISTS ${fk};`);
          parts.push(`TRUNCATE TABLE public."${td.name}" CASCADE;`);
          parts.push('');
        } else {
          parts.push(`-- Tabela: ${td.name} (${td.label}) — parte ${ci + 1} de ${chunkRows.length}`);
          parts.push('');
        }

        parts.push(generateInserts(td.name, chunkRows[ci]));

        if (ci === chunkRows.length - 1 && fk) {
          parts.push('');
          parts.push(`ALTER TABLE public."${td.name}" ADD CONSTRAINT ${fk} FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;`);
        }

        parts.push('', 'COMMIT;', '');
        files.push({ name: fileName, content: parts.join('\n') });
      }
      continue;
    }

    // Check if adding this table would exceed file size limit
    if (currentBytes + td.byteSize > MAX_BYTES_PER_FILE && currentContent) {
      flushFile();
    }

    currentContent += td.sqlBlock + '\n';
    currentBytes += td.byteSize;
    currentTables.push(td.name);
  }
  flushFile();

  // 3. If we still have too many files, merge small consecutive files
  while (files.length > MAX_FILES) {
    // Find the two smallest consecutive files to merge
    let bestIdx = 0;
    let bestSize = Infinity;
    for (let i = 0; i < files.length - 1; i++) {
      const combined = encoder.encode(files[i].content).length + encoder.encode(files[i + 1].content).length;
      if (combined < bestSize) {
        bestSize = combined;
        bestIdx = i;
      }
    }
    // Merge files[bestIdx] and files[bestIdx+1]
    const a = files[bestIdx];
    const b = files[bestIdx + 1];
    const merged = a.content.replace(/\nCOMMIT;\n$/, '\n') + '\n' + b.content.replace(/^BEGIN;\n\n/, '');
    files.splice(bestIdx, 2, { name: a.name, content: merged });
  }

  // Renumber files
  for (let i = 0; i < files.length; i++) {
    const oldName = files[i].name;
    const suffix = oldName.replace(/^\d+_/, '');
    files[i].name = `${String(i + 1).padStart(2, '0')}_${suffix}`;
  }

  // Add to ZIP
  for (const f of files) {
    zip.file(f.name, f.content);
  }

  // README
  const readme = [
    '=== WebMarcas SQL Migration ===',
    `Gerado em: ${new Date().toISOString()}`,
    `Total de arquivos: ${files.length}`,
    `Total de registros: ${totalRecords}`,
    '',
    'INSTRUÇÕES:',
    '1. Abra o SQL Editor do Supabase de destino',
    '2. Execute cada arquivo na ORDEM NUMÉRICA (01, 02, 03...)',
    '3. Cada arquivo é autocontido (BEGIN/COMMIT)',
    '4. Tabelas são limpas (TRUNCATE CASCADE) antes de inserir',
    '5. É seguro re-executar — limpa e reinsere',
    '',
    'IMPORTANTE:',
    '- NÃO altere a ordem de execução',
    '- Se um arquivo falhar, corrija e re-execute antes de continuar',
    '- A tabela profiles tem DROP/ADD CONSTRAINT para a FK com auth.users',
    '- Usuários (auth.users) NÃO são migrados',
    '- Arquivos do Storage NÃO são migrados',
  ].join('\n');

  zip.file('00_README.txt', readme);

  const blob = await zip.generateAsync({ type: 'blob' });
  return { blob, totalFiles: files.length, totalRecords };
}

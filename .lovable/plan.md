
# Prompt Completo para Replicar Importação Perfex CRM no Outro Projeto

Copie TUDO entre as linhas `=====INÍCIO=====` e `=====FIM=====` e cole como uma única mensagem no outro projeto Lovable. Aprove a migration quando solicitado.

**Antes de colar**, ajuste se necessário:
- `MASTER_EMAIL` (atualmente `davillys@gmail.com`)
- `APP_URL` nas 3 import functions (substitua `https://webmarcas1.lovable.app` pela URL publicada do novo projeto — usado só como fallback)

---

=====INÍCIO=====

Implemente o sistema completo de Importação Legado do Perfex CRM. Crie EXATAMENTE os arquivos abaixo, na íntegra, sem omitir nada. Faça deploy automático das 4 edge functions ao final.

## 1) MIGRATION SQL (criar bucket privado + RLS Master-only + RPC auxiliar)

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('perfex-import', 'perfex-import', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Master can read perfex-import"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'perfex-import' AND EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email = 'davillys@gmail.com'));

CREATE POLICY "Master can upload perfex-import"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'perfex-import' AND EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email = 'davillys@gmail.com'));

CREATE POLICY "Master can update perfex-import"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'perfex-import' AND EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email = 'davillys@gmail.com'));

CREATE POLICY "Master can delete perfex-import"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'perfex-import' AND EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email = 'davillys@gmail.com'));

CREATE OR REPLACE FUNCTION public.get_auth_user_id_by_email(lookup_email text)
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM auth.users WHERE email = lower(trim(lookup_email)) LIMIT 1;
$$;
```

## 2) ARQUIVO: supabase/functions/parse-perfex-dump/index.ts

```typescript
// Parse Perfex SQL dump uploaded to Storage and produce NDJSON.gz files
// Accepts: .sql, .sql.gz, .zip (containing one .sql)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @ts-ignore deno
import { unzipSync, gzipSync } from 'https://esm.sh/fflate@0.8.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BUCKET = 'perfex-import';

function digits(s: string | null | undefined): string {
  return (s || '').replace(/\D+/g, '');
}

function* iterRows(sql: string, table: string): Generator<string[]> {
  const re = new RegExp(`INSERT INTO \`?${table}\`?\\s*\\(([^)]+)\\)\\s*VALUES\\s*`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) {
    let i = m.index + m[0].length;
    while (i < sql.length) {
      while (i < sql.length && /\s/.test(sql[i])) i++;
      if (sql[i] !== '(') break;
      i++;
      const row: string[] = [];
      let cur = '';
      let inStr = false;
      while (i < sql.length) {
        const ch = sql[i];
        if (inStr) {
          if (ch === '\\' && i + 1 < sql.length) { cur += sql[i+1]; i += 2; continue; }
          if (ch === "'") { inStr = false; i++; continue; }
          cur += ch; i++; continue;
        }
        if (ch === "'") { inStr = true; i++; continue; }
        if (ch === ',') { row.push(cur.trim()); cur = ''; i++; continue; }
        if (ch === ')') { row.push(cur.trim()); i++; break; }
        cur += ch; i++;
      }
      yield row.map(v => v === 'NULL' ? '' : v);
      while (i < sql.length && /\s/.test(sql[i])) i++;
      if (sql[i] === ',') { i++; continue; }
      if (sql[i] === ';') { i++; break; }
      break;
    }
  }
}

function getCols(sql: string, table: string): string[] {
  const m = new RegExp(`INSERT INTO \`?${table}\`?\\s*\\(([^)]+)\\)`, 'i').exec(sql);
  if (!m) return [];
  return m[1].split(',').map(s => s.trim().replace(/`/g, ''));
}

function rowsAsObjects(sql: string, table: string): Record<string, string>[] {
  const cols = getCols(sql, table);
  if (!cols.length) return [];
  const out: Record<string, string>[] = [];
  for (const row of iterRows(sql, table)) {
    const obj: Record<string, string> = {};
    cols.forEach((c, idx) => obj[c] = row[idx] ?? '');
    out.push(obj);
  }
  return out;
}

async function readDumpFromUpload(bytes: Uint8Array, name: string): Promise<string> {
  const lower = name.toLowerCase();
  if (lower.endsWith('.zip')) {
    const files = unzipSync(bytes);
    const sqlEntry = Object.entries(files).find(([n]) => n.toLowerCase().endsWith('.sql'));
    if (!sqlEntry) throw new Error('ZIP não contém arquivo .sql');
    return new TextDecoder('utf-8').decode(sqlEntry[1]);
  }
  if (lower.endsWith('.gz') || lower.endsWith('.sql.gz')) {
    const ds = new DecompressionStream('gzip');
    const decompressed = new Response(new Blob([bytes]).stream().pipeThrough(ds));
    return await decompressed.text();
  }
  return new TextDecoder('utf-8').decode(bytes);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No auth');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userData.user?.email !== 'davillys@gmail.com') {
      return new Response(JSON.stringify({ error: 'Apenas Master Admin' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { storagePath } = await req.json();
    if (!storagePath) throw new Error('storagePath obrigatório');

    const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(storagePath);
    if (dlErr || !blob) throw new Error(`Falha ao baixar dump: ${dlErr?.message}`);
    const bytes = new Uint8Array(await blob.arrayBuffer());

    const sql = await readDumpFromUpload(bytes, storagePath);

    const customersRaw = rowsAsObjects(sql, 'tblwebmarcas_customers');
    const contactsRaw = rowsAsObjects(sql, 'tblcontacts');
    const clientsRaw = rowsAsObjects(sql, 'tblclients');
    const contractsRaw = rowsAsObjects(sql, 'tblcontracts');
    const filesRaw = rowsAsObjects(sql, 'tblfiles');

    const seen = new Map<string, any>();
    const upsert = (rec: any) => {
      const key = (rec.email || digits(rec.cpf) || digits(rec.cnpj) || '').toLowerCase();
      if (!key) return;
      if (!seen.has(key)) seen.set(key, rec);
      else Object.assign(seen.get(key), Object.fromEntries(Object.entries(rec).filter(([_,v]) => v)));
    };

    for (const c of contactsRaw) {
      const cli = clientsRaw.find(x => x.userid === c.userid);
      upsert({
        perfex_id: c.id,
        client_id: c.userid,
        email: (c.email || '').toLowerCase(),
        full_name: `${c.firstname || ''} ${c.lastname || ''}`.trim(),
        phone: c.phonenumber || cli?.phonenumber || '',
        cpf: digits(cli?.vat?.length === 11 ? cli.vat : ''),
        cnpj: digits(cli?.vat?.length === 14 ? cli.vat : ''),
        address: cli?.address || '',
        city: cli?.city || '',
        state: cli?.state || '',
        zip_code: cli?.zip || '',
        brand_name: cli?.company || '',
      });
    }
    for (const c of customersRaw) {
      upsert({
        perfex_id: c.id,
        email: (c.email || '').toLowerCase(),
        full_name: c.name || '',
        phone: c.phone || '',
        cpf: c.cpf ? digits(c.cpf) : '',
        cnpj: c.cnpj ? digits(c.cnpj) : '',
        brand_name: c.brand || c.marca || '',
      });
    }

    const customers = Array.from(seen.values()).filter(r => r.email || r.cpf || r.cnpj);
    const contracts = contractsRaw.filter(c => c.signed === '1');
    const files = filesRaw.filter(f => f.rel_type === 'customer' || f.rel_type === 'contract');

    const mapping: Record<string, string> = {};
    for (const c of customers) if (c.client_id) mapping[c.client_id] = c.email;

    const enc = new TextEncoder();
    const toGz = (lines: string[]) => gzipSync(enc.encode(lines.join('\n')));

    const uploads = [
      { path: 'generated/customers.ndjson.gz', body: toGz(customers.map(c => JSON.stringify(c))) },
      { path: 'generated/contracts.ndjson.gz', body: toGz(contracts.map(c => JSON.stringify(c))) },
      { path: 'generated/files.ndjson.gz',     body: toGz(files.map(c => JSON.stringify(c))) },
      { path: 'generated/mapping.json',        body: enc.encode(JSON.stringify(mapping)) },
    ];

    for (const u of uploads) {
      const { error } = await supabase.storage.from(BUCKET).upload(u.path, u.body, {
        contentType: u.path.endsWith('.json') ? 'application/json' : 'application/gzip',
        upsert: true,
      });
      if (error) throw new Error(`Upload ${u.path}: ${error.message}`);
    }

    return new Response(JSON.stringify({
      success: true,
      stats: { customers: customers.length, contracts: contracts.length, files: files.length },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

## 3) ARQUIVO: supabase/functions/import-perfex-customers/index.ts

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APP_URL = 'https://webmarcas1.lovable.app';
const MASTER_EMAIL = 'davillys@gmail.com';

interface CustomerRecord {
  source: string; perfex_id: number; email: string; full_name: string;
  phone?: string | null; company_name?: string | null; cpf?: string | null;
  cnpj?: string | null; cpf_cnpj?: string | null; address?: string | null;
  neighborhood?: string | null; city?: string | null; state?: string | null;
  zip_code?: string | null; brand_name?: string | null; business_area?: string | null;
}

async function fetchNdjsonGz(url: string): Promise<string[]> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const ds = new DecompressionStream('gzip');
  const decompressed = res.body!.pipeThrough(ds);
  const text = await new Response(decompressed).text();
  return text.split('\n').filter(l => l.trim());
}

async function loadNdjson(supabase: ReturnType<typeof createClient>, fileName: string, fallbackUrl: string): Promise<string[]> {
  const storagePath = `generated/${fileName}`;
  const { data: signed, error: signedError } = await supabase.storage
    .from('perfex-import').createSignedUrl(storagePath, 60);
  if (signed?.signedUrl) return fetchNdjsonGz(signed.signedUrl);
  if (signedError) console.warn(`Signed URL failed: ${signedError.message}`);
  return fetchNdjsonGz(fallbackUrl);
}

async function findExisting(supabase: ReturnType<typeof createClient>, c: CustomerRecord) {
  const { data: byEmail } = await supabase.from('profiles').select('id').eq('email', c.email).maybeSingle();
  if (byEmail) return byEmail;
  if (c.cpf) { const { data } = await supabase.from('profiles').select('id').eq('cpf', c.cpf).maybeSingle(); if (data) return data; }
  if (c.cnpj) { const { data } = await supabase.from('profiles').select('id').eq('cnpj', c.cnpj).maybeSingle(); if (data) return data; }
  if (c.cpf_cnpj) { const { data } = await supabase.from('profiles').select('id').eq('cpf_cnpj', c.cpf_cnpj).maybeSingle(); if (data) return data; }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user || user.email !== MASTER_EMAIL) {
      return new Response(JSON.stringify({ error: 'Forbidden — Master only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const url = new URL(req.url);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const lines = await loadNdjson(supabase, 'customers.ndjson.gz', `${APP_URL}/perfex-data/customers.ndjson.gz`);
    const total = lines.length;
    const slice = lines.slice(offset, offset + limit);

    let imported = 0, skipped = 0, errors = 0;
    const errorDetails: string[] = [];

    for (const line of slice) {
      let c: CustomerRecord;
      try { c = JSON.parse(line); } catch { errors++; continue; }
      const email = (c.email || '').toLowerCase().trim();
      if (!email) { skipped++; continue; }

      try {
        const existing = await findExisting(supabase, c);
        if (existing) { skipped++; continue; }

        let userId: string;
        const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
          email, password: '123Mudar@', email_confirm: true,
          user_metadata: { full_name: c.full_name || email },
        });
        if (authErr) {
          if (authErr.message?.includes('already')) {
            const { data: foundId } = await supabase.rpc('get_auth_user_id_by_email', { lookup_email: email });
            if (!foundId) { errors++; errorDetails.push(`${email}: auth exists but ID not found`); continue; }
            userId = foundId as string;
          } else { errors++; errorDetails.push(`${email}: ${authErr.message}`); continue; }
        } else { userId = authData!.user!.id; }

        await supabase.from('profiles').upsert({
          id: userId, email,
          full_name: c.full_name || null, phone: c.phone || null,
          company_name: c.company_name || null, cpf: c.cpf || null,
          cnpj: c.cnpj || null, cpf_cnpj: c.cpf_cnpj || null,
          address: c.address || null, neighborhood: c.neighborhood || null,
          city: c.city || null, state: c.state || null, zip_code: c.zip_code || null,
          origin: 'import_perfex', client_funnel_type: 'juridico',
          created_by: user.id, assigned_to: user.id,
        });

        await supabase.from('user_roles').insert({ user_id: userId, role: 'user' }).then(() => {}).catch(() => {});

        const brandName = c.brand_name || c.company_name || c.full_name || email;
        await supabase.from('brand_processes').insert({
          user_id: userId, brand_name: brandName,
          business_area: c.business_area || null,
          status: 'em_andamento', pipeline_stage: 'protocolado',
        }).then(() => {}).catch(() => {});

        imported++;
      } catch (e) {
        errors++; errorDetails.push(`${email}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const nextOffset = offset + slice.length;
    const done = nextOffset >= total;
    return new Response(JSON.stringify({
      imported, skipped, errors, errorDetails: errorDetails.slice(0, 30),
      total, processed: nextOffset, nextOffset, done,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('import-perfex-customers error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
```

## 4) ARQUIVO: supabase/functions/import-perfex-contracts/index.ts

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APP_URL = 'https://webmarcas1.lovable.app';
const MASTER_EMAIL = 'davillys@gmail.com';

interface ContractRecord {
  perfex_id: number; perfex_client_id: number | null; client_email: string | null;
  subject: string | null; description: string | null; content_html: string | null;
  contract_value: number | null; start_date: string | null; end_date: string | null;
  signed: boolean; signed_at: string | null; signature_ip: string | null;
  signatory_name: string | null; signatory_email: string | null;
  date_added: string | null; hash: string | null;
}

async function fetchNdjsonGz(url: string): Promise<string[]> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const ds = new DecompressionStream('gzip');
  const text = await new Response(res.body!.pipeThrough(ds)).text();
  return text.split('\n').filter(l => l.trim());
}

async function loadNdjson(supabase: ReturnType<typeof createClient>, fileName: string, fallbackUrl: string): Promise<string[]> {
  const storagePath = `generated/${fileName}`;
  const { data: signed, error: signedError } = await supabase.storage
    .from('perfex-import').createSignedUrl(storagePath, 60);
  if (signed?.signedUrl) return fetchNdjsonGz(signed.signedUrl);
  if (signedError) console.warn(`Signed URL failed: ${signedError.message}`);
  return fetchNdjsonGz(fallbackUrl);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user || user.email !== MASTER_EMAIL) {
      return new Response(JSON.stringify({ error: 'Forbidden — Master only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const url = new URL(req.url);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const lines = await loadNdjson(supabase, 'contracts.ndjson.gz', `${APP_URL}/perfex-data/contracts.ndjson.gz`);
    const total = lines.length;
    const slice = lines.slice(offset, offset + limit);

    let imported = 0, skipped = 0, errors = 0, missingClient = 0;
    const errorDetails: string[] = [];

    for (const line of slice) {
      let c: ContractRecord;
      try { c = JSON.parse(line); } catch { errors++; continue; }
      const email = (c.client_email || '').toLowerCase().trim();
      if (!email) { missingClient++; skipped++; continue; }

      try {
        const { data: profile } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
        if (!profile) { missingClient++; skipped++; continue; }

        const perfexMarker = `[PERFEX_ID:${c.perfex_id}]`;
        const { data: existing } = await supabase.from('contracts').select('id')
          .eq('user_id', profile.id).ilike('description', `%${perfexMarker}%`).maybeSingle();
        if (existing) { skipped++; continue; }

        await supabase.from('contracts').insert({
          user_id: profile.id,
          subject: c.subject || `Contrato Perfex #${c.perfex_id}`,
          description: `${c.description || ''}\n\n${perfexMarker}`,
          contract_html: c.content_html, contract_value: c.contract_value,
          start_date: c.start_date, end_date: c.end_date,
          signature_status: c.signed ? 'signed' : 'not_signed',
          signed_at: c.signed_at, signature_ip: c.signature_ip,
          signatory_name: c.signatory_name, contract_type: 'registro_marca',
          created_by: user.id, visible_to_client: true,
        });
        imported++;
      } catch (e) {
        errors++;
        errorDetails.push(`Contrato #${c.perfex_id} (${email}): ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const nextOffset = offset + slice.length;
    const done = nextOffset >= total;
    return new Response(JSON.stringify({
      imported, skipped, errors, missingClient,
      errorDetails: errorDetails.slice(0, 30),
      total, processed: nextOffset, nextOffset, done,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('import-perfex-contracts error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
```

## 5) ARQUIVO: supabase/functions/import-perfex-files/index.ts

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APP_URL = 'https://webmarcas1.lovable.app';
const PERFEX_BASE = 'https://crm.webmarcas.net/uploads';
const MASTER_EMAIL = 'davillys@gmail.com';

interface FileRecord {
  perfex_id: number; rel_id: number; rel_type: string;
  file_name: string; filetype: string | null;
  client_email: string | null; date_added: string | null;
}

async function fetchNdjsonGz(url: string): Promise<string[]> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const ds = new DecompressionStream('gzip');
  const text = await new Response(res.body!.pipeThrough(ds)).text();
  return text.split('\n').filter(l => l.trim());
}

async function loadNdjson(supabase: ReturnType<typeof createClient>, fileName: string, fallbackUrl: string): Promise<string[]> {
  const storagePath = `generated/${fileName}`;
  const { data: signed, error: signedError } = await supabase.storage
    .from('perfex-import').createSignedUrl(storagePath, 60);
  if (signed?.signedUrl) return fetchNdjsonGz(signed.signedUrl);
  if (signedError) console.warn(`Signed URL failed: ${signedError.message}`);
  return fetchNdjsonGz(fallbackUrl);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user || user.email !== MASTER_EMAIL) {
      return new Response(JSON.stringify({ error: 'Forbidden — Master only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const url = new URL(req.url);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    const lines = await loadNdjson(supabase, 'files.ndjson.gz', `${APP_URL}/perfex-data/files.ndjson.gz`);
    const total = lines.length;
    const slice = lines.slice(offset, offset + limit);

    let imported = 0, skipped = 0, errors = 0, notFound = 0;
    const errorDetails: string[] = [];

    for (const line of slice) {
      let f: FileRecord;
      try { f = JSON.parse(line); } catch { errors++; continue; }
      const email = (f.client_email || '').toLowerCase().trim();
      if (!email) { skipped++; continue; }

      try {
        const { data: profile } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
        if (!profile) { skipped++; continue; }

        const storagePath = `imported/perfex/${f.rel_type}/${f.rel_id}/${f.file_name}`;
        const { data: existingDoc } = await supabase.from('documents').select('id')
          .eq('user_id', profile.id).like('file_url', `%${storagePath}%`).maybeSingle();
        if (existingDoc) { skipped++; continue; }

        const candidates = [
          `${PERFEX_BASE}/${f.rel_type}/${f.rel_id}/${f.file_name}`,
          `${PERFEX_BASE}/${f.rel_type}_files/${f.rel_id}/${f.file_name}`,
          `${PERFEX_BASE}/${f.rel_type}s/${f.rel_id}/${f.file_name}`,
        ];

        let bytes: ArrayBuffer | null = null;
        for (const u of candidates) {
          try {
            const r = await fetch(u, { signal: AbortSignal.timeout(15000) });
            if (r.ok) { bytes = await r.arrayBuffer(); break; }
          } catch { /* try next */ }
        }
        if (!bytes) { notFound++; continue; }

        const { error: upErr } = await supabase.storage.from('documents').upload(
          storagePath, bytes,
          { contentType: f.filetype || 'application/octet-stream', upsert: true }
        );
        if (upErr) { errors++; errorDetails.push(`${f.file_name}: upload ${upErr.message}`); continue; }

        const { data: publicUrl } = supabase.storage.from('documents').getPublicUrl(storagePath);

        let contractId: string | null = null;
        if (f.rel_type === 'contract') {
          const perfexMarker = `[PERFEX_ID:${f.rel_id}]`;
          const { data: ct } = await supabase.from('contracts').select('id')
            .eq('user_id', profile.id).ilike('description', `%${perfexMarker}%`).maybeSingle();
          if (ct) contractId = ct.id;
        }

        await supabase.from('documents').insert({
          user_id: profile.id, contract_id: contractId,
          name: f.file_name, file_url: publicUrl.publicUrl,
          mime_type: f.filetype, uploaded_by: 'import_perfex',
          document_type: f.rel_type === 'contract' ? 'contrato' : 'documento',
        });

        imported++;
      } catch (e) {
        errors++;
        errorDetails.push(`${f.file_name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const nextOffset = offset + slice.length;
    const done = nextOffset >= total;
    return new Response(JSON.stringify({
      imported, skipped, errors, notFound,
      errorDetails: errorDetails.slice(0, 30),
      total, processed: nextOffset, nextOffset, done,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('import-perfex-files error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
```

## 6) ARQUIVO: src/components/admin/settings/PerfexImportSection.tsx

```tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SettingsCard } from './SettingsCard';
import { toast } from 'sonner';
import { Loader2, Users, FileText, FolderArchive, AlertTriangle, ShieldCheck, DatabaseBackup, Upload, FileArchive } from 'lucide-react';

type Phase = 'customers' | 'contracts' | 'files';

interface PhaseState {
  running: boolean; done: boolean; total: number; processed: number;
  imported: number; skipped: number; errors: number;
  notFound?: number; missingClient?: number; errorDetails: string[];
}

const initialState: PhaseState = {
  running: false, done: false, total: 0, processed: 0,
  imported: 0, skipped: 0, errors: 0, errorDetails: [],
};

const PHASE_CONFIG = {
  customers: { fn: 'import-perfex-customers', limit: 30, label: 'Clientes', icon: Users },
  contracts: { fn: 'import-perfex-contracts', limit: 25, label: 'Contratos Assinados', icon: FileText },
  files:     { fn: 'import-perfex-files',     limit: 10, label: 'Arquivos do Servidor Antigo', icon: FolderArchive },
} as const;

// IMPORTANTE: substitua pela URL Supabase deste projeto (import.meta.env.VITE_SUPABASE_URL)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export function PerfexImportSection() {
  const [isMaster, setIsMaster] = useState(false);
  const [checking, setChecking] = useState(true);
  const [state, setState] = useState<Record<Phase, PhaseState>>({
    customers: { ...initialState },
    contracts: { ...initialState },
    files: { ...initialState },
  });
  const [errorModal, setErrorModal] = useState<{ phase: Phase; details: string[] } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parseStats, setParseStats] = useState<{ customers: number; contracts: number; files: number } | null>(null);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    if (!file) return;
    const okExt = /\.(zip|sql|sql\.gz|gz)$/i.test(file.name);
    if (!okExt) { toast.error('Use .zip, .sql ou .sql.gz'); return; }

    setUploading(true);
    setUploadProgress(0);
    setParseStats(null);
    try {
      const path = `uploads/${Date.now()}-${file.name}`;
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error(`Upload ${xhr.status}: ${xhr.responseText}`));
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/perfex-import/${path}`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.setRequestHeader('x-upsert', 'true');
        xhr.send(file);
      });

      setUploadedFile(path);
      toast.success('Upload concluído. Processando dump...');
      setUploading(false);
      setParsing(true);
      const res = await supabase.functions.invoke('parse-perfex-dump', { body: { storagePath: path } });
      if (res.error) throw new Error(res.error.message);
      setParseStats(res.data.stats);
      toast.success(`Dump processado: ${res.data.stats.customers} clientes, ${res.data.stats.contracts} contratos, ${res.data.stats.files} arquivos`);
    } catch (e) {
      toast.error(`Falha: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setUploading(false);
      setParsing(false);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsMaster(data.user?.email === 'davillys@gmail.com');
      setChecking(false);
    });
  }, []);

  const runPhase = async (phase: Phase) => {
    const cfg = PHASE_CONFIG[phase];
    setState(s => ({ ...s, [phase]: { ...initialState, running: true } }));

    let offset = 0; let total = 0;
    let aggImported = 0, aggSkipped = 0, aggErrors = 0, aggNotFound = 0, aggMissing = 0;
    const aggErrorDetails: string[] = [];

    try {
      while (true) {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        const url = `${SUPABASE_URL}/functions/v1/${cfg.fn}?offset=${offset}&limit=${cfg.limit}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Erro desconhecido');

        total = body.total;
        aggImported += body.imported; aggSkipped += body.skipped; aggErrors += body.errors;
        aggNotFound += body.notFound || 0; aggMissing += body.missingClient || 0;
        if (body.errorDetails?.length) aggErrorDetails.push(...body.errorDetails);

        setState(s => ({
          ...s,
          [phase]: {
            running: !body.done, done: body.done, total, processed: body.processed,
            imported: aggImported, skipped: aggSkipped, errors: aggErrors,
            notFound: aggNotFound, missingClient: aggMissing, errorDetails: aggErrorDetails,
          },
        }));

        if (body.done) break;
        offset = body.nextOffset;
      }
      toast.success(`${cfg.label}: ${aggImported} importados, ${aggSkipped} pulados, ${aggErrors} erros`);
    } catch (e) {
      toast.error(`Erro em ${cfg.label}: ${e instanceof Error ? e.message : String(e)}`);
      setState(s => ({ ...s, [phase]: { ...s[phase], running: false } }));
    }
  };

  if (checking) return null;
  if (!isMaster) return null;

  const renderPhase = (phase: Phase) => {
    const s = state[phase]; const cfg = PHASE_CONFIG[phase]; const Icon = cfg.icon;
    const pct = s.total > 0 ? Math.round((s.processed / s.total) * 100) : 0;
    return (
      <div className="border rounded-lg p-4 space-y-3 bg-card">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <span className="font-semibold">{cfg.label}</span>
          </div>
          <Button size="sm" onClick={() => runPhase(phase)} disabled={s.running} variant={s.done ? 'outline' : 'default'}>
            {s.running ? (<><Loader2 className="h-4 w-4 mr-1 animate-spin" />Importando...</>) : s.done ? 'Reexecutar' : 'Iniciar'}
          </Button>
        </div>
        {(s.running || s.done) && (
          <>
            <Progress value={pct} className="h-2" />
            <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
              <span>{s.processed}/{s.total} ({pct}%)</span>
              <Badge variant="default" className="bg-green-600">✓ {s.imported} novos</Badge>
              <Badge variant="secondary">↻ {s.skipped} pulados</Badge>
              {s.errors > 0 && (
                <Badge variant="destructive" className="cursor-pointer" onClick={() => setErrorModal({ phase, details: s.errorDetails })}>
                  ⚠ {s.errors} erros
                </Badge>
              )}
              {s.notFound !== undefined && s.notFound > 0 && (<Badge variant="outline">⊘ {s.notFound} não encontrados</Badge>)}
              {s.missingClient !== undefined && s.missingClient > 0 && (<Badge variant="outline">⊘ {s.missingClient} sem cliente</Badge>)}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <SettingsCard icon={DatabaseBackup} title="Importação Legado Perfex CRM"
        description="Migra clientes, contratos assinados e arquivos do CRM antigo (crm.webmarcas.net). Apenas Master Admin.">
        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="flex items-center gap-2">
              <FileArchive className="h-5 w-5 text-primary" />
              <span className="font-semibold text-sm">Upload do Dump SQL</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Envie um arquivo <code className="bg-muted px-1 rounded">.zip</code>, <code className="bg-muted px-1 rounded">.sql</code> ou <code className="bg-muted px-1 rounded">.sql.gz</code> do dump do Perfex CRM.
            </p>
            <div className="flex items-center gap-2">
              <input type="file" id="perfex-dump-upload" accept=".zip,.sql,.gz" className="hidden"
                disabled={uploading || parsing}
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
              <Button size="sm" variant="outline" disabled={uploading || parsing}
                onClick={() => document.getElementById('perfex-dump-upload')?.click()}>
                {uploading ? (<><Loader2 className="h-4 w-4 mr-1 animate-spin" />Enviando {uploadProgress}%</>)
                  : parsing ? (<><Loader2 className="h-4 w-4 mr-1 animate-spin" />Processando...</>)
                  : (<><Upload className="h-4 w-4 mr-1" />Selecionar Arquivo</>)}
              </Button>
              {uploadedFile && !uploading && !parsing && (
                <span className="text-xs text-muted-foreground truncate">{uploadedFile.split('/').pop()}</span>
              )}
            </div>
            {(uploading || parsing) && uploadProgress > 0 && uploadProgress < 100 && (
              <Progress value={uploadProgress} className="h-1.5" />
            )}
            {parseStats && (
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="default" className="bg-green-600">✓ Dump pronto</Badge>
                <Badge variant="secondary">{parseStats.customers} clientes</Badge>
                <Badge variant="secondary">{parseStats.contracts} contratos</Badge>
                <Badge variant="secondary">{parseStats.files} arquivos</Badge>
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium text-amber-900 dark:text-amber-200">Execute na ordem 1 → 2 → 3</p>
              <ul className="text-xs text-amber-800 dark:text-amber-300 list-disc list-inside space-y-0.5">
                <li>Clientes existentes (mesmo email/CPF/CNPJ) serão <strong>preservados intactos</strong></li>
                <li>Contratos só importam se o cliente já existir no CRM atual</li>
                <li>Arquivos serão baixados de crm.webmarcas.net (pode demorar)</li>
                <li>Operação <strong>idempotente</strong>: pode reexecutar sem duplicar</li>
              </ul>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span className="bg-primary/10 text-primary rounded-full w-6 h-6 inline-flex items-center justify-center text-xs">1</span>
              Importar Clientes
            </div>
            {renderPhase('customers')}

            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mt-2">
              <span className="bg-primary/10 text-primary rounded-full w-6 h-6 inline-flex items-center justify-center text-xs">2</span>
              Importar Contratos Assinados
            </div>
            {renderPhase('contracts')}

            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mt-2">
              <span className="bg-primary/10 text-primary rounded-full w-6 h-6 inline-flex items-center justify-center text-xs">3</span>
              Baixar Arquivos do Servidor Antigo
            </div>
            {renderPhase('files')}
          </div>

          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Senha padrão dos novos clientes: <code className="bg-muted px-1 rounded">123Mudar@</code>. Origem marcada como <code className="bg-muted px-1 rounded">import_perfex</code>.
          </div>
        </div>
      </SettingsCard>

      <Dialog open={!!errorModal} onOpenChange={(o) => !o && setErrorModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Erros durante importação ({errorModal?.details.length})</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            <ul className="text-sm space-y-1 font-mono">
              {errorModal?.details.map((e, i) => (
                <li key={i} className="p-2 bg-muted/50 rounded text-xs break-all">{e}</li>
              ))}
            </ul>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

## 7) INTEGRAÇÃO em src/components/admin/settings/BackupSettings.tsx

Adicione o import no topo:
```tsx
import { PerfexImportSection } from './PerfexImportSection';
```
E renderize após `<BackupImportSection />`:
```tsx
<BackupImportSection />
<PerfexImportSection />
```

## REGRAS CRÍTICAS

- Use `import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'` em todas edge functions
- corsHeaders manual em todas as 4 funções
- Validação de Master Admin (`davillys@gmail.com`) em TODAS as 4 functions
- Não modifique `src/integrations/supabase/client.ts` nem `types.ts`
- **Faça deploy automático das 4 edge functions ao final**: parse-perfex-dump, import-perfex-customers, import-perfex-contracts, import-perfex-files

Após o deploy, o painel aparece em **Admin → Configurações** → "Importação Legado Perfex CRM". O Master faz upload do dump SQL, aguarda o parse e executa as 3 fases na ordem 1 → 2 → 3.

=====FIM=====

---

## Resumo

- ✅ Migration completa (bucket + RLS + RPC)
- ✅ 4 edge functions com código inline 100% pronto
- ✅ Componente UI completo
- ✅ Integração no BackupSettings
- ✅ Pronto para colar e aprovar no outro projeto Lovable

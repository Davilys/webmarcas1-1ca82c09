import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APP_URL = 'https://webmarcas1.lovable.app';
const MASTER_EMAIL = 'davillys@gmail.com';

interface CustomerRecord {
  source: string;
  perfex_id: number;
  email: string;
  full_name: string;
  phone?: string | null;
  company_name?: string | null;
  cpf?: string | null;
  cnpj?: string | null;
  cpf_cnpj?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  brand_name?: string | null;
  business_area?: string | null;
}

async function fetchNdjsonGz(url: string): Promise<string[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const ds = new DecompressionStream('gzip');
  const decompressed = res.body!.pipeThrough(ds);
  const text = await new Response(decompressed).text();
  return text.split('\n').filter(l => l.trim());
}

async function loadNdjson(supabase: ReturnType<typeof createClient>, fileName: string, fallbackUrl: string): Promise<string[]> {
  // Try Storage (uploaded dump) first
  const { data } = await supabase.storage.from('perfex-import').download(`generated/${fileName}`);
  if (data) {
    const buf = new Uint8Array(await data.arrayBuffer());
    const ds = new DecompressionStream('gzip');
    const decompressed = new Response(new Blob([buf]).stream().pipeThrough(ds));
    const text = await decompressed.text();
    return text.split('\n').filter(l => l.trim());
  }
  return fetchNdjsonGz(fallbackUrl);
}

async function findExisting(supabase: ReturnType<typeof createClient>, c: CustomerRecord) {
  // 1. Email
  const { data: byEmail } = await supabase
    .from('profiles').select('id').eq('email', c.email).maybeSingle();
  if (byEmail) return byEmail;

  // 2. CPF (digits only)
  if (c.cpf) {
    const { data } = await supabase
      .from('profiles').select('id').eq('cpf', c.cpf).maybeSingle();
    if (data) return data;
  }
  // 3. CNPJ
  if (c.cnpj) {
    const { data } = await supabase
      .from('profiles').select('id').eq('cnpj', c.cnpj).maybeSingle();
    if (data) return data;
  }
  // 4. legacy cpf_cnpj
  if (c.cpf_cnpj) {
    const { data } = await supabase
      .from('profiles').select('id').eq('cpf_cnpj', c.cpf_cnpj).maybeSingle();
    if (data) return data;
  }
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

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

        // Create auth user
        let userId: string;
        const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
          email,
          password: '123Mudar@',
          email_confirm: true,
          user_metadata: { full_name: c.full_name || email },
        });
        if (authErr) {
          if (authErr.message?.includes('already')) {
            const { data: foundId } = await supabase.rpc('get_auth_user_id_by_email', { lookup_email: email });
            if (!foundId) { errors++; errorDetails.push(`${email}: auth exists but ID not found`); continue; }
            userId = foundId as string;
          } else {
            errors++; errorDetails.push(`${email}: ${authErr.message}`); continue;
          }
        } else {
          userId = authData!.user!.id;
        }

        // Upsert profile
        await supabase.from('profiles').upsert({
          id: userId,
          email,
          full_name: c.full_name || null,
          phone: c.phone || null,
          company_name: c.company_name || null,
          cpf: c.cpf || null,
          cnpj: c.cnpj || null,
          cpf_cnpj: c.cpf_cnpj || null,
          address: c.address || null,
          neighborhood: c.neighborhood || null,
          city: c.city || null,
          state: c.state || null,
          zip_code: c.zip_code || null,
          origin: 'import_perfex',
          client_funnel_type: 'juridico',
          created_by: user.id,
          assigned_to: user.id,
        });

        // Role
        await supabase.from('user_roles').insert({ user_id: userId, role: 'user' }).then(() => {}).catch(() => {});

        // Brand process
        const brandName = c.brand_name || c.company_name || c.full_name || email;
        await supabase.from('brand_processes').insert({
          user_id: userId,
          brand_name: brandName,
          business_area: c.business_area || null,
          status: 'em_andamento',
          pipeline_stage: 'protocolado',
        }).then(() => {}).catch(() => {});

        imported++;
      } catch (e) {
        errors++; errorDetails.push(`${email}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const nextOffset = offset + slice.length;
    const done = nextOffset >= total;

    return new Response(JSON.stringify({
      imported, skipped, errors,
      errorDetails: errorDetails.slice(0, 30),
      total, processed: nextOffset, nextOffset, done,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('import-perfex-customers error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

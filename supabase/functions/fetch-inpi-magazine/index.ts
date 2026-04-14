import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ATTORNEY_NAME = 'Davilys Danques Oliveira Cunha';
const ATTORNEY_SEARCH_TERM = 'davilys';
const INPI_BASE_URL = 'https://revistas.inpi.gov.br';

function normalizeText(str: string): string {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function convertBrazilianDateToISO(dateStr: string | null): string | null {
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.split('T')[0];
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  const altMatch = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (altMatch) return `${altMatch[3]}-${altMatch[2]}-${altMatch[1]}`;
  return null;
}

function calculateExpectedRpiNumber(): number {
  const referenceDate = new Date('2024-12-10');
  const referenceRpi = 2870;
  const today = new Date();
  const diffWeeks = Math.floor((today.getTime() - referenceDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return referenceRpi + diffWeeks;
}

// ========== INPI SESSION ==========

function extractCookies(response: Response): string[] {
  const cookies: string[] = [];
  try {
    const sc = (response.headers as any).getSetCookie?.();
    if (sc && sc.length > 0) return sc;
  } catch (_) { /* fallback */ }
  for (const [key, value] of response.headers.entries()) {
    if (key.toLowerCase() === 'set-cookie') cookies.push(value);
  }
  const raw = response.headers.get('set-cookie');
  if (raw && cookies.length === 0) cookies.push(raw);
  return cookies;
}

function mergeCookies(existing: string, newCookies: string[]): string {
  const cookieMap = new Map<string, string>();
  if (existing) {
    for (const part of existing.split(';')) {
      const trimmed = part.trim();
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) cookieMap.set(trimmed.substring(0, eqIdx).trim(), trimmed.substring(eqIdx + 1).trim());
    }
  }
  for (const cookie of newCookies) {
    const nameValue = cookie.split(';')[0].trim();
    const eqIdx = nameValue.indexOf('=');
    if (eqIdx > 0) cookieMap.set(nameValue.substring(0, eqIdx).trim(), nameValue.substring(eqIdx + 1).trim());
  }
  return Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function loginToInpi(): Promise<string | null> {
  const username = Deno.env.get('INPI_USERNAME');
  const password = Deno.env.get('INPI_PASSWORD');
  if (!username || !password) return null;

  try {
    const loginPageRes = await fetch(`${INPI_BASE_URL}/login/`, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' },
      redirect: 'manual',
    });
    const initialCookies = extractCookies(loginPageRes);
    let cookies = mergeCookies('', initialCookies);
    const loginHtml = await loginPageRes.text();

    const csrfMatch = loginHtml.match(/name=["']csrfmiddlewaretoken["']\s+value=["']([^"']+)["']/i);
    let csrfToken = csrfMatch ? csrfMatch[1] : '';
    const csrfCookieMatch = cookies.match(/csrftoken=([^;]+)/);
    if (!csrfToken && csrfCookieMatch) csrfToken = csrfCookieMatch[1];

    const actionMatch = loginHtml.match(/action=["']([^"']+)["']/i);
    const loginAction = actionMatch ? actionMatch[1] : `${INPI_BASE_URL}/login/`;
    const loginUrl = loginAction.startsWith('http') ? loginAction : `${INPI_BASE_URL}${loginAction}`;

    const formBody = new URLSearchParams();
    formBody.append('username', username);
    formBody.append('password', password);
    if (csrfToken) formBody.append('csrfmiddlewaretoken', csrfToken);

    const loginRes = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': `${INPI_BASE_URL}/login/`,
        'Origin': INPI_BASE_URL,
        ...(cookies ? { 'Cookie': cookies } : {}),
      },
      body: formBody.toString(),
      redirect: 'manual',
    });

    const loginResponseCookies = extractCookies(loginRes);
    cookies = mergeCookies(cookies, loginResponseCookies);
    const location = loginRes.headers.get('location') || '';
    await loginRes.text();

    if (location && (loginRes.status === 302 || loginRes.status === 301)) {
      const redirectUrl = location.startsWith('http') ? location : `${INPI_BASE_URL}${location}`;
      const redirectRes = await fetch(redirectUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': cookies },
        redirect: 'manual',
      });
      const redirectCookies = extractCookies(redirectRes);
      cookies = mergeCookies(cookies, redirectCookies);
      await redirectRes.text();
      return cookies;
    }
    return cookies || null;
  } catch (error) {
    console.error('INPI login error:', error);
    return null;
  }
}

async function fetchWithSession(url: string, sessionCookies: string | null): Promise<Response> {
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/zip,*/*;q=0.8',
    'Referer': `${INPI_BASE_URL}/rpi/`,
  };
  if (sessionCookies) headers['Cookie'] = sessionCookies;
  return fetch(url, { headers, redirect: 'follow' });
}

// ========== RPI LISTING ==========

async function fetchAvailableRpis(sessionCookies: string | null): Promise<{ latest: number; available: number[]; withXml: number[] }> {
  const expectedRpi = calculateExpectedRpiNumber();
  try {
    const response = await fetchWithSession(`${INPI_BASE_URL}/rpi/`, sessionCookies);
    if (!response.ok) { await response.text(); throw new Error(`Status ${response.status}`); }
    const html = await response.text();

    if (html.includes('id="login_form"') || html.includes('id_username')) {
      const fallback = Array.from({ length: 20 }, (_, i) => expectedRpi - i);
      return { latest: expectedRpi, available: fallback, withXml: [] };
    }

    const rpiNumbers: number[] = [];
    const tdRegex = /<td[^>]*>\s*(\d{4})\s*<\/td>/gi;
    let match;
    while ((match = tdRegex.exec(html)) !== null) {
      const num = parseInt(match[1]);
      if (num >= 2800 && num <= 3100) rpiNumbers.push(num);
    }
    const linkRegex = /rpi[\/\-_]?(\d{4})/gi;
    while ((match = linkRegex.exec(html)) !== null) {
      const num = parseInt(match[1]);
      if (num >= 2800 && num <= 3100 && !rpiNumbers.includes(num)) rpiNumbers.push(num);
    }

    const rpWithXml: number[] = [];
    const xmlPatterns = [/RM(\d{4})\.zip/gi];
    for (const pattern of xmlPatterns) {
      while ((match = pattern.exec(html)) !== null) {
        const num = parseInt(match[1]);
        if (num >= 2800 && num <= 3100 && !rpWithXml.includes(num)) rpWithXml.push(num);
      }
    }

    const uniqueNumbers = [...new Set(rpiNumbers)].sort((a, b) => b - a);
    const sortedWithXml = rpWithXml.sort((a, b) => b - a);

    if (uniqueNumbers.length > 0) {
      return { latest: uniqueNumbers[0], available: uniqueNumbers.slice(0, 20), withXml: sortedWithXml };
    }
    const fallback = Array.from({ length: 20 }, (_, i) => expectedRpi - i);
    return { latest: expectedRpi, available: fallback, withXml: [] };
  } catch (error) {
    console.error('Error fetching RPIs:', error);
    const fallback = Array.from({ length: 20 }, (_, i) => expectedRpi - i);
    return { latest: expectedRpi, available: fallback, withXml: [] };
  }
}

// ========== DISPATCH TYPE ==========

function determineDispatchType(code: string | null, text: string | null): string {
  const combined = normalizeText(`${code || ''} ${text || ''}`);
  if (combined.includes('deferimento') || combined.includes('deferido')) return 'Deferimento';
  if (combined.includes('indeferimento') || combined.includes('indeferido')) return 'Indeferimento';
  if (combined.includes('exigencia') || combined.includes('exigência')) return 'Exigência';
  if (combined.includes('oposicao') || combined.includes('oposição')) return 'Oposição';
  if (combined.includes('certificado') || combined.includes('concessao')) return 'Certificado';
  if (combined.includes('recurso')) return 'Recurso';
  if (combined.includes('arquivamento') || combined.includes('arquivado')) return 'Arquivamento';
  if (combined.includes('publicacao') || combined.includes('publicação')) return 'Publicação';
  if (combined.includes('sobrestamento') || combined.includes('sobrestado')) return 'Sobrestamento';
  if (combined.includes('anulacao') || combined.includes('anulação')) return 'Anulação';
  return 'Outro';
}

// ========== XML PARSING (streamed, memory-efficient) ==========

interface ExtractedProcess {
  processNumber: string;
  brandName: string | null;
  holderName: string | null;
  attorneyName: string | null;
  nclClasses: string[];
  dispatchCode: string | null;
  dispatchText: string | null;
  dispatchType: string | null;
  publicationDate: string | null;
}

function parseRpiXml(xmlContent: string, _rpiNumber: number): ExtractedProcess[] {
  const processes: ExtractedProcess[] = [];
  const MAX_PROCESSES = 300;
  const searchRegex = new RegExp(ATTORNEY_SEARCH_TERM, 'i');

  if (!searchRegex.test(xmlContent)) {
    console.log('Attorney not found in XML');
    return [];
  }

  const extractTagContent = (xml: string, tagName: string): string | null => {
    const startTag = `<${tagName}`;
    const endTag = `</${tagName}>`;
    const startIdx = xml.indexOf(startTag);
    if (startIdx === -1) return null;
    const endIdx = xml.indexOf(endTag, startIdx);
    if (endIdx === -1) return null;
    const tagEndIdx = xml.indexOf('>', startIdx);
    if (tagEndIdx === -1 || tagEndIdx > endIdx) return null;
    return xml.substring(tagEndIdx + 1, endIdx).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || null;
  };

  const extractAttribute = (xml: string, tagName: string, attrName: string): string | null => {
    const tagStart = xml.indexOf(`<${tagName}`);
    if (tagStart === -1) return null;
    const tagEnd = xml.indexOf('>', tagStart);
    if (tagEnd === -1) return null;
    const attrMatch = xml.substring(tagStart, tagEnd).match(new RegExp(`${attrName}\\s*=\\s*["']([^"']+)["']`, 'i'));
    return attrMatch ? attrMatch[1].trim() : null;
  };

  const headerSection = xmlContent.slice(0, 2000);
  const revistaMatch = headerSection.match(/<revista[^>]*data[^>]*=["']([^"']+)["']/i);
  const publicationDate = revistaMatch ? revistaMatch[1] : null;

  const chunks = xmlContent.split('</processo>');
  xmlContent = ''; // free memory

  const seenNumbers = new Set<string>();

  for (let i = 0; i < chunks.length - 1 && processes.length < MAX_PROCESSES; i++) {
    const chunk = chunks[i];
    if (!chunk || chunk.length < 50 || !searchRegex.test(chunk)) continue;

    const processoStart = chunk.lastIndexOf('<processo');
    if (processoStart === -1) continue;
    const block = chunk.substring(processoStart) + '</processo>';

    const numAttrMatch = block.match(/numero\s*=\s*["'](\d+)["']/i);
    let processNumber = numAttrMatch ? numAttrMatch[1] : null;
    if (!processNumber) {
      const numMatch = block.match(/(\d{9,12})/);
      processNumber = numMatch ? numMatch[1] : null;
    }
    if (!processNumber) continue;

    const cleanNumber = processNumber.replace(/\D/g, '');
    if (seenNumbers.has(cleanNumber)) continue;
    seenNumbers.add(cleanNumber);

    let brandName = extractTagContent(block, 'marca') || extractTagContent(block, 'nome') || extractTagContent(block, 'denominacao') || extractAttribute(block, 'marca', 'nome');
    if (brandName) brandName = brandName.replace(/<[^>]+>/g, '').trim();

    const holderName = extractAttribute(block, 'titular', 'nome-razao-social') || extractTagContent(block, 'titular') || extractTagContent(block, 'requerente');
    const dispatchCode = extractAttribute(block, 'despacho', 'codigo') || extractTagContent(block, 'codigo');
    const dispatchText = extractTagContent(block, 'texto-complementar') || extractTagContent(block, 'descricao');

    const nclClasses: string[] = [];
    const nclRegex = /classe-nice[^>]*codigo[^>]*=["'](\d+)["']/gi;
    let nclMatch;
    while ((nclMatch = nclRegex.exec(block)) !== null) nclClasses.push(nclMatch[1]);

    processes.push({
      processNumber: cleanNumber,
      brandName,
      holderName,
      attorneyName: ATTORNEY_NAME,
      nclClasses,
      dispatchCode,
      dispatchText,
      dispatchType: determineDispatchType(dispatchCode, dispatchText),
      publicationDate,
    });
  }

  console.log(`Extracted ${processes.length} processes`);
  return processes;
}

// ========== BACKGROUND PROCESSING ==========

async function processRpiInBackground(
  targetRpi: number,
  sessionCookies: string | null,
  uploadId: string,
  supabaseUrl: string,
  supabaseKey: string,
) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Download ZIP
    const urls = [
      `${INPI_BASE_URL}/txt/RM${targetRpi}.zip`,
      `${INPI_BASE_URL}/xml/RM${targetRpi}.zip`,
      `${INPI_BASE_URL}/rpi/RM${targetRpi}.zip`,
      `${INPI_BASE_URL}/txt/M${targetRpi}.zip`,
    ];

    let xmlContent: string | null = null;

    for (const url of urls) {
      try {
        const response = await fetchWithSession(url, sessionCookies);
        if (!response.ok) { await response.text(); continue; }

        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        if (bytes[0] === 0x50 && bytes[1] === 0x4B) {
          // ZIP file — use JSZip
          const { default: JSZip } = await import('https://esm.sh/jszip@3.10.1');
          const zip = await JSZip.loadAsync(arrayBuffer);
          const xmlFiles = Object.keys(zip.files).filter(name => name.toLowerCase().endsWith('.xml'));
          if (xmlFiles.length > 0) {
            xmlContent = await zip.files[xmlFiles[0]].async('string');
            console.log(`Extracted XML, size: ${xmlContent.length}`);
            break;
          }
        } else if (bytes[0] === 0x3C) {
          const text = new TextDecoder().decode(bytes);
          if (text.includes('<?xml') || text.includes('<revista') || text.includes('<processo')) {
            xmlContent = text;
            break;
          }
        }
      } catch (e) {
        console.log(`Error fetching ${url}: ${e}`);
      }
    }

    if (!xmlContent) {
      await supabase.from('rpi_uploads').update({
        status: 'failed',
        summary: `Não foi possível baixar o XML da RPI ${targetRpi}.`,
        processed_at: new Date().toISOString(),
      }).eq('id', uploadId);
      return;
    }

    // Parse
    const extractedProcesses = parseRpiXml(xmlContent, targetRpi);
    console.log(`Found ${extractedProcesses.length} processes`);

    if (extractedProcesses.length === 0) {
      await supabase.from('rpi_uploads').update({
        status: 'completed',
        total_processes_found: 0,
        total_clients_matched: 0,
        summary: `RPI ${targetRpi} analisada. Nenhum processo do procurador ${ATTORNEY_NAME} encontrado.`,
        processed_at: new Date().toISOString(),
      }).eq('id', uploadId);
      return;
    }

    // Match clients
    const { data: existingProcesses } = await supabase
      .from('brand_processes')
      .select('id, process_number, user_id, brand_name');

    const processMap = new Map(
      (existingProcesses || []).map(p => [p.process_number?.replace(/\D/g, ''), p])
    );

    let matchedClients = 0;
    const entries = extractedProcesses.map(proc => {
      const cleanNumber = proc.processNumber.replace(/\D/g, '');
      const existing = processMap.get(cleanNumber);
      if (existing?.user_id) matchedClients++;

      return {
        rpi_upload_id: uploadId,
        process_number: cleanNumber,
        brand_name: proc.brandName,
        holder_name: proc.holderName,
        attorney_name: proc.attorneyName || ATTORNEY_NAME,
        ncl_classes: proc.nclClasses.length > 0 ? proc.nclClasses : null,
        dispatch_code: proc.dispatchCode,
        dispatch_text: proc.dispatchText,
        dispatch_type: proc.dispatchType,
        publication_date: convertBrazilianDateToISO(proc.publicationDate),
        matched_client_id: existing?.user_id || null,
        matched_process_id: existing?.id || null,
        update_status: 'pending',
      };
    });

    await supabase.from('rpi_entries').insert(entries);

    const summary = `RPI ${targetRpi} processada. ${extractedProcesses.length} publicações encontradas, ${matchedClients} correspondem a clientes.`;
    await supabase.from('rpi_uploads').update({
      status: 'completed',
      total_processes_found: extractedProcesses.length,
      total_clients_matched: matchedClients,
      summary,
      processed_at: new Date().toISOString(),
    }).eq('id', uploadId);

    console.log(`Background processing complete: ${summary}`);
  } catch (error) {
    console.error('Background processing error:', error);
    await supabase.from('rpi_uploads').update({
      status: 'failed',
      summary: `Erro ao processar RPI ${targetRpi}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      processed_at: new Date().toISOString(),
    }).eq('id', uploadId);
  }
}

// ========== MAIN HANDLER ==========

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rpiNumber, mode } = await req.json();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Login
    const sessionCookies = await loginToInpi();

    // Fetch available RPIs (lightweight)
    const { latest, available, withXml } = await fetchAvailableRpis(sessionCookies);

    if (mode === 'list') {
      return new Response(
        JSON.stringify({
          success: true,
          latestRpi: latest,
          recentRpis: available,
          rpWithXml: withXml,
          authenticated: !!sessionCookies,
          message: `Última RPI: ${latest}. Com XML: ${withXml.slice(0, 5).join(', ') || 'nenhuma'}`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let targetRpi = rpiNumber || latest;
    if (!rpiNumber && withXml.length > 0 && !withXml.includes(targetRpi)) {
      targetRpi = withXml[0];
    }

    // Create upload record immediately
    const { data: rpiUpload, error: uploadError } = await supabase
      .from('rpi_uploads')
      .insert({
        file_name: `RPI_${targetRpi}_auto.xml`,
        file_path: `remote/RPI_${targetRpi}.xml`,
        rpi_number: targetRpi.toString(),
        rpi_date: new Date().toISOString().split('T')[0],
        status: 'processing',
        summary: `Processando RPI ${targetRpi} em segundo plano...`,
      })
      .select()
      .single();

    if (uploadError) throw uploadError;

    // Offload heavy work to background using EdgeRuntime.waitUntil
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    EdgeRuntime.waitUntil(
      processRpiInBackground(targetRpi, sessionCookies, rpiUpload.id, supabaseUrl, supabaseKey)
    );

    // Return immediately
    return new Response(
      JSON.stringify({
        success: true,
        rpiNumber: targetRpi,
        uploadId: rpiUpload.id,
        status: 'processing',
        message: `RPI ${targetRpi} está sendo processada em segundo plano. Acompanhe o status na lista de uploads.`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Erro ao processar RPI.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

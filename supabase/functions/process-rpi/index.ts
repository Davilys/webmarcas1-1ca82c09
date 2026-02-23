import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import * as pdfjsLib from "https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ATTORNEY_NAME = "Davilys Danques Oliveira Cunha";
// Busca simplificada apenas por "davilys" para capturar mais processos
const ATTORNEY_SEARCH_TERM = "davilys";

function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\n+/g, " ")
    .trim();
}

function containsAttorney(text: string): boolean {
  const normalized = normalizeText(text);
  // Busca simplificada apenas por "davilys"
  return normalized.includes(ATTORNEY_SEARCH_TERM);
}

function guessExtFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const pathname = u.pathname;
    const last = pathname.split("/").pop() || "";
    const ext = last.includes(".") ? last.split(".").pop() : null;
    return ext?.toLowerCase() || null;
  } catch {
    return null;
  }
}

async function downloadBytes(fileUrl: string): Promise<Uint8Array> {
  const fileResp = await fetch(fileUrl);
  if (!fileResp.ok) throw new Error("Falha ao baixar o arquivo do storage");
  return new Uint8Array(await fileResp.arrayBuffer());
}

async function extractTextFromXml(bytes: Uint8Array): Promise<string> {
  return new TextDecoder().decode(bytes);
}

async function extractTextFromExcel(bytes: Uint8Array): Promise<string> {
  const wb = XLSX.read(bytes, { type: "array" });
  const parts: string[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(ws);
    parts.push(`\n\n--- PLANILHA: ${sheetName} ---\n${csv}`);
  }

  return parts.join("\n");
}

async function extractTextFromPdf(bytes: Uint8Array): Promise<{ text: string; pages: number }> {
  // pdfjs-dist em Edge precisa do workerSrc configurado. No esm.sh o worker está em build/.
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc =
    "https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.mjs";


  const loadingTask = (pdfjsLib as any).getDocument({ data: bytes, disableWorker: true } as any);
  const pdf = await loadingTask.promise;

  let out = "";
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const strings = (content.items || [])
      .map((it: any) => (typeof it.str === "string" ? it.str : ""))
      .filter(Boolean);
    out += `\n\n--- PÁGINA ${pageNum} ---\n` + strings.join(" ");
  }

  return { text: out, pages: pdf.numPages };
}

function extractAttorneyBlocks(text: string): string[] {
  const blocks: string[] = [];
  const normalized = normalizeText(text);
  let idx = 0;

  // Busca simplificada apenas por "davilys"
  while ((idx = normalized.indexOf(ATTORNEY_SEARCH_TERM, idx)) !== -1) {
    // Capturar contexto amplo ao redor do nome (5000 chars antes e depois)
    const start = Math.max(0, idx - 5000);
    const end = Math.min(text.length, idx + ATTORNEY_SEARCH_TERM.length + 5000);
    const block = text.slice(start, end);

    if (!blocks.some((b) => b.includes(block.slice(100, 200)))) {
      blocks.push(block);
    }
    idx += ATTORNEY_SEARCH_TERM.length;
  }

  return blocks;
}

type AttorneyProcess = {
  process_number: string;
  brand_name?: string;
  ncl_classes?: string[];
  dispatch_code?: string;
  dispatch_type?: string;
  dispatch_text?: string;
  holder_name?: string;
  publication_date?: string;
};

async function aiExtractFromBlocks(args: {
  apiKey: string;
  blocks: string[];
}): Promise<AttorneyProcess[]> {
  const { apiKey, blocks } = args;
  if (blocks.length === 0) return [];

  const combinedText = blocks.join("\n\n---BLOCO---\n\n");

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Você é especialista em RPI (INPI). Extraia APENAS processos de MARCAS cujo procurador seja "${ATTORNEY_NAME}" (ou variações diretas).\n\nNão retorne patentes/desenhos/IG. Retorne apenas JSON válido.`,
        },
        {
          role: "user",
          content: `A seguir há blocos de texto onde o nome do procurador aparece.\n\nPara cada processo de MARCA identificado, retorne:\n- process_number (apenas dígitos)\n- brand_name\n- ncl_classes\n- dispatch_code\n- dispatch_type\n- dispatch_text (resumido)\n- holder_name\n- publication_date (YYYY-MM-DD, se disponível)\n\nFormato obrigatório (somente JSON):\n{"attorney_processes":[{"process_number":"...","brand_name":"...","ncl_classes":["35"],"dispatch_code":"...","dispatch_type":"...","dispatch_text":"...","holder_name":"...","publication_date":"YYYY-MM-DD"}]}\n\nSe não houver processos de marca, retorne: {"attorney_processes":[]}\n\nBLOCOS:\n${combinedText}`,
        },
      ],
      max_tokens: 6000,
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    console.error("AI blocks error:", resp.status, t);
    const err = new Error(`AI error ${resp.status}`);
    // @ts-ignore
    err.status = resp.status;
    throw err;
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || "";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const arr = parsed.attorney_processes;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let rpiUploadId: string | undefined;

  try {
    const body = await req.json();
    rpiUploadId = body?.rpiUploadId;
    const fileUrl = body?.fileUrl;

    if (!rpiUploadId || !fileUrl) {
      return new Response(JSON.stringify({ error: "rpiUploadId e fileUrl são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Reprocessamento: limpar entradas antigas deste upload para não duplicar.
    await supabase.from("rpi_entries").delete().eq("rpi_upload_id", rpiUploadId);

    await supabase.from("rpi_uploads").update({ status: "processing" }).eq("id", rpiUploadId);

    const ext = guessExtFromUrl(fileUrl);
    const processingDetails: any = {
      format: ext || "unknown",
      extracted_text_chars: 0,
      extracted_pages: null,
      blocksFound: 0,
      note: null,
    };

    let fullText = "";

    if (ext === "pdf") {
      console.log("Downloading PDF...");
      const bytes = await downloadBytes(fileUrl);
      console.log("Extracting text from PDF...");
      const pdf = await extractTextFromPdf(bytes);
      fullText = pdf.text;
      processingDetails.extracted_pages = pdf.pages;
      processingDetails.extracted_text_chars = fullText.length;
    } else if (ext === "xml") {
      const bytes = await downloadBytes(fileUrl);
      fullText = await extractTextFromXml(bytes);
      processingDetails.extracted_text_chars = fullText.length;
    } else if (ext === "xlsx" || ext === "xls") {
      const bytes = await downloadBytes(fileUrl);
      fullText = await extractTextFromExcel(bytes);
      processingDetails.extracted_text_chars = fullText.length;
    } else {
      await supabase
        .from("rpi_uploads")
        .update({
          status: "error",
          summary: `Formato não suportado (${ext || "desconhecido"}). Envie PDF, XML, XLSX ou XLS.`,
        })
        .eq("id", rpiUploadId);

      return new Response(JSON.stringify({ error: "Unsupported file format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!fullText || fullText.trim().length < 100) {
      processingDetails.note = "texto_extraido_vazio";
      await supabase
        .from("rpi_uploads")
        .update({
          status: "completed",
          total_processes_found: 0,
          total_clients_matched: 0,
          summary:
            `Arquivo lido, porém não foi possível extrair texto suficiente para identificar processos. ` +
            `Se este PDF for digitalizado (imagem), envie o XML da edição ou uma planilha (Excel) para leitura estruturada.`,
          processed_at: new Date().toISOString(),
        })
        .eq("id", rpiUploadId);

      return new Response(
        JSON.stringify({
          success: true,
          total_processes: 0,
          matched_clients: 0,
          processing_details: processingDetails,
          summary:
            `Arquivo lido, porém não foi possível extrair texto suficiente para identificar processos. ` +
            `Se este PDF for digitalizado (imagem), envie o XML da edição ou uma planilha (Excel) para leitura estruturada.`,
          entries: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!containsAttorney(fullText)) {
      await supabase
        .from("rpi_uploads")
        .update({
          status: "completed",
          total_processes_found: 0,
          total_clients_matched: 0,
          summary:
            `Nenhum processo do procurador ${ATTORNEY_NAME} foi localizado nesta edição da Revista do INPI. ` +
            `O arquivo foi lido com sucesso (${processingDetails.format.toUpperCase()}, ${processingDetails.extracted_text_chars.toLocaleString()} caracteres).`,
          processed_at: new Date().toISOString(),
        })
        .eq("id", rpiUploadId);

      return new Response(
        JSON.stringify({
          success: true,
          total_processes: 0,
          matched_clients: 0,
          processing_details: processingDetails,
          summary: `Nenhum processo do procurador ${ATTORNEY_NAME} foi localizado nesta edição da Revista do INPI.`,
          entries: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const blocks = extractAttorneyBlocks(fullText);
    processingDetails.blocksFound = blocks.length;

    // Processar em lotes para não estourar contexto
    const batchSize = 10;
    const collected: AttorneyProcess[] = [];

    for (let i = 0; i < blocks.length; i += batchSize) {
      const batch = blocks.slice(i, i + batchSize);
      console.log(`AI batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(blocks.length / batchSize)}`);
      try {
        const found = await aiExtractFromBlocks({ apiKey: OPENAI_API_KEY, blocks: batch });
        collected.push(...found);
      } catch (e) {
        const status = (e as any)?.status;
        if (status === 429) {
          await supabase
            .from("rpi_uploads")
            .update({ status: "error", summary: "Limite de requisições excedido. Tente novamente em alguns minutos." })
            .eq("id", rpiUploadId);
          return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          await supabase
            .from("rpi_uploads")
            .update({ status: "error", summary: "Créditos de IA esgotados. Adicione créditos para continuar." })
            .eq("id", rpiUploadId);
          return new Response(JSON.stringify({ error: "Payment required" }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.error("AI batch error:", e);
      }
    }

    // Deduplicar por número do processo
    const byProcess = new Map<string, AttorneyProcess>();
    for (const p of collected) {
      const clean = (p.process_number || "").toString().replace(/\D/g, "");
      if (!clean) continue;
      if (!byProcess.has(clean)) byProcess.set(clean, { ...p, process_number: clean });
    }

    const attorneyProcesses = Array.from(byProcess.values());

    // Match com processos existentes
    const { data: existingProcesses } = await supabase
      .from("brand_processes")
      .select("id, process_number, brand_name, user_id");

    const matchedEntries = attorneyProcesses.map((entry) => {
      let matchedClientId: string | null = null;
      let matchedProcessId: string | null = null;

      const cleanProcessNumber = entry.process_number?.toString().replace(/\D/g, "");

      if (cleanProcessNumber && existingProcesses) {
        const processMatch = existingProcesses.find((p) => p.process_number === cleanProcessNumber);
        if (processMatch) {
          matchedProcessId = processMatch.id;
          matchedClientId = processMatch.user_id;
        }
      }

      if (!matchedClientId && entry.brand_name && existingProcesses) {
        const brandMatch = existingProcesses.find(
          (p) => normalizeText(p.brand_name) === normalizeText(entry.brand_name || "")
        );
        if (brandMatch) {
          matchedProcessId = brandMatch.id;
          matchedClientId = brandMatch.user_id;
        }
      }

      return {
        rpi_upload_id: rpiUploadId,
        process_number: cleanProcessNumber || "",
        brand_name: entry.brand_name || "",
        ncl_classes: entry.ncl_classes || [],
        dispatch_type: entry.dispatch_type || "",
        dispatch_code: entry.dispatch_code || "",
        dispatch_text: entry.dispatch_text || "",
        publication_date: entry.publication_date || null,
        holder_name: entry.holder_name || "",
        attorney_name: ATTORNEY_NAME,
        matched_client_id: matchedClientId,
        matched_process_id: matchedProcessId,
        update_status: "pending",
      };
    });

    if (matchedEntries.length > 0) {
      const { error: insertError } = await supabase.from("rpi_entries").insert(matchedEntries);
      if (insertError) console.error("Insert error:", insertError);
    }

    const matchedCount = matchedEntries.filter((e: any) => e.matched_client_id).length;

    const summary =
      matchedEntries.length === 0
        ? `Nenhum processo do procurador ${ATTORNEY_NAME} foi localizado nesta edição da Revista do INPI.`
        : `Encontrados ${matchedEntries.length} processo(s) do procurador ${ATTORNEY_NAME}, ${matchedCount} correspondem a clientes.`;

    await supabase
      .from("rpi_uploads")
      .update({
        status: "completed",
        total_processes_found: matchedEntries.length,
        total_clients_matched: matchedCount,
        summary,
        processed_at: new Date().toISOString(),
      })
      .eq("id", rpiUploadId);

    return new Response(
      JSON.stringify({
        success: true,
        total_processes: matchedEntries.length,
        matched_clients: matchedCount,
        processing_details: processingDetails,
        summary,
        entries: matchedEntries,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Process RPI error:", error);

    if (rpiUploadId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        await supabase
          .from("rpi_uploads")
          .update({
            status: "error",
            summary: `Erro durante o processamento: ${error instanceof Error ? error.message : "Erro desconhecido"}.`,
          })
          .eq("id", rpiUploadId);
      } catch {
        // ignore
      }
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro desconhecido",
        details: "O arquivo foi recebido, mas não foi possível processá-lo. Verifique se o formato está correto (PDF, XML, XLSX ou XLS).",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

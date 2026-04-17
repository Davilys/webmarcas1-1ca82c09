import JSZip from 'jszip';
import { supabase } from '@/integrations/supabase/client';

// ── Types ──
export interface DocManifestEntry {
  name: string;
  file_url: string;
  document_type: string | null;
  mime_type: string | null;
  file_size: number | null;
  protocol: string | null;
  created_at: string | null;
  client_email: string | null;
  client_name: string | null;
  brand_name: string | null;
  process_id: string | null;
  user_id: string | null;
  contract_id: string | null;
  contract_number: string | null; // for re-linking after contract import
  zip_filename: string;
  storage_path: string | null; // preserve original storage subfolder
}

export interface ContractManifestEntry {
  // Identity
  contract_number: string | null;
  subject: string | null;
  description: string | null;
  document_type: string | null;
  contract_type: string | null;
  contract_type_name: string | null;
  template_name: string | null;
  // Financial
  contract_value: number | null;
  penalty_value: number | null;
  payment_method: string | null;
  custom_due_date: string | null;
  asaas_payment_id: string | null;
  // Dates
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  signed_at: string | null;
  signature_expires_at: string | null;
  // Visibility
  visible_to_client: boolean | null;
  // Client / parties
  client_email: string | null;
  client_name: string | null;
  brand_name: string | null; // resolves process_id
  signatory_name: string | null;
  signatory_cpf: string | null;
  signatory_cnpj: string | null;
  // Content
  contract_html: string | null;
  suggested_classes: any | null;
  // Signature legal proof
  signature_status: string | null;
  signature_token: string | null;
  signature_ip: string | null;
  signature_user_agent: string | null;
  ip_address: string | null;
  user_agent: string | null;
  device_info: any | null;
  client_signature_image: string | null;
  contractor_signature_image: string | null;
  // Blockchain proof
  blockchain_hash: string | null;
  blockchain_timestamp: string | null;
  blockchain_tx_id: string | null;
  blockchain_network: string | null;
  blockchain_proof: string | null;
  ots_file_url: string | null;
  ots_zip_filename: string | null; // path in zip if downloaded
  // Attached PDFs (zip filenames)
  attached_pdfs: { zip_filename: string; original_url: string; name: string; storage_path: string | null }[];
}

export interface ZipProgress {
  current: number;
  total: number;
  label: string;
  phase: 'fetching' | 'downloading' | 'zipping' | 'uploading' | 'creating';
}

// ── Helpers ──
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\-() ]/g, '_').slice(0, 100);
}

async function fetchFileAsBlob(url: string): Promise<Blob | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    return await resp.blob();
  } catch {
    return null;
  }
}

/** Extract storage subpath after `/object/public/<bucket>/` so we can preserve folder structure */
function extractStoragePath(publicUrl: string, bucket = 'documents'): string | null {
  try {
    const marker = `/object/public/${bucket}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(publicUrl.substring(idx + marker.length).split('?')[0]);
  } catch {
    return null;
  }
}

const SIZE_WARNING_BYTES = 400 * 1024 * 1024; // 400 MB

// ── EXPORT DOCUMENTS ZIP ──
export async function exportDocumentsZip(
  onProgress: (p: ZipProgress) => void,
  options?: { skipSizeCheck?: boolean }
): Promise<{ blob: Blob; totalFiles: number; estimatedSize: number }> {
  onProgress({ current: 0, total: 1, label: 'Buscando documentos...', phase: 'fetching' });

  const { data: docs, error } = await supabase
    .from('documents')
    .select('*, profiles(full_name, email), brand_processes(brand_name), contracts(contract_number)')
    .order('created_at', { ascending: false });

  if (error) throw new Error('Erro ao buscar documentos');
  if (!docs || docs.length === 0) throw new Error('Nenhum documento encontrado');

  // Size validation
  const estimatedSize = docs.reduce((acc, d: any) => acc + (d.file_size || 0), 0);
  if (!options?.skipSizeCheck && estimatedSize > SIZE_WARNING_BYTES) {
    throw new Error(
      `SIZE_WARNING:${estimatedSize}:${docs.length}`
    );
  }

  const zip = new JSZip();
  const manifest: DocManifestEntry[] = [];
  const usedNames = new Set<string>();
  const total = docs.length;

  for (let i = 0; i < docs.length; i++) {
    const d: any = docs[i];
    onProgress({ current: i + 1, total, label: d.name, phase: 'downloading' });

    const ext = d.file_url.split('.').pop()?.split('?')[0] || 'bin';
    let baseName = sanitizeFilename(d.protocol ? `${d.protocol}_${d.name}` : d.name);
    let zipName = `files/${baseName}.${ext}`;
    let counter = 1;
    while (usedNames.has(zipName)) {
      zipName = `files/${baseName}_${counter}.${ext}`;
      counter++;
    }
    usedNames.add(zipName);

    const blob = await fetchFileAsBlob(d.file_url);
    if (blob) zip.file(zipName, blob);

    manifest.push({
      name: d.name,
      file_url: d.file_url,
      document_type: d.document_type,
      mime_type: d.mime_type,
      file_size: d.file_size,
      protocol: d.protocol || null,
      created_at: d.created_at,
      client_email: d.profiles?.email || null,
      client_name: d.profiles?.full_name || null,
      brand_name: d.brand_processes?.brand_name || null,
      process_id: d.process_id,
      user_id: d.user_id,
      contract_id: d.contract_id || null,
      contract_number: d.contracts?.contract_number || null,
      zip_filename: zipName,
      storage_path: extractStoragePath(d.file_url),
    });
  }

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  onProgress({ current: total, total, label: 'Compactando ZIP...', phase: 'zipping' });
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return { blob: zipBlob, totalFiles: manifest.length, estimatedSize };
}

// ── IMPORT DOCUMENTS ZIP ──
export async function importDocumentsZip(
  file: File,
  onProgress: (p: ZipProgress) => void
): Promise<{ imported: number; failed: number; errors: string[] }> {
  onProgress({ current: 0, total: 1, label: 'Lendo ZIP...', phase: 'fetching' });

  const zip = await JSZip.loadAsync(file);
  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) throw new Error('ZIP inválido: manifest.json não encontrado');

  const manifest: DocManifestEntry[] = JSON.parse(await manifestFile.async('text'));
  if (!Array.isArray(manifest) || manifest.length === 0) {
    throw new Error('Manifest vazio ou inválido');
  }

  // Integrity check: warn if manifest references files not present in the ZIP
  const integrityWarnings: string[] = [];
  let missingFiles = 0;
  for (const m of manifest) {
    if (m.zip_filename && !zip.file(m.zip_filename)) missingFiles++;
  }
  if (missingFiles > 0) {
    integrityWarnings.push(
      `Aviso de integridade: ${missingFiles}/${manifest.length} arquivos referenciados no manifest não foram encontrados no ZIP (apenas metadados serão importados para esses).`
    );
  }

  // `documents.uploaded_by` is `text` (default 'system'). We store the admin's UUID as a string
  // for traceability; falls back to 'import_zip' if no auth session is available.
  const { data: authData } = await supabase.auth.getUser();
  const adminUserId = authData?.user?.id || 'import_zip';

  // Build lookups
  const emails = [...new Set(manifest.map((m) => m.client_email).filter(Boolean))] as string[];
  const profileMap = new Map<string, string>();
  for (let i = 0; i < emails.length; i += 50) {
    const batch = emails.slice(i, i + 50);
    const { data } = await supabase.from('profiles').select('id, email').in('email', batch);
    data?.forEach((p) => profileMap.set(p.email, p.id));
  }

  const brands = [...new Set(manifest.map((m) => m.brand_name).filter(Boolean))] as string[];
  const processMap = new Map<string, string>();
  if (brands.length > 0) {
    const { data } = await supabase.from('brand_processes').select('id, brand_name');
    data?.forEach((p) => processMap.set(p.brand_name, p.id));
  }

  // Map contract_number → contract_id (resolved AFTER contract import for proper linking)
  const contractNumbers = [...new Set(manifest.map((m) => m.contract_number).filter(Boolean))] as string[];
  const contractMap = new Map<string, string>();
  if (contractNumbers.length > 0) {
    for (let i = 0; i < contractNumbers.length; i += 50) {
      const batch = contractNumbers.slice(i, i + 50);
      const { data } = await supabase.from('contracts').select('id, contract_number').in('contract_number', batch);
      data?.forEach((c) => c.contract_number && contractMap.set(c.contract_number, c.id));
    }
  }

  let imported = 0;
  let failed = 0;
  const errors: string[] = [];
  const total = manifest.length;

  for (let i = 0; i < manifest.length; i++) {
    const entry = manifest[i];
    onProgress({ current: i + 1, total, label: entry.name, phase: 'uploading' });

    try {
      const zipFile = zip.file(entry.zip_filename);
      let fileUrl = entry.file_url;

      if (zipFile) {
        const blob = await zipFile.async('blob');
        const ext = entry.zip_filename.split('.').pop() || 'bin';
        // Preserve original storage path subfolder when possible
        const originalSubfolder = entry.storage_path?.split('/').slice(0, -1).join('/') || 'imported';
        const storagePath = `${originalSubfolder}/${Date.now()}_${i}.${ext}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(storagePath, blob, {
            contentType: entry.mime_type || 'application/octet-stream',
            upsert: false,
          });

        if (uploadError) {
          errors.push(`Upload falhou: ${entry.name} - ${uploadError.message}`);
          failed++;
          continue;
        }

        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(uploadData.path);
        fileUrl = urlData.publicUrl;
      }

      const userId = entry.client_email ? profileMap.get(entry.client_email) || null : null;
      const processId = entry.brand_name ? processMap.get(entry.brand_name) || null : null;
      const contractId = entry.contract_number ? contractMap.get(entry.contract_number) || null : entry.contract_id || null;

      const { error: insertError } = await (supabase as any).from('documents').insert({
        name: entry.name,
        file_url: fileUrl,
        document_type: entry.document_type || 'outro',
        mime_type: entry.mime_type,
        file_size: entry.file_size,
        protocol: entry.protocol,
        user_id: userId,
        process_id: processId,
        contract_id: contractId,
        uploaded_by: adminUserId, // text column; stores admin UUID or 'import_zip'
      });

      if (insertError) {
        errors.push(`Inserção falhou: ${entry.name} - ${insertError.message}`);
        failed++;
      } else {
        imported++;
      }
    } catch (err: any) {
      errors.push(`Erro: ${entry.name} - ${err.message}`);
      failed++;
    }
  }

  return { imported, failed, errors: [...integrityWarnings, ...errors] };
}

// ── EXPORT CONTRACTS ZIP ──
export async function exportContractsZip(
  onProgress: (p: ZipProgress) => void,
  options?: { skipSizeCheck?: boolean }
): Promise<{ blob: Blob; totalContracts: number; estimatedSize: number }> {
  onProgress({ current: 0, total: 1, label: 'Buscando contratos...', phase: 'fetching' });

  const { data: contracts, error } = await supabase
    .from('contracts')
    .select(`
      *,
      contract_type_rel:contract_types(name),
      contract_template:contract_templates(name),
      profile:profiles(full_name, email, phone),
      process:brand_processes(brand_name)
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Erro ao buscar contratos');
  if (!contracts || contracts.length === 0) throw new Error('Nenhum contrato encontrado');

  // Estimate size from associated documents
  const contractIds = contracts.map((c: any) => c.id);
  let estimatedSize = 0;
  if (contractIds.length > 0) {
    const { data: relatedDocs } = await supabase
      .from('documents')
      .select('file_size')
      .in('contract_id', contractIds);
    estimatedSize = (relatedDocs || []).reduce((acc, d: any) => acc + (d.file_size || 0), 0);
  }
  if (!options?.skipSizeCheck && estimatedSize > SIZE_WARNING_BYTES) {
    throw new Error(`SIZE_WARNING:${estimatedSize}:${contracts.length}`);
  }

  const zip = new JSZip();
  const manifest: ContractManifestEntry[] = [];
  const total = contracts.length;

  for (let i = 0; i < contracts.length; i++) {
    const c: any = contracts[i];
    onProgress({
      current: i + 1,
      total,
      label: c.contract_number || c.subject || `Contrato ${i + 1}`,
      phase: 'downloading',
    });

    const safeKey = sanitizeFilename(c.contract_number || c.id);

    // Download attached PDFs
    const attachedPdfs: ContractManifestEntry['attached_pdfs'] = [];
    const { data: docs } = await supabase.from('documents').select('*').eq('contract_id', c.id);
    if (docs && docs.length > 0) {
      for (const doc of docs) {
        const blob = await fetchFileAsBlob(doc.file_url);
        if (blob) {
          const ext = doc.file_url.split('.').pop()?.split('?')[0] || 'pdf';
          const pdfName = `contract_pdfs/${safeKey}_${sanitizeFilename(doc.name)}.${ext}`;
          zip.file(pdfName, blob);
          attachedPdfs.push({
            zip_filename: pdfName,
            original_url: doc.file_url,
            name: doc.name,
            storage_path: extractStoragePath(doc.file_url),
          });
        }
      }
    }

    // Download .ots blockchain proof
    let otsZipFilename: string | null = null;
    if (c.ots_file_url) {
      const otsBlob = await fetchFileAsBlob(c.ots_file_url);
      if (otsBlob) {
        otsZipFilename = `ots_proofs/${safeKey}.ots`;
        zip.file(otsZipFilename, otsBlob);
      }
    }

    manifest.push({
      contract_number: c.contract_number,
      subject: c.subject,
      description: c.description,
      document_type: c.document_type,
      contract_type: c.contract_type,
      contract_type_name: c.contract_type_rel?.name || null,
      template_name: c.contract_template?.name || null,
      contract_value: c.contract_value,
      penalty_value: c.penalty_value,
      payment_method: c.payment_method,
      custom_due_date: c.custom_due_date,
      asaas_payment_id: c.asaas_payment_id,
      start_date: c.start_date,
      end_date: c.end_date,
      created_at: c.created_at,
      signed_at: c.signed_at,
      signature_expires_at: c.signature_expires_at,
      visible_to_client: c.visible_to_client,
      client_email: c.profile?.email || null,
      client_name: c.profile?.full_name || null,
      brand_name: c.process?.brand_name || null,
      signatory_name: c.signatory_name,
      signatory_cpf: c.signatory_cpf,
      signatory_cnpj: c.signatory_cnpj,
      contract_html: c.contract_html,
      suggested_classes: c.suggested_classes,
      signature_status: c.signature_status,
      signature_token: c.signature_token,
      signature_ip: c.signature_ip,
      signature_user_agent: c.signature_user_agent,
      ip_address: c.ip_address,
      user_agent: c.user_agent,
      device_info: c.device_info,
      client_signature_image: c.client_signature_image,
      contractor_signature_image: c.contractor_signature_image,
      blockchain_hash: c.blockchain_hash,
      blockchain_timestamp: c.blockchain_timestamp,
      blockchain_tx_id: c.blockchain_tx_id,
      blockchain_network: c.blockchain_network,
      blockchain_proof: c.blockchain_proof,
      ots_file_url: c.ots_file_url,
      ots_zip_filename: otsZipFilename,
      attached_pdfs: attachedPdfs,
    });
  }

  zip.file('contracts_manifest.json', JSON.stringify(manifest, null, 2));

  onProgress({ current: total, total, label: 'Compactando ZIP...', phase: 'zipping' });
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return { blob: zipBlob, totalContracts: manifest.length, estimatedSize };
}

// ── IMPORT CONTRACTS ZIP ──
export async function importContractsZip(
  file: File,
  onProgress: (p: ZipProgress) => void
): Promise<{ imported: number; failed: number; errors: string[]; renumbered: number }> {
  onProgress({ current: 0, total: 1, label: 'Lendo ZIP...', phase: 'fetching' });

  const zip = await JSZip.loadAsync(file);
  const manifestFile = zip.file('contracts_manifest.json');
  if (!manifestFile) throw new Error('ZIP inválido: contracts_manifest.json não encontrado');

  const manifest: ContractManifestEntry[] = JSON.parse(await manifestFile.async('text'));
  if (!Array.isArray(manifest) || manifest.length === 0) {
    throw new Error('Manifest vazio ou inválido');
  }

  // Integrity check
  const integrityWarnings: string[] = [];
  let missingAssets = 0;
  let totalAssets = 0;
  for (const m of manifest) {
    if (m.ots_zip_filename) {
      totalAssets++;
      if (!zip.file(m.ots_zip_filename)) missingAssets++;
    }
    for (const p of m.attached_pdfs || []) {
      totalAssets++;
      if (!zip.file(p.zip_filename)) missingAssets++;
    }
  }
  if (missingAssets > 0) {
    integrityWarnings.push(
      `Aviso de integridade: ${missingAssets}/${totalAssets} arquivos (.ots/PDFs) referenciados não foram encontrados no ZIP.`
    );
  }

  const { data: authData } = await supabase.auth.getUser();
  const adminUserId = authData?.user?.id || null;

  // Lookup maps
  const emails = [...new Set(manifest.map((m) => m.client_email).filter(Boolean))] as string[];
  const profileMap = new Map<string, string>();
  for (let i = 0; i < emails.length; i += 50) {
    const batch = emails.slice(i, i + 50);
    const { data } = await supabase.from('profiles').select('id, email').in('email', batch);
    data?.forEach((p) => profileMap.set(p.email, p.id));
  }

  const brands = [...new Set(manifest.map((m) => m.brand_name).filter(Boolean))] as string[];
  const processMap = new Map<string, string>();
  if (brands.length > 0) {
    const { data } = await supabase.from('brand_processes').select('id, brand_name');
    data?.forEach((p) => processMap.set(p.brand_name, p.id));
  }

  const { data: templates } = await supabase.from('contract_templates').select('id, name');
  const { data: types } = await supabase.from('contract_types').select('id, name');
  const templateMap = new Map<string, string>();
  const typeMap = new Map<string, string>();
  templates?.forEach((t) => templateMap.set(t.name, t.id));
  types?.forEach((t) => typeMap.set(t.name, t.id));

  // Existing contract numbers to detect collisions
  const { data: existing } = await supabase
    .from('contracts')
    .select('contract_number')
    .not('contract_number', 'is', null);
  const existingNumbers = new Set((existing || []).map((c: any) => c.contract_number));

  let imported = 0;
  let failed = 0;
  let renumbered = 0;
  const errors: string[] = [];
  const total = manifest.length;

  for (let i = 0; i < manifest.length; i++) {
    const entry = manifest[i];
    onProgress({
      current: i + 1,
      total,
      label: entry.contract_number || `Contrato ${i + 1}`,
      phase: 'creating',
    });

    try {
      const userId = entry.client_email ? profileMap.get(entry.client_email) || null : null;
      const templateId = entry.template_name ? templateMap.get(entry.template_name) || null : null;
      const typeId = entry.contract_type_name ? typeMap.get(entry.contract_type_name) || null : null;
      const processId = entry.brand_name ? processMap.get(entry.brand_name) || null : null;

      // Handle contract_number collision
      let contractNumber = entry.contract_number;
      if (contractNumber && existingNumbers.has(contractNumber)) {
        contractNumber = `${contractNumber}_imp_${Date.now()}`;
        renumbered++;
        errors.push(`Aviso: ${entry.contract_number} renumerado para ${contractNumber}`);
      }
      if (contractNumber) existingNumbers.add(contractNumber);

      // Re-upload .ots proof if present. If upload fails, NULL the URL to avoid orphan link to project A.
      let otsFileUrl: string | null = null;
      if (entry.ots_zip_filename) {
        const otsFile = zip.file(entry.ots_zip_filename);
        if (otsFile) {
          const otsBlob = await otsFile.async('blob');
          const otsPath = `ots-proofs/${Date.now()}_${i}.ots`;
          const { data: otsUpload, error: otsErr } = await supabase.storage
            .from('documents')
            .upload(otsPath, otsBlob, { contentType: 'application/octet-stream', upsert: false });
          if (!otsErr && otsUpload) {
            otsFileUrl = supabase.storage.from('documents').getPublicUrl(otsUpload.path).data.publicUrl;
          } else {
            errors.push(`Aviso: falha ao re-enviar prova .ots de ${entry.contract_number || i} (${otsErr?.message || 'desconhecido'}) — link removido para evitar URL órfã.`);
          }
        } else {
          errors.push(`Aviso: prova .ots ausente no ZIP para ${entry.contract_number || i}.`);
        }
      } else if (entry.ots_file_url) {
        // Original had ots_file_url but no bundled file — keep null to avoid pointing to project A
        errors.push(`Aviso: ${entry.contract_number || i} tinha ots_file_url no manifest mas o arquivo não foi incluído no ZIP.`);
      }

      const { data: newContract, error: insertError } = await (supabase as any)
        .from('contracts')
        .insert({
          contract_number: contractNumber,
          subject: entry.subject,
          description: entry.description,
          document_type: entry.document_type || 'contract',
          contract_type: entry.contract_type,
          contract_type_id: typeId,
          template_id: templateId,
          contract_value: entry.contract_value,
          penalty_value: entry.penalty_value,
          payment_method: entry.payment_method,
          custom_due_date: entry.custom_due_date,
          asaas_payment_id: entry.asaas_payment_id,
          start_date: entry.start_date,
          end_date: entry.end_date,
          signed_at: entry.signed_at,
          signature_expires_at: entry.signature_expires_at,
          visible_to_client: entry.visible_to_client ?? true,
          user_id: userId,
          process_id: processId,
          signatory_name: entry.signatory_name,
          signatory_cpf: entry.signatory_cpf,
          signatory_cnpj: entry.signatory_cnpj,
          contract_html: entry.contract_html,
          suggested_classes: entry.suggested_classes,
          // Signature legal proof
          signature_status: entry.signature_status || 'not_signed',
          signature_token: entry.signature_token,
          signature_ip: entry.signature_ip,
          signature_user_agent: entry.signature_user_agent,
          ip_address: entry.ip_address,
          user_agent: entry.user_agent,
          device_info: entry.device_info,
          client_signature_image: entry.client_signature_image,
          contractor_signature_image: entry.contractor_signature_image,
          // Blockchain proof — preserved as-is to maintain hash validity
          blockchain_hash: entry.blockchain_hash,
          blockchain_timestamp: entry.blockchain_timestamp,
          blockchain_tx_id: entry.blockchain_tx_id,
          blockchain_network: entry.blockchain_network,
          blockchain_proof: entry.blockchain_proof,
          ots_file_url: otsFileUrl,
          created_by: adminUserId,
        })
        .select('id')
        .single();

      if (insertError) {
        errors.push(`Contrato ${entry.contract_number || i}: ${insertError.message}`);
        failed++;
        continue;
      }

      // Upload attached PDFs preserving original folder
      if (entry.attached_pdfs.length > 0 && newContract?.id) {
        for (let p = 0; p < entry.attached_pdfs.length; p++) {
          const pdf = entry.attached_pdfs[p];
          onProgress({
            current: i + 1,
            total,
            label: `${entry.contract_number || `Contrato ${i + 1}`} — PDF ${p + 1}/${entry.attached_pdfs.length}`,
            phase: 'uploading',
          });
          const pdfFile = zip.file(pdf.zip_filename);
          if (!pdfFile) {
            errors.push(`Aviso: PDF ${pdf.name} ausente no ZIP (contrato ${entry.contract_number || i}).`);
            continue;
          }
          const blob = await pdfFile.async('blob');
          const ext = pdf.zip_filename.split('.').pop() || 'pdf';
          const subfolder = pdf.storage_path?.split('/').slice(0, -1).join('/') || 'signed-contracts';
          const storagePath = `${subfolder}/${Date.now()}_${p}_contract_${i}.${ext}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(storagePath, blob, { contentType: 'application/pdf', upsert: false });

          if (uploadError || !uploadData) {
            errors.push(`Falha ao enviar PDF ${pdf.name} (contrato ${entry.contract_number || i}): ${uploadError?.message || 'desconhecido'}`);
            continue;
          }

          const url = supabase.storage.from('documents').getPublicUrl(uploadData.path).data.publicUrl;
          const { error: docInsertErr } = await (supabase as any).from('documents').insert({
            name: pdf.name || pdf.zip_filename.split('/').pop() || 'documento.pdf',
            file_url: url,
            document_type: 'contrato',
            mime_type: 'application/pdf',
            user_id: userId,
            contract_id: newContract.id,
            uploaded_by: adminUserId || 'import_zip',
          });
          if (docInsertErr) {
            errors.push(`PDF enviado mas registro falhou (${pdf.name}): ${docInsertErr.message}`);
          }
        }
      }

      imported++;
    } catch (err: any) {
      errors.push(`Erro: ${entry.contract_number || i} - ${err.message}`);
      failed++;
    }
  }

  return { imported, failed, errors: [...integrityWarnings, ...errors], renumbered };
}

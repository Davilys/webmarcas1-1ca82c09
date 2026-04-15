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
  zip_filename: string;
}

export interface ContractManifestEntry {
  contract_number: string | null;
  subject: string | null;
  contract_value: number | null;
  start_date: string | null;
  end_date: string | null;
  signature_status: string | null;
  signed_at: string | null;
  contract_html: string | null;
  contract_type: string | null;
  document_type: string | null;
  description: string | null;
  payment_method: string | null;
  penalty_value: number | null;
  visible_to_client: boolean | null;
  client_email: string | null;
  client_name: string | null;
  signatory_name: string | null;
  signatory_cpf: string | null;
  signatory_cnpj: string | null;
  created_at: string | null;
  template_name: string | null;
  contract_type_name: string | null;
  attached_pdfs: string[]; // zip filenames
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

// ── EXPORT DOCUMENTS ZIP ──
export async function exportDocumentsZip(
  onProgress: (p: ZipProgress) => void
): Promise<{ blob: Blob; totalFiles: number }> {
  onProgress({ current: 0, total: 1, label: 'Buscando documentos...', phase: 'fetching' });

  const { data: docs, error } = await supabase
    .from('documents')
    .select('*, profiles(full_name, email), brand_processes(brand_name)')
    .order('created_at', { ascending: false });

  if (error) throw new Error('Erro ao buscar documentos');
  if (!docs || docs.length === 0) throw new Error('Nenhum documento encontrado');

  const zip = new JSZip();
  const manifest: DocManifestEntry[] = [];
  const usedNames = new Set<string>();
  const total = docs.length;

  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    onProgress({ current: i + 1, total, label: d.name, phase: 'downloading' });

    // Generate unique zip filename
    const ext = d.file_url.split('.').pop()?.split('?')[0] || 'bin';
    let baseName = sanitizeFilename(d.protocol ? `${d.protocol}_${d.name}` : d.name);
    let zipName = `files/${baseName}.${ext}`;
    let counter = 1;
    while (usedNames.has(zipName)) {
      zipName = `files/${baseName}_${counter}.${ext}`;
      counter++;
    }
    usedNames.add(zipName);

    // Download file
    const blob = await fetchFileAsBlob(d.file_url);
    if (blob) {
      zip.file(zipName, blob);
    }

    manifest.push({
      name: d.name,
      file_url: d.file_url,
      document_type: d.document_type,
      mime_type: d.mime_type,
      file_size: d.file_size,
      protocol: d.protocol || null,
      created_at: d.created_at,
      client_email: (d.profiles as any)?.email || null,
      client_name: (d.profiles as any)?.full_name || null,
      brand_name: (d.brand_processes as any)?.brand_name || null,
      process_id: d.process_id,
      user_id: d.user_id,
      contract_id: d.contract_id || null,
      zip_filename: zipName,
    });
  }

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  onProgress({ current: total, total, label: 'Compactando ZIP...', phase: 'zipping' });
  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });

  return { blob: zipBlob, totalFiles: manifest.length };
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

  const manifestText = await manifestFile.async('text');
  const manifest: DocManifestEntry[] = JSON.parse(manifestText);

  if (!Array.isArray(manifest) || manifest.length === 0) {
    throw new Error('Manifest vazio ou inválido');
  }

  // Build email→profile mapping
  const emails = [...new Set(manifest.map(m => m.client_email).filter(Boolean))] as string[];
  const profileMap = new Map<string, string>();
  if (emails.length > 0) {
    for (let i = 0; i < emails.length; i += 50) {
      const batch = emails.slice(i, i + 50);
      const { data } = await supabase
        .from('profiles')
        .select('id, email')
        .in('email', batch);
      data?.forEach(p => profileMap.set(p.email, p.id));
    }
  }

  // Build brand→process mapping
  const brands = [...new Set(manifest.map(m => m.brand_name).filter(Boolean))] as string[];
  const processMap = new Map<string, string>();
  if (brands.length > 0) {
    const { data } = await supabase
      .from('brand_processes')
      .select('id, brand_name');
    data?.forEach(p => processMap.set(p.brand_name, p.id));
  }

  let imported = 0;
  let failed = 0;
  const errors: string[] = [];
  const total = manifest.length;

  for (let i = 0; i < manifest.length; i++) {
    const entry = manifest[i];
    onProgress({ current: i + 1, total, label: entry.name, phase: 'uploading' });

    try {
      // Get file from zip
      const zipFile = zip.file(entry.zip_filename);
      let fileUrl = entry.file_url; // fallback to original URL

      if (zipFile) {
        // Upload to storage
        const blob = await zipFile.async('blob');
        const ext = entry.zip_filename.split('.').pop() || 'bin';
        const storagePath = `imported/${Date.now()}_${i}.${ext}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(storagePath, blob, {
            contentType: entry.mime_type || 'application/octet-stream',
          });

        if (uploadError) {
          errors.push(`Upload falhou: ${entry.name} - ${uploadError.message}`);
          failed++;
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(uploadData.path);
        fileUrl = urlData.publicUrl;
      }

      // Resolve user_id
      const userId = entry.client_email ? profileMap.get(entry.client_email) || null : null;
      // Resolve process_id
      const processId = entry.brand_name ? processMap.get(entry.brand_name) || null : null;

      const { error: insertError } = await (supabase as any).from('documents').insert({
        name: entry.name,
        file_url: fileUrl,
        document_type: entry.document_type || 'outro',
        mime_type: entry.mime_type,
        file_size: entry.file_size,
        protocol: entry.protocol,
        user_id: userId,
        process_id: processId,
        contract_id: entry.contract_id || null,
        uploaded_by: 'import_zip',
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

  return { imported, failed, errors };
}

// ── EXPORT CONTRACTS ZIP ──
export async function exportContractsZip(
  onProgress: (p: ZipProgress) => void
): Promise<{ blob: Blob; totalContracts: number }> {
  onProgress({ current: 0, total: 1, label: 'Buscando contratos...', phase: 'fetching' });

  const { data: contracts, error } = await supabase
    .from('contracts')
    .select(`
      *,
      contract_type:contract_types(name),
      contract_template:contract_templates(name),
      profile:profiles(full_name, email, phone)
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Erro ao buscar contratos');
  if (!contracts || contracts.length === 0) throw new Error('Nenhum contrato encontrado');

  const zip = new JSZip();
  const manifest: ContractManifestEntry[] = [];
  const total = contracts.length;

  for (let i = 0; i < contracts.length; i++) {
    const c = contracts[i];
    onProgress({ current: i + 1, total, label: c.contract_number || c.subject || `Contrato ${i + 1}`, phase: 'downloading' });

    const attachedPdfs: string[] = [];

    // Get associated documents (PDFs)
    if (c.id) {
      const { data: docs } = await supabase
        .from('documents')
        .select('*')
        .eq('contract_id', c.id);

      if (docs && docs.length > 0) {
        for (const doc of docs) {
          const blob = await fetchFileAsBlob(doc.file_url);
          if (blob) {
            const ext = doc.file_url.split('.').pop()?.split('?')[0] || 'pdf';
            const pdfName = `contract_pdfs/${sanitizeFilename(c.contract_number || c.id)}_${sanitizeFilename(doc.name)}.${ext}`;
            zip.file(pdfName, blob);
            attachedPdfs.push(pdfName);
          }
        }
      }
    }

    manifest.push({
      contract_number: c.contract_number,
      subject: c.subject,
      contract_value: c.contract_value,
      start_date: c.start_date,
      end_date: c.end_date,
      signature_status: c.signature_status,
      signed_at: c.signed_at,
      contract_html: c.contract_html,
      contract_type: c.contract_type as unknown as string,
      document_type: c.document_type,
      description: c.description,
      payment_method: c.payment_method,
      penalty_value: c.penalty_value,
      visible_to_client: c.visible_to_client,
      client_email: (c.profile as any)?.email || null,
      client_name: (c.profile as any)?.full_name || null,
      signatory_name: c.signatory_name,
      signatory_cpf: c.signatory_cpf,
      signatory_cnpj: c.signatory_cnpj,
      created_at: c.created_at,
      template_name: (c.contract_template as any)?.name || null,
      contract_type_name: (c.contract_type as any)?.name || null,
      attached_pdfs: attachedPdfs,
    });
  }

  zip.file('contracts_manifest.json', JSON.stringify(manifest, null, 2));

  onProgress({ current: total, total, label: 'Compactando ZIP...', phase: 'zipping' });
  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });

  return { blob: zipBlob, totalContracts: manifest.length };
}

// ── IMPORT CONTRACTS ZIP ──
export async function importContractsZip(
  file: File,
  onProgress: (p: ZipProgress) => void
): Promise<{ imported: number; failed: number; errors: string[] }> {
  onProgress({ current: 0, total: 1, label: 'Lendo ZIP...', phase: 'fetching' });

  const zip = await JSZip.loadAsync(file);
  const manifestFile = zip.file('contracts_manifest.json');
  if (!manifestFile) throw new Error('ZIP inválido: contracts_manifest.json não encontrado');

  const manifestText = await manifestFile.async('text');
  const manifest: ContractManifestEntry[] = JSON.parse(manifestText);

  if (!Array.isArray(manifest) || manifest.length === 0) {
    throw new Error('Manifest vazio ou inválido');
  }

  // Build email→profile mapping
  const emails = [...new Set(manifest.map(m => m.client_email).filter(Boolean))] as string[];
  const profileMap = new Map<string, string>();
  if (emails.length > 0) {
    for (let i = 0; i < emails.length; i += 50) {
      const batch = emails.slice(i, i + 50);
      const { data } = await supabase
        .from('profiles')
        .select('id, email')
        .in('email', batch);
      data?.forEach(p => profileMap.set(p.email, p.id));
    }
  }

  // Get template and type mappings
  const { data: templates } = await supabase.from('contract_templates').select('id, name');
  const { data: types } = await supabase.from('contract_types').select('id, name');
  const templateMap = new Map<string, string>();
  const typeMap = new Map<string, string>();
  templates?.forEach(t => templateMap.set(t.name, t.id));
  types?.forEach(t => typeMap.set(t.name, t.id));

  let imported = 0;
  let failed = 0;
  const errors: string[] = [];
  const total = manifest.length;

  for (let i = 0; i < manifest.length; i++) {
    const entry = manifest[i];
    onProgress({ current: i + 1, total, label: entry.contract_number || `Contrato ${i + 1}`, phase: 'creating' });

    try {
      const userId = entry.client_email ? profileMap.get(entry.client_email) || null : null;
      const templateId = entry.template_name ? templateMap.get(entry.template_name) || null : null;
      const typeId = entry.contract_type_name ? typeMap.get(entry.contract_type_name) || null : null;

      const { data: newContract, error: insertError } = await (supabase as any)
        .from('contracts')
        .insert({
          contract_number: entry.contract_number,
          subject: entry.subject,
          contract_value: entry.contract_value,
          start_date: entry.start_date,
          end_date: entry.end_date,
          signature_status: entry.signature_status || 'not_signed',
          signed_at: entry.signed_at,
          contract_html: entry.contract_html,
          document_type: entry.document_type || 'contract',
          description: entry.description,
          payment_method: entry.payment_method,
          penalty_value: entry.penalty_value,
          visible_to_client: entry.visible_to_client ?? true,
          user_id: userId,
          template_id: templateId,
          contract_type_id: typeId,
          signatory_name: entry.signatory_name,
          signatory_cpf: entry.signatory_cpf,
          signatory_cnpj: entry.signatory_cnpj,
        })
        .select('id')
        .single();

      if (insertError) {
        errors.push(`Contrato ${entry.contract_number || i}: ${insertError.message}`);
        failed++;
        continue;
      }

      // Upload attached PDFs
      if (entry.attached_pdfs.length > 0 && newContract?.id) {
        for (const pdfPath of entry.attached_pdfs) {
          const pdfFile = zip.file(pdfPath);
          if (pdfFile) {
            const blob = await pdfFile.async('blob');
            const ext = pdfPath.split('.').pop() || 'pdf';
            const storagePath = `imported/${Date.now()}_contract_${i}.${ext}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('documents')
              .upload(storagePath, blob, { contentType: 'application/pdf' });

            if (!uploadError && uploadData) {
              const { data: urlData } = supabase.storage
                .from('documents')
                .getPublicUrl(uploadData.path);

              await (supabase as any).from('documents').insert({
                name: pdfPath.split('/').pop() || 'documento.pdf',
                file_url: urlData.publicUrl,
                document_type: 'contrato',
                mime_type: 'application/pdf',
                user_id: userId,
                contract_id: newContract.id,
                uploaded_by: 'import_zip',
              });
            }
          }
        }
      }

      imported++;
    } catch (err: any) {
      errors.push(`Erro: ${entry.contract_number || i} - ${err.message}`);
      failed++;
    }
  }

  return { imported, failed, errors };
}

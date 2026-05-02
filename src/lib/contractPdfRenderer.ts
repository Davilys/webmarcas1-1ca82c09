// Renderiza um contrato em PDF (Blob) usando o mesmo HTML do generateDocumentPrintHTML.
// Usa um iframe offscreen + html2canvas + jsPDF para produzir PDF multi-página A4.

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { generateDocumentPrintHTML, getLogoBase64ForPDF, type BlockchainSignature } from '@/components/contracts/DocumentRenderer';

export interface RenderableContract {
  id: string;
  contract_number?: string | null;
  document_type?: string | null;
  contract_html?: string | null;
  client_signature_image?: string | null;
  blockchain_hash?: string | null;
  blockchain_timestamp?: string | null;
  blockchain_tx_id?: string | null;
  blockchain_network?: string | null;
  signature_ip?: string | null;
  signatory_name?: string | null;
  signatory_cpf?: string | null;
  signatory_cnpj?: string | null;
}

const A4_WIDTH_PX = 794;   // ~210mm @ 96dpi
const A4_HEIGHT_PX = 1123; // ~297mm @ 96dpi

let cachedLogo: string | null = null;

async function getLogo(): Promise<string> {
  if (cachedLogo !== null) return cachedLogo;
  try {
    cachedLogo = await getLogoBase64ForPDF();
  } catch {
    cachedLogo = '';
  }
  return cachedLogo;
}

/**
 * Renderiza HTML do contrato para um PDF Blob multi-página.
 * Mantém: assinatura desenhada do cliente, marca "✓ Assinado Digitalmente" e
 * a seção completa de Certificação Blockchain (hash, timestamp, txId, rede, IP, QR).
 */
export async function renderContractPDF(contract: RenderableContract): Promise<Blob> {
  if (!contract.contract_html) {
    throw new Error('Contrato sem conteúdo HTML');
  }

  const logo = await getLogo();
  const docType = (contract.document_type || 'contract') as 'contract' | 'procuracao' | 'distrato_multa' | 'distrato_sem_multa';

  const blockchainSignature: BlockchainSignature | undefined = contract.blockchain_hash
    ? {
        hash: contract.blockchain_hash,
        timestamp: contract.blockchain_timestamp || '',
        txId: contract.blockchain_tx_id || '',
        network: contract.blockchain_network || '',
        ipAddress: contract.signature_ip || '',
      }
    : undefined;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://webmarcas.net';

  const html = generateDocumentPrintHTML(
    docType,
    contract.contract_html,
    contract.client_signature_image || null,
    blockchainSignature,
    contract.signatory_name || undefined,
    contract.signatory_cpf || undefined,
    contract.signatory_cnpj || undefined,
    undefined,
    baseUrl,
    logo
  );

  // Container offscreen
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = `${A4_WIDTH_PX}px`;
  container.style.background = 'white';
  container.style.zIndex = '-1';

  // Extraímos só o <body> para inserir no container (mantemos o <style>)
  const styleMatch = html.match(/<style[\s\S]*?<\/style>/);
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  container.innerHTML = `${styleMatch ? styleMatch[0] : ''}${bodyMatch ? bodyMatch[1] : html}`;
  document.body.appendChild(container);

  try {
    // Aguarda fontes/imagens externas (logo base64 já carrega instant; QR é externa)
    const imgs = Array.from(container.querySelectorAll('img'));
    await Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalHeight !== 0) return resolve();
            const done = () => resolve();
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
            // timeout de segurança 8s (QR externo pode falhar)
            setTimeout(done, 8000);
          })
      )
    );

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: A4_WIDTH_PX,
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();   // 210
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297
    const ratio = pdfWidth / canvas.width;
    const fullHeightMm = canvas.height * ratio;

    if (fullHeightMm <= pdfHeight) {
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pdfWidth, fullHeightMm);
    } else {
      // Quebra multi-página
      const pageHeightPx = Math.floor(pdfHeight / ratio);
      let yOffsetPx = 0;
      let pageIndex = 0;
      while (yOffsetPx < canvas.height) {
        const sliceHeight = Math.min(pageHeightPx, canvas.height - yOffsetPx);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        const ctx = pageCanvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context indisponível');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(canvas, 0, yOffsetPx, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

        if (pageIndex > 0) pdf.addPage();
        const sliceMm = sliceHeight * ratio;
        pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pdfWidth, sliceMm);

        yOffsetPx += sliceHeight;
        pageIndex++;
      }
    }

    return pdf.output('blob');
  } finally {
    container.remove();
  }
}

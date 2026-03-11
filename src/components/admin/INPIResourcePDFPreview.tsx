import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Printer, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logoWebmarcas from '@/assets/webmarcas-logo-new.png';
import signatureImage from '@/assets/davilys-signature.png';
import jsPDF from 'jspdf';

interface ResourceData {
  id: string;
  brand_name: string | null;
  process_number: string | null;
  ncl_class: string | null;
  holder: string | null;
  approved_at: string | null;
}

interface INPIResourcePDFPreviewProps {
  resource: ResourceData;
  content: string;
  resourceType?: string;
}

const isNotificacao = (type?: string) => type === 'notificacao_extrajudicial';

const cleanMarkdown = (text: string): string => {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/#{1,6}\s*/g, '')
    .replace(/[\u2500-\u257F\u2580-\u259F\u2550-\u256C]/g, '')
    .trim();
};

const stripClosingFromContent = (text: string, resourceType?: string): string => {
  let cleaned = text.replace(/^Av\.\s*Brigadeiro.*$/gm, '');
  cleaned = cleaned.replace(/^Tel:?\s*\(11\).*$/gm, '');
  cleaned = cleaned.replace(/^[═─━╌╍┄┅┈┉▬%P\s]{3,}$/gm, '');
  cleaned = cleaned.replace(/^[\u2500-\u257F\u2580-\u259F\u2550-\u256C]{2,}.*$/gm, '');
  cleaned = cleaned.replace(/^[_]{3,}$/gm, '');
  cleaned = cleaned.replace(/Examinador\/Opoe?nte:/gi, 'Oponente:');
  
  const closingPatterns = [
    /\n\s*Protesta provar[\s\S]*$/i,
    /\n\s*Nestes termos[\s\S]*$/i,
  ];
  for (const pattern of closingPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  cleaned = cleaned.replace(/\n\s*Termos em que,?\s*\n\s*Pede deferimento\.?\s*\n[\s\S]*$/i, '');
  
  // For notificacao, also strip any AI-generated closing with signature
  if (isNotificacao(resourceType)) {
    cleaned = cleaned.replace(/\n\s*São Paulo,\s*\d{1,2}\s*de\s*\w+\s*de\s*\d{4}[\s\S]*$/i, '');
    cleaned = cleaned.replace(/\n\s*Davilys Danques[\s\S]*$/i, '');
  }
  
  return cleaned.trim();
};

const isHeadingLine = (text: string): boolean => {
  const trimmed = text.trim();
  if (trimmed.length >= 100) return false;
  return /^(I{1,4}V?\s*[–—-]|V?I{0,4}\s*[–—-]|[A-Z][A-Z\s–—-]{5,}$|DO[S]?\s|DA[S]?\s|CONCLUS|PEDIDO|FATOS|FUNDAMENT|RECURSO|EXCELENT|NOTIFICA)/i.test(trimmed);
};

const imageToBase64 = (src: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject('No canvas context'); return; }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = src;
  });
};

export function INPIResourcePDFPreview({ resource, content, resourceType }: INPIResourcePDFPreviewProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const isNotif = isNotificacao(resourceType);
  const isProcuradorPetition = resourceType === 'troca_procurador' || resourceType === 'nomeacao_procurador';
  const cleanedContent = cleanMarkdown(content);
  const bodyContent = stripClosingFromContent(cleanedContent, resourceType);

  const approvalDate = resource.approved_at 
    ? format(new Date(resource.approved_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const documentTitle = isNotif
    ? 'Notificação Extrajudicial'
    : isProcuradorPetition
      ? resourceType === 'troca_procurador'
        ? 'Petição de Troca de Procurador'
        : 'Petição de Nomeação de Procurador'
      : 'Recurso Administrativo';
  const documentTitleUpper = documentTitle.toUpperCase();
  const pdfFileName = isNotif
    ? `Notificacao_Extrajudicial_${resource.brand_name?.replace(/\s+/g, '_') || 'WebMarcas'}_${format(new Date(), 'yyyy-MM-dd')}.pdf`
    : isProcuradorPetition
      ? `${resourceType === 'troca_procurador' ? 'Peticao_Troca_Procurador' : 'Peticao_Nomeacao_Procurador'}_${resource.brand_name?.replace(/\s+/g, '_') || 'INPI'}_${format(new Date(), 'yyyy-MM-dd')}.pdf`
      : `Recurso_${resource.brand_name?.replace(/\s+/g, '_') || 'INPI'}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita pop-ups para imprimir o documento.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${documentTitle} - ${resource.brand_name || 'WebMarcas'}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;500;600;700&display=swap');
            @page { margin: 2.5cm; size: A4; }
            body { font-family: 'Crimson Pro', Georgia, serif; font-size: 12pt; line-height: 1.8; color: #1a1a1a; }
            .letterhead { margin-bottom: 40px; border-top: 8px solid #1e3a5f; padding-top: 20px; }
            .logo-container img { width: 80px; height: 80px; }
            .content { text-align: justify; margin-top: 30px; }
            .content h2 { font-weight: 600; color: #1e3a5f; font-size: 13pt; margin-top: 20px; margin-bottom: 10px; }
            .content p { margin-bottom: 14px; text-indent: 2cm; }
            .signature { margin-top: 60px; text-align: center; }
            .signature-name { font-weight: 600; color: #1e3a5f; }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 25;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = margin;

      let logoBase64: string | null = null;
      let signBase64: string | null = null;
      try { logoBase64 = await imageToBase64(logoWebmarcas); } catch { /* skip */ }
      try { signBase64 = await imageToBase64(signatureImage); } catch { /* skip */ }

      // ── Header Bar ──
      pdf.setFillColor(30, 58, 95);
      pdf.rect(0, 0, pageWidth, 6, 'F');
      pdf.setFillColor(200, 175, 55);
      pdf.rect(0, 6, pageWidth, 2, 'F');
      yPos = 18;

      // ── Letterhead ──
      if (logoBase64) {
        pdf.addImage(logoBase64, 'PNG', margin, yPos - 2, 16, 16);
      }
      const textX = logoBase64 ? margin + 19 : margin;
      pdf.setFontSize(16);
      pdf.setTextColor(30, 58, 95);
      pdf.setFont('helvetica', 'bold');
      pdf.text('WEBMARCAS INTELLIGENCE PI', textX, yPos + 5);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Propriedade Intelectual e Registro de Marcas', textX, yPos + 10);

      // Right-aligned contact info - positioned below header line to avoid overlap
      yPos += 16;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 58, 95);
      pdf.text('CNPJ: 39.528.012/0001-29', pageWidth - margin, yPos, { align: 'right' });
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(150, 150, 150);
      pdf.text('Av. Brigadeiro Luiz Antônio, 2696 — Centro — São Paulo/SP', pageWidth - margin, yPos + 4, { align: 'right' });
      pdf.text('Tel: (11) 9 1112-0225  |  juridico@webmarcas.net', pageWidth - margin, yPos + 8, { align: 'right' });

      // ── Double Separator ──
      yPos += 12;
      pdf.setDrawColor(30, 58, 95);
      pdf.setLineWidth(0.8);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      pdf.setDrawColor(200, 175, 55);
      pdf.setLineWidth(0.3);
      pdf.line(margin, yPos + 1.5, pageWidth - margin, yPos + 1.5);
      yPos += 8;

      // ── Document Title Badge ──
      pdf.setFontSize(11);
      const badgeWidth = pdf.getTextWidth(documentTitleUpper) + 16;
      const badgeX = (pageWidth - badgeWidth) / 2;
      pdf.setFillColor(30, 58, 95);
      pdf.roundedRect(badgeX, yPos - 4, badgeWidth, 10, 1, 1, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text(documentTitleUpper, pageWidth / 2, yPos + 2.5, { align: 'center' });
      yPos += 12;

      if (resource.brand_name) {
        pdf.setFontSize(12);
        pdf.setTextColor(30, 58, 95);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Marca: ${resource.brand_name}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 6;
      }
      if (resource.process_number) {
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Processo INPI nº ${resource.process_number}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 6;
      }
      yPos += 6;

      // ── Content Body ──
      pdf.setFont('helvetica', 'normal');
      const paragraphs = bodyContent.split('\n\n').filter(p => p.trim());
      
      const addFooter = (pageNum: number, totalPages: number) => {
        const footerY = pageHeight - 12;
        pdf.setDrawColor(30, 58, 95);
        pdf.setLineWidth(0.5);
        pdf.line(margin, footerY - 8, pageWidth - margin, footerY - 8);
        pdf.setDrawColor(200, 175, 55);
        pdf.setLineWidth(0.3);
        pdf.line(margin, footerY - 6.5, pageWidth - margin, footerY - 6.5);
        pdf.setFontSize(7.5);
        pdf.setTextColor(100, 100, 100);
        pdf.text('Av. Brigadeiro Luiz Antônio, 2696, Centro — São Paulo/SP — CEP 01402-000', pageWidth / 2, footerY - 2, { align: 'center' });
        pdf.text('Tel: (11) 9 1112-0225  |  juridico@webmarcas.net  |  www.webmarcas.net', pageWidth / 2, footerY + 2, { align: 'center' });
        pdf.setFontSize(8);
        pdf.setTextColor(130, 130, 130);
        pdf.text(`${pageNum}/${totalPages}`, pageWidth - margin, footerY - 2, { align: 'right' });
      };

      const bottomLimit = pageHeight - 30;

      for (const paragraph of paragraphs) {
        const trimmedParagraph = paragraph.trim();
        if (!trimmedParagraph) continue;
        if (/^(Av\.\s*Brigadeiro|Tel:\s*\(11\))/.test(trimmedParagraph)) continue;

        const heading = isHeadingLine(trimmedParagraph);
        
        if (heading) {
          if (yPos > margin + 10) yPos += 4;
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(30, 58, 95);
          
          const headingLines = pdf.splitTextToSize(trimmedParagraph, contentWidth);
          for (const line of headingLines) {
            if (yPos > bottomLimit) { pdf.addPage(); yPos = margin; }
            pdf.text(line, margin, yPos);
            yPos += 7;
          }
          
          if (trimmedParagraph.length < 80) {
            pdf.setDrawColor(200, 175, 55);
            pdf.setLineWidth(0.3);
            pdf.line(margin, yPos - 2, margin + 40, yPos - 2);
          }
          
          pdf.setFont('helvetica', 'normal');
          yPos += 3;
        } else {
          pdf.setFontSize(11);
          pdf.setTextColor(30, 30, 30);
          pdf.setFont('helvetica', 'normal');

          const isList = /^[-–•]\s/.test(trimmedParagraph);
          const indent = isList ? margin + 5 : margin;
          const lineWidth = isList ? contentWidth - 5 : contentWidth;
          
          const lines = pdf.splitTextToSize(trimmedParagraph, lineWidth);
          
          for (const line of lines) {
            if (yPos > bottomLimit) { pdf.addPage(); yPos = margin; }
            pdf.text(line, indent, yPos);
            yPos += 6;
          }
          yPos += 3;
        }
      }

      // ── Closing / Signature Block ──
      if (yPos > pageHeight - 90) { pdf.addPage(); yPos = margin; }
      
      yPos += 10;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(60, 60, 60);

      if (!isNotif) {
        // Standard INPI resource closing
        pdf.text('Termos em que,', pageWidth / 2, yPos, { align: 'center' });
        yPos += 8;
        pdf.text('Pede deferimento.', pageWidth / 2, yPos, { align: 'center' });
        yPos += 12;
      }

      pdf.text(`São Paulo, ${approvalDate}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 16;

      // Signature image
      if (signBase64) {
        const sigW = 40;
        const sigH = 16;
        pdf.addImage(signBase64, 'PNG', (pageWidth - sigW) / 2, yPos, sigW, sigH);
        yPos += sigH + 2;
      }

      // Signature line
      pdf.setDrawColor(30, 58, 95);
      pdf.setLineWidth(0.5);
      pdf.line(pageWidth / 2 - 35, yPos, pageWidth / 2 + 35, yPos);
      
      yPos += 6;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 58, 95);
      pdf.text('Davilys Danques de Oliveira Cunha', pageWidth / 2, yPos, { align: 'center' });
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(80, 80, 80);
      pdf.text('Procurador', pageWidth / 2, yPos + 6, { align: 'center' });

      if (!isNotif && !isProcuradorPetition) {
        // Only show CPF for standard INPI appeal resources
        pdf.text('CPF 393.239.118-79', pageWidth / 2, yPos + 12, { align: 'center' });
      }

      // ── Footers on all pages ──
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        addFooter(i, totalPages);
      }

      pdf.save(pdfFileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const renderContent = () => {
    return bodyContent.split('\n\n').filter(p => p.trim()).map((paragraph, idx) => {
      const trimmed = paragraph.trim();
      if (/^(Av\.\s*Brigadeiro|Tel:\s*\(11\))/.test(trimmed)) return null;
      
      if (isHeadingLine(trimmed)) {
        return (
          <h2 key={idx} className="text-base font-semibold mt-6 mb-3 pb-1" style={{ color: '#1e3a5f', borderBottom: '2px solid #c8af37' }}>
            {trimmed}
          </h2>
        );
      }
      
      const isList = /^[-–•]\s/.test(trimmed);
      if (isList) {
        return <p key={idx} className="mb-3 pl-6" style={{ textIndent: '0' }}>{trimmed}</p>;
      }
      
      return <p key={idx} className="mb-4 text-justify" style={{ textIndent: '2cm' }}>{trimmed}</p>;
    }).filter(Boolean);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 justify-end print:hidden">
        <Button variant="outline" onClick={handlePrint} className="gap-2 rounded-xl">
          <Printer className="h-4 w-4" />
          Imprimir
        </Button>
        <Button onClick={handleDownloadPDF} disabled={isGeneratingPDF} className="gap-2 rounded-xl shadow-lg shadow-primary/15">
          {isGeneratingPDF ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Gerando PDF...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Download PDF
            </>
          )}
        </Button>
      </div>

      <div 
        ref={printRef}
        className="bg-white text-gray-900 shadow-2xl mx-auto overflow-hidden rounded-lg"
        style={{ width: '210mm', minHeight: '297mm', fontFamily: "Georgia, serif", fontSize: '12pt', lineHeight: '1.8' }}
      >
        {/* Header */}
        <div className="w-full" style={{ height: '8px', background: 'linear-gradient(90deg, #1e3a5f 0%, #2a5080 50%, #1e3a5f 100%)' }} />
        <div className="w-full" style={{ height: '3px', background: 'linear-gradient(90deg, #c8af37, #d4c050, #c8af37)' }} />

        <div className="px-16 py-10">
          {/* Letterhead */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-5">
              <img 
                src={logoWebmarcas} 
                alt="WebMarcas" 
                className="object-contain"
                style={{ width: '75px', height: '75px' }} 
              />
              <div>
                <h1 className="text-2xl font-bold tracking-wider" style={{ color: '#1e3a5f', letterSpacing: '0.15em' }}>WEBMARCAS INTELLIGENCE PI</h1>
                <p className="text-sm mt-1" style={{ color: '#666' }}>Propriedade Intelectual e Registro de Marcas</p>
              </div>
            </div>
            <div className="text-right text-xs space-y-0.5" style={{ color: '#999' }}>
              <p className="font-medium" style={{ color: '#1e3a5f' }}>CNPJ: 39.528.012/0001-29</p>
              <p>Av. Brigadeiro Luiz Antônio, 2696</p>
              <p>Centro — São Paulo/SP</p>
              <p>juridico@webmarcas.net</p>
            </div>
          </div>

          {/* Double separator */}
          <div className="w-full mb-8">
            <div style={{ height: '2px', background: 'linear-gradient(90deg, #1e3a5f, #2a5080, #1e3a5f)' }} />
            <div style={{ height: '1px', marginTop: '2px', background: 'linear-gradient(90deg, transparent, #c8af37, transparent)' }} />
          </div>

          {/* Document title badge */}
          <div className="text-center mb-8">
            <div className="inline-block px-8 py-2 rounded-sm" style={{ backgroundColor: '#1e3a5f' }}>
              <span className="text-white font-semibold text-sm tracking-wider uppercase">
                {documentTitle}
              </span>
            </div>
            {resource.brand_name && (
              <p className="mt-3 text-base font-semibold" style={{ color: '#1e3a5f' }}>
                Marca: {resource.brand_name}
              </p>
            )}
            {resource.process_number && (
              <p className="text-sm" style={{ color: '#666' }}>
                Processo INPI nº {resource.process_number}
              </p>
            )}
          </div>

          {/* Content */}
          <div className="text-justify" style={{ color: '#1a1a1a' }}>
            {renderContent()}
          </div>

          {/* Signature */}
          <div className="mt-16 text-center">
            {!isNotif && (
              <>
                <p className="mb-4" style={{ color: '#374151' }}>Termos em que,</p>
                <p className="mb-4" style={{ color: '#374151' }}>Pede deferimento.</p>
              </>
            )}
            <p className="mb-8" style={{ color: '#374151' }}>São Paulo, {approvalDate}</p>
            
            <div className="mt-6">
              <div className="flex justify-center mb-2">
                <img 
                  src={signatureImage} 
                  alt="Assinatura" 
                  className="h-16 object-contain opacity-90"
                />
              </div>
              <div className="w-52 mx-auto mb-3" style={{ height: '2px', background: '#1e3a5f' }} />
              <p className="font-semibold text-base" style={{ color: '#1e3a5f' }}>Davilys Danques de Oliveira Cunha</p>
              <p className="text-sm" style={{ color: '#555' }}>Procurador</p>
              {!isNotif && !isProcuradorPetition && (
                <p className="text-sm" style={{ color: '#777' }}>CPF 393.239.118-79</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-16 pt-3" style={{ borderTop: '2px solid #1e3a5f' }}>
            <div className="mb-2" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #c8af37, transparent)' }} />
            <div className="flex justify-center gap-6 text-xs flex-wrap" style={{ color: '#888' }}>
              <span>📍 Av. Brigadeiro Luiz Antônio, 2696, Centro — São Paulo/SP</span>
              <span>📞 (11) 9 1112-0225</span>
              <span>✉️ juridico@webmarcas.net</span>
              <span>🌐 www.webmarcas.net</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

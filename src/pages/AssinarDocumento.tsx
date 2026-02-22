import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { SignaturePad } from '@/components/signature/SignaturePad';
import { DocumentRenderer, generateDocumentPrintHTML, getSignatureBase64, getLogoBase64ForPDF } from '@/components/contracts/DocumentRenderer';
import { generateAndUploadContractPdf, generateSignedContractHtml } from '@/hooks/useContractPdfUpload';
import CreditCardForm from '@/components/payment/CreditCardForm';
import { toast } from 'sonner';
import { Loader2, Download, Printer, CheckCircle, AlertCircle, FileText, CreditCard, QrCode, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import webmarcasLogo from '@/assets/webmarcas-logo-new.png';

interface ContractData {
  id: string;
  subject: string | null;
  contract_html: string | null;
  document_type: string | null;
  signatory_name: string | null;
  signatory_cpf: string | null;
  signatory_cnpj: string | null;
  signature_status: string | null;
  signature_expires_at: string | null;
  client_signature_image: string | null;
  contractor_signature_image: string | null;
  blockchain_hash: string | null;
  blockchain_timestamp: string | null;
  blockchain_tx_id: string | null;
  blockchain_network: string | null;
  signature_ip: string | null;
  payment_method: string | null;
}

interface PaymentData {
  paymentMethod: string;
  requiresCreditCardForm: boolean;
  data: {
    customerId?: string;
    invoiceId?: string;
    paymentId?: string;
    contractId?: string;
    value?: number;
    installmentCount?: number;
    installmentValue?: number;
    dueDate?: string;
    holderName?: string;
    holderEmail?: string;
    holderCpfCnpj?: string;
    holderPostalCode?: string;
    holderPhone?: string;
    invoiceUrl?: string;
    bankSlipUrl?: string;
    pixQrCode?: string;
    pixPayload?: string;
  };
}

export default function AssinarDocumento() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contract, setContract] = useState<ContractData | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);
  
  // Payment state
  const [showPayment, setShowPayment] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);

  useEffect(() => {
    if (token) {
      fetchContract();
    }
  }, [token]);

  const fetchContract = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use edge function to fetch contract by token (bypasses RLS)
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-contract-by-token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ token }),
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        setError(result.error || 'Documento não encontrado');
        return;
      }

      setContract(result.contract);
      
      if (result.contract.signature_status === 'signed') {
        setSigned(true);
      }
    } catch (err) {
      console.error('Error fetching contract:', err);
      setError('Erro ao carregar documento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Verificar se é procuração (exige rubrica manuscrita)
  const isProcuracao = contract?.document_type === 'procuracao';

  // Create Asaas payment after signature
  const createPaymentAfterSignature = async () => {
    if (!contract?.id) return;
    
    setLoadingPayment(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-post-signature-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ contractId: contract.id }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('Payment creation error:', result);
        toast.error(result.error || 'Erro ao criar cobrança');
        return;
      }

      setPaymentData(result);
      setShowPayment(true);
    } catch (err) {
      console.error('Error creating payment:', err);
      toast.error('Erro ao processar pagamento');
    } finally {
      setLoadingPayment(false);
    }
  };

  const handleSign = async () => {
    if (!contract || !acceptedTerms) {
      toast.error('Por favor, aceite os termos do documento');
      return;
    }
    
    // Procuração exige assinatura manuscrita
    if (isProcuracao && !signature) {
      toast.error('Por favor, desenhe sua assinatura para a procuração');
      return;
    }

    setSigning(true);
    try {
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenSize: `${window.screen.width}x${window.screen.height}`,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sign-contract-blockchain`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            contractId: contract.id,
            contractHtml: contract.contract_html,
            signatureImage: signature,
            signatureToken: token,
            deviceInfo,
            baseUrl: window.location.origin,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Erro ao assinar documento');
      }

      // Generate and upload PDF after successful signing
      if (contract.contract_html) {
        const brandName = contract.subject || 'Documento';
        
        // Generate PDF with blockchain data
        const signedHtml = generateSignedContractHtml(
          contract.contract_html,
          brandName,
          contract.signatory_name || '',
          contract.signatory_cpf || '',
          {
            hash: result.data?.hash,
            timestamp: result.data?.timestamp,
            txId: result.data?.txId,
            network: result.data?.network,
            ipAddress: result.data?.ipAddress,
          }
        );

        generateAndUploadContractPdf({
          contractId: contract.id,
          contractHtml: signedHtml,
          brandName,
          documentType: contract.document_type || 'contrato',
        }).then(uploadResult => {
          if (uploadResult.success) {
            console.log('Signed PDF uploaded successfully:', uploadResult.publicUrl);
          } else {
            console.error('Failed to upload signed PDF:', uploadResult.error);
          }
        }).catch(err => {
          console.error('Error uploading signed PDF:', err);
        });
      }

      toast.success('Documento assinado com sucesso!');
      setSigned(true);
      
      // Refresh contract data
      await fetchContract();
      
      // If contract has payment_method, create payment
      if (contract.payment_method) {
        await createPaymentAfterSignature();
      }
    } catch (err: any) {
      console.error('Error signing:', err);
      toast.error(err.message || 'Erro ao assinar documento');
    } finally {
      setSigning(false);
    }
  };

  const handlePaymentSuccess = () => {
    setPaymentComplete(true);
    toast.success('Pagamento realizado com sucesso!');
  };

  const handlePaymentError = (error: string) => {
    toast.error(error);
  };

  const copyPixCode = () => {
    if (paymentData?.data.pixPayload) {
      navigator.clipboard.writeText(paymentData.data.pixPayload);
      toast.success('Código PIX copiado!');
    }
  };

  const handleDownloadPDF = async () => {
    if (!contract) return;

    // Load signature base64 for procuracao documents
    let signatureBase64: string | undefined;
    if (contract.document_type === 'procuracao') {
      signatureBase64 = await getSignatureBase64();
    }

    // CORREÇÃO: Carregar logo em base64 ANTES de gerar o HTML
    const logoBase64 = await getLogoBase64ForPDF();

    const html = generateDocumentPrintHTML(
      (contract.document_type as any) || 'procuracao',
      contract.contract_html || '',
      contract.client_signature_image,
      contract.blockchain_hash ? {
        hash: contract.blockchain_hash,
        timestamp: contract.blockchain_timestamp || '',
        txId: contract.blockchain_tx_id || '',
        network: contract.blockchain_network || '',
        ipAddress: contract.signature_ip || '',
      } : undefined,
      contract.signatory_name || undefined,
      contract.signatory_cpf || undefined,
      contract.signatory_cnpj || undefined,
      signatureBase64,
      window.location.origin, // CORREÇÃO: Adicionar baseUrl
      logoBase64              // CORREÇÃO: Adicionar logoBase64
    );

    // Inject floating action buttons (standard pattern)
    const enhancedHtml = html
      .replace('</head>', `
        <style>
          @media print { .no-print { display: none !important; } }
          .action-buttons {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            gap: 8px;
          }
          .action-buttons button {
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            border: none;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }
          .btn-primary {
            background: linear-gradient(135deg, #f97316, #ea580c);
            color: white;
          }
          .btn-secondary {
            background: #f1f5f9;
            color: #334155;
          }
        </style>
      </head>`)
      .replace('<body', `<body><div class="action-buttons no-print">
        <button class="btn-primary" onclick="window.print()">Salvar como PDF</button>
        <button class="btn-secondary" onclick="window.close()">Fechar</button>
      </div><body`.slice(0, -5));

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(enhancedHtml);
      printWindow.document.close();
      printWindow.onload = () => setTimeout(() => printWindow.print(), 500);
    }
  };

  const handlePrint = () => {
    handleDownloadPDF();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-lg text-gray-600">Carregando documento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto p-8 bg-white rounded-lg shadow-lg text-center">
          <AlertCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Documento não encontrado</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500">
            O link pode ter expirado ou o documento já foi assinado.
          </p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return null;
  }

  // Payment page after signature
  if (showPayment && paymentData && !paymentComplete) {
    return (
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <img src={webmarcasLogo} alt="WebMarcas" className="h-10" />
            <div className="text-sm text-gray-500">
              Pagamento do Registro
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="text-center mb-6">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Contrato Assinado com Sucesso!
              </h1>
              <p className="text-gray-600">
                Agora, finalize o pagamento para iniciar o processo de registro.
              </p>
            </div>

            {/* Credit Card Form */}
            {paymentData.requiresCreditCardForm && paymentData.data && (
              <CreditCardForm
                value={paymentData.data.value || 1194}
                installmentCount={paymentData.data.installmentCount || 6}
                installmentValue={paymentData.data.installmentValue || 199}
                dueDate={paymentData.data.dueDate || new Date().toISOString().split('T')[0]}
                customerId={paymentData.data.customerId || ''}
                invoiceId={paymentData.data.invoiceId || ''}
                contractId={contract.id}
                holderName={paymentData.data.holderName || ''}
                holderEmail={paymentData.data.holderEmail || ''}
                holderCpfCnpj={paymentData.data.holderCpfCnpj || ''}
                holderPostalCode={paymentData.data.holderPostalCode || ''}
                holderPhone={paymentData.data.holderPhone}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            )}

            {/* PIX Payment */}
            {!paymentData.requiresCreditCardForm && paymentData.paymentMethod === 'avista' && (
              <div className="space-y-6">
                <div className="text-center">
                  <QrCode className="h-8 w-8 mx-auto text-primary mb-2" />
                  <h2 className="text-xl font-bold">Pagamento via PIX</h2>
                  <p className="text-3xl font-bold text-primary mt-2">R$ 699,00</p>
                  <p className="text-sm text-green-600">43% de desconto</p>
                </div>

                {paymentData.data.pixQrCode && (
                  <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-lg border-2 border-primary">
                      <img 
                        src={`data:image/png;base64,${paymentData.data.pixQrCode}`} 
                        alt="QR Code PIX" 
                        className="w-48 h-48"
                      />
                    </div>
                  </div>
                )}

                {paymentData.data.pixPayload && (
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-600">Código PIX (Copia e Cola):</Label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={paymentData.data.pixPayload}
                        readOnly
                        className="flex-1 px-3 py-2 text-xs font-mono bg-gray-50 border rounded-lg truncate"
                      />
                      <Button variant="outline" size="icon" onClick={copyPixCode}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-sm text-green-800">
                    <strong>Como pagar:</strong><br />
                    1. Abra o app do seu banco<br />
                    2. Escolha pagar via PIX com QR Code ou Copia e Cola<br />
                    3. Confirme o pagamento
                  </p>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setPaymentComplete(true)}
                >
                  Já efetuei o pagamento
                </Button>
              </div>
            )}

            {/* Boleto Payment */}
            {!paymentData.requiresCreditCardForm && paymentData.paymentMethod === 'boleto3x' && (
              <div className="space-y-6">
                <div className="text-center">
                  <FileText className="h-8 w-8 mx-auto text-primary mb-2" />
                  <h2 className="text-xl font-bold">Pagamento via Boleto</h2>
                  <p className="text-lg font-bold text-primary mt-2">3x de R$ 399,00</p>
                  <p className="text-sm text-gray-600">Total: R$ 1.197,00</p>
                </div>

                {paymentData.data.invoiceUrl && (
                  <Button
                    className="w-full"
                    onClick={() => window.open(paymentData.data.invoiceUrl, '_blank')}
                  >
                    <FileText className="h-5 w-5 mr-2" />
                    Ver Boleto
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setPaymentComplete(true)}
                >
                  Já efetuei o pagamento
                </Button>
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t mt-12 py-6">
          <div className="max-w-5xl mx-auto px-4 text-center text-sm text-gray-500">
            <p>WebMarcas Patentes - CNPJ: 39.528.012/0001-29</p>
          <p className="mt-2">
            Dúvidas? Entre em contato: (11) 91112-0225 | juridico@webmarcas.net
          </p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <img src={webmarcasLogo} alt="WebMarcas" className="h-10" />
          <div className="text-sm text-gray-500">
            Sistema de Assinatura Digital
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {(signed || paymentComplete) ? (
          /* Success State */
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="text-center mb-8">
              <CheckCircle className="h-20 w-20 mx-auto text-green-500 mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {paymentComplete ? 'Processo Concluído!' : 'Documento Assinado com Sucesso!'}
              </h1>
              <p className="text-gray-600">
                {paymentComplete 
                  ? 'Seu contrato foi assinado e o pagamento foi registrado. Em breve você receberá as instruções por e-mail.'
                  : 'Seu documento foi assinado eletronicamente e registrado em blockchain.'}
              </p>
            </div>

            <div className="flex justify-center gap-4 mb-8">
              <Button onClick={handleDownloadPDF} size="lg">
                <Download className="h-5 w-5 mr-2" />
                Baixar PDF
              </Button>
              <Button variant="outline" onClick={handlePrint} size="lg">
                <Printer className="h-5 w-5 mr-2" />
                Imprimir
              </Button>
            </div>

            {contract.blockchain_hash && (
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Certificação Digital
                </h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 font-medium">Hash SHA-256:</p>
                    <p className="font-mono text-xs break-all bg-white p-2 rounded mt-1">
                      {contract.blockchain_hash}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium">Data/Hora:</p>
                    <p className="mt-1">{contract.blockchain_timestamp}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium">ID Transação:</p>
                    <p className="font-mono text-xs mt-1">{contract.blockchain_tx_id}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium">Rede:</p>
                    <p className="mt-1">{contract.blockchain_network}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Verifique a autenticidade em:{' '}
                  <a 
                    href={`/verificar-contrato?hash=${contract.blockchain_hash}`}
                    className="text-blue-600 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {window.location.host}/verificar-contrato
                  </a>
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Signing State */
          <>
            <div className="bg-white rounded-lg shadow-lg mb-8 overflow-hidden">
              <div className="p-6 border-b bg-gray-50">
                <h1 className="text-2xl font-bold text-gray-900">
                  {contract.subject || 'Documento para Assinatura'}
                </h1>
                <p className="text-gray-600 mt-1">
                  Leia atentamente o documento abaixo e assine eletronicamente.
                </p>
              </div>

              {/* Document Preview */}
              <div className="p-6">
                <DocumentRenderer
                  documentType={(contract.document_type as any) || 'procuracao'}
                  content={contract.contract_html || ''}
                  clientSignature={null}
                  signatoryName={contract.signatory_name || undefined}
                  signatoryCpf={contract.signatory_cpf || undefined}
                  signatoryCnpj={contract.signatory_cnpj || undefined}
                />
              </div>
            </div>

            {/* Signature Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Assinatura Eletrônica
              </h2>

              {/* Terms Acceptance */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <Checkbox 
                    id="accept-terms"
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                  />
                  <Label 
                    htmlFor="accept-terms" 
                    className="text-sm text-gray-700 cursor-pointer leading-relaxed"
                  >
                    Declaro que li e concordo com todos os termos e condições deste documento. 
                    Reconheço que esta assinatura eletrônica tem validade jurídica conforme 
                    Lei 14.063/2020 e MP 2.200-2/2001.
                  </Label>
                </div>
              </div>

              {/* Signature Pad - Apenas para Procuração */}
              {isProcuracao ? (
                <div className="mb-6">
                  <Label className="block mb-3 font-medium">
                    Desenhe sua assinatura no campo abaixo:
                  </Label>
                  <SignaturePad 
                    onSignatureChange={setSignature}
                    width={600}
                    height={200}
                  />
                </div>
              ) : (
                <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">
                        Assinatura Eletrônica com Certificação Digital
                      </p>
                      <p className="text-sm text-green-700">
                        Este documento será assinado eletronicamente com validade jurídica 
                        conforme Lei 14.063/2020. Não é necessária rubrica manuscrita.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sign Button */}
              <div className="flex justify-center">
                <Button 
                  size="lg"
                  onClick={handleSign}
                  disabled={!acceptedTerms || (isProcuracao && !signature) || signing}
                  className="min-w-[200px]"
                >
                  {signing ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Assinando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Assinar Documento
                    </>
                  )}
                </Button>
              </div>

              {/* Legal Notice */}
              <p className="text-xs text-center text-gray-500 mt-6">
                {isProcuracao ? (
                  <>Ao clicar em "Assinar Documento", sua assinatura manuscrita será registrada em blockchain, 
                  capturando data/hora, endereço IP e informações do dispositivo para garantir 
                  a validade jurídica do documento.</>
                ) : (
                  <>Ao clicar em "Assinar Documento", sua confirmação será registrada em blockchain 
                  com certificação digital, garantindo validade jurídica conforme Lei 14.063/2020.</>
                )}
              </p>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12 py-6">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>WebMarcas Intelligence PI - CNPJ: 39.528.012/0001-29</p>
          <p>Av. Prestes Maia, 241 - Centro, São Paulo - SP</p>
          <p className="mt-2">
            Dúvidas? Entre em contato: (11) 91112-0225 | juridico@webmarcas.net
          </p>
        </div>
      </footer>
    </div>
  );
}

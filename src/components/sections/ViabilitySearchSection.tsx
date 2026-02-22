import { useState, useEffect } from "react";
import { Search, AlertCircle, CheckCircle, AlertTriangle, ArrowRight, MessageCircle, ShieldX, Printer, Shield, Zap, TrendingUp, Globe, Building2, Brain, Clock, Target, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { checkViability, type ViabilityResult } from "@/lib/api/viability";
import { supabase } from "@/integrations/supabase/client";
import webmarcasIcon from "@/assets/webmarcas-icon.png";

type ViabilityLevel = "high" | "medium" | "low" | "blocked" | null;

const FEATURE_CARDS = [
  { icon: Shield, label: "100% Seguro", sub: "Dados protegidos" },
  { icon: Zap, label: "Tempo Real", sub: "Base oficial INPI" },
  { icon: TrendingUp, label: "Laudo Técnico", sub: "IA especializada" },
];

// ─── Commercial Intelligence Module ─────────────────────
function CommercialIntelligenceModule({ classes, businessArea }: { classes?: number[]; businessArea: string }) {
  const [score, setScore] = useState<number | null>(null);
  const [avgTime, setAvgTime] = useState(0);
  const [successRate, setSuccessRate] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchScore() {
      setLoading(true);
      try {
        const classe = classes && classes.length > 0 ? `NCL ${classes[0]}` : businessArea || null;
        const { data } = await supabase.rpc('calculate_predictive_score', { p_classe: classe });
        const d = data as any;
        if (d) {
          setScore(Math.round(d.score ?? 50));
          setAvgTime(Math.round(d.tempo_medio_dias ?? 0));
          setSuccessRate(Math.round(d.taxa_deferimento ?? 0));
        } else {
          setScore(50);
        }
      } catch {
        setScore(50);
      } finally {
        setLoading(false);
      }
    }
    fetchScore();
  }, [classes, businessArea]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 mb-6 animate-pulse">
        <div className="h-6 w-48 bg-muted/40 rounded mb-4" />
        <div className="h-4 w-full bg-muted/30 rounded mb-2" />
        <div className="h-4 w-3/4 bg-muted/30 rounded" />
      </div>
    );
  }

  const s = score ?? 50;
  const riskLabel = s >= 80 ? 'Baixo' : s >= 60 ? 'Médio' : 'Alto';
  const riskColor = s >= 80 ? 'text-emerald-500' : s >= 60 ? 'text-amber-500' : 'text-red-500';
  const barColor = s >= 80 ? 'from-emerald-500 to-green-400' : s >= 60 ? 'from-amber-500 to-orange-400' : 'from-red-500 to-rose-400';
  const borderColor = s >= 80 ? 'border-emerald-500/30' : s >= 60 ? 'border-amber-500/30' : 'border-red-500/30';
  const bgGlow = s >= 80 ? 'bg-emerald-500/5' : s >= 60 ? 'bg-amber-500/5' : 'bg-red-500/5';

  const message = s >= 80
    ? 'Alto potencial de deferimento. Recomendamos protocolar imediatamente.'
    : s >= 60
    ? 'Marca viável, porém o registro imediato reduz riscos futuros.'
    : 'Recomendamos avaliação estratégica do nome antes do protocolo.';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={`rounded-2xl border ${borderColor} ${bgGlow} p-5 md:p-6 mb-6 space-y-4`}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-md">
          <Brain className="h-4.5 w-4.5 text-white" />
        </div>
        <div>
          <h4 className="font-display font-semibold text-base">🧠 Análise Inteligente da Marca</h4>
          <p className="text-[11px] text-muted-foreground">Motor preditivo WebMarcas Intelligence PI™</p>
        </div>
      </div>

      {/* Score + Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Score */}
        <div className="flex items-center gap-3">
          <div className="relative w-16 h-16">
            <svg width="64" height="64" className="-rotate-90">
              <circle cx="32" cy="32" r="26" fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
              <motion.circle
                cx="32" cy="32" r="26" fill="none"
                stroke={s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444'}
                strokeWidth="5" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 26}
                initial={{ strokeDashoffset: 2 * Math.PI * 26 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 26 * (1 - s / 100) }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-lg font-black ${riskColor}`}>{s}</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-bold">Score Comercial</p>
            <p className={`text-xs font-semibold ${riskColor}`}>Risco {riskLabel}</p>
          </div>
        </div>

        {/* Success Rate */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10">
            <TrendingUp className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-bold">{successRate > 0 ? `${successRate}%` : '—'}</p>
            <p className="text-[11px] text-muted-foreground">Taxa de deferimento</p>
          </div>
        </div>

        {/* Avg Time */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10">
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-bold">{avgTime > 0 ? `~${avgTime} dias` : '—'}</p>
            <p className="text-[11px] text-muted-foreground">Tempo médio estimado</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-muted-foreground">Potencial de deferimento</span>
          <span className={`text-xs font-bold ${riskColor}`}>{s}/100</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-muted/40 overflow-hidden">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${s}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
          />
        </div>
      </div>

      {/* Strategic Observation */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-card/60 border border-border/30">
        <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-foreground leading-relaxed">
          <strong>Observação estratégica:</strong> {message}
        </p>
      </div>

      {/* Legal Disclaimer */}
      <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
        Indicador baseado em dados históricos internos e públicos. Não representa garantia de resultado.
      </p>
    </motion.div>
  );
}

const ViabilitySearchSection = () => {
  const [brandName, setBrandName] = useState("");
  const [businessArea, setBusinessArea] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<ViabilityResult | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!brandName.trim() || !businessArea.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o nome da marca e o ramo de atividade.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);

    try {
      const viabilityResult = await checkViability(brandName.trim(), businessArea.trim());
      setResult(viabilityResult);

      await supabase.from('viability_searches').insert({
        brand_name: brandName.trim(),
        business_area: businessArea.trim(),
        result_level: viabilityResult.level
      });
    } catch (error) {
      console.error('Error checking viability:', error);
      toast({
        title: "Erro na consulta",
        description: "Não foi possível realizar a consulta. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const resetSearch = () => {
    setResult(null);
    setBrandName("");
    setBusinessArea("");
  };

  const getViabilityText = (level: ViabilityLevel) => {
    switch (level) {
      case "high": return "✅ Viável";
      case "medium": return "⚠️ Baixa viabilidade";
      case "low": return "❌ Alto risco de colidência";
      case "blocked": return "❌ Marca bloqueada";
      default: return "";
    }
  };

  const printLaudo = () => {
    const currentDate = new Date().toLocaleString('pt-BR');
    const viabilityText = getViabilityText(result?.level || null);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: "Erro", description: "Não foi possível abrir a janela de impressão.", variant: "destructive" });
      return;
    }

    // Build INPI table rows
    const inpiRows = (result?.inpiData?.resultados || []).map((r, i) =>
      `<tr><td>${i + 1}</td><td>${r.marca}</td><td>${r.processo}</td><td>${r.situacao}</td><td>${r.classe}</td></tr>`
    ).join('');

    // Build CNPJ rows
    const cnpjRows = (result?.cnpjData?.matches || []).map((m, i) =>
      `<tr><td>${i + 1}</td><td>${m.nome}</td><td>${m.cnpj}</td><td>${m.situacao}</td></tr>`
    ).join('');

    // Build social rows
    const socialRows = (result?.internetData?.socialMatches || []).map(s =>
      `<tr><td>${s.plataforma}</td><td>${s.encontrado ? '✅ Encontrado' : '❌ Não encontrado'}</td><td>${s.url || '-'}</td></tr>`
    ).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Laudo Técnico de Viabilidade - WebMarcas</title>
        <style>
          @page { size: A4; margin: 20mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1a1a2e; background: white; padding: 40px; }
          .header { display: flex; align-items: center; gap: 20px; border-bottom: 3px solid #0ea5e9; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { width: 80px; height: 80px; }
          .company-info h1 { font-size: 28px; color: #0ea5e9; margin-bottom: 5px; }
          .company-info p { color: #64748b; font-size: 14px; }
          .official-badge { background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; margin-bottom: 20px; }
          .title { text-align: center; font-size: 24px; color: #1a1a2e; margin-bottom: 30px; padding: 15px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 8px; border-left: 4px solid #0ea5e9; }
          .info-section { margin-bottom: 25px; }
          .info-section h3 { font-size: 16px; color: #0ea5e9; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
          .info-item { background: #f8fafc; padding: 12px 16px; border-radius: 6px; border-left: 3px solid #0ea5e9; }
          .info-item label { display: block; font-size: 12px; color: #64748b; margin-bottom: 4px; }
          .info-item span { font-size: 16px; font-weight: 600; color: #1a1a2e; }
          .result-box { padding: 20px; border-radius: 8px; margin-bottom: 25px; text-align: center; font-size: 20px; font-weight: bold; }
          .result-high { background: #dcfce7; color: #166534; border: 2px solid #22c55e; }
          .result-medium { background: #fef9c3; color: #854d0e; border: 2px solid #eab308; }
          .result-low, .result-blocked { background: #fee2e2; color: #991b1b; border: 2px solid #ef4444; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 13px; }
          th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
          th { background: #f0f9ff; color: #0369a1; font-weight: 600; }
          .laudo-content { background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 25px; white-space: pre-wrap; font-size: 14px; line-height: 1.8; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px; }
          .footer .site { color: #0ea5e9; font-weight: 600; }
          .footer .disclaimer { margin-top: 15px; padding: 10px; background: #dcfce7; border-radius: 6px; color: #166534; font-style: italic; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${webmarcasIcon}" alt="WebMarcas" class="logo" />
          <div class="company-info"><h1>WebMarcas</h1><p>Registro de Marcas</p></div>
        </div>
        <div class="official-badge">📋 PESQUISA REAL – INPI + MERCADO + INTERNET</div>
        <div class="title">📋 Laudo Técnico de Viabilidade de Marca</div>

        <div class="info-section">
          <h3>📋 Dados da Consulta</h3>
          <div class="info-grid">
            <div class="info-item"><label>Nome da Marca</label><span>${brandName}</span></div>
            <div class="info-item"><label>Ramo de Atividade</label><span>${businessArea}</span></div>
            <div class="info-item"><label>Data da Consulta</label><span>${result?.searchDate || currentDate}</span></div>
            <div class="info-item"><label>Tipo de Pesquisa</label><span>Completa (INPI + CNPJ + Internet)</span></div>
          </div>
        </div>

        <div class="info-section">
          <h3>📊 Resultado da Análise</h3>
          <div class="result-box result-${result?.level || 'low'}">${viabilityText}</div>
        </div>

        ${(result?.inpiData?.totalResultados ?? 0) > 0 ? `
        <div class="info-section">
          <h3>🔍 Resultado da Pesquisa no INPI</h3>
          <p style="margin-bottom:10px;font-size:14px;">Total de resultados: <strong>${result?.inpiData?.totalResultados}</strong></p>
          <table>
            <thead><tr><th>#</th><th>Marca</th><th>Processo</th><th>Situação</th><th>Classe</th></tr></thead>
            <tbody>${inpiRows}</tbody>
          </table>
        </div>` : `
        <div class="info-section">
          <h3>🔍 Resultado da Pesquisa no INPI</h3>
          <p style="font-size:14px;">✅ Nenhuma marca idêntica encontrada na base do INPI.</p>
        </div>`}

        ${(result?.cnpjData?.total ?? 0) > 0 ? `
        <div class="info-section">
          <h3>🏢 Colidência Empresarial (CNPJ)</h3>
          <table>
            <thead><tr><th>#</th><th>Empresa</th><th>CNPJ</th><th>Situação</th></tr></thead>
            <tbody>${cnpjRows}</tbody>
          </table>
        </div>` : `
        <div class="info-section">
          <h3>🏢 Colidência Empresarial (CNPJ)</h3>
          <p style="font-size:14px;">✅ Nenhuma empresa com nome idêntico encontrada.</p>
        </div>`}

        <div class="info-section">
          <h3>🌐 Colidência na Internet</h3>
          ${socialRows ? `<table><thead><tr><th>Plataforma</th><th>Status</th><th>URL</th></tr></thead><tbody>${socialRows}</tbody></table>` : '<p style="font-size:14px;">Nenhuma presença identificada.</p>'}
        </div>

        ${result?.classDescriptions ? `
        <div class="info-section">
          <h3>🏷️ Classes NCL Recomendadas</h3>
          <ul style="list-style:none;padding:0;">
            ${result.classDescriptions.map(d => `<li style="background:#f8fafc;padding:10px 16px;border-radius:6px;border-left:3px solid #0ea5e9;margin-bottom:8px;font-size:14px;">${d}</li>`).join('')}
          </ul>
        </div>` : ''}

        <div class="info-section">
          <h3>⚖️ Parecer Técnico Completo</h3>
          <div class="laudo-content">${result?.laudo || result?.description || 'Análise não disponível'}</div>
        </div>

        <div class="footer">
          <p>Documento gerado automaticamente pelo sistema WebMarcas</p>
          <p class="site">www.webmarcas.net</p>
          <p>Data e hora da geração: ${currentDate}</p>
          <div class="disclaimer">✅ Pesquisa realizada diretamente na base oficial do INPI + análise de mercado.</div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.focus(); printWindow.print(); };
  };

  const handleRegisterClick = () => {
    sessionStorage.setItem('viabilityData', JSON.stringify({
      brandName,
      businessArea,
      level: result?.level,
    }));
    window.scrollTo({ top: 0, behavior: 'instant' });
    navigate('/registro');
  };

  const getResultStyles = (level: ViabilityLevel) => {
    switch (level) {
      case "high": return { icon: CheckCircle, bgClass: "bg-accent/10 border-accent/30", iconClass: "text-accent", textClass: "text-accent" };
      case "medium": return { icon: AlertTriangle, bgClass: "bg-yellow-500/10 border-yellow-500/30", iconClass: "text-yellow-500", textClass: "text-yellow-500" };
      case "low": return { icon: AlertCircle, bgClass: "bg-destructive/10 border-destructive/30", iconClass: "text-destructive", textClass: "text-destructive" };
      case "blocked": return { icon: ShieldX, bgClass: "bg-destructive/20 border-destructive/50", iconClass: "text-destructive", textClass: "text-destructive" };
      default: return { icon: Search, bgClass: "", iconClass: "", textClass: "" };
    }
  };

  return (
    <section id="consultar" className="py-12 md:py-16 lg:py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-gradient opacity-30" />
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/3 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-10"
        >
          <span className="badge-premium mb-4 inline-flex">Pesquisa Real no INPI</span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Consulte a viabilidade da sua{" "}
            <span className="gradient-text">marca</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Pesquisa automática na base oficial do INPI em tempo real.
          </p>
        </motion.div>

        <div className="max-w-2xl mx-auto">
          {/* Feature Cards */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="grid grid-cols-3 gap-4 mb-6"
          >
            {FEATURE_CARDS.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: 0.15 + i * 0.07 }}
                className="flex flex-col items-center gap-2.5 rounded-2xl border border-border/50 bg-card/70 backdrop-blur-sm px-3 py-5 text-center shadow-sm"
              >
                <item.icon className="w-7 h-7 text-primary" strokeWidth={1.5} />
                <p className="font-semibold text-foreground text-sm leading-tight">{item.label}</p>
                <p className="text-xs text-muted-foreground leading-snug">{item.sub}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Search Form / Result */}
          {!result ? (
            <motion.form
              onSubmit={handleSearch}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.2 }}
              className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm shadow-md p-8"
            >
              <div className="space-y-6">
                <div>
                  <label htmlFor="brandName" className="block text-sm font-bold text-foreground mb-2.5">
                    Nome da Marca <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="brandName"
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="Ex: WebMarcas, TechFlow, BioVida..."
                    className="w-full h-14 rounded-xl border border-border/60 bg-muted/30 px-4 text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all disabled:opacity-50"
                    disabled={isSearching}
                  />
                </div>

                <div>
                  <label htmlFor="businessArea" className="block text-sm font-bold text-foreground mb-2.5">
                    Ramo de Atividade <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="businessArea"
                    type="text"
                    value={businessArea}
                    onChange={(e) => setBusinessArea(e.target.value)}
                    placeholder="Ex: Serviços Jurídicos, Alimentação, Tecnologia..."
                    className="w-full h-14 rounded-xl border border-border/60 bg-muted/30 px-4 text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all disabled:opacity-50"
                    disabled={isSearching}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSearching}
                  className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2.5 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSearching ? (
                    <>
                      <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Consultando INPI...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Consultar Viabilidade
                    </>
                  )}
                </button>
              </div>

              <p className="mt-5 text-center text-xs text-muted-foreground">
                🔒 Consulta gratuita • Resultado em segundos • Sem cadastro necessário
              </p>
            </motion.form>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm shadow-md p-8"
            >
              {/* Official Badge */}
              <div className="flex justify-center mb-5">
                <span className="bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium border border-primary/20">
                  📋 Resultado da pesquisa real no INPI
                </span>
              </div>

              {/* Result Header */}
              {(() => {
                const styles = getResultStyles(result.level);
                const Icon = styles.icon;
                return (
                  <div className={`rounded-xl border p-6 mb-6 ${styles.bgClass}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <Icon className={`w-6 h-6 ${styles.iconClass}`} />
                      <h3 className={`font-display text-xl font-bold ${styles.textClass}`}>{result.title}</h3>
                    </div>
                    <p className="text-muted-foreground">{result.description}</p>
                  </div>
                );
              })()}

              {/* INPI Results Section */}
              {result.inpiData && (
                <div className="mb-6">
                  <h4 className="font-display font-semibold text-base mb-3 flex items-center gap-2">
                    <Search className="w-4 h-4 text-primary" />
                    Resultado INPI ({result.inpiData.totalResultados} encontrado{result.inpiData.totalResultados !== 1 ? 's' : ''})
                  </h4>
                  {result.inpiData.totalResultados > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-border/40">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Marca</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Processo</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Situação</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Classe</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.inpiData.resultados.map((r, i) => (
                            <tr key={i} className="border-t border-border/30">
                              <td className="px-3 py-2 font-medium">{r.marca}</td>
                              <td className="px-3 py-2 text-muted-foreground">{r.processo || '-'}</td>
                              <td className="px-3 py-2">{r.situacao}</td>
                              <td className="px-3 py-2 text-muted-foreground">{r.classe}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                      ✅ Nenhuma marca idêntica encontrada na base do INPI.
                    </p>
                  )}
                </div>
              )}

              {/* CNPJ + Internet Summary */}
              {(result.cnpjData || result.internetData) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {result.cnpjData && (
                    <div className="rounded-lg border border-border/40 p-4">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary" />
                        Colidência Empresarial
                      </h4>
                      {result.cnpjData.total > 0 ? (
                        <div className="space-y-2">
                          {result.cnpjData.matches.map((m, i) => (
                            <div key={i} className="text-xs bg-muted/30 rounded p-2">
                              <p className="font-medium">{m.nome}</p>
                              {m.cnpj && <p className="text-muted-foreground">{m.cnpj} • {m.situacao}</p>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">✅ Nenhuma empresa encontrada</p>
                      )}
                    </div>
                  )}

                  {result.internetData && (
                    <div className="rounded-lg border border-border/40 p-4">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-primary" />
                        Presença na Internet
                      </h4>
                      <div className="space-y-1.5">
                        {result.internetData.socialMatches.map((s, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="font-medium">{s.plataforma}</span>
                            <span className={s.encontrado ? 'text-yellow-600' : 'text-accent'}>
                              {s.encontrado ? '⚠️ Encontrado' : '✅ Livre'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Laudo Completo */}
              {result.laudo && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-display font-semibold text-lg">Laudo Técnico de Viabilidade</h4>
                    <Button variant="ghost" size="sm" onClick={printLaudo} className="text-muted-foreground hover:text-foreground">
                      <Printer className="w-4 h-4 mr-1" />
                      Imprimir / Salvar Laudo
                    </Button>
                  </div>
                  <div className="bg-muted/40 rounded-xl p-4 max-h-80 overflow-y-auto border border-border/40">
                    <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans leading-relaxed">{result.laudo}</pre>
                  </div>
                </div>
              )}

              {/* Warning */}
              {result.level !== 'blocked' && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-primary">⚠️ Importante:</strong> O dono da marca é quem
                    registra primeiro. Mesmo com alta viabilidade, a situação pode mudar a qualquer
                    momento se outra pessoa protocolar antes de você.
                  </p>
                </div>
              )}

              {/* Análise Inteligente Comercial */}
              {result.level !== 'blocked' && (
                <CommercialIntelligenceModule
                  classes={result.classes}
                  businessArea={businessArea}
                />
              )}

              {/* CTAs */}
              <div className="space-y-3">
                {result.level !== 'blocked' && (
                  <button
                    className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm group"
                    onClick={handleRegisterClick}
                  >
                    🚀 Registrar minha marca agora
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
                <a
                  href={`https://wa.me/5511911120225?text=${encodeURIComponent(`Olá, estava no site da Webmarcas, quero registrar uma marca!`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-14 rounded-xl border border-primary/40 text-primary font-semibold text-base flex items-center justify-center gap-2 hover:bg-primary/5 active:scale-[0.98] transition-all"
                >
                  <MessageCircle className="w-5 h-5" />
                  Falar com especialista
                </a>
                <button
                  onClick={resetSearch}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2 flex items-center justify-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  Fazer nova consulta
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ViabilitySearchSection;

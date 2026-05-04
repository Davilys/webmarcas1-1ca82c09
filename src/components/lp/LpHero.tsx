import { Zap, CheckCircle2 } from "lucide-react";

interface Props {
  onCtaClick: () => void;
}

export const LpHero = ({ onCtaClick }: Props) => (
  <section className="relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background pointer-events-none" />
    <div className="relative max-w-2xl mx-auto px-4 pt-8 pb-10 md:pt-14 md:pb-16">
      {/* Badge */}
      <div className="flex justify-center mb-5">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
          <Zap className="w-3.5 h-3.5" />
          Protocolo em até 48h no INPI
        </div>
      </div>

      {/* H1 */}
      <h1 className="font-display text-[28px] leading-[1.15] sm:text-4xl md:text-5xl font-bold tracking-tight text-center mb-4">
        Registre sua Marca e Proteja seu Negócio com{" "}
        <span className="text-primary">Exclusividade</span>
      </h1>

      {/* Subheadline */}
      <p className="text-base md:text-lg text-muted-foreground text-center max-w-xl mx-auto mb-7">
        Cuidamos de todo o processo no INPI. Você só preenche o formulário —
        nós fazemos o resto.
      </p>

      {/* CTA */}
      <button
        type="button"
        onClick={onCtaClick}
        className="w-full min-h-[56px] rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-[18px] font-bold transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.99]"
      >
        Iniciar meu Registro Agora →
      </button>

      {/* Micro-copy jurídica */}
      <p className="text-[12px] text-muted-foreground text-center mt-3 leading-relaxed">
        Processo realizado perante o INPI · Sem garantia de aprovação · Suporte
        em todas as etapas
      </p>

      {/* Selos inline */}
      <div className="mt-6 grid grid-cols-3 gap-2">
        {[
          "100% Online",
          "Parcelamento disponível",
          "Equipe especializada",
        ].map((label) => (
          <div
            key={label}
            className="flex items-center gap-1.5 justify-center text-[11px] sm:text-xs font-medium text-foreground/80 bg-card border border-border/60 rounded-lg px-2 py-2 text-center"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
            <span className="leading-tight">{label}</span>
          </div>
        ))}
      </div>
    </div>
  </section>
);

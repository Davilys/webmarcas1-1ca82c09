import { ShieldCheck, Zap, Award } from "lucide-react";

/**
 * Trust strip for landing page /registrar.
 * Reinforces credibility right below the conversion form.
 */
export function TrustStrip() {
  const items = [
    { icon: Zap, label: "Protocolo INPI em 48h" },
    { icon: ShieldCheck, label: "Certificado Blockchain" },
    { icon: Award, label: "+1.000 marcas registradas" },
  ];

  return (
    <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">
      {items.map(({ icon: Icon, label }) => (
        <div
          key={label}
          className="flex flex-col items-center text-center gap-1.5 px-2 py-3 rounded-xl bg-card/50 border border-border/60 backdrop-blur-sm"
        >
          <Icon className="w-5 h-5 text-primary" strokeWidth={2.2} />
          <span className="text-[11px] sm:text-xs font-medium text-foreground leading-tight">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

import { ShieldCheck, Zap, Award, Users } from "lucide-react";

/**
 * Trust strip for landing page /registrar.
 * Premium horizontal chips reinforcing credibility.
 */
export function TrustStrip() {
  const items = [
    { icon: Users, label: "+11.000 marcas" },
    { icon: Zap, label: "Protocolo em 48h" },
    { icon: ShieldCheck, label: "Certificado Blockchain" },
    { icon: Award, label: "INPI Oficial" },
  ];

  return (
    <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      {items.map(({ icon: Icon, label }) => (
        <div
          key={label}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-card/70 border border-border/60 backdrop-blur-sm shadow-sm"
        >
          <Icon className="w-4 h-4 text-accent shrink-0" strokeWidth={2.2} />
          <span className="text-[11px] sm:text-xs font-semibold text-foreground/90 leading-tight">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

import { AlertTriangle } from "lucide-react";

const points = [
  "Outra empresa pode registrar seu nome antes de você.",
  "Você perde o direito de uso exclusivo no mercado.",
  "Todo seu investimento em marketing fica sem proteção legal.",
];

export const LpPainPoints = () => (
  <section className="bg-secondary/40 py-12 md:py-16">
    <div className="max-w-2xl mx-auto px-4">
      <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-8 tracking-tight">
        O que acontece se você não registrar?
      </h2>
      <div className="space-y-3">
        {points.map((p, i) => (
          <div
            key={i}
            className="flex gap-3 p-5 bg-card border-l-4 border-l-destructive/60 border-y border-r border-border/60 rounded-r-xl rounded-l-sm"
          >
            <AlertTriangle
              className="w-5 h-5 text-destructive/80 shrink-0 mt-0.5"
              strokeWidth={1.5}
            />
            <p className="text-sm md:text-base text-foreground/90 leading-relaxed">
              {p}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

import { ClipboardList, Search, FileCheck2 } from "lucide-react";

const steps = [
  { icon: ClipboardList, title: "Você preenche o formulário", desc: "Informe seus dados e o nome da marca que deseja registrar." },
  { icon: Search, title: "Nossa equipe analisa", desc: "Preparamos seu pedido tecnicamente para o protocolo no INPI." },
  { icon: FileCheck2, title: "Acompanhamos até o fim", desc: "Você acompanha cada etapa pelo painel do cliente." },
];

export const LpSteps = () => (
  <section className="bg-background py-12 md:py-16">
    <div className="max-w-2xl mx-auto px-4">
      <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-8 tracking-tight">
        Como é o processo?
      </h2>
      <div className="space-y-4">
        {steps.map((s, i) => (
          <div
            key={i}
            className="flex gap-4 p-5 bg-card border border-border/60 rounded-2xl"
          >
            <div className="flex-shrink-0 flex flex-col items-center gap-2">
              <span className="font-display text-2xl font-bold text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <s.icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-display font-bold text-foreground mb-1">
                {s.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {s.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs italic text-muted-foreground text-center mt-6 max-w-md mx-auto">
        O prazo de análise e aprovação é determinado exclusivamente pelo INPI e
        pode variar.
      </p>
    </div>
  </section>
);

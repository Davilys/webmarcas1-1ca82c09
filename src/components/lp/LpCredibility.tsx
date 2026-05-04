import { Globe2, Users, ListChecks, MessageCircle } from "lucide-react";

const items = [
  { icon: Globe2, title: "Processo 100% Online", desc: "Sem precisar sair de casa." },
  { icon: Users, title: "Equipe Especializada", desc: "Profissionais em Propriedade Intelectual." },
  { icon: ListChecks, title: "Acompanhamento Completo", desc: "Do início ao protocolo no INPI." },
  { icon: MessageCircle, title: "Atendimento via WhatsApp", desc: "Tire dúvidas em tempo real." },
];

export const LpCredibility = () => (
  <section className="bg-secondary/40 py-12 md:py-16">
    <div className="max-w-2xl mx-auto px-4">
      <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-8 tracking-tight">
        Por que escolher a WebMarcas?
      </h2>
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {items.map((it, i) => (
          <div
            key={i}
            className="bg-card border border-border/60 rounded-2xl p-4 md:p-5"
          >
            <it.icon className="w-6 h-6 text-accent mb-3" strokeWidth={1.5} />
            <h3 className="font-display font-bold text-sm md:text-base text-foreground mb-1 leading-tight">
              {it.title}
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              {it.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

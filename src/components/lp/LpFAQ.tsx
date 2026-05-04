import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Quanto tempo leva o registro?",
    a: "O prazo de análise é determinado pelo INPI e pode variar de meses a anos. Cuidamos do protocolo em até 48h após aprovação do pedido.",
  },
  {
    q: "Vocês garantem a aprovação?",
    a: "Não. O INPI é o órgão responsável pela análise e aprovação. Garantimos excelência no preparo e acompanhamento do seu processo.",
  },
  {
    q: "Posso parcelar?",
    a: "Sim. Consulte as condições de parcelamento disponíveis no checkout.",
  },
  {
    q: "Preciso de CNPJ?",
    a: "Não necessariamente. Tanto pessoas físicas quanto jurídicas podem registrar uma marca, comprovando o exercício da atividade.",
  },
];

export const LpFAQ = () => (
  <section className="bg-background py-12 md:py-16">
    <div className="max-w-2xl mx-auto px-4">
      <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-8 tracking-tight">
        Perguntas frequentes
      </h2>
      <Accordion type="single" collapsible className="space-y-3">
        {faqs.map((f, i) => (
          <AccordionItem
            key={i}
            value={`item-${i}`}
            className="bg-card border border-border/60 rounded-xl px-5 data-[state=open]:border-primary/40"
          >
            <AccordionTrigger className="text-left font-display font-semibold text-sm md:text-base hover:no-underline py-4 min-h-[56px]">
              {f.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
              {f.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </section>
);

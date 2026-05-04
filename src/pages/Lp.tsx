import { useEffect } from "react";
import { LpHeader } from "@/components/lp/LpHeader";
import { LpHero } from "@/components/lp/LpHero";
import { LpSteps } from "@/components/lp/LpSteps";
import { LpPainPoints } from "@/components/lp/LpPainPoints";
import { LpLeadForm } from "@/components/lp/LpLeadForm";
import { LpCredibility } from "@/components/lp/LpCredibility";
import { LpFAQ } from "@/components/lp/LpFAQ";
import { LpFooter } from "@/components/lp/LpFooter";
import { PageMeta } from "@/components/seo/PageMeta";
import { trackLpView } from "@/lib/lpAnalytics";

export default function Lp() {
  useEffect(() => {
    trackLpView();
  }, []);

  const scrollToForm = () => {
    document.getElementById("lp-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageMeta
        title="Registre sua Marca no INPI | WebMarcas — Protocolo em 48h"
        description="Registre sua marca no INPI 100% online. Processo conduzido por equipe especializada, com acompanhamento até o certificado."
        canonical="https://webmarcas.net/lp"
      />
      <LpHeader />
      <main className="flex-1">
        <LpHero onCtaClick={scrollToForm} />
        <LpSteps />
        <LpPainPoints />
        <LpLeadForm />
        <LpCredibility />
        <LpFAQ />
      </main>
      <LpFooter />
    </div>
  );
}

import { useLanguage } from "@/contexts/LanguageContext";
import benefitProtection from "@/assets/illustrations/benefit-protection.png";
import benefitReport from "@/assets/illustrations/benefit-report.png";
import benefitProtocol from "@/assets/illustrations/benefit-protocol.png";
import benefitLegal from "@/assets/illustrations/benefit-legal.png";
import benefitTracking from "@/assets/illustrations/benefit-tracking.png";
import benefitSupport from "@/assets/illustrations/benefit-support.png";

const BenefitsSection = () => {
  const { t } = useLanguage();

  const benefits = [
    {
      image: benefitProtection,
      title: t("benefits.protection.title"),
      description: t("benefits.protection.desc"),
    },
    {
      image: benefitReport,
      title: t("benefits.report.title"),
      description: t("benefits.report.desc"),
    },
    {
      image: benefitProtocol,
      title: t("benefits.protocol.title"),
      description: t("benefits.protocol.desc"),
    },
    {
      image: benefitLegal,
      title: t("benefits.legal.title"),
      description: t("benefits.legal.desc"),
    },
    {
      image: benefitTracking,
      title: t("benefits.tracking.title"),
      description: t("benefits.tracking.desc"),
    },
    {
      image: benefitSupport,
      title: t("benefits.support.title"),
      description: t("benefits.support.desc"),
    },
  ];

  return (
    <section id="beneficios" className="section-padding bg-card relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="badge-premium mb-4 inline-flex">{t("benefits.badge")}</span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            {t("benefits.title")}{" "}
            <span className="gradient-text">{t("benefits.titleHighlight")}</span>?
          </h2>
          <p className="text-muted-foreground text-lg">
            {t("benefits.subtitle")}
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
          {benefits.map((benefit, index) => (
            <div key={index} className="feature-card group">
              <div className="w-20 h-20 mb-4 flex items-center justify-center">
                <img src={benefit.image} alt={benefit.title} className="w-full h-full object-contain" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">
                {benefit.title}
              </h3>
              <p className="text-muted-foreground">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;

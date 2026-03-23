import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { AnimatedCounter } from "@/components/admin/dashboard/AnimatedCounter";
import trustShield from "@/assets/illustrations/trust-shield.png";
import trustClock from "@/assets/illustrations/trust-clock.png";
import trustGuarantee from "@/assets/illustrations/trust-guarantee.png";
import trustOnline from "@/assets/illustrations/trust-online.png";

const TrustBadgesSection = () => {
  const { t } = useLanguage();

  const trustBadges = [
    { image: trustShield, label: t("hero.trust.inpi") },
    { image: trustClock, label: t("hero.trust.protocol") },
    { image: trustGuarantee, label: t("hero.trust.guarantee") },
    { image: trustOnline, label: t("hero.trust.online") },
  ];

  const stats = [
    { value: 11000, suffix: "+", label: t("hero.stats.brands") },
    { value: 98, suffix: "%", label: t("hero.stats.success") },
    { value: 48, suffix: "h", label: t("hero.stats.time") },
    { value: 15, suffix: "+", label: t("hero.stats.experience") },
  ];

  return (
    <section className="py-12 md:py-16 bg-background">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Trust Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {trustBadges.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-card border border-border/50 shadow-sm text-center"
            >
              <div className="w-16 h-16 flex items-center justify-center">
                <img src={item.image} alt={item.label} className="w-full h-full object-contain" />
              </div>
              <span className="text-sm font-medium text-foreground leading-tight">{item.label}</span>
            </motion.div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
            >
              <div className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-primary mb-2">
                <AnimatedCounter
                  value={stat.value}
                  suffix={stat.suffix}
                  duration={2.5}
                />
              </div>
              <div className="text-sm md:text-base text-muted-foreground font-medium">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustBadgesSection;

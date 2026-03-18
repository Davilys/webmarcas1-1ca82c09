import { ArrowRight, Shield, Clock, CheckCircle, Award, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { getNextFridayFormatted } from "@/lib/dateUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedCounter } from "@/components/admin/dashboard/AnimatedCounter";
import ViabilitySearchSection from "@/components/sections/ViabilitySearchSection";

const HeroSection = () => {
  const { t } = useLanguage();
  const [phraseIndex, setPhraseIndex] = useState(0);

  const phrases = [t("hero.phrase1"), t("hero.phrase2"), t("hero.phrase3")];

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % phrases.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [phrases.length]);

  const trustBadges = [
    { icon: Shield, label: t("hero.trust.inpi"), color: "text-blue-600", bgColor: "bg-blue-500/10" },
    { icon: Clock, label: t("hero.trust.protocol"), color: "text-emerald-600", bgColor: "bg-emerald-500/10" },
    { icon: CheckCircle, label: t("hero.trust.guarantee"), color: "text-violet-600", bgColor: "bg-violet-500/10" },
    { icon: Award, label: t("hero.trust.online"), color: "text-amber-600", bgColor: "bg-amber-500/10" },
  ];

  const stats = [
    { value: 11000, suffix: "+", label: t("hero.stats.brands") },
    { value: 98, suffix: "%", label: t("hero.stats.success") },
    { value: 48, suffix: "h", label: t("hero.stats.time") },
    { value: 15, suffix: "+", label: t("hero.stats.experience") },
  ];

  return (
    <section id="home" className="relative hero-glow overflow-x-clip overflow-y-visible">
      <div className="absolute inset-0 bg-hero-gradient" />

      <div className="container mx-auto px-4 pt-28 pb-14 relative z-10">
        {/* Two-column layout — no cards, transparent background */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_440px] gap-8 lg:gap-12 items-start max-w-6xl mx-auto">
          
          {/* Left Column — Hero Text */}
          <div className="flex flex-col justify-center text-center lg:text-left pt-2 lg:pt-6">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 badge-premium mb-6 w-fit mx-auto lg:mx-0">
              <Award className="w-4 h-4" />
              <span>{t("hero.badge")}</span>
            </div>

            {/* Heading — 2 lines max */}
            <h1 className="font-display text-[2.5rem] sm:text-5xl md:text-[3.5rem] lg:text-[3.5rem] xl:text-[4rem] font-bold leading-[1.08] mb-5">
              {t("hero.title")}{" "}
              <span className="inline-block overflow-hidden h-[1.15em] align-bottom relative">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={phraseIndex}
                    initial={{ y: '100%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '-100%', opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="inline-block gradient-text"
                  >
                    {phrases[phraseIndex]}
                  </motion.span>
                </AnimatePresence>
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8">
              {t("hero.subtitle")}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3 mb-5">
              <Button variant="hero" size="xl" asChild>
                <a href="#consultar" className="group">
                  {t("hero.cta.check")}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
              <Button variant="hero-outline" size="xl" asChild>
                <a href="#precos">
                  {t("hero.cta.register")}
                </a>
              </Button>
            </div>

            {/* Urgency Banner */}
            <div className="flex items-center justify-center lg:justify-start gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20 max-w-md mx-auto lg:mx-0">
              <Flame className="w-5 h-5 text-destructive shrink-0" />
              <p className="text-sm font-medium text-foreground">
                {t("hero.urgency")} <span className="font-bold text-destructive">{getNextFridayFormatted()}</span>
              </p>
            </div>
          </div>

          {/* Right Column — Viability Search */}
          <div className="w-full">
            <ViabilitySearchSection compact />
          </div>
        </div>

        {/* Trust Badges — full width, no card wrapper */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 max-w-4xl mx-auto mt-16">
          {trustBadges.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-card/60 backdrop-blur-sm text-center"
            >
              <div className={`p-3 rounded-xl ${item.bgColor}`}>
                <item.icon className={`w-6 h-6 ${item.color}`} />
              </div>
              <span className="text-sm font-medium text-foreground leading-tight">{item.label}</span>
            </motion.div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10 max-w-4xl mx-auto">
          {stats.map((stat, index) => (
            <motion.div 
              key={index} 
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
            >
              <div className="font-display text-3xl sm:text-4xl md:text-5xl font-bold gradient-text mb-2">
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

export default HeroSection;

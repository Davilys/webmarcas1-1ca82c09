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
    { 
      icon: Shield, 
      label: t("hero.trust.inpi"),
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
      gradientFrom: "from-blue-500",
      gradientTo: "to-cyan-500"
    },
    { 
      icon: Clock, 
      label: t("hero.trust.protocol"),
      color: "text-emerald-600",
      bgColor: "bg-emerald-500/10",
      gradientFrom: "from-emerald-500",
      gradientTo: "to-green-500"
    },
    { 
      icon: CheckCircle, 
      label: t("hero.trust.guarantee"),
      color: "text-violet-600",
      bgColor: "bg-violet-500/10",
      gradientFrom: "from-violet-500",
      gradientTo: "to-purple-500"
    },
    { 
      icon: Award, 
      label: t("hero.trust.online"),
      color: "text-amber-600",
      bgColor: "bg-amber-500/10",
      gradientFrom: "from-amber-500",
      gradientTo: "to-orange-500"
    },
  ];

  const stats = [
    { value: 11000, suffix: "+", label: t("hero.stats.brands") },
    { value: 98, suffix: "%", label: t("hero.stats.success") },
    { value: 48, suffix: "h", label: t("hero.stats.time") },
    { value: 15, suffix: "+", label: t("hero.stats.experience") },
  ];

  return (
    <section id="home" className="relative min-h-[85vh] flex items-center hero-glow overflow-x-clip overflow-y-visible">
      {/* Background elements */}
      <div className="absolute inset-0 bg-hero-gradient" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 pt-24 pb-16 relative z-10">
        {/* Two-column hero layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center max-w-6xl mx-auto">
          {/* Left Column - Text */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 badge-premium mb-6 animate-fade-in">
              <Award className="w-4 h-4" />
              <span>{t("hero.badge")}</span>
            </div>

            {/* Heading */}
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-5 animate-slide-up">
              {t("hero.title")}{" "}
              <span className="inline-block overflow-hidden h-[1.2em] align-bottom relative">
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
            <p className="text-base md:text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0 mb-8 animate-slide-up" style={{ animationDelay: "0.1s" }}>
              {t("hero.subtitle")}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3 mb-5 animate-slide-up" style={{ animationDelay: "0.2s" }}>
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
            <div className="flex items-center justify-center lg:justify-start gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20 max-w-md mx-auto lg:mx-0 mb-8 animate-slide-up" style={{ animationDelay: "0.25s" }}>
              <Flame className="w-5 h-5 text-destructive" />
              <p className="text-sm font-medium text-foreground">
                {t("hero.urgency")} <span className="font-bold text-destructive">{getNextFridayFormatted()}</span>
              </p>
            </div>

            {/* Trust badges - only on desktop, below text */}
            <div className="hidden lg:grid grid-cols-4 gap-3 max-w-lg">
              {trustBadges.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card/60 backdrop-blur-sm border border-border/40 text-center"
                >
                  <div className={`p-2 rounded-lg ${item.bgColor}`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <span className="text-xs font-medium text-foreground leading-tight">{item.label}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right Column - Viability Search Form */}
          <div className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <ViabilitySearchSection compact />
          </div>
        </div>

        {/* Trust badges - mobile only */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto mt-10 lg:hidden">
          {trustBadges.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card/60 backdrop-blur-sm border border-border/40 text-center"
            >
              <div className={`p-2.5 rounded-lg ${item.bgColor}`}>
                <item.icon className={`w-6 h-6 ${item.color}`} />
              </div>
              <span className="text-xs font-medium text-foreground leading-tight">{item.label}</span>
            </motion.div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10 max-w-4xl mx-auto">
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

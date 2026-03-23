import { Award, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import ViabilitySearchSection from "@/components/sections/ViabilitySearchSection";
import consultant1 from "@/assets/consultants/consultant-1.jpg";
import consultant2 from "@/assets/consultants/consultant-2.jpg";
import consultant3 from "@/assets/consultants/consultant-3.jpg";

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


  return (
    <section id="home" className="relative overflow-x-clip overflow-y-visible" style={{ background: 'linear-gradient(135deg, #2946d9 0%, #3B5CFC 40%, #4a6aff 100%)' }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-14 relative z-10 max-w-7xl">
        {/* Two-column hero */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          
          {/* Left — Text */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium bg-white/15 border border-white/30 text-white mb-6 w-fit mx-auto lg:mx-0">
              <Award className="w-4 h-4" />
              <span>{t("hero.badge")}</span>
            </div>

            {/* Heading */}
            <h1 className="font-display text-[2.5rem] sm:text-5xl xl:text-[3.5rem] font-bold leading-[1.15] mb-6 text-white">
              {t("hero.title")}{" "}
              <span className="inline-block overflow-hidden h-[1.15em] align-bottom relative">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={phraseIndex}
                    initial={{ y: '100%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '-100%', opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="inline-block text-yellow-300"
                  >
                    {phrases[phraseIndex]}
                  </motion.span>
                </AnimatePresence>
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base md:text-lg text-white max-w-lg mx-auto lg:mx-0 mb-10">
              {t("hero.subtitle")}
            </p>

            {/* Social Proof */}
            <div className="hidden sm:inline-flex flex-col sm:flex-row items-center lg:items-start gap-4 rounded-2xl bg-white/10 border border-white/20 px-5 py-4 mx-auto lg:mx-0">
              <div className="flex items-center -space-x-3 shrink-0">
                <img src={consultant1} alt="Consultora" className="w-11 h-11 rounded-full border-2 border-white/40 object-cover" />
                <img src={consultant2} alt="Consultor" className="w-11 h-11 rounded-full border-2 border-white/40 object-cover" />
                <img src={consultant3} alt="Consultora" className="w-11 h-11 rounded-full border-2 border-white/40 object-cover" />
              </div>
              <div className="text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-0.5 mb-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-xs text-white leading-snug max-w-[220px]">
                  Consultores disponíveis durante todo processo do registro via WhatsApp.
                </p>
              </div>
            </div>
          </div>

          {/* Right — Viability Search */}
          <div className="w-full max-w-md mx-auto lg:max-w-none">
            <ViabilitySearchSection compact />
          </div>
        </div>

      </div>
    </section>
  );
};

export default HeroSection;


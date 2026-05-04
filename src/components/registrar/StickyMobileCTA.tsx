import { useEffect, useState } from "react";
import { ArrowDown } from "lucide-react";

interface StickyMobileCTAProps {
  /** Only show when on or after this step */
  minStep?: number;
  currentStep: number;
}

/**
 * Sticky bottom CTA on mobile — guides the user back to the active form
 * when they scroll past it. Hidden on desktop and on step 1 (form already visible).
 */
export function StickyMobileCTA({ minStep = 2, currentStep }: StickyMobileCTAProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (currentStep < minStep) {
      setVisible(false);
      return;
    }
    const onScroll = () => {
      const card = document.querySelector("[data-registrar-form]");
      if (!card) return;
      const rect = card.getBoundingClientRect();
      // Show when form is mostly out of view
      setVisible(rect.bottom < window.innerHeight * 0.4);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [currentStep, minStep]);

  if (currentStep < minStep || !visible) return null;

  const handleClick = () => {
    const card = document.querySelector("[data-registrar-form]");
    card?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 px-4 pb-4 pt-3 bg-gradient-to-t from-background via-background/95 to-background/0 pointer-events-none">
      <button
        type="button"
        onClick={handleClick}
        className="pointer-events-auto w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold shadow-[var(--shadow-button,0_8px_24px_-8px_hsl(var(--primary)/0.5))] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
      >
        <ArrowDown className="w-4 h-4" />
        Continuar registro
      </button>
    </div>
  );
}

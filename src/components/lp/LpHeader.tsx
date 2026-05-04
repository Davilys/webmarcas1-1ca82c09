import { ShieldCheck } from "lucide-react";
import logo from "@/assets/webmarcas-logo.png";

export const LpHeader = () => (
  <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/60 safe-area-top">
    <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
      <a href="/" className="flex items-center gap-2" aria-label="WebMarcas">
        <img src={logo} alt="WebMarcas" className="h-8 w-auto" />
        <span className="font-display text-base font-bold hidden sm:inline">
          Web<span className="text-primary">Marcas</span>
        </span>
      </a>
      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-secondary px-2.5 py-1.5 rounded-full border border-border/60">
        <ShieldCheck className="w-3.5 h-3.5 text-accent" />
        Site Seguro
      </div>
    </div>
  </header>
);

import logo from "@/assets/webmarcas-logo.png";

export const LpFooter = () => (
  <footer className="bg-secondary/60 border-t border-border/60 py-8 safe-area-bottom">
    <div className="max-w-2xl mx-auto px-4 text-center space-y-3">
      <div className="flex items-center justify-center gap-2">
        <img src={logo} alt="WebMarcas" className="h-7 w-auto" />
        <span className="font-display font-bold text-sm">
          Web<span className="text-primary">Marcas</span>
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        WebMarcas Intelligence PI — CNPJ 39.528.012/0001-29
      </p>
      <div className="flex items-center justify-center gap-4 text-xs">
        <a href="/politica-de-privacidade" className="text-muted-foreground hover:text-primary transition-colors">
          Política de Privacidade
        </a>
        <span className="text-border">•</span>
        <a href="/termos-de-uso" className="text-muted-foreground hover:text-primary transition-colors">
          Termos de Serviço
        </a>
        <span className="text-border">•</span>
        <a href="/#precos" className="text-muted-foreground hover:text-primary transition-colors">
          Planos
        </a>
      </div>
    </div>
  </footer>
);

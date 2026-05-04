
## Auditoria — o que encontrei

- `/registrar` é o **funil de 6 passos** (Viability → Personal → Brand → Plan → Payment → Contract) integrado a Asaas + Blockchain + CRM. **Funcional e blindado** pela regra de Safety Lockdown.
- Tokens atuais (`src/index.css`) usam **azul brilhante `210 100% 40%`** + verde como accent. Não bate com a identidade institucional Navy/Gold já usada em PDFs, contratos, blockchain e e-mails.
- `HeroSection` da Home tem layout 2 colunas com `ViabilitySearchSection` à direita (bom em desktop, mas competindo com o resto em mobile).
- `Header` global aparece com idioma + tema + 7 itens de menu — distrai em landing de conversão.
- Já existem: `LpHero`, `LpLeadForm`, `StickyMobileCTA`, `TrustStrip`, `PageMeta`, `lpAnalytics`. Boa base.
- Ticket R$699+, 90% mobile, vindo de Meta Ads → /registrar.

## O que NÃO vou tocar (Safety Lockdown)

- Funil de 6 passos, Asaas, Blockchain, RLS, edge functions, valores dos planos.
- `supabase/`, `client.ts`, `types.ts`, schemas.
- Identidade institucional: **mantenho Navy `#1e3a5f` + Gold `#c8af37`** (memory-locked, usados em PDFs/contratos). Os hexes que você sugeriu (#0f172a / #d4af37) são quase idênticos visualmente — manter os institucionais garante consistência cross-canal.

## Plano de execução

### 1. Design tokens premium (`src/index.css`)
- `--primary` → Navy `222 51% 25%` (#1e3a5f) | dark: Navy levemente clareado
- `--accent` → Gold `46 56% 50%` (#c8af37) — usado para selos de confiança, bordas de "premium" e micro-acentos (não como CTA principal)
- CTA principal: **Navy sólido** com sombra elegante; CTA secundário: contorno Gold
- `--gradient-primary`: `linear-gradient(135deg, #1e3a5f → #2c5283)`
- Sombras: `--shadow-card`, `--shadow-button` recalibradas (mais profundidade, menos blur azul)
- Manter Inter (corpo 16-18px mobile) + Space Grotesk (títulos, tracking -0.02em). Não trocar fonte (Satoshi exigiria nova carga e quebraria FCP).
- Adicionar utility `.glass-premium` (backdrop-blur + borda gold sutil 1px) e `.shadow-premium`.

### 2. `/registrar` como landing de conversão (mobile-first)
- **Header dedicado, mínimo**: só logo + WhatsApp + tema (já existe header local — vou enxugar, remover seleção de idioma no mobile, aumentar tap targets para 48px). Sem menu de navegação.
- **Hero acima do fold (390px)**:
  - Badge gold "Protocolo em até 48h no INPI"
  - H1: "Proteja sua marca antes que alguém registre primeiro" (28px mobile, 48px desktop)
  - Sub: "Consulta de viabilidade gratuita no INPI + análise técnica em minutos"
  - Em mobile: **`ViabilityStep` (formulário) sobe imediatamente** — hoje o card já está logo após o título; vou compactar mais o título mobile e remover o `CheckoutProgress` no step 1 (substituir por um indicador inline mais leve "Passo 1 de 6 · 2 min")
  - Trust signals em chips horizontais com scroll: "11.000+ marcas" · "98% satisfação" · "INPI Oficial" · "Suporte humano"
- **Loading premium** no botão de viabilidade: substituir spinner genérico por mensagem rotativa "Consultando base oficial do INPI…" (alterar `ViabilityStep` apenas no estado de loading, sem mudar lógica).
- **Sticky CTA mobile**: já existe `StickyMobileCTA` — refinar com Gold accent na borda superior e `min-h-[56px]`.
- **Linguagem honesta preservada**: nada de "garantia de aprovação". Reforçar "prioridade de uso", "proteção legal", "processo conduzido por especialistas".
- **Manter step 2-6 intactos** — só passo 1 ganha tratamento de landing.

### 3. Home (`src/pages/Index.tsx` + `HeroSection`)
- Refinar `HeroSection` com nova paleta Navy/Gold (botões, badges, gradientes).
- Mobile: o bloco de "Consultores disponíveis" continua oculto; em troca, mostrar 2 trust badges grandes (Shield + 48h) acima do CTA.
- CTA hero mobile: botão único `min-h-[56px]` "Consultar minha marca grátis" → scroll para `#consultar`.
- Espaçamentos verticais aumentados em mobile (py-14 → py-16) para dar negative space premium.

### 4. `/planos` e `PricingSection` (visual only)
- Aplicar nova paleta. Card "Premium" ganha **borda Gold 2px + selo "MAIS ESCOLHIDO"** centralizado no topo, flutuando.
- CTAs uniformes `min-h-[56px]`, peso 700, tracking -0.01em.
- **Valores e copy preservados.**

### 5. Header global (Home e demais páginas)
- Diminuir items de nav em mobile (esconder Idioma — manter só tema + menu hamburguer).
- CTA "Consultar marca" com Gold accent border.

### 6. Performance / Mobile
- `loading="lazy"` + `decoding="async"` em todas imagens não-hero.
- Audit de `motion` no Hero — manter 1 animação principal, remover redundâncias em mobile via `useReducedMotion`.
- Confirmar fontes preloaded em `index.html` (já estão).

### 7. QA viewport 390×781
- Hero `/registrar`: badge + H1 + sub + form visível sem scroll
- CTA principal sempre ≥ 56px, gap ≥ 12px
- Sticky CTA não cobre input ativo (usar `padding-bottom` no form)
- Home hero: H1 + sub + CTA + 1 trust badge no fold
- Testar fluxo completo do funil 1→6 para garantir zero regressão

## Arquivos a editar (estimado)

- `src/index.css` — tokens Navy/Gold, novas utilities premium
- `src/pages/Registrar.tsx` — header enxuto, hero compactado mobile, headline nova
- `src/components/cliente/checkout/ViabilityStep.tsx` — loading premium (apenas UI)
- `src/components/cliente/checkout/CheckoutProgress.tsx` — variante leve para step 1
- `src/components/registrar/StickyMobileCTA.tsx` — refinar com Gold
- `src/components/registrar/TrustStrip.tsx` — chips horizontais
- `src/components/sections/HeroSection.tsx` — paleta + mobile CTA
- `src/components/sections/PricingSection.tsx` — borda Gold + selo Premium
- `src/components/layout/Header.tsx` — enxugar mobile

## Arquivos NÃO tocados

- Funil steps 2-6, edge functions, supabase, schemas, `/lp`, contratos, blockchain, `client.ts`, `types.ts`, valores de planos.

Aprove para eu executar.

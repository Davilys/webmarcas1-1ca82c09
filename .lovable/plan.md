## Decisões já tomadas (sem mais perguntas)

Você pulou as 3 perguntas, então aplico **defaults seguros**, fundamentados nas regras Core do projeto:

1. **NÃO substituir o /registrar atual.** Ele JÁ é o funil de checkout em 6 etapas (Viability → Personal → Brand → Plan → Payment → Contract) que está funcionando, com integração Asaas, geração de contrato e blockchain. Trocar por uma landing longa quebraria o **Safety Lockdown** ("Never alter working funnels"). Em vez disso, **crio uma landing nova em `/lp`** (e aliases `/oferta`, `/inicio`) **como página dedicada para Meta Ads**, e ela alimenta o funil existente via sessionStorage (mesmo mecanismo já usado pela `ViabilitySearchSection`).
2. **Mantenho a paleta Navy `#1e3a5f` + Gold `#c8af37`.** A memória Core fixa essa identidade — é usada em PDFs de contrato, certificado blockchain, e-mails e painéis. Trocar para `#1A1AFF/#C9A84C` no site público criaria inconsistência grave entre o que o cliente vê na landing e o que recebe no contrato/certificado. Aplico todos os **princípios premium** que você pediu (tipografia mais forte, espaçamentos generosos, sombras profundas, mobile-first 44/52/56px, sem gradientes "alegres") **dentro da paleta institucional**.
3. **Mantenho Space Grotesk** (já preloaded, peso visual forte equivalente a Sora). Zero custo de performance, mesmo resultado visual.

Se discordar de qualquer um destes 3 pontos, me diga antes de aprovar.

---

## O que vou construir

### 1. Nova landing `/lp` (página de conversão para anúncios Meta)

Página standalone, sem header/footer do site, estrutura mobile-first conforme você descreveu:

```text
[HEADER MINIMAL]      Logo + selo "Site Seguro" (sem menu)
[HERO]                Badge "Protocolo em até 48h" + H1 forte +
                      subheadline + CTA full-width 56px → rola até form +
                      micro-copy jurídica + 3 selos inline
[COMO FUNCIONA]       3 passos verticais com número Gold + ícone lucide
                      Nota: "prazo determinado pelo INPI"
[POR QUE REGISTRAR]   3 cards com tom informativo (não alarmista)
[FORMULÁRIO INLINE]   4 campos: Nome, E-mail, WhatsApp (máscara), Marca
                      → Cria lead (tabela leads existente) + grava
                        sessionStorage 'viabilityData' + redireciona
                        para /registrar já no Step 2 (pré-preenchido)
                      → Dispara fbq('track','Lead') no submit
[CREDIBILIDADE]       Grid 2x2 com benefícios reais
[DEPOIMENTOS]         Reaproveita depoimentos existentes (compactos)
[FAQ ACCORDION]       4 perguntas com tom jurídico correto
[FOOTER MINIMAL]      Logo + CNPJ + 2 links legais
```

**Regras jurídicas respeitadas:** nenhuma promessa de aprovação, INPI mencionado como órgão decisor, prazo descrito como variável.

### 2. Componentes globais novos

- `src/components/lp/LpHeader.tsx` — header minimal (logo + selo, sem nav)
- `src/components/lp/LpHero.tsx` — hero com CTA scroll
- `src/components/lp/LpSteps.tsx` — 3 passos verticais
- `src/components/lp/LpPainPoints.tsx` — 3 cards informativos
- `src/components/lp/LpLeadForm.tsx` — form curto + validação zod + máscara WhatsApp
- `src/components/lp/LpCredibility.tsx` — grid 2x2
- `src/components/lp/LpFAQ.tsx` — accordion
- `src/components/lp/LpFooter.tsx` — minimal
- `src/components/ui/PremiumButton.tsx` — variantes "primary" (Navy 56px) e "ghost" — já existe Button shadcn, então só crio um wrapper se necessário (provavelmente uso classes diretas)

### 3. Integração com funil existente (ZERO mudança no funil)

O `LpLeadForm` no submit:
1. Insere registro em `leads` (origem `meta_ads_lp`)
2. Chama edge function existente para criar lead no CRM (se houver — verifico) ou apenas `supabase.from('leads').insert()`
3. Salva em sessionStorage:
   ```ts
   sessionStorage.setItem('lpLead', JSON.stringify({
     fullName, email, phone, brandName
   }))
   ```
4. `navigate('/registrar')` — atualizo `Registrar.tsx` para ler `lpLead` e pré-preencher Step 1 (Viability) com `brandName`, e Step 2 (PersonalData) com nome/email/phone.

### 4. Refino visual da home `/` e `/planos`

**Sem mexer na estrutura** (apenas refino dentro da paleta atual):
- `HeroSection.tsx`: aumentar peso/tracking do H1, padronizar CTA para 56px mobile, garantir contraste Navy/Gold mais forte
- `PricingSection.tsx`: borda Gold 2px no card "Premium" (recomendado), CTA 56px, padding interno mínimo 24px mobile
- `Header.tsx`: garantir CTA "Registrar Marca" sempre visível no mobile (sticky)
- Remover qualquer gradiente colorido residual ("alegre") e substituir por gradientes Navy escuro com leve toque Gold

### 5. Roteamento

Em `src/App.tsx`:
```tsx
const Lp = lazy(() => import("./pages/Lp"));
<Route path="/lp" element={<Lp />} />
<Route path="/oferta" element={<Navigate to="/lp" replace />} />
<Route path="/inicio" element={<Navigate to="/lp" replace />} />
```

Os anúncios Meta Ads passam a apontar para `/lp` em vez de `/registrar` (você muda isso no Meta Ads quando quiser — `/registrar` continua funcionando normalmente para quem chega direto).

### 6. SEO + Pixel

- `PageMeta` (já existe) com title/description otimizados para LP
- `fbq('track', 'Lead')` no submit do form (Pixel `257440690498371` permanece intacto)
- `fbq('track', 'ViewContent')` no mount da `/lp`

---

## Detalhes técnicos

**Tokens Tailwind:** sem mudanças no `tailwind.config.ts` nem em `index.css` global. Uso classes utilitárias com Navy `hsl(217 47% 25%)` e Gold já mapeados, mais classes Tailwind padrão (`min-h-[56px]`, `text-base md:text-lg`, `tracking-tight`).

**Validação form (zod):**
```ts
const schema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/),
  brandName: z.string().trim().min(1).max(80),
});
```

**Acessibilidade mobile:** todos os tap targets ≥ 44×44, gap mínimo 12px, labels acima do campo, `inputMode` correto, `font-size: 16px` nos inputs (já é o padrão `.input-styled`).

**Performance:** `/lp` lazy-loaded. Sem imagens raster novas. Animações apenas `fade-in` + `slide-up` (já no Tailwind config).

---

## Arquivos

**Criar (10):**
- `src/pages/Lp.tsx`
- `src/components/lp/LpHeader.tsx`
- `src/components/lp/LpHero.tsx`
- `src/components/lp/LpSteps.tsx`
- `src/components/lp/LpPainPoints.tsx`
- `src/components/lp/LpLeadForm.tsx`
- `src/components/lp/LpCredibility.tsx`
- `src/components/lp/LpFAQ.tsx`
- `src/components/lp/LpFooter.tsx`
- `src/lib/lpAnalytics.ts` (helpers `fbq`)

**Editar (5):**
- `src/App.tsx` — adicionar rotas `/lp`, `/oferta`, `/inicio`
- `src/pages/Registrar.tsx` — ler `sessionStorage.lpLead` e pré-preencher
- `src/components/sections/HeroSection.tsx` — refino tipográfico/CTA mobile
- `src/components/sections/PricingSection.tsx` — borda Gold no Premium + CTA 56px
- `src/components/layout/Header.tsx` — CTA sticky mobile (verificar se já é)

**NÃO toco em:**
- `tailwind.config.ts`, `src/index.css` (global)
- Funil `/registrar` — apenas adiciono leitura do `lpLead` no `useEffect` inicial
- `PricingSection` valores
- Qualquer arquivo de admin, cliente, edge function, contrato, blockchain
- `supabase/config.toml`, schemas, RLS

---

## QA antes de finalizar

- Viewport 390×781 (iPhone 14): hero acima do fold, CTA visível, form em ≤3min
- Viewport 320 (iPhone SE): nada quebra
- Viewport 1280 (desktop): layout centralizado, max-w consistente
- Submit do form: lead criado, sessionStorage gravado, redirect funciona, Step 2 do funil pré-preenchido
- `/registrar` direto continua funcionando exatamente como antes
- `/planos`, `/`, `/blog` mantêm visual consistente

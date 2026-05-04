
# Plano de Reestruturação WebMarcas — Conversão, Premium e Mobile

## Princípios e Travas (não negociáveis)
- **Não alterar**: valores dos planos, copy técnica do registro, schema do banco, edge functions, fluxo do checkout (`create-asaas-payment`, contrato, blockchain).
- **Identidade**: manter Navy `#1e3a5f` + Gold `#c8af37` (memória de marca). Ajustes premium = refinar tipografia, contraste, sombras e densidade — não trocar paleta.
- **Mobile-first**: 90% do tráfego é mobile; toda decisão visual é validada em 375px primeiro.

## Escopo por Fases

### Fase 1 — Correções críticas de roteamento (rápido, alto impacto em Ads)
Causas dos 404 reportados:
- `/registar` (sem o segundo "r") e `/planos` (com "s") não existem em `App.tsx`.
- Já existe `/registrar` e `/precos` (redireciona âncora `#precos`).

Ações em `src/App.tsx`:
- Adicionar `<Route path="/registar" element={<Navigate to="/registrar" replace />} />`
- Adicionar `<Route path="/planos" element={<SectionRedirect section="precos" />} />`
- Adicionar variantes comuns: `/cadastro`, `/cadastrar` → `/registrar`; `/preco` → `#precos`.

Garante que campanhas ativas com URLs erradas continuem convertendo.

### Fase 2 — Página `/registrar` em modo Landing Page (foco Ads)
Hoje `Registrar.tsx` já é uma página separada (sem `Header`/`Footer` do site). Refinos:

1. **Hero compacto acima da dobra mobile**:
   - Logo pequena + headline curta ("Registre sua marca no INPI em 48h") + 1 sub-headline.
   - Form de viabilidade (`ViabilityStep`) **visível sem scroll** em 375×812.
2. **Trust strip fixo** abaixo do form: "Protocolo INPI 48h • Certificado Blockchain • +1.000 marcas registradas" com ícones em Gold.
3. **Sticky CTA mobile**: barra inferior fixa com botão "Continuar registro" enquanto o usuário rola — só aparece a partir do step 2.
4. **Reduzir distrações**: remover `SocialProofNotification` apenas no step 1 (o pop-up de venda atrapalha o primeiro foco). Reativar a partir do step 3.
5. **Selos de confiança** ao lado do CTA do form: SSL, INPI, LGPD (já existem assets/ícones lucide).
6. **Micro-melhorias UX**:
   - `inputMode="numeric"` em CPF/CEP/telefone (auditoria já indicou que falta).
   - Auto-focus no primeiro campo de cada step.
   - Mensagens de erro inline em vermelho com ícone.
   - Validação em tempo real (debounce 400ms).
7. **Pixel/Conversion**: garantir que `fbq('track','Lead')` dispara no fim do step 2 e `InitiateCheckout` no step 5 (verificar `metaPixel.ts` — apenas adicionar chamadas onde faltam).

> Copy do registro permanece **idêntica**. Nada de promessa nova.

### Fase 3 — Refino Premium da Home (sem reescrever)
Mantendo todas as seções existentes:

1. **Tipografia**: aumentar peso e tracking dos headings em desktop (`Space Grotesk 700`, `letter-spacing: -0.02em`); reduzir tamanho em mobile para evitar quebra de linha feia.
2. **Cards de pricing** (`PricingSection`): adicionar borda Gold sutil + sombra interna no plano Premium (recomendado). Mantém valores intocados.
3. **Hero**: substituir gradientes genéricos por overlay Navy/Gold mais sólido; adicionar animação de entrada `reveal-up` (já existe no Tailwind config).
4. **Seções**: padronizar `section-padding` mobile (ex.: `py-12` em vez de `py-20`) — reduz scroll fatigante.
5. **Botões CTA primários**: garantir altura mínima 48px no mobile (touch target Apple/Google).

### Fase 4 — Performance e SEO técnico
1. **Imagens**: converter PNG/JPG da home para WebP via build (verificar `public/` e `src/assets/`); adicionar `loading="lazy"` em tudo abaixo da dobra; `fetchpriority="high"` no hero.
2. **Fontes**: já tem `preload`, mas remover pesos não usados (`Inter 400/500/600/700` — checar se 500 é usado; senão remover).
3. **Meta Pixel**: já está deferido (1500ms) — bom. Manter.
4. **Tags SEO específicas por página**: adicionar `<title>` e `<meta description>` dinâmicos via `react-helmet-async` para `/registrar`, `/blog`, `/blog/:slug`. (Hoje só o `index.html` tem meta — todas as rotas SPA herdam o mesmo title.)
5. **Schema.org**: adicionar JSON-LD `Organization` + `Service` (registro de marca) no `index.html`.

### Fase 5 — QA & Validação
- Testar `/registrar` em 320px, 375px, 414px, 768px, 1280px.
- Validar 6 steps do funil completo em mobile real (sem regressão no `create-asaas-payment`).
- Testar redirects: `/registar`, `/planos`, `/cadastro`, `/preco`.
- Lighthouse mobile: alvo Performance ≥85, Accessibility ≥95, SEO 100.
- Confirmar disparos de Pixel via Meta Events Manager (test events).

## O que NÃO entra neste plano
- Trocar paleta de cores institucional.
- Alterar copy técnica do INPI/registro.
- Mexer em valores/planos.
- Alterar edge functions, schemas, RLS.
- Tocar no painel admin ou cliente logado.

## Detalhes técnicos resumidos
- Arquivos editados: `src/App.tsx` (redirects), `src/pages/Registrar.tsx` (landing mode), `src/components/cliente/checkout/*Step.tsx` (inputMode + autofocus + erros), `src/components/sections/HeroSection.tsx` + `PricingSection.tsx` (refino visual), `index.html` (JSON-LD), `src/main.tsx` (HelmetProvider).
- Arquivos novos: `src/components/registrar/StickyMobileCTA.tsx`, `src/components/registrar/TrustStrip.tsx`, `src/components/seo/PageMeta.tsx`.
- Dependência nova: `react-helmet-async` (~6kb).

## Pergunta antes de executar
A auditoria sugere implementar tudo — mas posso entregar em duas ondas para você validar:
- **Onda 1 (rápida, ~baixa quebra)**: Fases 1 + 2 + 4. Resolve 404s, transforma `/registrar` em landing real, melhora SEO/Pixel.
- **Onda 2 (refino visual)**: Fase 3 (premium home) + Fase 5 (QA).

Aprovar **tudo de uma vez** ou começar pela **Onda 1** primeiro?

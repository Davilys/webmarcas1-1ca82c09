

# Plano Atualizado — 3 Frentes WebMarcas

## Frente 1: Busca Real no INPI via Firecrawl

### Testes Realizados
| Metodo | Resultado |
|--------|-----------|
| Portal antigo pePI | **404 morto** — Apache Tomcat 6.0.24 retorna "resource not available" |
| Portal novo — fetch direto | **SPA React** — HTML retorna apenas skeleton sem dados (precisa JS) |
| Portal novo — Firecrawl com waitFor | **Unica opcao viavel** — Firecrawl renderiza JS e aguarda resultados |

### Como funciona o portal novo do INPI
- URL de busca rapida: `https://servicos.busca.inpi.gov.br/marcas/search?q={marca}&searchType=quick`
- E uma SPA React que carrega resultados via API interna apos renderizacao JS
- Firecrawl (ja conectado, `FIRECRAWL_API_KEY` disponivel) consegue renderizar com `waitFor: 5000`

### Logica de viabilidade baseada nos resultados reais

**Sem resultados** ("Nenhum resultado encontrado"):
- Viabilidade: **ALTA (97%)**
- Nivel: `high`
- A marca nao consta na base do INPI, esta disponivel

**Com resultados encontrados** (ex: "Mostrando 1 - 2 de um total de 2 resultados"):
- Extrair cada resultado: numero do processo, marca, titular, procurador, status (Registro em vigor / Pedido definitivamente arquivado / etc), datas
- Se existe "Registro de marca em vigor" na mesma classe → Viabilidade: **BAIXA (~40%)**
- Se existe apenas "Pedido definitivamente arquivado" → Viabilidade: **MEDIA (~65%)**
- Se existe em classes diferentes → Viabilidade: **MEDIA (~70%)**

### O que exibir no laudo
O Firecrawl retorna apenas o **texto dos dados** (markdown), sem imagens HTML. O laudo da WebMarcas exibe esses dados estruturados:
- Numero do processo (ex: 930072960)
- Nome da marca
- Titular e Procurador
- Datas (protocolo, publicacao, vigencia)
- Status (Registro em vigor, Arquivado, etc)

### Implementacao
1. **Criar** `supabase/functions/firecrawl-scrape/index.ts` — edge function generica para Firecrawl
2. **Atualizar** `supabase/functions/inpi-viability-check/index.ts`:
   - Substituir funcao `searchINPI()` para usar Firecrawl como fonte primaria
   - Firecrawl scrape da URL de busca rapida com `waitFor: 5000` e `formats: ['markdown']`
   - IA (GPT-5.2) extrai dados estruturados do markdown retornado
   - Se Firecrawl falhar → fallback para DuckDuckGo (comportamento atual)
3. **Adicionar** configuracao no `supabase/config.toml` para firecrawl-scrape

### O que NAO muda
- Front-end (laudo, design, animacoes, PDF) — **tudo identico**
- CNPJ, Internet, Classes NCL — **tudo identico**
- Estrutura de resposta da API — **identica**

---

## Frente 2: Blog Estrategico (10 Paginas + Imagens Premium)

### Estrutura
- Rota `/blog` (listagem) e `/blog/:slug` (artigo individual)
- Layout reutiliza Header/Footer existentes
- 10 artigos com conteudo SEO real e original
- Imagens de capa premium geradas via IA (estilo navy/gold do site)
- CTA em cada artigo para busca de viabilidade

### 10 Artigos
1. Como Fazer Consulta de Marca no INPI em 2026
2. O Que e Marca Generica e Por Que o INPI Barra
3. Propriedade Industrial vs. Propriedade Intelectual
4. Quem Pode Registrar Marca no INPI
5. Naming Estrategico — Como Criar uma Marca Forte
6. Pesquisa de Anterioridade — O Guia Completo
7. Direito Marcario — Proteja Sua Exclusividade
8. Custos do Registro de Marca — Entenda os Valores (taxas INPI 2026: R$840 PJ / R$440 PF)
9. Marca Indeferida — O Que Fazer em 5 Passos
10. Plano Premium WebMarcas — Protecao Total para Sua Marca

### Arquivos novos
- `src/pages/Blog.tsx` — listagem
- `src/pages/BlogPost.tsx` — artigo individual
- `src/data/blogPosts.ts` — conteudo completo dos 10 artigos
- `src/components/blog/BlogCard.tsx`

### Arquivos modificados
- `src/App.tsx` — rotas /blog e /blog/:slug
- `src/components/layout/Header.tsx` — link Blog no menu

### Impacto: **Zero** — 100% aditivo

---

## Frente 3: Plano Premium + Taxas INPI 2026

### Taxas INPI 2026 (corrigidas)
- **LTDA / Pessoa Juridica**: R$ 840,00
- **Pessoa Fisica / MEI / Simples Nacional**: R$ 440,00

### Secao de Precos — 2 Cards
**Card 1: Plano Essencial** (atual)
- R$ 699 a vista | parcelado
- Registro + acompanhamento basico
- Recursos extras cobrados separadamente (1 salario minimo/recurso)
- Taxas INPI **nao incluidas** (valor explicito ao lado)

**Card 2: Plano Premium** (novo, badge "Recomendado")
- R$ 398/mes (assinatura recorrente)
- **Tudo incluso**: deposito, oposicoes, exigencias, recursos, acompanhamento ate certificado
- Taxas do INPI **incluidas** no plano

### Transparencia de Taxas
- Secao visual abaixo dos cards: "Taxas Governamentais do INPI"
- PJ/LTDA: R$ 840 | PF/MEI/Simples: R$ 440
- FAQ atualizado

### Checkout e Backend
- Toggle Essencial/Premium no `PaymentStep.tsx`
- Edge function `create-asaas-payment` suporta tipo "subscription"
- Nova tabela `subscriptions` (id, user_id, plan, status, amount, start_date, end_date)

### Arquivos modificados
- `src/components/sections/PricingSection.tsx`
- `src/components/sections/FAQSection.tsx`
- `src/components/cliente/checkout/PaymentStep.tsx`
- `supabase/functions/create-asaas-payment/index.ts`
- `src/hooks/usePricing.ts`

### Impacto: **Medio** — PricingSection muda visual, checkout ganha toggle

---

## Resumo

| Frente | Risco | Tabelas existentes alteradas? |
|--------|-------|-------------------------------|
| 1. INPI real | Baixo | Nenhuma |
| 2. Blog | Zero | Nenhuma |
| 3. Premium | Medio | Nenhuma (nova tabela `subscriptions`) |

Nenhuma tabela existente e alterada. Autenticacao e fluxos consolidados nao sao tocados.

